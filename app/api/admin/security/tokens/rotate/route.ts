import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { tokenService } from '@/lib/services/token.service';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

// Schema de validación para rotación de tokens
const rotateTokensSchema = z.object({
  subject_ids: z.array(z.string().uuid()).optional(),
  days_before_expiry: z.number().min(1).max(90).default(7),
  reason: z.string().min(3).max(200).default('scheduled_rotation'),
});

const invalidateTokenSchema = z.object({
  token: z.string().min(20),
  reason: z.string().min(3).max(200).default('security_breach'),
});

/**
 * POST /api/admin/security/tokens/rotate
 * Rota tokens próximos a expirar o tokens específicos
 */
export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = `token_rotate_${Date.now()}`;

    try {
      // Verificar permisos de admin
      if (!authContext.isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const { subject_ids, days_before_expiry, reason } =
        rotateTokensSchema.parse(body);

      SecurityLogger.logSecurityEvent('token_rotation_initiated', {
        requestId,
        userId: authContext.user?.id,
        subjectIds: subject_ids,
        daysBefore: days_before_expiry,
        reason,
      });

      let results;

      if (subject_ids && subject_ids.length > 0) {
        // Rotar tokens específicos
        results = await tokenService.generateTokensForSubjects(subject_ids, {
          rotateExisting: true,
        });

        const rotationResult = {
          rotated: results.size,
          failed: subject_ids.length - results.size,
          errors: subject_ids
            .filter((id) => !results.has(id))
            .map((id) => ({ subjectId: id, error: 'Failed to rotate token' })),
        };

        SecurityLogger.logSecurityEvent('specific_token_rotation_completed', {
          requestId,
          ...rotationResult,
          reason,
        });

        return NextResponse.json({
          success: true,
          message: `${rotationResult.rotated} tokens rotated successfully`,
          results: rotationResult,
        });
      } else {
        // Rotar tokens próximos a expirar
        results = await tokenService.rotateExpiringTokens(days_before_expiry);

        SecurityLogger.logSecurityEvent('bulk_token_rotation_completed', {
          requestId,
          ...results,
          daysBefore: days_before_expiry,
          reason,
        });

        return NextResponse.json({
          success: true,
          message: `${results.rotated} expiring tokens rotated successfully`,
          results,
        });
      }
    } catch (error: any) {
      SecurityLogger.logSecurityEvent(
        'token_rotation_error',
        {
          requestId,
          error: error.message,
          userId: authContext.user?.id,
        },
        'error'
      );

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: error.errors,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Token rotation failed' },
        { status: 500 }
      );
    }
  }, 'admin')
);

/**
 * DELETE /api/admin/security/tokens/rotate
 * Invalida un token específico por razones de seguridad
 */
export const DELETE = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = `token_invalidate_${Date.now()}`;

    try {
      if (!authContext.isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const { token, reason } = invalidateTokenSchema.parse(body);

      SecurityLogger.logSecurityEvent('token_invalidation_initiated', {
        requestId,
        userId: authContext.user?.id,
        reason,
      });

      const success = await tokenService.invalidateToken(token, reason);

      if (success) {
        SecurityLogger.logSecurityEvent('token_invalidated_successfully', {
          requestId,
          reason,
        });

        return NextResponse.json({
          success: true,
          message: 'Token invalidated successfully',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Token not found or already expired',
          },
          { status: 404 }
        );
      }
    } catch (error: any) {
      SecurityLogger.logSecurityEvent(
        'token_invalidation_error',
        {
          requestId,
          error: error.message,
        },
        'error'
      );

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: error.errors,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Token invalidation failed' },
        { status: 500 }
      );
    }
  }, 'admin')
);

/**
 * GET /api/admin/security/tokens/rotate
 * Obtiene estadísticas de tokens para monitoreo
 */
export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      const stats = await tokenService.getTokenStats();

      return NextResponse.json({
        success: true,
        stats,
        recommendations: {
          shouldRotateSoon:
            stats.expiringIn24Hours > 0
              ? `${stats.expiringIn24Hours} tokens expire within 24 hours`
              : null,
          shouldRotateWeekly:
            stats.expiringIn7Days > 0
              ? `${stats.expiringIn7Days} tokens expire within 7 days`
              : null,
          cleanupExpired:
            stats.expired > 0
              ? `${stats.expired} expired tokens should be cleaned up`
              : null,
        },
      });
    } catch (error: any) {
      SecurityLogger.logSecurityEvent(
        'token_stats_error',
        {
          error: error.message,
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Failed to get token stats' },
        { status: 500 }
      );
    }
  }, 'admin')
);
