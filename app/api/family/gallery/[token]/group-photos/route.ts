import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { familyService } from '@/lib/services/family.service';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
} from '@/lib/utils/api-response';

const tokenParamsSchema = z.object({
  token: z.string().min(20, 'Token must be at least 20 characters'),
});

const queryParamsSchema = z.object({
  photo_type: z.enum(['group', 'activity', 'event']).optional(),
});

// GET /api/family/gallery/[token]/group-photos - Get only group photos for family
export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(
    async (
      request: NextRequest,
      authContext, context: RouteContext<{ token: string }>) => {
      const params = await context.params;
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
          'family_group_photos_error',
          {
            requestId,
            studentId: authContext.subject?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'error'
        );

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid parameters',
              details: error.errors.map(
                (e) => `${e.path.join('.')}: ${e.message}`
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

