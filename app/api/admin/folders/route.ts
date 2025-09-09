/**
 * Ultra-Optimized Folders API - Minimal Egress Usage
 * GET: List folders with cached counts
 * POST: Create folder with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import {
  createServerSupabaseServiceClient,
  createServerSupabaseClient,
} from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Use server service client per-request (avoids module-scope env issues)

// Validation schemas - minimal data
const folderQuerySchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(50), // NEVER exceed 50
  offset: z.coerce.number().min(0).default(0),
  include_global: z.coerce.boolean().default(false),
  scopes: z.string().optional(), // comma-separated list: event,global,legacy,template
});

const createFolderSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name required')
    .max(100, 'Name too long')
    // Allow Unicode letters/numbers, spaces, dash, underscore, dot
    .regex(/^[\p{L}\p{N}\s\-_\.]+$/u, 'Invalid characters')
    .transform((s) => s.trim()),
  parent_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
});

// Types for minimal data transfer
interface FolderListItem {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  photo_count: number;
  has_children: boolean;
  // Extended metadata (non-breaking additions)
  event_id?: string | null;
  child_folder_count?: number;
  scope?: 'event' | 'global' | 'legacy' | 'template';
}

interface CreateFolderResponse {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  photo_count: number;
}

/**
 * GET /api/admin/folders
 * List folders with fallback database queries
 */
