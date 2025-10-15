import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shareTokenSecurity } from '@/lib/security/share-token-security';
import {
  galleryService,
  GalleryServiceError,
  type GalleryResult,
} from '@/lib/services/gallery.service';

const queryParamsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 60)),
});

function mapLegacyShareResponse(result: GalleryResult) {
  return {
    token: {
      shareType: result.share?.shareType ?? 'event',
      allowDownload: result.share?.allowDownload ?? false,
      allowComments: result.share?.allowComments ?? false,
      expiresAt: result.token.expiresAt,
    },
    eventId: result.event?.id ?? null,
    eventName: result.event?.name ?? null,
    items: result.items.map((item) => ({
      id: item.id,
      filename: item.filename,
      preview_url: item.previewUrl ?? item.signedUrl ?? null,
      created_at: item.createdAt,
      size: item.size,
      mime: item.mimeType,
      folder_id: item.folderId,
    })),
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      total_pages: result.pagination.totalPages,
      has_more: result.pagination.hasMore,
    },
  };
}

function extractIpFromRequest(req: NextRequest): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const [first] = forwarded.split(',');
    if (first && first.trim()) return first.trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return undefined;
}

// GET /api/public/share/[token]/gallery
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const query = queryParamsSchema.parse(
      Object.fromEntries(new URL(req.url).searchParams.entries())
    );

    if (!token || token.length < 32) {
      return NextResponse.json(
        { success: false, error: 'Invalid share token' },
        { status: 400 }
      );
    }

    const requestContext = await shareTokenSecurity.extractRequestContext();
    const validation = await shareTokenSecurity.validateToken(
      token,
      undefined,
      requestContext
    );

    if (!validation.isValid || !validation.token) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid or expired token',
        },
        { status: 403 }
      );
    }

    const result = await galleryService.getGallery({
      token,
      page: query.page,
      limit: query.limit,
      ipAddress: requestContext.ip ?? extractIpFromRequest(req),
      userAgent: requestContext.userAgent ?? req.headers.get('user-agent') ?? undefined,
      includeCatalog: true,
    });

    return NextResponse.json({
      success: true,
      gallery: result,
      legacy: mapLegacyShareResponse(result),
    });
  } catch (error) {
    if (error instanceof GalleryServiceError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: error.errors.map(
            (issue) => `${issue.path.join('.')}: ${issue.message}`
          ),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
