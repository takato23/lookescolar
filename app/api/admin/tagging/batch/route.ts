import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(true); // Service role for admin operations
    const body = await request.json();

    // Validate schema
    const { eventId, assignments } = BatchAssignSchema.parse(body);

    // Start transaction for atomicity
    const { data, error } = await supabase.rpc('batch_assign_photos', {
      p_event_id: eventId,
      p_assignments: assignments.map((a) => ({
        photo_id: a.photoId,
        subject_id: a.subjectId,
      })),
    });

    if (error) {
      console.error('Error in batch assign:', error);
      return NextResponse.json(
        { error: 'Failed to assign photos in batch', details: error.message },
        { status: 500 }
      );
    }

    // Update photo_subjects table for many-to-many relationships
    const photoSubjectInserts = assignments.map((assignment) => ({
      photo_id: assignment.photoId,
      subject_id: assignment.subjectId,
      tagged_at: new Date().toISOString(),
      tagged_by: 'system', // In real implementation, use actual user ID
    }));

    const { error: photoSubjectsError } = await supabase
      .from('photo_subjects')
      .insert(photoSubjectInserts);

    if (photoSubjectsError) {
      console.error('Error inserting photo_subjects:', photoSubjectsError);
      // Don't fail the entire operation for this
    }

    // Get updated statistics
    const { data: stats, error: statsError } = await supabase
      .from('photos')
      .select('id, subject_id')
      .eq('event_id', eventId)
      .eq('approved', true);

    const totalPhotos = stats?.length || 0;
    const taggedPhotos = stats?.filter((p) => p.subject_id).length || 0;

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${assignments.length} photos`,
      data: {
        assignedCount: assignments.length,
        stats: {
          totalPhotos,
          taggedPhotos,
          untaggedPhotos: totalPhotos - taggedPhotos,
          progressPercentage:
            totalPhotos > 0
              ? Math.round((taggedPhotos / totalPhotos) * 100)
              : 0,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in batch assign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Batch unassign photos
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(true);
    const body = await request.json();

    // Validate schema
    const { eventId, photoIds } = BatchUnassignSchema.parse(body);

    // Verify photos belong to the event
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id')
      .eq('event_id', eventId)
      .in('id', photoIds);

    if (photosError) {
      console.error('Error verifying photos:', photosError);
      return NextResponse.json(
        { error: 'Failed to verify photos' },
        { status: 500 }
      );
    }

    if (!photos || photos.length !== photoIds.length) {
      return NextResponse.json(
        { error: 'Some photos do not exist or do not belong to this event' },
        { status: 400 }
      );
    }

    // Remove assignments from photo_subjects table
    const { error: deleteError } = await supabase
      .from('photo_subjects')
      .delete()
      .in('photo_id', photoIds);

    if (deleteError) {
      console.error('Error removing photo assignments:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unassign photos' },
        { status: 500 }
      );
    }

    // If using direct subject_id on photos table, clear those too
    const { error: updateError } = await supabase
      .from('photos')
      .update({ subject_id: null })
      .in('id', photoIds);

    if (updateError) {
      console.error('Error clearing photo subjects:', updateError);
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
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in batch unassign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Bulk assign photos based on criteria
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(true);
    const body = await request.json();

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

    console.error('Error in bulk assign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Rate limiting configuration
export const runtime = 'nodejs';
