import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

// =============================================================================
// TYPES
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
  supabase: SupabaseClient<Database>;
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
  supabase: SupabaseClient<Database>;
  couponId: string;
  orderId: string;
  tenantId: string;
  userIdentifier?: string;
  userEmail?: string;
  discountAppliedCents: number;
}

// =============================================================================
// COUPON SERVICE CLASS
// =============================================================================

export class CouponService {
  private readonly log = logger.child({ service: 'coupon' });

  /**
   * Format currency amount
   */
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

  /**
   * Create a new coupon
   */
  async createCoupon(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    input: CreateCouponInput
  ): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
    const log = this.log.child({ tenantId, code: input.code });

    // Validate code format
    const normalizedCode = input.code.toUpperCase().trim();
    if (!/^[A-Z0-9_-]{3,20}$/.test(normalizedCode)) {
      return {
        success: false,
        error: 'El codigo debe tener entre 3 y 20 caracteres alfanumericos',
      };
    }

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', normalizedCode)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Ya existe un cupon con ese codigo' };
    }

    // Validate value based on type
    if (input.type === 'percentage' && (input.value < 0 || input.value > 100)) {
      return { success: false, error: 'El porcentaje debe estar entre 0 y 100' };
    }

    if (input.type === 'fixed' && input.value < 0) {
      return { success: false, error: 'El valor debe ser positivo' };
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        tenant_id: tenantId,
        code: normalizedCode,
        type: input.type,
        value: input.value,
        min_purchase_cents: input.minPurchaseCents || 0,
        max_discount_cents: input.maxDiscountCents || null,
        max_uses: input.maxUses || null,
        max_uses_per_user: input.maxUsesPerUser || 1,
        valid_from: input.validFrom?.toISOString() || new Date().toISOString(),
        expires_at: input.expiresAt?.toISOString() || null,
        description: input.description || null,
        applies_to_digital: input.appliesToDigital ?? true,
        applies_to_physical: input.appliesToPhysical ?? true,
        is_active: true,
      })
      .select()
      .maybeSingle();

    if (error) {
      log.error('coupon_creation_failed', { error: error.message });
      return { success: false, error: 'Error al crear el cupon' };
    }

    log.info('coupon_created', { couponId: data?.id });
    return { success: true, coupon: data as unknown as Coupon };
  }

  /**
   * Validate a coupon code
   */
  async validateCoupon(options: ValidateCouponOptions): Promise<ValidateCouponResult> {
    const {
      supabase,
      tenantId,
      code,
      subtotalCents,
      userIdentifier,
      hasDigitalItems = false,
      hasPhysicalItems = true,
    } = options;
    const log = this.log.child({ tenantId, code });

    const normalizedCode = code.toUpperCase().trim();

    // Find active coupon
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      log.error('coupon_fetch_failed', { error: error.message });
      return {
        valid: false,
        discountCents: 0,
        discountFormatted: '$0',
        error: 'Error al validar el cupon',
        errorCode: 'FETCH_ERROR',
      };
    }

    if (!coupon) {
      return {
        valid: false,
        discountCents: 0,
        discountFormatted: '$0',
        error: 'Cupon no valido',
        errorCode: 'NOT_FOUND',
      };
    }

    const now = new Date();

    // Check valid_from
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return {
        valid: false,
        discountCents: 0,
        discountFormatted: '$0',
        error: 'Este cupon aun no esta activo',
        errorCode: 'NOT_STARTED',
      };
    }

    // Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return {
        valid: false,
        discountCents: 0,
        discountFormatted: '$0',
        error: 'Este cupon ha expirado',
        errorCode: 'EXPIRED',
      };
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return {
        valid: false,
        discountCents: 0,
        discountFormatted: '$0',
        error: 'Este cupon ya ha sido usado el maximo de veces',
        errorCode: 'MAX_USES_REACHED',
      };
    }

    // Check product type applicability
    if (hasDigitalItems && !coupon.applies_to_digital) {
      return {
        valid: false,
        discountCents: 0,
        discountFormatted: '$0',
        error: 'Este cupon no aplica a productos digitales',
        errorCode: 'NOT_FOR_DIGITAL',
      };
    }

    if (hasPhysicalItems && !coupon.applies_to_physical) {
      return {
        valid: false,
        discountCents: 0,
        discountFormatted: '$0',
        error: 'Este cupon no aplica a productos fisicos',
        errorCode: 'NOT_FOR_PHYSICAL',
      };
    }

    // Check minimum purchase
    if (subtotalCents < coupon.min_purchase_cents) {
      const minPurchaseFormatted = this.formatCurrency(coupon.min_purchase_cents);
      return {
        valid: false,
        discountCents: 0,
        discountFormatted: '$0',
        error: `Compra minima requerida: ${minPurchaseFormatted}`,
        errorCode: 'MIN_PURCHASE_NOT_MET',
      };
    }

    // Check per-user usage limit
    if (userIdentifier && coupon.max_uses_per_user) {
      const { count } = await supabase
        .from('coupon_usage')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_identifier', userIdentifier);

      if (count !== null && count >= coupon.max_uses_per_user) {
        return {
          valid: false,
          discountCents: 0,
          discountFormatted: '$0',
          error: 'Ya has usado este cupon el maximo de veces permitido',
          errorCode: 'USER_MAX_USES_REACHED',
        };
      }
    }

    // Calculate discount
    let discountCents = 0;

    switch (coupon.type) {
      case 'percentage':
        discountCents = Math.floor(subtotalCents * (coupon.value / 100));
        break;
      case 'fixed':
        discountCents = Math.floor(coupon.value * 100); // Convert to cents
        break;
      case 'free_shipping':
        discountCents = 0; // Shipping handled separately
        break;
    }

    // Apply max discount cap if set
    if (coupon.max_discount_cents !== null && discountCents > coupon.max_discount_cents) {
      discountCents = coupon.max_discount_cents;
    }

    // Ensure discount doesn't exceed subtotal
    if (discountCents > subtotalCents) {
      discountCents = subtotalCents;
    }

    log.info('coupon_validated', { couponId: coupon.id, discountCents });

    return {
      valid: true,
      coupon: coupon as unknown as Coupon,
      discountCents,
      discountFormatted: this.formatCurrency(discountCents),
    };
  }

  /**
   * Apply a coupon to an order (record usage)
   */
  async applyCoupon(options: ApplyCouponOptions): Promise<{ success: boolean; error?: string }> {
    const { supabase, couponId, orderId, tenantId, userIdentifier, userEmail, discountAppliedCents } =
      options;
    const log = this.log.child({ couponId, orderId });

    // Record usage
    const { error: usageError } = await supabase.from('coupon_usage').insert({
      coupon_id: couponId,
      order_id: orderId,
      tenant_id: tenantId,
      user_identifier: userIdentifier || null,
      user_email: userEmail || null,
      discount_applied_cents: discountAppliedCents,
    });

    if (usageError) {
      log.error('coupon_usage_record_failed', { error: usageError.message });
      return { success: false, error: 'Error al aplicar el cupon' };
    }

    // Update order with coupon info
    const { error: orderError } = await supabase
      .from('unified_orders')
      .update({
        coupon_id: couponId,
        coupon_discount_cents: discountAppliedCents,
      })
      .eq('id', orderId);

    if (orderError) {
      log.error('order_coupon_update_failed', { error: orderError.message });
      // Don't fail - usage was already recorded
    }

    log.info('coupon_applied', { discountAppliedCents });
    return { success: true };
  }

  /**
   * Get all coupons for a tenant
   */
  async getCoupons(
    supabase: SupabaseClient<Database>,
    tenantId: string,
    options?: {
      activeOnly?: boolean;
      includeExpired?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ coupons: Coupon[]; total: number }> {
    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    if (!options?.includeExpired) {
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      this.log.error('coupons_fetch_failed', { error: error.message, tenantId });
      return { coupons: [], total: 0 };
    }

    return {
      coupons: (data || []) as unknown as Coupon[],
      total: count || 0,
    };
  }

  /**
   * Get a single coupon by ID
   */
  async getCoupon(
    supabase: SupabaseClient<Database>,
    couponId: string
  ): Promise<Coupon | null> {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as unknown as Coupon;
  }

  /**
   * Update a coupon
   */
  async updateCoupon(
    supabase: SupabaseClient<Database>,
    couponId: string,
    updates: Partial<CreateCouponInput> & { isActive?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    const updateData: Record<string, unknown> = {};

    if (updates.value !== undefined) updateData.value = updates.value;
    if (updates.minPurchaseCents !== undefined) updateData.min_purchase_cents = updates.minPurchaseCents;
    if (updates.maxDiscountCents !== undefined) updateData.max_discount_cents = updates.maxDiscountCents;
    if (updates.maxUses !== undefined) updateData.max_uses = updates.maxUses;
    if (updates.maxUsesPerUser !== undefined) updateData.max_uses_per_user = updates.maxUsesPerUser;
    if (updates.expiresAt !== undefined)
      updateData.expires_at = updates.expiresAt?.toISOString() || null;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.appliesToDigital !== undefined) updateData.applies_to_digital = updates.appliesToDigital;
    if (updates.appliesToPhysical !== undefined) updateData.applies_to_physical = updates.appliesToPhysical;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase.from('coupons').update(updateData).eq('id', couponId);

    if (error) {
      this.log.error('coupon_update_failed', { error: error.message, couponId });
      return { success: false, error: 'Error al actualizar el cupon' };
    }

    return { success: true };
  }

  /**
   * Delete a coupon
   */
  async deleteCoupon(
    supabase: SupabaseClient<Database>,
    couponId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);

    if (error) {
      this.log.error('coupon_delete_failed', { error: error.message, couponId });
      return { success: false, error: 'Error al eliminar el cupon' };
    }

    return { success: true };
  }

  /**
   * Get coupon usage statistics
   */
  async getCouponStats(
    supabase: SupabaseClient<Database>,
    couponId: string
  ): Promise<{
    totalUses: number;
    totalDiscountCents: number;
    uniqueUsers: number;
    usageByDate: Array<{ date: string; uses: number; discount_cents: number }>;
  }> {
    const { data, error } = await supabase
      .from('coupon_usage')
      .select('user_identifier, discount_applied_cents, used_at')
      .eq('coupon_id', couponId);

    if (error || !data) {
      return {
        totalUses: 0,
        totalDiscountCents: 0,
        uniqueUsers: 0,
        usageByDate: [],
      };
    }

    const uniqueUsers = new Set(data.filter((u) => u.user_identifier).map((u) => u.user_identifier))
      .size;
    const totalDiscountCents = data.reduce((sum, u) => sum + (u.discount_applied_cents || 0), 0);

    // Group by date
    const usageByDate = data.reduce(
      (acc, usage) => {
        const date = new Date(usage.used_at).toISOString().split('T')[0];
        const existing = acc.find((d) => d.date === date);
        if (existing) {
          existing.uses++;
          existing.discount_cents += usage.discount_applied_cents || 0;
        } else {
          acc.push({ date, uses: 1, discount_cents: usage.discount_applied_cents || 0 });
        }
        return acc;
      },
      [] as Array<{ date: string; uses: number; discount_cents: number }>
    );

    return {
      totalUses: data.length,
      totalDiscountCents,
      uniqueUsers,
      usageByDate: usageByDate.sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}

// Export singleton instance
export const couponService = new CouponService();
