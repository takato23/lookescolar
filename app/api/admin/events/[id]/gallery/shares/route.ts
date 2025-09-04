import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateShareSchema = z.object({
  level_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  expires_in_days: z.number().min(1).max(365).default(7),
  max_views: z.number().min(1).max(10000).optional(),
  allow_download: z.boolean().default(true),
  allow_share: z.boolean().default(true),
  custom_message: z.string().optional(),
});

// POST /api/admin/events/[id]/gallery/shares
export const POST = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: eventId } = await params;
      const body = await req.json();
      const userId = req.headers.get('x-user-id');

      // Validate input
      const validatedData = CreateShareSchema.parse(body);
      const {
        level_id,
        course_id,
        student_id,
        expires_in_days,
        max_views,
        allow_download,
        allow_share,
        custom_message,
      } = validatedData;

      const supabase = await createServerSupabaseServiceClient();

      // Create gallery share
      const { data, error } = await supabase.rpc('create_gallery_share', {
        p_event_id: eventId,
        p_level_id: level_id,
        p_course_id: course_id,
        p_student_id: student_id,
        p_expires_in_days: expires_in_days,
        p_max_views: max_views,
        p_allow_download: allow_download,
        p_allow_share: allow_share,
        p_custom_message: custom_message,
        p_created_by: userId,
      });

      if (error) {
        console.error('Error creating gallery share:', error);
        return NextResponse.json(
          { error: 'Failed to create gallery share', details: error.message },
          { status: 500 }
        );
      }

      // Generate share URL
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const shareUrl = `${siteUrl}/store-unified/${data.token}`;

      return NextResponse.json({
        success: true,
        message: 'Gallery share created successfully',
        share: {
          ...data,
          share_url: shareUrl,
        },
      });
    } catch (error) {
      console.error(
        'Error in POST /api/admin/events/[id]/gallery/shares:',
        error
      );

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

const ListSharesSchema = z.object({
  level_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(100).default(20),
});

// GET /api/admin/events/[id]/gallery/shares
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: eventId } = await params;
      const { searchParams } = new URL(req.url);

      // Parse and validate query parameters
      const queryResult = ListSharesSchema.safeParse({
        level_id: searchParams.get('level_id') || undefined,
        course_id: searchParams.get('course_id') || undefined,
        student_id: searchParams.get('student_id') || undefined,
        page: parseInt(searchParams.get('page') || '0'),
        limit: parseInt(searchParams.get('limit') || '20'),
      });

      if (!queryResult.success) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: queryResult.error.errors,
          },
          { status: 400 }
        );
      }

      const { level_id, course_id, student_id, page, limit } = queryResult.data;
      const offset = page * limit;

      const supabase = await createServerSupabaseServiceClient();

      // Build query for gallery shares
      let shareQuery = supabase
        .from('gallery_shares')
        .select(
          'id, event_id, level_id, course_id, student_id, token, expires_at, max_views, view_count, allow_download, allow_share, custom_message, created_by, created_at, updated_at',
          { count: 'exact' }
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      // Apply filters based on hierarchy level
      if (student_id) {
        shareQuery = shareQuery.eq('student_id', student_id);
      } else if (course_id) {
        shareQuery = shareQuery.eq('course_id', course_id);
      } else if (level_id) {
        shareQuery = shareQuery.eq('level_id', level_id);
      }

      // Apply pagination
      shareQuery = shareQuery.range(offset, offset + limit - 1);

      const { data: shares, error, count } = await shareQuery;

      if (error) {
        // Graceful fallback when migration/table is not present yet
        const msg = (error as any)?.message || '';
        const relationMissing =
          typeof msg === 'string' && msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist');
        if (relationMissing) {
          console.warn('[GalleryShares] Table missing, returning empty list for compatibility');
          return NextResponse.json({
            success: true,
            shares: [],
            pagination: { page, limit, total: 0, has_more: false },
          });
        }

        console.error('Error fetching gallery shares:', error);
        return NextResponse.json(
          { error: 'Failed to fetch gallery shares', details: msg },
          { status: 500 }
        );
      }

      // Process shares for response
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const processedShares = (shares || []).map((share) => ({
        ...share,
        share_url: `${siteUrl}/store-unified/${share.token}`,
        is_expired: share.expires_at ? new Date(share.expires_at) < new Date() : false,
        views_remaining: share.max_views != null ? Math.max(0, share.max_views - (share.view_count || 0)) : null,
      }));

      return NextResponse.json({
        success: true,
        shares: processedShares,
        pagination: {
          page,
          limit,
          total: count || processedShares.length,
          has_more: (count || 0) > (page + 1) * limit,
        },
      });
    } catch (error) {
      console.error(
        'Error in GET /api/admin/events/[id]/gallery/shares:',
        error
      );

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
