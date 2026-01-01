/**
 * Assets API - list assets by folder or event with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
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
    const buildPreviewProxyUrl = (path?: string | null) => {
      if (!path || typeof path !== 'string') return null;
      if (path.startsWith('http')) return path;
      const normalized = path.replace(/^\/+/, '').trim();
      if (!normalized) return null;
      if (!/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(normalized)) return null;
      if (
        normalized.includes('/') &&
        !/(^|\/)(previews|watermarks|watermarked|originals)\//i.test(normalized)
      ) {
        return null;
      }
      return `/admin/previews/${normalized}`;
    };

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

    // For the current UI, we need to support both new assets and legacy photos.
    const supabase = await createServerSupabaseServiceClient();

    const perSourceLimit = offset + limit; // ensure we can build the merged slice

    // --- Fetch from assets table ---
    let assetsSel = supabase
      .from('assets')
      .select(
        'id, filename, preview_path, file_size, created_at, folder_id, status',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(0, Math.max(perSourceLimit - 1, 0));
    if (queryParams.folder_id) assetsSel = assetsSel.eq('folder_id', queryParams.folder_id);
    if (queryParams.status) assetsSel = assetsSel.eq('status', queryParams.status);
    if (queryParams.q) assetsSel = assetsSel.ilike('filename', `%${queryParams.q}%`);
    if (typeof queryParams.min_size === 'number') assetsSel = assetsSel.gte('file_size', queryParams.min_size);
    if (typeof queryParams.max_size === 'number') assetsSel = assetsSel.lte('file_size', queryParams.max_size);
    if (queryParams.start_date) assetsSel = assetsSel.gte('created_at', queryParams.start_date);
    if (queryParams.end_date) assetsSel = assetsSel.lte('created_at', queryParams.end_date);
    const { data: assetsData, error: assetsError, count: assetsCount } = await assetsSel;

    if (assetsError) {
      return NextResponse.json(
        { success: false, error: 'Database query failed (assets)', requestId },
        { status: 500, headers: { 'X-Request-Id': requestId } }
      );
    }

    // --- Fetch from legacy photos table ---
    let photosSel = supabase
      .from('photos')
      .select(
        'id, original_filename, preview_path, file_size, created_at, folder_id',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(0, Math.max(perSourceLimit - 1, 0));
    if (queryParams.folder_id) {
      // Support legacy schemas where photos linked via subject_id instead of folder_id
      photosSel = photosSel.or(
        `folder_id.eq.${queryParams.folder_id},subject_id.eq.${queryParams.folder_id}`
      );
    }
    if (queryParams.q) photosSel = photosSel.ilike('original_filename', `%${queryParams.q}%`);
    if (typeof queryParams.min_size === 'number') photosSel = photosSel.gte('file_size', queryParams.min_size);
    if (typeof queryParams.max_size === 'number') photosSel = photosSel.lte('file_size', queryParams.max_size);
    if (queryParams.start_date) photosSel = photosSel.gte('created_at', queryParams.start_date);
    if (queryParams.end_date) photosSel = photosSel.lte('created_at', queryParams.end_date);
    const { data: photosData, error: photosError, count: photosCount } = await photosSel;

    if (photosError) {
      // do not fail entirely; return assets only
      // but still signal with header for debugging
      // We won't early-return; we’ll proceed with assets only
    }

    const rawAssets = (assetsData || []).map((a: any) => ({
      id: a.id,
      filename: a.filename || 'Untitled',
      preview_path: a.preview_path ?? null,
      file_size: a.file_size ?? 0,
      created_at: a.created_at,
      status: a.status || undefined,
    }));

    const rawPhotos = (photosData || []).map((p: any) => ({
      id: p.id,
      filename: p.original_filename || 'Untitled',
      preview_path: p.preview_path ?? null,
      file_size: p.file_size ?? 0,
      created_at: p.created_at,
      status: 'ready' as const,
    }));

    // Merge and paginate
    const merged = [...rawAssets, ...rawPhotos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const totalCount = (assetsCount || 0) + (photosCount || 0);
    const pageItems = merged.slice(offset, offset + limit);

    // For memory safety, only sign up to 24 previews per request
    const shouldSign = pageItems.length <= 24;
    const assets = await Promise.all(
      pageItems.map(async (a) => {
        let preview_url: string | null = null;
        if (shouldSign && a.preview_path) {
          try {
            const url = await signedUrlForKey(a.preview_path);
            if (typeof url === 'string' && url.length > 0) preview_url = url;
          } catch (_) {
            preview_url = null;
          }
        }
        const proxyPreview = preview_url ?? buildPreviewProxyUrl(a.preview_path);
        return { ...a, preview_url: proxyPreview };
      })
    );
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
