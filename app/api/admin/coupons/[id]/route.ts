import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { couponService } from '@/lib/services/coupon.service';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

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
// GET - Get single coupon with stats
// =============================================================================

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(
    async (
      request: NextRequest,
      authContext,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        if (!authContext.isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        SecurityLogger.logResourceAccess('coupon_view', authContext, request);

        const { tenantId } = resolveTenantFromHeaders(request.headers);
        const supabase = await createServerSupabaseServiceClient();

        const coupon = await couponService.getCoupon(supabase, id);

        if (!coupon) {
          return NextResponse.json({ error: 'Cupon no encontrado' }, { status: 404 });
        }

        // Verify tenant ownership
        if (coupon.tenant_id !== tenantId) {
          return NextResponse.json({ error: 'Cupon no encontrado' }, { status: 404 });
        }

        // Get usage stats
        const stats = await couponService.getCouponStats(supabase, id);

        return NextResponse.json({
          success: true,
          data: {
            ...coupon,
            stats,
          },
        });
      } catch (error) {
        console.error('[Coupons API] GET error:', error);
        return NextResponse.json(
          { error: 'Error al obtener cupon' },
          { status: 500 }
        );
      }
    }
  )
);

// =============================================================================
// PATCH - Update coupon
// =============================================================================

export const PATCH = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(
    async (
      request: NextRequest,
      authContext,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        if (!authContext.isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        SecurityLogger.logResourceAccess('coupon_update', authContext, request);

        const { tenantId } = resolveTenantFromHeaders(request.headers);
        const supabase = await createServerSupabaseServiceClient();

        // Verify coupon exists and belongs to tenant
        const coupon = await couponService.getCoupon(supabase, id);
        if (!coupon || coupon.tenant_id !== tenantId) {
          return NextResponse.json({ error: 'Cupon no encontrado' }, { status: 404 });
        }

        const body = await request.json();
        const validation = updateCouponSchema.safeParse(body);

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Datos invalidos', details: validation.error.errors },
            { status: 400 }
          );
        }

        const updates = {
          ...validation.data,
          expiresAt: validation.data.expiresAt
            ? new Date(validation.data.expiresAt)
            : validation.data.expiresAt === null
              ? null
              : undefined,
        };

        const result = await couponService.updateCoupon(supabase, id, updates);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Get updated coupon
        const updatedCoupon = await couponService.getCoupon(supabase, id);

        return NextResponse.json({
          success: true,
          data: updatedCoupon,
        });
      } catch (error) {
        console.error('[Coupons API] PATCH error:', error);
        return NextResponse.json(
          { error: 'Error al actualizar cupon' },
          { status: 500 }
        );
      }
    }
  )
);

// =============================================================================
// DELETE - Delete coupon
// =============================================================================

export const DELETE = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(
    async (
      request: NextRequest,
      authContext,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        if (!authContext.isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        SecurityLogger.logResourceAccess('coupon_delete', authContext, request);

        const { tenantId } = resolveTenantFromHeaders(request.headers);
        const supabase = await createServerSupabaseServiceClient();

        // Verify coupon exists and belongs to tenant
        const coupon = await couponService.getCoupon(supabase, id);
        if (!coupon || coupon.tenant_id !== tenantId) {
          return NextResponse.json({ error: 'Cupon no encontrado' }, { status: 404 });
        }

        const result = await couponService.deleteCoupon(supabase, id);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: 'Cupon eliminado correctamente',
        });
      } catch (error) {
        console.error('[Coupons API] DELETE error:', error);
        return NextResponse.json(
          { error: 'Error al eliminar cupon' },
          { status: 500 }
        );
      }
    }
  )
);