async function handleGET(request: NextRequest) {
  try {
    // Validate environment variables
    // Soft-check env: allow anon fallback if service key is missing in dev
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error('Missing NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      );
    }

    // Rate limiting applied by wrapper below

    // Parse query params with validation
    const url = new URL(request.url);
    let queryParams;
    try {
      // Ensure nulls are not passed to Zod; use undefined to allow defaults/optional
      const parent_id_raw = url.searchParams.get('parent_id');
      const parent_id =
        parent_id_raw === 'null' ? null : parent_id_raw || undefined;
      const event_id = url.searchParams.get('event_id') || undefined;
      const limit = url.searchParams.get('limit') ?? undefined;
      const offset = url.searchParams.get('offset') ?? undefined;
      const include_global =
        url.searchParams.get('include_global') ?? undefined;
      const scopes = url.searchParams.get('scopes') ?? undefined;

      queryParams = folderQuerySchema.parse({
        parent_id,
        event_id,
        limit,
        offset,
        include_global,
        scopes,
      });
    } catch (validationError) {
      logger.warn('Invalid query parameters', { error: validationError });
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    // Direct table query (stable, avoids optional RPC)
    let folders: any[] | undefined, error: any;
    let usingLegacy = false;
    let supabaseClient = await createServerSupabaseServiceClient();

    // Parse scopes
    const scopes = queryParams.scopes
      ? queryParams.scopes.split(',').map((s) => s.trim().toLowerCase())
      : undefined;

    // Helper to fetch from folders with filters (no clone, build queries explicitly)
    const fetchFromFolders = async (filter: {
      event_id?: string;
      include_global?: boolean;
    }) => {
      const results: any[] = [];

      const applyCommonFilters = (q: any) => {
        if (queryParams.parent_id !== undefined) {
          if (queryParams.parent_id === null) q.is('parent_id', null);
          else q.eq('parent_id', queryParams.parent_id);
        } else if (!filter.event_id) {
          // root only when no event filter
          q.is('parent_id', null);
        }
        // Order by name to be compatible with schemas missing created_at
        return q.order('name', { ascending: true });
      };

      if (filter.event_id) {
        let q = supabaseClient
          .from('folders')
          .select('id, name, parent_id, depth, event_id')
          .eq('event_id', filter.event_id);
        q = applyCommonFilters(q);
        let r = await q;
        // Retry without event_id column if undefined_column
        if (r.error && r.error.code === '42703') {
          // If the column does not exist, folders table cannot be event-scoped; skip this branch
          r = { data: [], error: null } as any;
        }
        if (r.error) return { data: undefined, error: r.error };
        results.push(...(r.data || []));
      }

      if (!filter.event_id || filter.include_global) {
        let qg = supabaseClient
          .from('folders')
          .select('id, name, parent_id, depth, event_id')
          .is('event_id', null);
        qg = applyCommonFilters(qg);
        let rg = await qg;
        if (rg.error && rg.error.code === '42703') {
          // Re-run without referencing event_id at all
          let qg2 = supabaseClient
            .from('folders')
            .select('id, name, parent_id, depth');
          qg2 = applyCommonFilters(qg2);
          rg = await qg2;
        }
        if (rg.error) return { data: undefined, error: rg.error };
        results.push(...(rg.data || []));
      }

      return { data: results, error: null };
    };

    // Try folders table first (with optional include_global)
    const resFolders = await fetchFromFolders({
      event_id: queryParams.event_id,
      include_global: queryParams.include_global,
    });
    folders = resFolders.data;
    error = resFolders.error;

    // If folders table doesn't exist, fall back to subjects as folders
    if (error && error.code === '42P01') {
      logger.warn('folders table missing, using subjects as folders');
      const subjectsQuery = supabaseAdmin
        .from('subjects')
        .select('id, name, created_at, event_id')
        .limit(queryParams.limit)
        .range(queryParams.offset, queryParams.offset + queryParams.limit - 1);

      if (queryParams.event_id) {
        subjectsQuery.eq('event_id', queryParams.event_id);
      }

      const subjectsResult = await subjectsQuery.order('created_at', {
        ascending: true,
      });

      if (subjectsResult.data) {
        // Transform subjects to folder format
        folders = subjectsResult.data.map((subject) => ({
          id: subject.id,
          name: subject.name,
          parent_id: null,
          created_at: subject.created_at,
          photo_count: 0, // Will be calculated later
          depth: 0,
          has_children: false,
          event_id: subject.event_id,
        }));
        error = null;
        usingLegacy = true;
      } else {
        error = subjectsResult.error;
      }
    }

    // If initial attempt failed due to auth/key issues, retry with anon SSR client
    if (error && (!('code' in error) || ['401', '403'].includes((error as any).code))) {
      try {
        supabaseClient = await createServerSupabaseClient();
        const retry = await fetchFromFolders({
          event_id: queryParams.event_id,
          include_global: queryParams.include_global,
        });
        folders = retry.data;
        error = retry.error;
      } catch (e) {
        // keep original error handling below
      }
    }

    if (error) {
      logger.error('Database query failed', {
        error: error.message,
        code: error.code,
      });

      // Fallback: legacy schema 'event_folders'
      if (error.code === '42P01') {
        logger.warn('folders table missing, attempting legacy event_folders');
        const sb2 = await createServerSupabaseServiceClient();
        const legacyQuery = sb2
          .from('event_folders')
          .select('id, name, parent_id, depth, created_at')
          .limit(queryParams.limit)
          .range(
            queryParams.offset,
            queryParams.offset + queryParams.limit - 1
          );
        if (queryParams.parent_id !== undefined) {
          if (queryParams.parent_id === null) legacyQuery.is('parent_id', null);
          else legacyQuery.eq('parent_id', queryParams.parent_id);
        } else {
          if (!queryParams.event_id) legacyQuery.is('parent_id', null);
        }
        if (queryParams.event_id)
          legacyQuery.eq('event_id', queryParams.event_id);
        const legacyResult = await legacyQuery.order('created_at', {
          ascending: true,
        });
        if (legacyResult.error) {
          logger.error('Legacy query failed', {
            error: legacyResult.error.message,
            code: legacyResult.error.code,
          });
          return NextResponse.json(
            { success: false, error: 'Database table not found' },
            { status: 404 }
          );
        }
        folders = legacyResult.data;
        usingLegacy = true;
      } else if (error.code === '42501') {
        return NextResponse.json(
          { success: false, error: 'Database access denied' },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: 'Database query failed', code: error.code },
          { status: 500 }
        );
      }
    }

    // Get total count efficiently (with error handling)
    let count = 0;
    try {
      const sbCount = await createServerSupabaseServiceClient();
      if (usingLegacy) {
        // legacy table count
        let countQuery = sbCount
          .from('event_folders')
          .select('id', { count: 'exact', head: true });
        if (queryParams.event_id)
          countQuery = countQuery.eq('event_id', queryParams.event_id);
        if (queryParams.parent_id !== undefined) {
          if (queryParams.parent_id === null) {
            const { count: total } = await countQuery.is('parent_id', null);
            count = total || 0;
          } else {
            const { count: total } = await countQuery.eq(
              'parent_id',
              queryParams.parent_id
            );
            count = total || 0;
          }
        } else {
          const { count: total } = await countQuery.is('parent_id', null);
          count = total || 0;
        }
      } else {
        // folders table, possibly include global
        const sb = await createServerSupabaseServiceClient();
        const base = sb
          .from('folders')
          .select('id', { count: 'exact', head: true });
        const countFor = async (eventId: string | null) => {
          let q = base;
          q =
            eventId === null
              ? q.is('event_id', null)
              : q.eq('event_id', eventId);
          if (queryParams.parent_id !== undefined) {
            q =
              queryParams.parent_id === null
                ? q.is('parent_id', null)
                : q.eq('parent_id', queryParams.parent_id);
          } else {
            q = q.is('parent_id', null);
          }
          const { count: c } = await q;
          return c || 0;
        };
        if (queryParams.event_id) {
          count = await countFor(queryParams.event_id);
          if (queryParams.include_global) count += await countFor(null);
        } else {
          count = await countFor(null);
        }
      }
    } catch (countErr) {
      logger.warn('Failed to get folder count', { error: countErr });
    }

    // Transform to minimal interface with safe defaults and calculate photo counts (batched)
    const folderRows = (folders || []) as Array<{
      id: string;
      name: string;
      parent_id: string | null;
      depth?: number;
      event_id?: string | null;
      has_children?: boolean;
    }>;

    const folderIds = folderRows.map((f) => f.id);

    // Calculate actual photo counts from assets table
    const countsMap: Record<string, number> = {};
    
    if (folderIds.length > 0) {
      try {
        const sb = await createServerSupabaseServiceClient();
        const { data: assetCounts, error: countsError } = await sb
          .from('assets')
          .select('folder_id')
          .in('folder_id', folderIds)
          .eq('status', 'ready'); // Only count ready assets
        
        if (!countsError && assetCounts) {
          // Count assets per folder
          const countsByFolder: Record<string, number> = {};
          assetCounts.forEach(asset => {
            if (asset.folder_id) {
              countsByFolder[asset.folder_id] = (countsByFolder[asset.folder_id] || 0) + 1;
            }
          });
          
          // Set counts for all folders (0 if no assets)
          for (const f of folderRows) {
            countsMap[f.id] = countsByFolder[f.id] || 0;
          }
        } else {
          // Fallback to cached counts if assets query fails
          for (const f of folderRows) {
            const cached = (f as any).photo_count;
            countsMap[f.id] = typeof cached === 'number' ? cached : 0;
          }
        }
      } catch (error) {
        logger.warn('Failed to get asset counts, using cached', { error });
        // Fallback to cached counts
        for (const f of folderRows) {
          const cached = (f as any).photo_count;
          countsMap[f.id] = typeof cached === 'number' ? cached : 0;
        }
      }
    } else {
      // No folders, set all to 0
      for (const f of folderRows) {
        countsMap[f.id] = 0;
      }
    }

    // Child folder counts to compute has_children
    const childCountMap: Record<string, number> = {};
    for (const folderId of folderIds) {
      try {
        const sb = await createServerSupabaseServiceClient();
        const { count } = await sb
          .from('folders')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', folderId);
        childCountMap[folderId] = count || 0;
      } catch {}
    }

    // Build list, optionally filter by scopes
    let folderList: FolderListItem[] = folderRows.map((folder) => {
      const isLegacy = usingLegacy;
      const scope: 'event' | 'global' | 'legacy' | 'template' = isLegacy
        ? 'legacy'
        : folder.event_id
          ? 'event'
          : 'global';
      const childCount = childCountMap[folder.id] || 0;
      return {
        id: folder.id,
        name: folder.name || 'Untitled Folder',
        parent_id: folder.parent_id,
        depth: folder.depth || 0,
        photo_count: countsMap[folder.id] || 0,
        has_children: childCount > 0,
        event_id: folder.event_id ?? undefined,
        child_folder_count: childCount,
        scope,
      };
    });

    if (scopes && scopes.length > 0) {
      const scopeSet = new Set(scopes as string[]);
      folderList = folderList.filter((f) => f.scope && scopeSet.has(f.scope));
    }

    // Apply pagination after merge (to respect include_global)
    const start = queryParams.offset;
    const end = start + queryParams.limit;
    folderList = folderList.slice(start, end);

    logger.info('Folders fetched successfully', {
      count: folderList.length,
      totalBytes: JSON.stringify(folderList).length,
    });

    return NextResponse.json({
      success: true,
      folders: folderList,
      count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Folders API error', { error: message });
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' ? message : undefined,
      },
      { status: 500 }
    );
  }
}

