'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { X, Tag, User } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  details?: string[];
}

interface PixiesetCartSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping?: number;
  discount?: number;
  total: number;
  currency?: string;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (itemId: string) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onCheckout: () => void;
  onContinueShopping?: () => void;
  showCouponInput?: boolean;
  onApplyCoupon?: (code: string) => void;
  className?: string;
}

/**
 * Cart/Order Summary styled like Pixieset
 * Features: Clean layout, item list, order summary sidebar
 */
export function PixiesetCartSummary({
  items,
  subtotal,
  shipping = 0,
  discount = 0,
  total,
  currency = 'ARS',
  onRemoveItem,
  onEditItem,
  onUpdateQuantity,
  onCheckout,
  onContinueShopping,
  showCouponInput = true,
  onApplyCoupon,
  className,
}: PixiesetCartSummaryProps) {
  const [couponCode, setCouponCode] = React.useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim() && onApplyCoupon) {
      onApplyCoupon(couponCode.trim());
      setCouponCode('');
    }
  };

  return (
    <div className={cn('min-h-screen bg-white', className)}>
      {/* Header */}
      <header className="border-b border-neutral-200 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-medium uppercase tracking-wider text-neutral-900">
              Shopping Cart
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {onContinueShopping && (
              <button
                onClick={onContinueShopping}
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                View Gallery
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Cart Items */}
        <div className="flex-1 px-4 py-8 lg:px-8">
          <h2 className="mb-6 text-lg font-normal uppercase tracking-wider text-neutral-900">
            Shopping Cart
          </h2>

          {items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-neutral-500">Your cart is empty</p>
              {onContinueShopping && (
                <button
                  onClick={onContinueShopping}
                  className="mt-4 text-sm text-[#8b7355] hover:underline"
                >
                  Continue shopping
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 border-b border-neutral-100 pb-6"
                >
                  {/* Item Image */}
                  {item.imageUrl && (
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden bg-neutral-100">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-normal text-neutral-900">
                          {item.name}
                          {item.quantity > 1 && (
                            <span className="ml-2 text-sm text-neutral-500">
                              ({item.quantity} selected)
                            </span>
                          )}
                        </h3>
                        {item.details && item.details.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {item.details.map((detail, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-neutral-500">
                                <span className="text-neutral-400">•</span>
                                {detail}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-neutral-900">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        {onRemoveItem && (
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-neutral-400 hover:text-neutral-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Edit Button */}
                    {onEditItem && (
                      <button
                        onClick={() => onEditItem(item.id)}
                        className="mt-2 self-start border border-neutral-300 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-neutral-700 transition-colors hover:bg-neutral-50"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {items.length > 0 && (
            <div className="mt-12">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-900">
                You Might Also Like
              </h3>
              <p className="text-sm text-neutral-500">
                Check out our other packages and prints
              </p>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        {items.length > 0 && (
          <div className="w-full border-t border-neutral-200 bg-neutral-50 px-4 py-8 lg:w-96 lg:border-l lg:border-t-0 lg:px-8">
            <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-neutral-900">
              Order Summary
            </h2>

            {/* Summary Lines */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Subtotal</span>
                <span className="text-neutral-900">{formatPrice(subtotal)}</span>
              </div>

              {shipping > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Shipping</span>
                  <span className="text-neutral-900">{formatPrice(shipping)}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}

              <p className="text-xs text-neutral-400">
                Shipping and taxes will be calculated at checkout
              </p>
            </div>

            {/* Total */}
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium uppercase tracking-wider text-neutral-500">
                  Total
                </span>
                <span className="text-xl font-normal text-neutral-900">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              className="mt-6 w-full bg-[#8b7355] py-4 text-xs font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#7a6349]"
            >
              Proceed to Checkout
            </button>

            {/* Continue Shopping */}
            {onContinueShopping && (
              <button
                onClick={onContinueShopping}
                className="mt-3 w-full py-3 text-xs font-medium uppercase tracking-[0.15em] text-neutral-600 transition-colors hover:text-neutral-900"
              >
                Continue Shopping
              </button>
            )}

            {/* Coupon */}
            {showCouponInput && onApplyCoupon && (
              <div className="mt-8 border-t border-neutral-200 pt-6">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Tag className="h-4 w-4" />
                  Have a coupon or gift card? Add it in the next step.
                </div>
              </div>
            )}

            {/* Sign in */}
            <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
              <User className="h-4 w-4" />
              <button className="text-[#8b7355] hover:underline">
                Sign in
              </button>
              <span>to save your cart</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PixiesetCartSummary;
