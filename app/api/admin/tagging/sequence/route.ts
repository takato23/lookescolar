import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Schema for sequential assignment
const SequenceAssignSchema = z.object({
  eventId: z.string().uuid(),
  sortBy: z.enum(['exif', 'filename', 'created_at']).default('exif'),
  onlyUnassigned: z.boolean().default(true),
  sequence: z
    .array(
      z.object({
        subjectId: z.string().uuid(),
        count: z.number().min(1).max(50),
      })
    )
    .min(1)
    .max(100),
});

// POST: Apply sequential photo assignment
export const POST = withAuth(async function (request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabaseServiceClient();
    const body = await request.json();

    logger.info('Sequential assignment request received', {
      requestId,
      bodyKeys: Object.keys(body),
    });

    // Validate schema
    const { eventId, sortBy, onlyUnassigned, sequence } =
      SequenceAssignSchema.parse(body);

    // Verify all subjects exist and belong to the event
    const subjectIds = sequence.map((s) => s.subjectId);
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id')
      .eq('event_id', eventId)
      .in('id', subjectIds);

    if (subjectsError || !subjects || subjects.length !== subjectIds.length) {
      return NextResponse.json(
        { error: 'Some subjects not found or do not belong to this event' },
        { status: 400 }
      );
    }

    // Build photo query based on sorting and filters
    let photoQuery = supabase
      .from('photos')
      .select('id, exif_taken_at, created_at, original_filename, subject_id')
      .eq('event_id', eventId)
      .eq('approved', true);

    if (onlyUnassigned) {
      // Only photos without assignment in photo_subjects
      const { data: assignedPhotoIds } = await supabase
        .from('photo_subjects')
        .select('photo_id')
        .in(
          'photo_id',
          (
            await supabase.from('photos').select('id').eq('event_id', eventId)
          ).data?.map((p) => p.id) || []
        );

      const assignedIds = assignedPhotoIds?.map((p) => p.photo_id) || [];
      if (assignedIds.length > 0) {
        photoQuery = photoQuery.not('id', 'in', `(${assignedIds.join(',')})`);
      }
    }

    const { data: photos, error: photosError } = await photoQuery;

    if (photosError) {
      logger.error('Error fetching photos for sequential assignment', {
        requestId,
        error: photosError.message,
        eventId,
      });

      return NextResponse.json(
        { error: 'Failed to fetch photos', details: photosError.message },
        { status: 500 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No photos found matching criteria',
        assignedCount: 0,
        totalPhotos: 0,
      });
    }

    // Sort photos based on selected criteria
    photos.sort((a, b) => {
      switch (sortBy) {
        case 'exif':
          const dateA = a.exif_taken_at
            ? new Date(a.exif_taken_at).getTime()
            : new Date(a.created_at).getTime();
          const dateB = b.exif_taken_at
            ? new Date(b.exif_taken_at).getTime()
            : new Date(b.created_at).getTime();
          return dateA - dateB;

        case 'filename':
          const nameA = a.original_filename || '';
          const nameB = b.original_filename || '';
          return nameA.localeCompare(nameB);

        case 'created_at':
        default:
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
      }
    });

    // Calculate total photos needed
    const totalNeeded = sequence.reduce((sum, s) => sum + s.count, 0);

    if (totalNeeded > photos.length) {
      return NextResponse.json(
        {
          error: 'Not enough photos available',
          details: {
            requested: totalNeeded,
            available: photos.length,
          },
        },
        { status: 400 }
      );
    }

    // Assign photos in sequence
    const assignments: Array<{ photo_id: string; subject_id: string }> = [];
    let photoIndex = 0;

    for (const { subjectId, count } of sequence) {
      for (let i = 0; i < count && photoIndex < photos.length; i++) {
        assignments.push({
          photo_id: photos[photoIndex].id,
          subject_id: subjectId,
        });
        photoIndex++;
      }
    }

    if (assignments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No assignments to process',
        assignedCount: 0,
        totalPhotos: photos.length,
      });
    }

    // Insert assignments into photo_subjects table
    const photoSubjectInserts = assignments.map((assignment) => ({
      photo_id: assignment.photo_id,
      subject_id: assignment.subject_id,
      tagged_at: new Date().toISOString(),
      tagged_by: 'admin_sequential', // Mark as sequential assignment
    }));

    const { error: insertError } = await supabase
      .from('photo_subjects')
      .insert(photoSubjectInserts);

    if (insertError) {
      logger.error('Error inserting sequential photo assignments', {
        requestId,
        error: insertError.message,
        assignmentCount: assignments.length,
      });

      return NextResponse.json(
        { error: 'Failed to assign photos', details: insertError.message },
        { status: 500 }
      );
    }

    // Update direct subject_id reference in photos table for backward compatibility
    const photoUpdates = assignments.map(async (assignment) => {
      return supabase
        .from('photos')
        .update({ subject_id: assignment.subject_id })
        .eq('id', assignment.photo_id);
    });

    await Promise.all(photoUpdates);

    const duration = Date.now() - startTime;

    logger.info('Sequential assignment completed successfully', {
      requestId,
      eventId,
      assignedCount: assignments.length,
      totalPhotos: photos.length,
      sortBy,
      onlyUnassigned,
      sequenceLength: sequence.length,
      duration,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${assignments.length} photos sequentially`,
      assignedCount: assignments.length,
      totalPhotos: photos.length,
      skippedPhotos: photos.length - assignments.length,
      assignments: assignments.map((a) => ({
        photoId: a.photo_id,
        subjectId: a.subject_id,
      })),
      metadata: {
        sortBy,
        onlyUnassigned,
        sequenceLength: sequence.length,
        processingTimeMs: duration,
        requestId,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.warn('Invalid request data for sequential assignment', {
        requestId,
        errors: error.errors,
        duration,
      });

      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error in sequential assignment operation', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process sequential assignment',
        requestId,
      },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';
