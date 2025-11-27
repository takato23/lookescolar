import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { couponService, type CreateCouponInput } from '@/lib/services/coupon.service';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createCouponSchema = z.object({
  code: z.string().min(3).max(20),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.number().min(0),
  minPurchaseCents: z.number().min(0).optional(),
  maxDiscountCents: z.number().min(0).nullable().optional(),
  maxUses: z.number().min(1).nullable().optional(),
  maxUsesPerUser: z.number().min(1).optional().default(1),
  validFrom: z.string().datetime().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  description: z.string().max(500).optional(),
  appliesToDigital: z.boolean().optional().default(true),
  appliesToPhysical: z.boolean().optional().default(true),
});

const updateCouponSchema = z.object({
  value: z.number().min(0).optional(),
  minPurchaseCents: z.number().min(0).optional(),
  maxDiscountCents: z.number().min(0).nullable().optional(),
  maxUses: z.number().min(1).nullable().optional(),
  maxUsesPerUser: z.number().min(1).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  description: z.string().max(500).optional(),
  appliesToDigital: z.boolean().optional(),
  appliesToPhysical: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// =============================================================================
// GET - List coupons
// =============================================================================

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      SecurityLogger.logResourceAccess('coupons_list', authContext, request);

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const { searchParams } = new URL(request.url);
      const activeOnly = searchParams.get('active_only') === 'true';
      const includeExpired = searchParams.get('include_expired') === 'true';
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const { coupons, total } = await couponService.getCoupons(supabase, tenantId, {
        activeOnly,
        includeExpired,
        limit,
        offset,
      });

      return NextResponse.json({
        success: true,
        data: coupons,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + coupons.length < total,
        },
      });
    } catch (error) {
      console.error('[Coupons API] GET error:', error);
      return NextResponse.json(
        { error: 'Error al obtener cupones' },
        { status: 500 }
      );
    }
  })
);

// =============================================================================
// POST - Create coupon
// =============================================================================

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    try {
      if (!authContext.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      SecurityLogger.logResourceAccess('coupon_create', authContext, request);

      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const body = await request.json();
      const validation = createCouponSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: validation.error.errors },
          { status: 400 }
        );
      }

      const input: CreateCouponInput = {
        ...validation.data,
        validFrom: validation.data.validFrom ? new Date(validation.data.validFrom) : undefined,
        expiresAt: validation.data.expiresAt ? new Date(validation.data.expiresAt) : null,
      };

      const result = await couponService.createCoupon(supabase, tenantId, input);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: result.coupon,
      });
    } catch (error) {
      console.error('[Coupons API] POST error:', error);
      return NextResponse.json(
        { error: 'Error al crear cupon' },
        { status: 500 }
      );
    }
  })
);
