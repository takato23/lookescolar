'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  couponCode?: string;
  couponType?: 'percentage' | 'fixed' | 'free_shipping';
  discountCents?: number;
  discountFormatted?: string;
  description?: string;
  error?: string;
  errorCode?: string;
}

interface AppliedCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  discountCents: number;
  discountFormatted: string;
  description?: string;
}

interface CouponInputProps {
  subtotalCents: number;
  hasDigitalItems?: boolean;
  hasPhysicalItems?: boolean;
  userIdentifier?: string;
  appliedCoupon: AppliedCoupon | null;
  onCouponApplied: (coupon: AppliedCoupon | null) => void;
  className?: string;
  disabled?: boolean;
}

export function CouponInput({
  subtotalCents,
  hasDigitalItems = false,
  hasPhysicalItems = true,
  userIdentifier,
  appliedCoupon,
  onCouponApplied,
  className,
  disabled = false,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!!appliedCoupon);

  const validateCoupon = useCallback(async () => {
    if (!code.trim()) {
      setError('Ingresa un codigo de cupon');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          subtotalCents,
          hasDigitalItems,
          hasPhysicalItems,
          userIdentifier,
        }),
      });

      const result: CouponValidationResult = await response.json();

      if (!result.valid) {
        setError(result.error || 'Cupon no valido');
        return;
      }

      // Apply coupon
      onCouponApplied({
        id: result.couponId!,
        code: result.couponCode!,
        type: result.couponType!,
        discountCents: result.discountCents!,
        discountFormatted: result.discountFormatted!,
        description: result.description,
      });

      setCode('');
      setError(null);
    } catch {
      setError('Error al validar el cupon');
    } finally {
      setLoading(false);
    }
  }, [code, subtotalCents, hasDigitalItems, hasPhysicalItems, userIdentifier, onCouponApplied]);

  const removeCoupon = useCallback(() => {
    onCouponApplied(null);
    setError(null);
  }, [onCouponApplied]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateCoupon();
    }
  };

  // If coupon is applied, show it
  if (appliedCoupon) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-800 dark:text-green-200">
                  {appliedCoupon.code}
                </span>
                <span className="text-sm text-green-600 dark:text-green-400">
                  -{appliedCoupon.discountFormatted}
                </span>
              </div>
              {appliedCoupon.description && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  {appliedCoupon.description}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeCoupon}
            disabled={disabled}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-200 dark:hover:bg-green-900"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Quitar cupon</span>
          </Button>
        </div>
      </div>
    );
  }

  // Collapsed state - just a button
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <Tag className="h-4 w-4" />
        <span>Tengo un cupon de descuento</span>
      </button>
    );
  }

  // Expanded state - input form
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Cupon de descuento</span>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Codigo de cupon"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          className={cn(
            'flex-1 uppercase',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
          autoComplete="off"
        />
        <Button
          type="button"
          onClick={validateCoupon}
          disabled={disabled || loading || !code.trim()}
          variant="secondary"
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setIsExpanded(false);
          setCode('');
          setError(null);
        }}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}

export type { AppliedCoupon, CouponValidationResult };
