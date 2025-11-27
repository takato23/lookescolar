import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { couponService } from '@/lib/services/coupon.service';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const validateCouponSchema = z.object({
  code: z.string().min(1),
  subtotalCents: z.number().min(0),
  userIdentifier: z.string().optional(),
  hasDigitalItems: z.boolean().optional().default(false),
  hasPhysicalItems: z.boolean().optional().default(true),
});

// =============================================================================
// POST - Validate coupon (public endpoint for checkout)
// =============================================================================

export const POST = RateLimitMiddleware.withRateLimit(
  async (request: NextRequest) => {
    try {
      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const supabase = await createServerSupabaseServiceClient();

      const body = await request.json();
      const validation = validateCouponSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: validation.error.errors },
          { status: 400 }
        );
      }

      const result = await couponService.validateCoupon({
        supabase,
        tenantId,
        code: validation.data.code,
        subtotalCents: validation.data.subtotalCents,
        userIdentifier: validation.data.userIdentifier,
        hasDigitalItems: validation.data.hasDigitalItems,
        hasPhysicalItems: validation.data.hasPhysicalItems,
      });

      if (!result.valid) {
        return NextResponse.json(
          {
            valid: false,
            error: result.error,
            errorCode: result.errorCode,
          },
          { status: 200 } // 200 because validation succeeded, coupon just isn't valid
        );
      }

      return NextResponse.json({
        valid: true,
        couponId: result.coupon?.id,
        couponCode: result.coupon?.code,
        couponType: result.coupon?.type,
        discountCents: result.discountCents,
        discountFormatted: result.discountFormatted,
        description: result.coupon?.description,
      });
    } catch (error) {
      console.error('[Coupons Validate API] POST error:', error);
      return NextResponse.json(
        { error: 'Error al validar cupon' },
        { status: 500 }
      );
    }
  }
);
