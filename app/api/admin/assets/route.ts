/**
 * Assets API - list assets by folder or event with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

// Request/response IDs for tracing
function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}
function generateErrorId(): string {
  return `err_${crypto.randomBytes(6).toString('hex')}`;
}

// Accept the parameters the client sends (folder-first), with safe defaults
const assetQuerySchema = z.object({
  folder_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  include_children: z.coerce.boolean().optional().default(false),
  // Client uses offset; support page for backward compatibility
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(['pending', 'processing', 'ready', 'error']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  min_size: z.coerce.number().min(0).optional(),
  max_size: z.coerce.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

async function handleGET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const url = new URL(request.url);

    // Parse/normalize query params
    let queryParams: z.infer<typeof assetQuerySchema>;
    try {
      queryParams = assetQuerySchema.parse({
        folder_id: url.searchParams.get('folder_id') || undefined,
        event_id: url.searchParams.get('event_id') || undefined,
        include_children: url.searchParams.get('include_children') || undefined,
        offset: url.searchParams.get('offset') || undefined,
        page: url.searchParams.get('page') || undefined,
        limit: url.searchParams.get('limit') || undefined,
        status: url.searchParams.get('status') || undefined,
        q: url.searchParams.get('q') || undefined,
        min_size: url.searchParams.get('min_size') || undefined,
        max_size: url.searchParams.get('max_size') || undefined,
        start_date: url.searchParams.get('start_date') || undefined,
        end_date: url.searchParams.get('end_date') || undefined,
      });
    } catch (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details:
            validationError instanceof z.ZodError
              ? validationError.issues.map((issue) => ({
                  path: issue.path.join('.'),
                  message: issue.message,
                  received: (issue as any).received,
                }))
              : [{ message: 'Validation failed' }],
          requestId,
        },
        { status: 400, headers: { 'X-Request-Id': requestId } }
      );
    }

    // At least one filter should be present; the UI passes folder_id.
    if (!queryParams.folder_id && !queryParams.event_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either folder_id or event_id is required',
          requestId,
        },
        { status: 400, headers: { 'X-Request-Id': requestId } }
      );
    }

    // Compute effective offset if page provided
    const limit = queryParams.limit;
    const offset = queryParams.page
      ? (queryParams.page - 1) * limit
      : queryParams.offset;

    // For the current UI, we only need folder-scoped queries. If only event_id is provided
    // (no folder selected), PhotoAdmin uses a different endpoint. We keep basic support here.
    const supabase = await createServerSupabaseServiceClient();

    // Base select with count for total
    let sel = supabase
      .from('assets')
      .select(
        'id, filename, preview_path, file_size, created_at, folder_id, status',
        {
          count: 'exact',
        }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filters
    if (queryParams.folder_id) sel = sel.eq('folder_id', queryParams.folder_id);
    // include_children is ignored in this minimal implementation; server may add recursive support later

    if (queryParams.status) sel = sel.eq('status', queryParams.status);
    if (queryParams.q) sel = sel.ilike('filename', `%${queryParams.q}%`);
    if (typeof queryParams.min_size === 'number')
      sel = sel.gte('file_size', queryParams.min_size);
    if (typeof queryParams.max_size === 'number')
      sel = sel.lte('file_size', queryParams.max_size);
    if (queryParams.start_date)
      sel = sel.gte('created_at', queryParams.start_date);
    if (queryParams.end_date) sel = sel.lte('created_at', queryParams.end_date);

    const { data, error, count } = await sel;

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Database query failed', requestId },
        { status: 500, headers: { 'X-Request-Id': requestId } }
      );
    }

    const assets = (data || []).map((a: any) => ({
      id: a.id,
      filename: a.filename || 'Untitled',
      preview_path: a.preview_path ?? null,
      file_size: a.file_size ?? 0,
      created_at: a.created_at,
      status: a.status || undefined,
    }));

    const totalCount = count || 0;
    const hasMore = offset + assets.length < totalCount;

    return NextResponse.json(
      {
        success: true,
        assets,
        count: totalCount,
        hasMore,
        totalCount,
        pagination: {
          limit,
          offset,
          hasMore,
        },
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (err) {
    const errorId = generateErrorId();
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorId },
      { status: 500 }
    );
  }
}

export const GET = handleGET;
