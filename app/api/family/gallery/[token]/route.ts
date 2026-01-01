import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import {
  createErrorResponse,
  createSuccessResponse,
  logDevRequest,
} from '@/lib/utils/api-response';
import {
  galleryService,
  GalleryServiceError,
  type GalleryResult,
} from '@/lib/services/gallery.service';

const tokenParamsSchema = z.object({
  token: z.string().min(8, 'Token inválido'),
});

const queryParamsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50)),
  photo_id: z.string().optional(),
});

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const [first] = forwarded.split(',');
    if (first && first.trim()) return first.trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return null;
}

function mapLegacyFamilyResponse(result: GalleryResult) {
  return {
    subject: result.subject
      ? {
        id: result.subject.id,
        name: result.subject.name,
        grade: (result.subject as any).grade ?? null,
        section: (result.subject as any).section ?? null,
        parent_name: result.subject.parent_name ?? null,
        parent_email: result.subject.parent_email ?? null,
        event: result.event
          ? {
            id: result.event.id,
            name: result.event.name,
            date: (result.event as any).date ?? null,
            school_name: result.event.school_name ?? null,
          }
          : null,
      }
      : null,
    photos: result.items.map((item) => ({
      id: item.id,
      filename: item.filename,
      storage_path: item.storagePath ?? null,
      created_at: item.createdAt,
      signed_url: item.signedUrl,
      preview_url: item.previewUrl,
      download_url: item.downloadUrl,
      assignment_id: item.assignmentId ?? null,
      photo_type: item.type ?? 'individual',
      metadata: item.metadata ?? null,
    })),
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      has_more: result.pagination.hasMore,
      total_pages: result.pagination.totalPages,
    },
    active_order: result.activeOrder
      ? {
        id: result.activeOrder.id,
        status: result.activeOrder.status,
        total_amount: result.activeOrder.totalAmount,
        created_at: result.activeOrder.createdAt,
        items_count: result.activeOrder.itemsCount,
      }
      : null,
  };
}

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(
    async (
      request: NextRequest,
      authContext, context: RouteContext<{ token: string }>) => {
      const params = await context.params;
      const requestId =
        globalThis.crypto && 'randomUUID' in globalThis.crypto
          ? (globalThis.crypto as Crypto).randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      try {
        const { token } = tokenParamsSchema.parse(params);
        const canonicalUrl = new URL(`/api/store/${token}`, request.url);
        const existingParams = new URL(request.url).searchParams;
        canonicalUrl.search = existingParams.toString();
        if (!canonicalUrl.searchParams.has('include_assets')) {
          canonicalUrl.searchParams.set('include_assets', 'true');
        }
        return NextResponse.redirect(canonicalUrl, 307);
      } catch (error) {
        SecurityLogger.logSecurityEvent(
          'family_gallery_error',
          {
            requestId,
            subjectId: authContext.subject?.id,
            error: error instanceof Error ? error.message : 'unknown error',
          },
          'error'
        );

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid parameters',
              details: error.errors.map(
                (issue) => `${issue.path.join('.')}: ${issue.message}`
              ),
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    },
    'family'
  )
);

