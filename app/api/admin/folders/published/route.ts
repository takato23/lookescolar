import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import {
  folderPublishService,
  FolderQuerySchema,
} from '@/lib/services/folder-publish.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Enhanced query parameters with performance optimizations
const queryParamsSchema = z.object({
  event_id: z.string().uuid().optional(),
  include_unpublished: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default('false'),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(parseInt(val, 10), 1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => Math.min(Math.max(parseInt(val, 10), 1), 50)), // Max 50 per page
  search: z
    .string()
    .optional()
    .transform((val) => val?.trim() || undefined),
  order_by: z
    .enum([
      'name_asc',
      'name_desc',
      'photos_desc',
      'photos_asc',
      'published_asc',
      'published_desc',
    ])
    .optional()
    .default('published_desc'),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const requestStart = Date.now();
  console.time('[API] /admin/folders/published');

  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      event_id: searchParams.get('event_id') || undefined,
      include_unpublished: searchParams.get('include_unpublished') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      search: searchParams.get('search') || undefined,
      order_by: searchParams.get('order_by') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    };

    // Parse URL params to appropriate types
    const parsedParams = queryParamsSchema.parse(rawParams);

    console.log('[API] Optimized paginated query:', {
      ...parsedParams,
      requestId: `req_${Date.now()}`,
    });

    // Use optimized database function for better performance
    const supabase = await createServerSupabaseServiceClient();

    // Try using the optimized function first
    let result;
    try {
      const { data: paginatedData, error: funcError } = await supabase.rpc(
        'get_folders_paginated',
        {
          p_event_id: parsedParams.event_id || null,
          p_include_unpublished: parsedParams.include_unpublished,
          p_search: parsedParams.search || null,
          p_page: parsedParams.page,
          p_limit: parsedParams.limit,
          p_order_by: parsedParams.order_by.replace(
            'published_desc',
            'published_at_desc'
          ),
        }
      );

      if (funcError) {
        console.warn('[API] Function fallback needed:', funcError.message);
        throw funcError;
      }

      // Transform paginated results
      const folders = paginatedData || [];
      const totalCount = folders.length > 0 ? folders[0].total_count : 0;
      const hasMore = parsedParams.page * parsedParams.limit < totalCount;

      result = {
        folders: folders.map((f) => ({
          id: f.id,
          name: f.name,
          event_id: f.event_id,
          photo_count: f.photo_count,
          photos_count: f.photo_count, // Compatibility alias
          is_published: f.is_published,
          share_token: f.share_token,
          published_at: f.published_at,
          family_url: f.family_url,
          qr_url: f.qr_url,
          event_name: f.event_name,
          event_date: f.event_date,
        })),
        pagination: {
          page: parsedParams.page,
          limit: parsedParams.limit,
          total: totalCount,
          total_pages: Math.ceil(totalCount / parsedParams.limit),
          has_more: hasMore,
          has_previous: parsedParams.page > 1,
        },
        // Legacy compatibility
        total: totalCount,
        page: parsedParams.page,
        limit: parsedParams.limit,
        has_more: hasMore,
      };
    } catch (funcError) {
      // Fallback: optimized direct query using folders table
      console.log('[API] Using fallback query with enhanced performance');

      let query = supabase.from('folders').select(
        `
          id,
          name,
          event_id,
          photo_count,
          created_at,
          events!inner(name, date)
        `,
        { count: 'exact' }
      );

      if (parsedParams.event_id) {
        query = query.eq('event_id', parsedParams.event_id);
      }

      if (!parsedParams.include_unpublished) {
        query = query.eq('is_published', true);
      }

      if (parsedParams.search) {
        // Use ILIKE for case-insensitive search
        query = query.ilike('name', `%${parsedParams.search}%`);
      }

      // Apply ordering
      const orderField = parsedParams.order_by.includes('name')
        ? 'name'
        : parsedParams.order_by.includes('photos')
          ? 'photo_count'
          : 'published_at';
      const ascending = parsedParams.order_by.includes('_asc');
      query = query.order(orderField, { ascending, nullsLast: !ascending });

      // Apply pagination
      const offset = (parsedParams.page - 1) * parsedParams.limit;
      query = query.range(offset, offset + parsedParams.limit - 1);

      const { data: folders, count, error: foldersError } = await query;

      if (foldersError) {
        throw new Error(`Database query failed: ${foldersError.message}`);
      }

      const totalCount = count || 0;
      const hasMore = parsedParams.page * parsedParams.limit < totalCount;

      result = {
        folders: (folders || []).map((f) => ({
          id: f.id,
          name: f.name,
          event_id: f.event_id,
          photo_count: f.photo_count || 0,
          photos_count: f.photo_count || 0, // Compatibility alias
          is_published: false, // Temporary: all folders not published until migration runs
          share_token: null, // Temporary: no sharing until migration runs
          published_at: null, // Temporary: no published date until migration runs
          family_url: null, // Temporary: no family URL until sharing is enabled
          qr_url: null, // Temporary: no QR until sharing is enabled
          event_name: f.events?.name || 'Unknown Event',
          event_date: f.events?.date || null,
        })),
        pagination: {
          page: parsedParams.page,
          limit: parsedParams.limit,
          total: totalCount,
          total_pages: Math.ceil(totalCount / parsedParams.limit),
          has_more: hasMore,
          has_previous: parsedParams.page > 1,
        },
        // Legacy compatibility
        total: totalCount,
        page: parsedParams.page,
        limit: parsedParams.limit,
        has_more: hasMore,
      };
    }

    // Performance logging
    const executionTime = Date.now() - requestStart;
    console.timeEnd('[API] /admin/folders/published');

    // Log performance metrics for monitoring
    if (executionTime > 500) {
      console.warn(`[PERF] Slow query detected: ${executionTime}ms`);
    } else if (executionTime < 200) {
      console.log(`[PERF] Fast query: ${executionTime}ms ✅`);
    }

    return NextResponse.json(result, {
      headers: {
        'X-Response-Time': `${executionTime}ms`,
        'X-Query-Type': 'optimized-paginated',
        'X-Page': parsedParams.page.toString(),
        'X-Total-Count': result.pagination?.total.toString() || '0',
        'Cache-Control': 'public, max-age=30', // 30s cache for published folders
      },
    });
  } catch (error) {
    const executionTime = Date.now() - requestStart;
    console.timeEnd('[API] /admin/folders/published');
    console.error('[API] Published folders error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      executionTime,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Export handler with admin authentication middleware
export const GET = withAdminAuth(handleGET);
