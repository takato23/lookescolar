import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import type { RouteContext } from '@/types/next-route';

// Schema for route parameters
const RouteParamsSchema = z.object({
  id: z.string().uuid('Invalid student ID format'),
});

/**
 * GET /api/admin/students/[id]
 * Retrieves student details by ID with associated event information
 */
export const GET = withAuth(async function (
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const params = await context.params;
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Validate route parameters
    const { id: studentId } = RouteParamsSchema.parse(params);

    logger.info('Student lookup request received', {
      requestId,
      studentId: `stu_${studentId.substring(0, 8)}***`,
    });

    // Initialize Supabase client with service role
    const supabase = await createServerSupabaseServiceClient();

    // Fetch student with event details and photo count
    const { data: student, error: studentError } = await supabase
      .from('subjects')
      .select(
        `
        id,
        name,
        grade,
        token,
        event_id,
        token_expires_at,
        created_at,
        updated_at,
        events (
          id,
          name,
          school_name,
          event_date,
          active,
          base_price,
          created_at
        )
      `
      )
      .eq('id', studentId)
      .single();

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        logger.warn('Student not found', {
          requestId,
          studentId: `stu_${studentId.substring(0, 8)}***`,
          error: studentError.message,
        });

        return NextResponse.json(
          {
            error: 'Student not found',
            message: 'No student found with the provided ID',
          },
          { status: 404 }
        );
      }

      logger.error('Error fetching student', {
        requestId,
        studentId: `stu_${studentId.substring(0, 8)}***`,
        error: studentError.message,
      });

      return NextResponse.json(
        {
          error: 'Failed to fetch student',
          details: studentError.message,
        },
        { status: 500 }
      );
    }

    // Get photo statistics for this student
    const { count: totalPhotoCount, error: totalCountError } = await supabase
      .from('photo_subjects')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', studentId);

    if (totalCountError) {
      logger.error('Error getting total photo count', {
        requestId,
        studentId: `stu_${studentId.substring(0, 8)}***`,
        error: totalCountError.message,
      });
    }

    // Get photo count by approval status
    const { data: photoBreakdown, error: breakdownError } = await supabase
      .from('photo_subjects')
      .select(
        `
        photo_id,
        photos!inner (
          id,
          approved
        )
      `
      )
      .eq('subject_id', studentId);

    if (breakdownError) {
      logger.error('Error getting photo breakdown', {
        requestId,
        studentId: `stu_${studentId.substring(0, 8)}***`,
        error: breakdownError.message,
      });
    }

    const approvedPhotos =
      photoBreakdown?.filter((p) => p.photos?.approved).length || 0;
    const pendingPhotos =
      photoBreakdown?.filter((p) => !p.photos?.approved).length || 0;

    // Get recent photo assignments (last 5)
    const { data: recentPhotos, error: recentPhotosError } = await supabase
      .from('photo_subjects')
      .select(
        `
        tagged_at,
        tagged_by,
        photos (
          id,
          filename,
          approved,
          created_at
        )
      `
      )
      .eq('subject_id', studentId)
      .order('tagged_at', { ascending: false })
      .limit(5);

    if (recentPhotosError) {
      logger.error('Error getting recent photos', {
        requestId,
        studentId: `stu_${studentId.substring(0, 8)}***`,
        error: recentPhotosError.message,
      });
    }

    // Check token status
    const tokenExpiresAt = student.token_expires_at
      ? new Date(student.token_expires_at)
      : null;
    const now = new Date();
    const tokenStatus = tokenExpiresAt
      ? tokenExpiresAt > now
        ? 'valid'
        : 'expired'
      : 'no_expiry';

    // Get order statistics for this student
    const { count: orderCount, error: orderCountError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', studentId);

    if (orderCountError) {
      logger.error('Error getting order count', {
        requestId,
        studentId: `stu_${studentId.substring(0, 8)}***`,
        error: orderCountError.message,
      });
    }

    const duration = Date.now() - startTime;

    logger.info('Student lookup successful', {
      requestId,
      studentId: `stu_${studentId.substring(0, 8)}***`,
      eventId: student.event_id,
      photoCount: totalPhotoCount || 0,
      approvedPhotos,
      orderCount: orderCount || 0,
      tokenStatus,
      duration,
    });

    // Prepare response data
    const response = {
      success: true,
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        token: `tok_${student.token.substring(0, 3)}***`, // Masked for security
        event_id: student.event_id,
        token_expires_at: student.token_expires_at,
        created_at: student.created_at,
        updated_at: student.updated_at,

        // Event information
        event: student.events
          ? {
              id: student.events.id,
              name: student.events.name,
              school_name: student.events.school_name,
              event_date: student.events.event_date,
              active: student.events.active,
              base_price: student.events.base_price,
              created_at: student.events.created_at,
            }
          : null,

        // Photo statistics
        photo_stats: {
          total_assigned: totalPhotoCount || 0,
          approved: approvedPhotos,
          pending_approval: pendingPhotos,
          last_tagged_at: recentPhotos?.[0]?.tagged_at || null,
        },

        // Order statistics
        order_stats: {
          total_orders: orderCount || 0,
        },

        // Token information
        token_info: {
          status: tokenStatus,
          expires_at: student.token_expires_at,
          days_until_expiry: tokenExpiresAt
            ? Math.ceil(
                (tokenExpiresAt.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
        },

        // Recent activity
        recent_photos:
          recentPhotos?.map((rp) => ({
            id: rp.photos?.id,
            filename: rp.photos?.filename,
            approved: rp.photos?.approved,
            created_at: rp.photos?.created_at,
            tagged_at: rp.tagged_at,
            tagged_by: rp.tagged_by,
          })) || [],
      },

      // Metadata
      metadata: {
        lookup_time_ms: duration,
        request_id: requestId,
        data_freshness: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.warn('Invalid student ID format', {
        requestId,
        errors: error.errors,
        duration,
      });

      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Student ID must be a valid UUID',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('Error in student lookup', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve student information',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
});

// Rate limiting configuration
export const runtime = 'nodejs';
