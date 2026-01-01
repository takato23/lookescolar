/**
 * Album QR Code Generation API
 * GET - Generate QR code for an album share link
 */

import { NextRequest, NextResponse } from 'next/server';
import { albumShareService } from '@/lib/services/album-share.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Generate QR code
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: folderId } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'dataurl'; // 'dataurl' | 'svg'

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Get share info to get the URL
    const shareInfo = await albumShareService.getAlbumShareInfo(folderId);

    if (!shareInfo.isPublished || !shareInfo.shareUrl) {
      return NextResponse.json(
        { error: 'El álbum no está publicado. Compártelo primero.' },
        { status: 400 }
      );
    }

    let qrCode: string;

    if (format === 'svg') {
      qrCode = await albumShareService.generateQRCodeSVG(shareInfo.shareUrl);

      // Return SVG directly
      return new NextResponse(qrCode, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else {
      qrCode = await albumShareService.generateQRCode(shareInfo.shareUrl);

      return NextResponse.json({
        success: true,
        data: {
          qrCodeDataUrl: qrCode,
          shareUrl: shareInfo.shareUrl,
          storeUrl: shareInfo.storeUrl,
        },
      });
    }
  } catch (error) {
    logger.error('Error generating QR code', { error });
    return NextResponse.json(
      { error: 'Error al generar código QR' },
      { status: 500 }
    );
  }
}
