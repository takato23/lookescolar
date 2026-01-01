import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

// =============================================================================
// TIPOS (mantenemos para compatibilidad con el código existente)
// =============================================================================

export type CouponType = 'percentage' | 'fixed' | 'free_shipping';

export interface Coupon {
  id: string;
  tenant_id: string;
  code: string;
  type: CouponType;
  value: number;
  min_purchase_cents: number;
  max_discount_cents: number | null;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number;
  valid_from: string;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  applies_to_digital: boolean;
  applies_to_physical: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  order_id: string | null;
  tenant_id: string;
  user_email: string | null;
  user_identifier: string | null;
  discount_applied_cents: number;
  used_at: string;
}

export interface CreateCouponInput {
  code: string;
  type: CouponType;
  value: number;
  minPurchaseCents?: number;
  maxDiscountCents?: number | null;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  validFrom?: Date;
  expiresAt?: Date | null;
  description?: string;
  appliesToDigital?: boolean;
  appliesToPhysical?: boolean;
}

export interface ValidateCouponOptions {
  supabase: SupabaseClient<Database>; // no-op en stub
  tenantId: string;
  code: string;
  subtotalCents: number;
  userIdentifier?: string;
  hasDigitalItems?: boolean;
  hasPhysicalItems?: boolean;
}

export interface ValidateCouponResult {
  valid: boolean;
  coupon?: Coupon;
  discountCents: number;
  discountFormatted: string;
  error?: string;
  errorCode?: string;
}

export interface ApplyCouponOptions {
  supabase: SupabaseClient<Database>; // no-op en stub
  couponId: string;
  orderId: string;
  tenantId: string;
  userIdentifier?: string;
  userEmail?: string;
  discountAppliedCents: number;
}

// =============================================================================
// SERVICIO STUB: la tabla coupons/coupon_usage no existe en el schema actual.
// Esto evita errores de typecheck y deja claro que el feature está deshabilitado.
// =============================================================================

export class CouponService {
  private readonly log = logger.child({ service: 'coupon' });

  private formatCurrency(amountCents: number, currency: string = 'ARS'): string {
    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amountCents / 100);
    } catch {
      return `${currency} ${(amountCents / 100).toFixed(2)}`;
    }
  }

  async createCoupon(
    _supabase: SupabaseClient<Database>,
    tenantId: string,
    input: CreateCouponInput
  ): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
    this.log.warn('coupon_create_stub', { tenantId, code: input.code });
    return {
      success: false,
      error: 'Cupones deshabilitados (tabla coupons no disponible en el schema actual).',
    };
  }

  async validateCoupon(options: ValidateCouponOptions): Promise<ValidateCouponResult> {
    this.log.warn('coupon_validate_stub', {
      tenantId: options.tenantId,
      code: options.code,
    });

    return {
      valid: false,
      discountCents: 0,
      discountFormatted: this.formatCurrency(0),
      error: 'Cupones deshabilitados en esta instancia.',
      errorCode: 'COUPONS_DISABLED',
    };
  }

  async applyCoupon(_options: ApplyCouponOptions): Promise<{ success: boolean; error?: string }> {
    this.log.warn('coupon_apply_stub');
    // No-op: devolvemos success true para no romper flujos que ya aplicaron descuento manual.
    return { success: true };
  }

  async getCoupons(
    _supabase: SupabaseClient<Database>,
    tenantId: string,
    _options?: {
      activeOnly?: boolean;
      includeExpired?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ coupons: Coupon[]; total: number }> {
    this.log.warn('coupon_list_stub', { tenantId });
    return { coupons: [], total: 0 };
  }

  async getCoupon(_supabase: SupabaseClient<Database>, _couponId: string): Promise<Coupon | null> {
    this.log.warn('coupon_get_stub', { couponId: _couponId });
    return null;
  }

  async updateCoupon(
    _supabase: SupabaseClient<Database>,
    couponId: string,
    _updates: Partial<CreateCouponInput> & { isActive?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    this.log.warn('coupon_update_stub', { couponId });
    return {
      success: false,
      error: 'Cupones deshabilitados (tabla coupons no disponible en el schema actual).',
    };
  }

  async deleteCoupon(
    _supabase: SupabaseClient<Database>,
    couponId: string
  ): Promise<{ success: boolean; error?: string }> {
    this.log.warn('coupon_delete_stub', { couponId });
    return {
      success: false,
      error: 'Cupones deshabilitados (tabla coupons no disponible en el schema actual).',
    };
  }

  async getCouponStats(
    _supabase: SupabaseClient<Database>,
    couponId: string
  ): Promise<{
    totalUses: number;
    totalDiscountCents: number;
    uniqueUsers: number;
    usageByDate: Array<{ date: string; uses: number; discount_cents: number }>;
  }> {
    this.log.warn('coupon_stats_stub', { couponId });
    return {
      totalUses: 0,
      totalDiscountCents: 0,
      uniqueUsers: 0,
      usageByDate: [],
    };
  }
}

export const couponService = new CouponService();
