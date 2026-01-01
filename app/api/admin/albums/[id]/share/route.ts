/**
 * Album Share API Route
 * POST - Create or update share configuration for an album/folder
 * GET - Get current share info for an album/folder
 * DELETE - Revoke sharing for an album/folder
 */

import { NextRequest, NextResponse } from 'next/server';
import { albumShareService } from '@/lib/services/album-share.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get share info
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: folderId } = await context.params;

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const shareInfo = await albumShareService.getAlbumShareInfo(folderId);

    return NextResponse.json({
      success: true,
      data: shareInfo,
    });
  } catch (error) {
    logger.error('Error getting album share info', { error });
    return NextResponse.json(
      { error: 'Error al obtener información de compartir' },
      { status: 500 }
    );
  }
}

// POST - Create or update share
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: folderId } = await context.params;
    const body = await request.json();

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const {
      mode = 'token',
      expiryDays = 30,
      password,
      allowDownload = false,
      title,
      description,
      notifyEmail,
      notifyWhatsApp,
    } = body;

    // Get folder to get event_id
    const supabase = await createServerSupabaseServiceClient();
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, event_id')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Carpeta no encontrada' },
        { status: 404 }
      );
    }

    const result = await albumShareService.createAlbumShare({
      folderId,
      eventId: folder.event_id || '',
      mode,
      expiryDays: expiryDays === 'never' ? 0 : parseInt(expiryDays, 10),
      password,
      allowDownload,
      title: title || folder.name,
      description,
      notifyEmail,
      notifyWhatsApp,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al crear enlace de compartir' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        shareToken: result.shareToken,
        shareUrl: result.shareUrl,
        storeUrl: result.storeUrl,
        qrCodeDataUrl: result.qrCodeDataUrl,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Error creating album share', { error });
    return NextResponse.json(
      { error: 'Error al compartir álbum' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke sharing (make private)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: folderId } = await context.params;

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Get folder to get event_id
    const supabase = await createServerSupabaseServiceClient();
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, event_id')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Carpeta no encontrada' },
        { status: 404 }
      );
    }

    const result = await albumShareService.createAlbumShare({
      folderId,
      eventId: folder.event_id || '',
      mode: 'private',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al revocar acceso' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Acceso revocado exitosamente',
    });
  } catch (error) {
    logger.error('Error revoking album share', { error });
    return NextResponse.json(
      { error: 'Error al revocar acceso' },
      { status: 500 }
    );
  }
}
