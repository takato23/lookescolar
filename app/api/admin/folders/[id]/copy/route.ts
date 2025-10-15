import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import crypto from 'crypto';

type Params = { params: { id: string } };

const copySchema = z.object({
  target_parent_id: z.string().uuid().nullable().optional(),
  new_name: z.string().trim().min(1).max(255).optional(),
  include_subfolders: z.boolean().optional().default(true),
  duplicate_assets: z.boolean().optional().default(false),
});

interface FolderRow {
  id: string;
  event_id: string;
  parent_id: string | null;
  name: string;
  depth: number | null;
  sort_order: number | null;
}

function parentKey(parentId: string | null | undefined) {
  return parentId ?? '__root__';
}

export const POST = withAuth(async (req: NextRequest, ctx: Params) => {
  const requestId = crypto.randomUUID();
  try {
    const { id: sourceFolderId } = ctx.params;
    const bodyInput = await req.json().catch(() => ({}));
    const body = copySchema.parse(bodyInput);

    const supabase = await createServerSupabaseServiceClient();

    const { data: sourceFolder, error: sourceError } = await supabase
      .from('folders')
      .select('id, event_id, parent_id, name, depth, sort_order')
      .eq('id', sourceFolderId)
      .single<FolderRow>();

    if (sourceError || !sourceFolder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found', requestId },
        { status: 404 }
      );
    }

    let targetParentId: string | null = null;
    if (body.target_parent_id !== undefined) {
      targetParentId = body.target_parent_id;
      if (targetParentId) {
        const { data: targetFolder, error: targetError } = await supabase
          .from('folders')
          .select('id, event_id')
          .eq('id', targetParentId)
          .single();
        if (targetError || !targetFolder) {
          return NextResponse.json(
            { success: false, error: 'Target parent folder not found', requestId },
            { status: 400 }
          );
        }
        if (targetFolder.event_id !== sourceFolder.event_id) {
          return NextResponse.json(
            { success: false, error: 'Cannot paste into a different event', requestId },
            { status: 400 }
          );
        }
      }
    } else {
      targetParentId = sourceFolder.parent_id;
    }

    // Fetch all folders for event
    const { data: allFoldersData, error: allFoldersError } = await supabase
      .from('folders')
      .select('id, event_id, parent_id, name, depth, sort_order')
      .eq('event_id', sourceFolder.event_id);

    if (allFoldersError || !allFoldersData) {
      logger.error('Failed to fetch folders for copy operation', {
        requestId,
        sourceFolderId,
        error: allFoldersError?.message,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to read folder tree', requestId },
        { status: 500 }
      );
    }

    const folderMap = new Map<string, FolderRow>();
    const childrenMap = new Map<string, FolderRow[]>();
    for (const folder of allFoldersData as FolderRow[]) {
      folderMap.set(folder.id, folder);
      const key = parentKey(folder.parent_id);
      if (!childrenMap.has(key)) {
        childrenMap.set(key, []);
      }
      childrenMap.get(key)!.push(folder);
    }

    const foldersToCopy: FolderRow[] = [];
    const queue: FolderRow[] = [sourceFolder];
    while (queue.length > 0) {
      const current = queue.shift()!;
      foldersToCopy.push(current);
      if (!body.include_subfolders) continue;
      const childKey = parentKey(current.id);
      const childList = childrenMap.get(childKey) || [];
      for (const child of childList) {
        if (child.id === current.id) continue;
        queue.push(child);
      }
    }

    const existingNameCache = new Map<string, Set<string>>();
    for (const folder of allFoldersData as FolderRow[]) {
      const key = parentKey(folder.parent_id);
      if (!existingNameCache.has(key)) existingNameCache.set(key, new Set());
      existingNameCache.get(key)!.add(folder.name);
    }

    const newRecordsByParent = new Map<string, Set<string>>();
    const newIdMap = new Map<string, string>();
    const createdFolders: Array<{ oldId: string; newId: string; name: string }> = [];

    const ensureUniqueName = (targetParent: string | null, baseName: string) => {
      const key = parentKey(targetParent);
      const existing = existingNameCache.get(key) ?? new Set<string>();
      const pending = newRecordsByParent.get(key) ?? new Set<string>();

      const normalizedBase = baseName.trim() || 'Carpeta';
      let candidate = normalizedBase;
      let suffix = 2;
      while (existing.has(candidate) || pending.has(candidate)) {
        candidate = `${normalizedBase} (${suffix})`;
        suffix += 1;
      }
      pending.add(candidate);
      newRecordsByParent.set(key, pending);
      return candidate;
    };

    // Copy order: ensure parent before children
    for (const folder of foldersToCopy) {
      const isRootClone = folder.id === sourceFolder.id;
      const destinationParentId = isRootClone
        ? targetParentId
        : newIdMap.get(folder.parent_id || '') ?? null;

      const desiredName = isRootClone
        ? body.new_name ?? folder.name
        : folder.name;
      const uniqueName = ensureUniqueName(destinationParentId, desiredName);

      const insertPayload = {
        event_id: folder.event_id,
        parent_id: destinationParentId,
        name: uniqueName,
        sort_order: folder.sort_order ?? 0,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('folders')
        .insert(insertPayload)
        .select('id, name, parent_id')
        .single();

      if (insertError || !inserted) {
        logger.error('Failed to insert copied folder', {
          requestId,
          sourceFolderId,
          folderId: folder.id,
          error: insertError?.message,
        });
        return NextResponse.json(
          { success: false, error: 'Failed to copy folder', requestId },
          { status: 500 }
        );
      }

      newIdMap.set(folder.id, inserted.id);
      const parentKeyForCache = parentKey(destinationParentId);
      if (!existingNameCache.has(parentKeyForCache)) {
        existingNameCache.set(parentKeyForCache, new Set());
      }
      existingNameCache.get(parentKeyForCache)!.add(uniqueName);
      createdFolders.push({ oldId: folder.id, newId: inserted.id, name: uniqueName });
    }

    const rootNewId = newIdMap.get(sourceFolder.id) || null;

    return NextResponse.json({
      success: true,
      requestId,
      sourceFolderId,
      newFolderId: rootNewId,
      createdCount: createdFolders.length,
      folders: createdFolders,
      assetsCopied: body.duplicate_assets ? 0 : null,
      duplicateAssetsImplemented: false,
    });
  } catch (error) {
    logger.error('Unexpected error during folder copy', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { success: false, error: 'Unexpected error copying folder', requestId },
      { status: 500 }
    );
  }
});
