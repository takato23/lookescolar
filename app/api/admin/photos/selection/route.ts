'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { signedUrlForKey } from '@/lib/storage/signedUrl';

const payloadSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(300),
  eventId: z.string().uuid().optional(),
});

type SupabaseAssetRow = {
  id: string;
  filename: string;
  folder_id: string | null;
  preview_path: string | null;
  watermark_path: string | null;
  storage_path: string | null;
  file_size: number | null;
  metadata: Record<string, unknown> | null;
};

type SupabasePhotoRow = {
  id: string;
  original_filename: string;
  folder_id: string | null;
  preview_path: string | null;
  watermark_path: string | null;
  storage_path: string | null;
  file_size: number | null;
  metadata: Record<string, unknown> | null;
};

type FolderRow = {
  id: string;
  name: string | null;
  path: string | null;
};

type PhotoStudentRow = {
  photo_id: string;
  students: {
    id: string;
    name: string;
  } | null;
};

interface SelectionMetadata {
  id: string;
  filename: string;
  folderId: string | null;
  folderName: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  students: Array<{ id: string; name: string }>;
  fileSize: number | null;
  metadata: Record<string, unknown> | null;
  source: 'asset' | 'photo';
}

async function buildSignedUrl(
  path: string | null | undefined,
  options: { width?: number; height?: number } = {}
): Promise<string | null> {
  if (!path) return null;
  try {
    return await signedUrlForKey(path, {
      expiresIn: 900,
      transform:
        options.width || options.height
          ? {
              width: options.width,
              height: options.height,
              resize: 'cover',
              quality: 85,
            }
          : undefined,
      quietMissing: true,
    });
  } catch {
    return null;
  }
}

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const json = await req.json();
    const payload = payloadSchema.parse(json);
    const { photoIds } = payload;

    const supabase = await createServerSupabaseServiceClient();

    const [assetsResult, studentsResult] = await Promise.all([
      supabase
        .from('assets')
        .select(
          'id, filename, folder_id, preview_path, watermark_path, storage_path, file_size, metadata'
        )
        .in('id', photoIds),
      supabase
        .from('photo_students')
        .select('photo_id, students:students(id, name)')
        .in('photo_id', photoIds),
    ]);

    if (assetsResult.error) {
      throw assetsResult.error;
    }

    const assetRows = (assetsResult.data || []) as SupabaseAssetRow[];
    const assetIds = new Set(assetRows.map((row) => row.id));
    const missingPhotoIds = photoIds.filter((id) => !assetIds.has(id));

    const photosResult =
      missingPhotoIds.length > 0
        ? await supabase
            .from('photos')
            .select(
              'id, original_filename, folder_id, preview_path, watermark_path, storage_path, file_size, metadata'
            )
            .in('id', missingPhotoIds)
        : { data: [] as SupabasePhotoRow[], error: null };

    if (photosResult.error) {
      throw photosResult.error;
    }

    const photoRows = (photosResult.data || []) as SupabasePhotoRow[];

    const folderIds = Array.from(
      new Set(
        [...assetRows, ...photoRows]
          .map((row) => row.folder_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const folderResult =
      folderIds.length > 0
        ? await supabase
            .from('folders')
            .select('id, name, path')
            .in('id', folderIds)
        : { data: [] as FolderRow[], error: null };

    if (folderResult.error) {
      throw folderResult.error;
    }

    const folderMap = new Map(
      (folderResult.data || []).map((folder) => [folder.id, folder])
    );

    const studentMap = new Map<string, Array<{ id: string; name: string }>>();
    (studentsResult.data || []).forEach((row: PhotoStudentRow) => {
      if (!row.photo_id || !row.students) return;
      const list = studentMap.get(row.photo_id);
      if (list) {
        list.push(row.students);
      } else {
        studentMap.set(row.photo_id, [row.students]);
      }
    });

    const allRecords: SelectionMetadata[] = [];

    const appendRecords = async (
      rows: Array<SupabaseAssetRow | SupabasePhotoRow>,
      source: 'asset' | 'photo'
    ) => {
      const items = await Promise.all(
        rows.map(async (row) => {
          const folderId = row.folder_id ?? null;
          const folder = folderId ? folderMap.get(folderId) : null;
          const students = studentMap.get(row.id) ?? [];
          const basePreviewPath =
            row.preview_path || row.watermark_path || row.storage_path;

          const [thumbnailUrl, previewUrl] = await Promise.all([
            buildSignedUrl(basePreviewPath, { width: 320, height: 320 }),
            buildSignedUrl(basePreviewPath, { width: 960, height: 960 }),
          ]);

          return {
            id: row.id,
            filename:
              source === 'asset'
                ? (row as SupabaseAssetRow).filename
                : (row as SupabasePhotoRow).original_filename,
            folderId,
            folderName: folder?.name ?? null,
            thumbnailUrl,
            previewUrl: previewUrl ?? thumbnailUrl,
            students,
            fileSize: row.file_size ?? null,
            metadata: row.metadata ?? null,
            source,
          } satisfies SelectionMetadata;
        })
      );

      allRecords.push(...items);
    };

    await appendRecords(assetRows, 'asset');
    await appendRecords(photoRows, 'photo');

    const foundIds = new Set(allRecords.map((item) => item.id));
    const missing = photoIds.filter((id) => !foundIds.has(id));

    return NextResponse.json({
      success: true,
      photos: allRecords,
      missing,
    });
  } catch (error) {
    console.error('[photos-selection] Error resolving selection metadata', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unexpected error resolving selection metadata',
      },
      { status: 500 }
    );
  }
});
