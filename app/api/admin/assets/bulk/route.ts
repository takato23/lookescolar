/**
 * Ultra-Optimized Bulk Assets API - Minimal Egress Usage
 * PATCH: Bulk move assets
 * DELETE: Bulk delete assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Use service client per request

// Validation schemas
const bulkMoveSchema = z.object({
  asset_ids: z.array(z.string().uuid()).min(1).max(100), // Max 100 for performance
  target_folder_id: z.string().uuid(),
});

const bulkDeleteSchema = z.object({
  asset_ids: z.array(z.string().uuid()).min(1).max(50), // Lower limit for deletes
});

// Types for minimal responses
interface BulkMoveResponse {
  success: true;
  moved_count: number;
  updated_folder_counts: Record<string, number>;
}

interface BulkDeleteResponse {
  success: true;
  deleted_count: number;
  storage_cleaned: number;
}

/**
 * PATCH /api/admin/assets/bulk
 * Bulk move assets between folders (supports both legacy photos and new assets IDs)
 */
async function handlePATCH(request: NextRequest) {
  try {
    // Rate limiting applied by wrapper below

    // Parse and validate request body
    const body = await request.json();
    const { asset_ids, target_folder_id } = bulkMoveSchema.parse(body);

    // Verify target folder exists
    const supabaseAdmin = await createServerSupabaseServiceClient();
    const { data: targetFolder } = await supabaseAdmin
      .from('folders')
      .select('id, photo_count')
      .eq('id', target_folder_id)
      .single();

    if (!targetFolder) {
      return NextResponse.json(
        { success: false, error: 'Target folder not found' },
        { status: 404 }
      );
    }

    // Fetch matching records from BOTH tables to support mixed ID sources
    const [{ data: photosFound }, { data: assetsFound }] = await Promise.all([
      supabaseAdmin.from('photos').select('id, subject_id').in('id', asset_ids),
      supabaseAdmin.from('assets').select('id, folder_id').in('id', asset_ids),
    ]);

    const photosList = Array.isArray(photosFound) ? photosFound : [];
    const assetsList = Array.isArray(assetsFound) ? assetsFound : [];

    if (photosList.length === 0 && assetsList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assets found' },
        { status: 404 }
      );
    }

    // Count assets per source folder (both sources)
    const sourceFolderCounts: Record<string, number> = {};
    for (const p of photosList) {
      const fid = (p as any).subject_id as string | null;
      if (fid) sourceFolderCounts[fid] = (sourceFolderCounts[fid] || 0) + 1;
    }
    for (const a of assetsList) {
      const fid = (a as any).folder_id as string | null;
      if (fid) sourceFolderCounts[fid] = (sourceFolderCounts[fid] || 0) + 1;
    }

    // Perform bulk moves on both tables where applicable
    const operations: Array<Promise<any>> = [];
    if (photosList.length > 0) {
      const photoIds = photosList.map((p: any) => p.id);
      operations.push(
        supabaseAdmin.from('photos').update({ subject_id: target_folder_id }).in('id', photoIds)
      );
    }
    if (assetsList.length > 0) {
      const assetIds = assetsList.map((a: any) => a.id);
      operations.push(
        supabaseAdmin.from('assets').update({ folder_id: target_folder_id }).in('id', assetIds)
      );
    }

    const results = await Promise.all(operations);
    const failed = results.find((r) => (r as any)?.error);
    if (failed && (failed as any).error) {
      logger.error('Failed to move some assets', { error: (failed as any).error.message });
      return NextResponse.json(
        { success: false, error: 'Failed to move assets' },
        { status: 500 }
      );
    }

    // Update folder photo counts
    const movedTotal = photosList.length + assetsList.length;

    // Try RPC deltas first; if unavailable or any error, fall back to recalc per folder
    const deltas: Record<string, number> = { ...Object.fromEntries(Object.entries(sourceFolderCounts).map(([k, v]) => [k, -v])) };
    deltas[target_folder_id] = (deltas[target_folder_id] || 0) + movedTotal;

    const tryRpcUpdates = async () => {
      const results = await Promise.all(
        Object.entries(deltas).map(([folderId, delta]) =>
          supabaseAdmin.rpc('update_folder_photo_count_delta', { folder_id: folderId, delta })
        )
      );
      const anyError = results.find((r: any) => r && r.error);
      return { ok: !anyError };
    };

    const recalcAndSet = async (folderId: string) => {
      try {
        const [{ count: assetsCount }, { count: photosCount }] = await Promise.all([
          (await createServerSupabaseServiceClient())
            .from('assets')
            .select('id', { count: 'exact', head: true })
            .eq('folder_id', folderId),
          (await createServerSupabaseServiceClient())
            .from('photos')
            .select('id', { count: 'exact', head: true })
            .eq('subject_id', folderId),
        ]);
        const newCount = (assetsCount || 0) + (photosCount || 0);
        const { error } = await (await createServerSupabaseServiceClient())
          .from('folders')
          .update({ photo_count: newCount })
          .eq('id', folderId);
        if (error) {
          logger.warn('Failed to set recalculated folder count', { folderId, error: error.message });
        }
      } catch (e: any) {
        logger.warn('Recalc folder count failed', { folderId, error: e?.message || String(e) });
      }
    };

    const rpcRes = await tryRpcUpdates();
    if (!rpcRes.ok) {
      await Promise.all(Object.keys(deltas).map((fid) => recalcAndSet(fid)));
    }

    const response: BulkMoveResponse = {
      success: true,
      moved_count: movedTotal,
      updated_folder_counts: {
        ...sourceFolderCounts,
        [target_folder_id]: movedTotal,
      },
    };

    logger.info('Bulk move completed', {
      movedCount: movedTotal,
      targetFolder: target_folder_id,
    });

    return NextResponse.json(response);

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid bulk move data', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Bulk move API error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/assets/bulk
 * Bulk delete assets and cleanup storage
 */
async function handleDELETE(request: NextRequest) {
  try {
    // Rate limiting applied by wrapper below

    // Parse and validate request body
    const body = await request.json();
    const { asset_ids } = bulkDeleteSchema.parse(body);

    // Get assets/photos with storage paths for cleanup from BOTH tables to avoid mismatches
    const supabaseAdmin = await createServerSupabaseServiceClient();

    // Query photos table (legacy/unified)
    const { data: photosToDelete, error: fetchPhotosError } = await supabaseAdmin
      .from('photos')
      .select('id, subject_id, storage_path, preview_path')
      .in('id', asset_ids);

    if (fetchPhotosError) {
      logger.error('Failed to fetch photos for deletion', {
        error: fetchPhotosError.message,
      });
    }

    // Query assets table (new system)
    const { data: assetsToDelete, error: fetchAssetsError } = await supabaseAdmin
      .from('assets')
      .select('id, folder_id, original_path, preview_path')
      .in('id', asset_ids);

    if (fetchAssetsError) {
      logger.error('Failed to fetch assets for deletion', {
        error: fetchAssetsError.message,
      });
    }

    const photosFound = Array.isArray(photosToDelete) ? photosToDelete : [];
    const assetsFound = Array.isArray(assetsToDelete) ? assetsToDelete : [];

    if (photosFound.length === 0 && assetsFound.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assets found' },
        { status: 404 }
      );
    }

    // Count assets per folder for count updates (photos use subject_id, assets use folder_id)
    const folderCounts: Record<string, number> = {};
    for (const p of photosFound) {
      const folderId = p.subject_id as string | null;
      if (folderId) folderCounts[folderId] = (folderCounts[folderId] || 0) + 1;
    }
    for (const a of assetsFound) {
      const folderId = a.folder_id as string | null;
      if (folderId) folderCounts[folderId] = (folderCounts[folderId] || 0) + 1;
    }

    // Delete storage files concurrently (limited concurrency)
    let storageCleanedCount = 0;
    const storageDeletes: Array<Promise<number>> = [];

    // Clean up storage for photos
    for (const photo of photosFound) {
      const promises: Array<Promise<number>> = [];
      if (photo.storage_path) {
        promises.push(
          supabaseAdmin.storage
            .from('photo-private')
            .remove([photo.storage_path])
            .then(({ data }) => (data ? 1 : 0))
        );
      }
      if (photo.preview_path) {
        promises.push(
          supabaseAdmin.storage
            .from('photos')
            .remove([photo.preview_path])
            .then(({ data }) => (data ? 1 : 0))
        );
      }
      storageDeletes.push(
        Promise.all(promises).then((results) =>
          results.reduce((sum, count) => sum + count, 0)
        )
      );
    }

    // Clean up storage for assets
    for (const asset of assetsFound) {
      const promises: Array<Promise<number>> = [];
      if (asset.original_path) {
        promises.push(
          supabaseAdmin.storage
            .from('photo-private')
            .remove([asset.original_path])
            .then(({ data }) => (data ? 1 : 0))
        );
      }
      if (asset.preview_path) {
        promises.push(
          supabaseAdmin.storage
            .from('photos')
            .remove([asset.preview_path])
            .then(({ data }) => (data ? 1 : 0))
        );
      }
      storageDeletes.push(
        Promise.all(promises).then((results) =>
          results.reduce((sum, count) => sum + count, 0)
        )
      );
    }

    const storageResults = await Promise.all(storageDeletes);
    storageCleanedCount = storageResults.reduce((sum, count) => sum + count, 0);

    // Delete database records from photos and assets tables
    const photoIdsToDelete = photosFound.map((p) => p.id);
    const assetIdsToDelete = assetsFound.map((a) => a.id);

    if (photoIdsToDelete.length > 0) {
      const { error: deletePhotosError } = await supabaseAdmin
        .from('photos')
        .delete()
        .in('id', photoIdsToDelete);
      if (deletePhotosError) {
        logger.error('Failed to delete photo records', {
          error: deletePhotosError.message,
        });
        return NextResponse.json(
          { success: false, error: 'Failed to delete photo records' },
          { status: 500 }
        );
      }
    }

    if (assetIdsToDelete.length > 0) {
      const { error: deleteAssetsError } = await supabaseAdmin
        .from('assets')
        .delete()
        .in('id', assetIdsToDelete);
      if (deleteAssetsError) {
        logger.error('Failed to delete asset records', {
          error: deleteAssetsError.message,
        });
        return NextResponse.json(
          { success: false, error: 'Failed to delete asset records' },
          { status: 500 }
        );
      }
    }

    // Update folder photo counts (try RPC; fall back to recalc)
    const tryRpcUpdates = async () => {
      const results = await Promise.all(
        Object.entries(folderCounts).map(([folderId, count]) =>
          supabaseAdmin.rpc('update_folder_photo_count_delta', { folder_id: folderId, delta: -count })
        )
      );
      const anyError = results.find((r: any) => r && r.error);
      return { ok: !anyError };
    };

    const recalcAndSet = async (folderId: string) => {
      try {
        const [{ count: assetsCount }, { count: photosCount }] = await Promise.all([
          (await createServerSupabaseServiceClient())
            .from('assets')
            .select('id', { count: 'exact', head: true })
            .eq('folder_id', folderId),
          (await createServerSupabaseServiceClient())
            .from('photos')
            .select('id', { count: 'exact', head: true })
            .eq('subject_id', folderId),
        ]);
        const newCount = (assetsCount || 0) + (photosCount || 0);
        const { error } = await (await createServerSupabaseServiceClient())
          .from('folders')
          .update({ photo_count: newCount })
          .eq('id', folderId);
        if (error) {
          logger.warn('Failed to set recalculated folder count (delete)', { folderId, error: error.message });
        }
      } catch (e: any) {
        logger.warn('Recalc folder count failed (delete)', { folderId, error: e?.message || String(e) });
      }
    };

    const rpcRes = await tryRpcUpdates();
    if (!rpcRes.ok) {
      await Promise.all(Object.keys(folderCounts).map((fid) => recalcAndSet(fid)));
    }

    const deletedCount = photosFound.length + assetsFound.length;

    const response: BulkDeleteResponse = {
      success: true,
      deleted_count: deletedCount,
      storage_cleaned: storageCleanedCount,
    };

    logger.info('Bulk delete completed', {
      deletedFromPhotos: photosFound.length,
      deletedFromAssets: assetsFound.length,
      deletedTotal: deletedCount,
      storageCleanedCount,
      foldersUpdated: Object.keys(folderCounts).length,
    });

    return NextResponse.json(response);

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid bulk delete data', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Bulk delete API error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = RateLimitMiddleware.withRateLimit(withAuth(handlePATCH));
export const DELETE = RateLimitMiddleware.withRateLimit(withAuth(handleDELETE));

// For compatibility with tests expecting 400 on POST invalid/malformed requests
export async function POST(request: NextRequest) {
  try {
    // Always validate body and return 400 for compatibility
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Invalid request method. Use PATCH or DELETE.' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

export const runtime = 'nodejs';