export const GET = RateLimitMiddleware.withRateLimit(withAuth(handleGET));

/**
 * POST /api/admin/folders
 * Create folder with validation and minimal response
 */
async function handlePOST(request: NextRequest) {
  try {
    // Rate limiting applied by wrapper below

    // Parse and validate request body (normalize root values)
    const raw = await request.json();
    const normalized = {
      ...raw,
      parent_id:
        raw?.parent_id === 'root' || raw?.parent_id === ''
          ? null
          : raw?.parent_id,
      event_id: raw?.event_id === '' ? null : raw?.event_id,
    };
    const folderData = createFolderSchema.parse(normalized);

    // Check if parent exists (if specified)
    if (folderData.parent_id) {
      const supabaseAdmin = await createServerSupabaseServiceClient();
      const { data: parent } = await supabaseAdmin
        .from('folders')
        .select('id, depth')
        .eq('id', folderData.parent_id)
        .single();

      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent folder not found' },
          { status: 404 }
        );
      }

      if (parent.depth >= 10) {
        return NextResponse.json(
          { success: false, error: 'Maximum folder depth exceeded' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate name in same parent
    const supabaseAdmin = await createServerSupabaseServiceClient();
    const { data: existing } = await supabaseAdmin
      .from('folders')
      .select('id')
      .eq('name', folderData.name)
      .eq('parent_id', folderData.parent_id || null)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Folder name already exists in this location',
        },
        { status: 409 }
      );
    }

    // Create folder with minimal data return
    const { data: folder, error } = await (
      await createServerSupabaseServiceClient()
    )
      .from('folders')
      .insert({
        name: folderData.name,
        parent_id: folderData.parent_id || null,
        event_id: folderData.event_id ?? null,
      })
      .select('id, name, parent_id, depth')
      .single();

    if (error) {
      logger.error('Failed to create folder', {
        error: error.message,
        folder: folderData,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to create folder' },
        { status: 500 }
      );
    }

    const response: CreateFolderResponse = {
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      depth: folder.depth ?? 0,
      photo_count: 0,
    };

    logger.info('Folder created successfully', {
      folderId: folder.id,
      name: folder.name,
    });

    return NextResponse.json(
      {
        success: true,
        folder: response,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid folder data', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Invalid folder data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Create folder API error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = RateLimitMiddleware.withRateLimit(withAuth(handlePOST));

// Apply auth middleware to all methods
export const runtime = 'nodejs';
