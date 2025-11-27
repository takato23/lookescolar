'use client';

import { useState } from 'react';
import { Tag, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnifiedCartStore, type AppliedCoupon } from '@/lib/stores/unified-cart-store';
import { useIsFeatureEnabled } from '@/lib/hooks/useTenantFeatures';
import { cn } from '@/lib/utils';

interface CouponInputProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function CouponInput({ className, variant = 'default' }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');

  // Check if coupons are enabled for this tenant
  const couponsEnabled = useIsFeatureEnabled('coupons_enabled');

  const appliedCoupon = useUnifiedCartStore((state) => state.appliedCoupon);
  const couponError = useUnifiedCartStore((state) => state.couponError);
  const isValidatingCoupon = useUnifiedCartStore((state) => state.isValidatingCoupon);
  const applyCoupon = useUnifiedCartStore((state) => state.applyCoupon);
  const removeCoupon = useUnifiedCartStore((state) => state.removeCoupon);

  // Don't render if coupons are disabled
  if (!couponsEnabled) {
    return null;
  }

  const handleApply = async () => {
    const success = await applyCoupon(couponCode);
    if (success) {
      setCouponCode('');
    }
  };

  const handleRemove = () => {
    removeCoupon();
    setCouponCode('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // Si hay un cupón aplicado, mostrar el badge
  if (appliedCoupon) {
    return (
      <div className={cn('', className)}>
        <AppliedCouponBadge coupon={appliedCoupon} onRemove={handleRemove} />
      </div>
    );
  }

  // Variante compacta
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cupón"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              disabled={isValidatingCoupon}
              className="pl-9 h-9 text-sm uppercase"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleApply}
            disabled={isValidatingCoupon || !couponCode.trim()}
            className="h-9 px-3"
          >
            {isValidatingCoupon ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Aplicar'
            )}
          </Button>
        </div>
        {couponError && (
          <p className="text-xs text-red-500">{couponError}</p>
        )}
      </div>
    );
  }

  // Variante default
  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Tag className="h-4 w-4" />
        Cupón de descuento
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Ingresa tu código"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          disabled={isValidatingCoupon}
          className="uppercase"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleApply}
          disabled={isValidatingCoupon || !couponCode.trim()}
          className="shrink-0"
        >
          {isValidatingCoupon ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Validando...
            </>
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {couponError && (
        <p className="text-sm text-red-500">{couponError}</p>
      )}
    </div>
  );
}

interface AppliedCouponBadgeProps {
  coupon: AppliedCoupon;
  onRemove: () => void;
}

function AppliedCouponBadge({ coupon, onRemove }: AppliedCouponBadgeProps) {
  const discountText = coupon.discountType === 'percentage'
    ? `${coupon.discountValue}% OFF`
    : `$${(coupon.discountCents / 100).toLocaleString('es-AR')} OFF`;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <div>
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
            {coupon.code}
          </span>
          <span className="text-xs text-green-600 dark:text-green-400 ml-2">
            {discountText}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-6 w-6 p-0 text-green-600 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Quitar cupón</span>
      </Button>
    </div>
  );
}

export default CouponInput;
