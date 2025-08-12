import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Enhanced schemas for batch operations
const BatchAssignSchema = z.object({
  eventId: z.string().uuid(),
  assignments: z
    .array(
      z.object({
        photoId: z.string().uuid(),
        subjectId: z.string().uuid(),
      })
    )
    .min(1)
    .max(100), // Limit to 100 assignments per batch
});

// New simplified schema for QR tagging workflow
const QRTaggingBatchSchema = z.object({
  eventId: z.string().uuid(),
  photoIds: z.array(z.string().uuid()).min(1).max(50), // Batch of photo IDs
  studentId: z.string().uuid(), // Single student to assign all photos to
});

const BatchUnassignSchema = z.object({
  eventId: z.string().uuid(),
  photoIds: z.array(z.string().uuid()).min(1).max(100),
});

const BulkAssignSchema = z.object({
  eventId: z.string().uuid(),
  subjectId: z.string().uuid(),
  filterCriteria: z
    .object({
      unassignedOnly: z.boolean().default(true),
      dateRange: z
        .object({
          start: z.string().datetime().optional(),
          end: z.string().datetime().optional(),
        })
        .optional(),
      filenamePattern: z.string().optional(),
      limit: z.number().min(1).max(500).optional(),
    })
    .optional(),
});

// POST: Batch assign photos to subjects
export const POST = withAuth(async function(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabaseServiceClient();
    const body = await request.json();

    logger.info('Batch tagging request received', {
      requestId,
      bodyKeys: Object.keys(body),
    });

    // Try QR tagging schema first (simplified workflow)
    let isQRTagging = false;
    let eventId: string, assignments: Array<{photoId: string, subjectId: string}>;

    try {
      const qrData = QRTaggingBatchSchema.parse(body);
      isQRTagging = true;
      eventId = qrData.eventId;
      // Convert to assignments format
      assignments = qrData.photoIds.map(photoId => ({
        photoId,
        subjectId: qrData.studentId,
      }));

      logger.info('Using QR tagging workflow', {
        requestId,
        eventId,
        studentId: `stu_${qrData.studentId.substring(0, 8)}***`,
        photoCount: qrData.photoIds.length,
      });
    } catch {
      // Fall back to standard batch schema
      const batchData = BatchAssignSchema.parse(body);
      eventId = batchData.eventId;
      assignments = batchData.assignments;

      logger.info('Using standard batch workflow', {
        requestId,
        eventId,
        assignmentCount: assignments.length,
      });
    }

    // Validate photos exist and belong to event
    const photoIds = assignments.map(a => a.photoId);
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, approved, event_id')
      .eq('event_id', eventId)
      .in('id', photoIds);

    if (photosError) {
      logger.error('Error validating photos', {
        requestId,
        error: photosError.message,
        eventId,
        photoCount: photoIds.length,
      });
      
      return NextResponse.json(
        { error: 'Failed to validate photos', details: photosError.message },
        { status: 500 }
      );
    }

    if (!photos || photos.length !== photoIds.length) {
      const foundIds = photos?.map(p => p.id) || [];
      const missingIds = photoIds.filter(id => !foundIds.includes(id));
      
      logger.warn('Some photos not found or not in event', {
        requestId,
        eventId,
        expectedCount: photoIds.length,
        foundCount: photos?.length || 0,
        missingCount: missingIds.length,
      });

      return NextResponse.json(
        { 
          error: 'Some photos not found or do not belong to this event',
          details: {
            expected: photoIds.length,
            found: photos?.length || 0,
            missing: missingIds.length,
          }
        },
        { status: 400 }
      );
    }

    // Check for unapproved photos
    const unapprovedPhotos = photos.filter(p => !p.approved);
    if (unapprovedPhotos.length > 0) {
      logger.warn('Cannot tag unapproved photos', {
        requestId,
        eventId,
        unapprovedCount: unapprovedPhotos.length,
        unapprovedIds: unapprovedPhotos.map(p => p.id.substring(0, 8) + '***'),
      });

      return NextResponse.json(
        {
          error: 'Cannot tag unapproved photos',
          details: {
            unapprovedCount: unapprovedPhotos.length,
            message: 'All photos must be approved before tagging',
          }
        },
        { status: 400 }
      );
    }

    // Check for duplicate assignments
    const { data: existingAssignments } = await supabase
      .from('photo_subjects')
      .select('photo_id, subject_id')
      .in('photo_id', photoIds);

    const duplicates = assignments.filter(assignment => 
      existingAssignments?.some(existing => 
        existing.photo_id === assignment.photoId && 
        existing.subject_id === assignment.subjectId
      )
    );

    if (duplicates.length > 0) {
      logger.warn('Duplicate assignments detected', {
        requestId,
        duplicateCount: duplicates.length,
        totalAssignments: assignments.length,
      });
    }

    // Filter out duplicates for processing
    const newAssignments = assignments.filter(assignment => 
      !existingAssignments?.some(existing => 
        existing.photo_id === assignment.photoId && 
        existing.subject_id === assignment.subjectId
      )
    );

    if (newAssignments.length === 0) {
      logger.info('No new assignments to process (all duplicates)', {
        requestId,
        originalCount: assignments.length,
      });

      return NextResponse.json({
        success: true,
        message: 'All photos were already assigned to the specified subjects',
        data: {
          assignedCount: 0,
          duplicateCount: assignments.length,
          skippedCount: 0,
        },
      });
    }

    // Start transaction for atomicity
    const { data, error } = await supabase.rpc('batch_assign_photos', {
      p_event_id: eventId,
      p_assignments: newAssignments.map((a) => ({
        photo_id: a.photoId,
        subject_id: a.subjectId,
      })),
    });

    if (error) {
      logger.error('Error in batch assign RPC', {
        requestId,
        error: error.message,
        eventId,
        assignmentCount: newAssignments.length,
      });

      return NextResponse.json(
        { error: 'Failed to assign photos in batch', details: error.message },
        { status: 500 }
      );
    }

    // Update photo_subjects table for many-to-many relationships
    const photoSubjectInserts = newAssignments.map((assignment) => ({
      photo_id: assignment.photoId,
      subject_id: assignment.subjectId,
      tagged_at: new Date().toISOString(),
      tagged_by: 'admin', // TODO: Get actual user ID from auth
    }));

    const { error: photoSubjectsError } = await supabase
      .from('photo_subjects')
      .insert(photoSubjectInserts);

    if (photoSubjectsError) {
      logger.error('Error inserting photo_subjects', {
        requestId,
        error: photoSubjectsError.message,
        insertCount: photoSubjectInserts.length,
      });
      
      // This is a secondary operation, don't fail the entire operation
    }

    // Get updated statistics
    const { data: stats, error: statsError } = await supabase
      .from('photos')
      .select('id, subject_id')
      .eq('event_id', eventId)
      .eq('approved', true);

    const totalPhotos = stats?.length || 0;
    const taggedPhotos = stats?.filter((p) => p.subject_id).length || 0;
    const duration = Date.now() - startTime;

    logger.info('Batch tagging completed successfully', {
      requestId,
      eventId,
      assignedCount: newAssignments.length,
      duplicateCount: duplicates.length,
      totalPhotos,
      taggedPhotos,
      duration,
      workflowType: isQRTagging ? 'qr_tagging' : 'standard_batch',
    });

    return NextResponse.json({
      success: true,
      message: isQRTagging 
        ? `Successfully assigned ${newAssignments.length} photos to student` 
        : `Successfully assigned ${newAssignments.length} photos in batch`,
      data: {
        assignedCount: newAssignments.length,
        duplicateCount: duplicates.length,
        skippedCount: assignments.length - newAssignments.length - duplicates.length,
        workflowType: isQRTagging ? 'qr_tagging' : 'standard_batch',
        stats: {
          totalPhotos,
          taggedPhotos,
          untaggedPhotos: totalPhotos - taggedPhotos,
          progressPercentage:
            totalPhotos > 0
              ? Math.round((taggedPhotos / totalPhotos) * 100)
              : 0,
        },
        metadata: {
          processingTimeMs: duration,
          requestId,
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.warn('Invalid request data for batch tagging', {
        requestId,
        errors: error.errors,
        duration,
      });

      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error in batch assign operation', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process batch tagging request',
        requestId,
      },
      { status: 500 }
    );
  }
});

// DELETE: Batch unassign photos
export const DELETE = withAuth(async function(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabaseServiceClient();
    const body = await request.json();

    logger.info('Batch unassign request received', {
      requestId,
      photoCount: body.photoIds?.length,
      eventId: body.eventId,
    });

    // Validate schema
    const { eventId, photoIds } = BatchUnassignSchema.parse(body);

    // Verify photos belong to the event
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id')
      .eq('event_id', eventId)
      .in('id', photoIds);

    if (photosError) {
      logger.error('Error verifying photos for unassign', {
        requestId,
        error: photosError.message,
        eventId,
        photoCount: photoIds.length,
      });

      return NextResponse.json(
        { error: 'Failed to verify photos', details: photosError.message },
        { status: 500 }
      );
    }

    if (!photos || photos.length !== photoIds.length) {
      const foundIds = photos?.map(p => p.id) || [];
      const missingIds = photoIds.filter(id => !foundIds.includes(id));

      logger.warn('Some photos not found for unassign', {
        requestId,
        eventId,
        expectedCount: photoIds.length,
        foundCount: photos?.length || 0,
        missingCount: missingIds.length,
      });

      return NextResponse.json(
        { 
          error: 'Some photos do not exist or do not belong to this event',
          details: {
            expected: photoIds.length,
            found: photos?.length || 0,
            missing: missingIds.length,
          }
        },
        { status: 400 }
      );
    }

    // Remove assignments from photo_subjects table
    const { error: deleteError } = await supabase
      .from('photo_subjects')
      .delete()
      .in('photo_id', photoIds);

    if (deleteError) {
      logger.error('Error removing photo assignments', {
        requestId,
        error: deleteError.message,
        photoCount: photoIds.length,
        eventId,
      });

      return NextResponse.json(
        { error: 'Failed to unassign photos', details: deleteError.message },
        { status: 500 }
      );
    }

    // If using direct subject_id on photos table, clear those too
    const { error: updateError } = await supabase
      .from('photos')
      .update({ subject_id: null })
      .in('id', photoIds);

    if (updateError) {
      logger.warn('Error clearing photo subjects (non-critical)', {
        requestId,
        error: updateError.message,
        photoCount: photoIds.length,
      });
      // Don't fail for this - photo_subjects is the primary relationship
    }

    // Get updated statistics
    const { data: stats } = await supabase
      .from('photos')
      .select('id, subject_id')
      .eq('event_id', eventId)
      .eq('approved', true);

    const totalPhotos = stats?.length || 0;
    const taggedPhotos = stats?.filter((p) => p.subject_id).length || 0;
    const duration = Date.now() - startTime;

    logger.info('Batch unassign completed successfully', {
      requestId,
      eventId,
      unassignedCount: photoIds.length,
      totalPhotos,
      taggedPhotos,
      duration,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unassigned ${photoIds.length} photos`,
      data: {
        unassignedCount: photoIds.length,
        stats: {
          totalPhotos,
          taggedPhotos,
          untaggedPhotos: totalPhotos - taggedPhotos,
          progressPercentage:
            totalPhotos > 0
              ? Math.round((taggedPhotos / totalPhotos) * 100)
              : 0,
        },
        metadata: {
          processingTimeMs: duration,
          requestId,
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.warn('Invalid request data for batch unassign', {
        requestId,
        errors: error.errors,
        duration,
      });

      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error in batch unassign operation', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process batch unassign request',
        requestId,
      },
      { status: 500 }
    );
  }
});

// PUT: Bulk assign photos based on criteria
export const PUT = withAuth(async function(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabaseServiceClient();
    const body = await request.json();

    logger.info('Bulk assign request received', {
      requestId,
      eventId: body.eventId,
      subjectId: body.subjectId ? `sub_${body.subjectId.substring(0, 8)}***` : undefined,
      hasFilterCriteria: !!body.filterCriteria,
    });

    // Validate schema
    const {
      eventId,
      subjectId,
      filterCriteria = {},
    } = BulkAssignSchema.parse(body);

    // Verify subject exists and belongs to event
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('event_id', eventId)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json(
        { error: 'Subject not found or does not belong to this event' },
        { status: 404 }
      );
    }

    // Build query for photos to assign
    let query = supabase
      .from('photos')
      .select('id, filename, created_at')
      .eq('event_id', eventId)
      .eq('approved', true);

    // Apply filter criteria
    if (filterCriteria.unassignedOnly) {
      query = query.is('subject_id', null);
    }

    if (filterCriteria.dateRange) {
      if (filterCriteria.dateRange.start) {
        query = query.gte('created_at', filterCriteria.dateRange.start);
      }
      if (filterCriteria.dateRange.end) {
        query = query.lte('created_at', filterCriteria.dateRange.end);
      }
    }

    if (filterCriteria.filenamePattern) {
      query = query.ilike('filename', `%${filterCriteria.filenamePattern}%`);
    }

    if (filterCriteria.limit) {
      query = query.limit(filterCriteria.limit);
    }

    const { data: photosToAssign, error: photosError } = await query;

    if (photosError) {
      console.error('Error querying photos for bulk assign:', photosError);
      return NextResponse.json(
        { error: 'Failed to query photos' },
        { status: 500 }
      );
    }

    if (!photosToAssign || photosToAssign.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No photos found matching the criteria',
        data: {
          assignedCount: 0,
          matchedPhotos: 0,
        },
      });
    }

    // Perform bulk assignment
    const photoIds = photosToAssign.map((p) => p.id);
    const assignments = photoIds.map((photoId) => ({
      photoId,
      subjectId,
    }));

    // Use the batch assign logic
    const batchRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        eventId,
        assignments,
      }),
    });

    return await POST(batchRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error in bulk assign operation', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process bulk assign request',
        requestId,
      },
      { status: 500 }
    );
  }
});

// Rate limiting configuration
export const runtime = 'nodejs';
