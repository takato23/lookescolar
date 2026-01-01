import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { RouteContext } from '@/types/next-route';

interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'photo' | 'student';
  parentId?: string;
  photoCount?: number;
  studentCount?: number;
  isActive?: boolean;
  thumbnailUrl?: string;
  metadata?: {
    level?: string;
    course?: string;
    section?: string;
    grade?: string;
    uploadDate?: string;
    fileSize?: number;
  };
}

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Drive-like navigation para el esquema actual (folders + assets).
 *
 * `path` se interpreta como una cadena de folder IDs separados por '/'.
 * - path vacío: lista carpetas raíz del evento
 * - path con ids: lista subcarpetas + fotos del último folder
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    if (!isValidUUID(eventId)) {
      return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const pathSegments = path ? path.split('/').filter(Boolean) : [];
    const currentFolderId = pathSegments.length
      ? pathSegments[pathSegments.length - 1]
      : null;

    if (currentFolderId && !isValidUUID(currentFolderId)) {
      return NextResponse.json(
        { error: 'path inválido (folder id)' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Subfolders
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, photo_count, updated_at')
      .eq('event_id', eventId)
      .is('parent_id', currentFolderId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (foldersError) {
      return NextResponse.json(
        { error: 'Error cargando carpetas' },
        { status: 500 }
      );
    }

    const items: DriveItem[] = (folders ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      type: 'folder',
      parentId: f.parent_id ?? undefined,
      photoCount: f.photo_count ?? 0,
      isActive: true,
      metadata: {
        uploadDate: f.updated_at ?? undefined,
      },
    }));

    // Assets in current folder
    if (currentFolderId) {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, filename, preview_path, created_at, file_size')
        .eq('folder_id', currentFolderId)
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (!assetsError) {
        for (const a of assets ?? []) {
          const previewPath = a.preview_path ? a.preview_path.replace(/^\/+/, '') : null;
          const thumbnailUrl = previewPath ? `/api/public/preview/${previewPath}` : undefined;
          items.push({
            id: a.id,
            name: a.filename,
            type: 'photo',
            parentId: currentFolderId,
            thumbnailUrl,
            metadata: {
              uploadDate: a.created_at ?? undefined,
              fileSize: a.file_size ?? undefined,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      items,
      path: pathSegments,
      currentFolderId,
    });
  } catch (error) {
    console.error('Drive items error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
