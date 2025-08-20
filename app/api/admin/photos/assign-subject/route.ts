import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';

// Schema for assigning photos to subjects
const assignSchema = z.object({
  photoId: z.string().uuid(),
  subjectId: z.string().uuid(),
});

const batchAssignSchema = z.object({
  items: z.array(assignSchema).min(1).max(100),
});

async function handlePOST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const userId = request.headers.get('x-user-id') || 'unknown';

  try {
    const body = await request.json();
    
    // Check if it's a single assignment or batch
    const isBatch = 'items' in body;
    
    if (isBatch) {
      const parsed = batchAssignSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();
      const { items } = parsed.data;
      
      // Process batch assignments
      const assignments = [];
      const errors = [];
      
      for (const item of items) {
        try {
          // Check if assignment already exists
          const { data: existing } = await supabase
            .from('photo_subjects')
            .select('id')
            .eq('photo_id', item.photoId)
            .eq('subject_id', item.subjectId)
            .single();

          if (!existing) {
            // Create new assignment
            const { data, error } = await supabase
              .from('photo_subjects')
              .insert({
                photo_id: item.photoId,
                subject_id: item.subjectId,
                tagged_at: new Date().toISOString(),
                tagged_by: userId,
              })
              .select()
              .single();

            if (error) {
              errors.push({ photoId: item.photoId, subjectId: item.subjectId, error: error.message });
            } else {
              assignments.push(data);
            }
          } else {
            // Assignment already exists, skip
            assignments.push(existing);
          }
        } catch (err) {
          errors.push({ 
            photoId: item.photoId, 
            subjectId: item.subjectId, 
            error: err instanceof Error ? err.message : 'Unknown error' 
          });
        }
      }

      SecurityLogger.logSecurityEvent(
        'batch_photo_subject_assignment',
        {
          requestId,
          userId,
          totalItems: items.length,
          successful: assignments.length,
          failed: errors.length,
        },
        'info'
      );

      return NextResponse.json({
        success: true,
        assigned: assignments.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } else {
      // Single assignment
      const parsed = assignSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { photoId, subjectId } = parsed.data;
      const supabase = await createServerSupabaseServiceClient();

      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('photo_subjects')
        .select('id')
        .eq('photo_id', photoId)
        .eq('subject_id', subjectId)
        .single();

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Assignment already exists',
          data: existing,
        });
      }

      // Create new assignment
      const { data, error } = await supabase
        .from('photo_subjects')
        .insert({
          photo_id: photoId,
          subject_id: subjectId,
          tagged_at: new Date().toISOString(),
          tagged_by: userId,
        })
        .select()
        .single();

      if (error) {
        SecurityLogger.logSecurityEvent(
          'photo_subject_assignment_error',
          {
            requestId,
            userId,
            photoId,
            subjectId,
            error: error.message,
          },
          'error'
        );
        return NextResponse.json(
          { error: 'Failed to assign photo to subject', details: error.message },
          { status: 500 }
        );
      }

      SecurityLogger.logSecurityEvent(
        'photo_subject_assigned',
        {
          requestId,
          userId,
          photoId,
          subjectId,
        },
        'info'
      );

      return NextResponse.json({
        success: true,
        data,
      });
    }
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'photo_assignment_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove photo-subject assignment
async function handleDELETE(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const userId = request.headers.get('x-user-id') || 'unknown';

  try {
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { photoId, subjectId } = parsed.data;
    const supabase = await createServerSupabaseServiceClient();

    // Delete assignment
    const { error } = await supabase
      .from('photo_subjects')
      .delete()
      .eq('photo_id', photoId)
      .eq('subject_id', subjectId);

    if (error) {
      SecurityLogger.logSecurityEvent(
        'photo_subject_unassignment_error',
        {
          requestId,
          userId,
          photoId,
          subjectId,
          error: error.message,
        },
        'error'
      );
      return NextResponse.json(
        { error: 'Failed to remove assignment', details: error.message },
        { status: 500 }
      );
    }

    SecurityLogger.logSecurityEvent(
      'photo_subject_unassigned',
      {
        requestId,
        userId,
        photoId,
        subjectId,
      },
      'info'
    );

    return NextResponse.json({
      success: true,
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'photo_unassignment_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = handlePOST;
export const DELETE = handleDELETE;