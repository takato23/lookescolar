import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';

// Schema for bulk folder assignment
const AssignFolderPhotosSchema = z.object({
  folderId: z.string().uuid().optional(), // If null/undefined, assigns all unassigned photos in event
  subjectIds: z.array(z.string().uuid()).min(1).max(100, 'Too many subjects'),
  assignmentMode: z.enum(['all_to_all', 'sequential', 'qr_detection']).default('all_to_all'),
  forceReassign: z.boolean().default(false), // Whether to override existing assignments
});

interface AssignmentResult {
  photoId: string;
  subjectId: string;
  success: boolean;
  error?: string;
  previouslyAssigned?: boolean;
}

// POST: Bulk assign photos from a folder to subjects
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const { id: eventId } = await params;
    const supabase = await createServerSupabaseServiceClient();
    const body = await request.json();

    logger.info('Folder photos assignment request received', {
      requestId,
      eventId: `event_${eventId.substring(0, 8)}***`,
      bodyKeys: Object.keys(body),
    });

    // Validate schema
    const { folderId, subjectIds, assignmentMode, forceReassign } = AssignFolderPhotosSchema.parse(body);

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Verify all subjects exist and belong to the event
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('event_id', eventId)
      .in('id', subjectIds);

    if (subjectsError || !subjects || subjects.length !== subjectIds.length) {
      return NextResponse.json(
        { error: 'Some subjects not found or do not belong to this event' },
        { status: 400 }
      );
    }

    // Get photos from the specified folder (or all unassigned photos if no folder specified)
    let photosQuery = supabase
      .from('photos')
      .select('id, original_filename, folder_id, created_at')
      .eq('event_id', eventId)
      .eq('approved', true); // Only assign approved photos

    if (folderId) {
      // Verify folder exists and belongs to event
      const { data: folder, error: folderError } = await supabase
        .from('event_folders')
        .select('id, name')
        .eq('id', folderId)
        .eq('event_id', eventId)
        .single();

      if (folderError || !folder) {
        return NextResponse.json(
          { error: 'Folder not found or does not belong to this event' },
          { status: 404 }
        );
      }

      photosQuery = photosQuery.eq('folder_id', folderId);
    } else {
      // Get photos not yet assigned to any subject if no folder specified
      const { data: assignedPhotoIds } = await supabase
        .from('photo_subjects')
        .select('photo_id')
        .in('photo_id', 
          (await supabase
            .from('photos')
            .select('id')
            .eq('event_id', eventId)
          ).data?.map(p => p.id) || []
        );
      
      const assignedIds = assignedPhotoIds?.map(p => p.photo_id) || [];
      if (assignedIds.length > 0 && !forceReassign) {
        photosQuery = photosQuery.not('id', 'in', `(${assignedIds.join(',')})`);
      }
    }

    const { data: photos, error: photosError } = await photosQuery.order('created_at', { ascending: true });

    if (photosError) {
      logger.error('Error fetching photos for assignment', {
        requestId,
        error: photosError.message,
        eventId,
        folderId,
      });

      return NextResponse.json(
        { error: 'Failed to fetch photos', details: photosError.message },
        { status: 500 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No photos found to assign',
        results: [],
        summary: {
          totalPhotos: 0,
          totalSubjects: subjectIds.length,
          assignedCount: 0,
          errorCount: 0,
        }
      });
    }

    // Generate assignments based on mode
    const assignments: Array<{ photoId: string; subjectId: string }> = [];

    switch (assignmentMode) {
      case 'all_to_all':
        // Assign every photo to every subject (many-to-many)
        for (const photo of photos) {
          for (const subjectId of subjectIds) {
            assignments.push({ photoId: photo.id, subjectId });
          }
        }
        break;

      case 'sequential':
        // Distribute photos sequentially across subjects
        photos.forEach((photo, index) => {
          const subjectIndex = index % subjectIds.length;
          assignments.push({ photoId: photo.id, subjectId: subjectIds[subjectIndex] });
        });
        break;

      case 'qr_detection':
        // TODO: Implement QR detection for automatic assignment
        // For now, fall back to all_to_all mode
        for (const photo of photos) {
          for (const subjectId of subjectIds) {
            assignments.push({ photoId: photo.id, subjectId });
          }
        }
        break;
    }

    // Execute assignments in batches
    const results: AssignmentResult[] = [];
    const batchSize = 100;
    let assignedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize);
      
      // Check for existing assignments if not force reassigning
      let existingAssignments: any[] = [];
      if (!forceReassign) {
        const { data: existing } = await supabase
          .from('photo_subjects')
          .select('photo_id, subject_id')
          .in('photo_id', batch.map(a => a.photoId))
          .in('subject_id', batch.map(a => a.subjectId));
        
        existingAssignments = existing || [];
      }

      // Filter out existing assignments
      const newAssignments = forceReassign ? batch : batch.filter(assignment => {
        return !existingAssignments.some(existing => 
          existing.photo_id === assignment.photoId && 
          existing.subject_id === assignment.subjectId
        );
      });

      if (newAssignments.length > 0) {
        // Insert new assignments
        const { error: insertError } = await supabase
          .from('photo_subjects')
          .insert(
            newAssignments.map(assignment => ({
              photo_id: assignment.photoId,
              subject_id: assignment.subjectId,
              tagged_at: new Date().toISOString(),
              tagged_by: null // Automatic assignment
            }))
          );

        if (insertError) {
          logger.error('Error inserting assignment batch', {
            requestId,
            batchIndex: Math.floor(i / batchSize),
            batchSize: newAssignments.length,
            error: insertError.message,
          });

          // Add errors to results
          newAssignments.forEach(assignment => {
            results.push({
              photoId: assignment.photoId,
              subjectId: assignment.subjectId,
              success: false,
              error: insertError.message,
            });
            errorCount++;
          });
        } else {
          // Add successes to results
          newAssignments.forEach(assignment => {
            results.push({
              photoId: assignment.photoId,
              subjectId: assignment.subjectId,
              success: true,
            });
            assignedCount++;
          });
        }
      }

      // Add skipped assignments (already existed)
      batch.filter(assignment => 
        existingAssignments.some(existing => 
          existing.photo_id === assignment.photoId && 
          existing.subject_id === assignment.subjectId
        )
      ).forEach(assignment => {
        results.push({
          photoId: assignment.photoId,
          subjectId: assignment.subjectId,
          success: true,
          previouslyAssigned: true,
        });
      });
    }

    const duration = Date.now() - startTime;

    logger.info('Folder photos assignment completed', {
      requestId,
      eventId,
      folderId,
      assignmentMode,
      totalPhotos: photos.length,
      totalSubjects: subjectIds.length,
      assignedCount,
      errorCount,
      duration,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${assignedCount} photo-subject combinations`,
      results: results.slice(0, 50), // Limit response size, show first 50 results
      summary: {
        totalPhotos: photos.length,
        totalSubjects: subjectIds.length,
        totalAssignments: assignments.length,
        assignedCount,
        errorCount,
        skippedCount: results.filter(r => r.previouslyAssigned).length,
        duration,
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Folder photos assignment failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}