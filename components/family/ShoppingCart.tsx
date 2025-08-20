'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ShoppingCartProps {
  onCheckout: () => void;
  className?: string;
}

export function ShoppingCart({ onCheckout, className }: ShoppingCartProps) {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
  } = useUnifiedCartStore();
  
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={closeCart}
        aria-hidden="true"
      />
      
      {/* Cart Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50",
          "transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              Carrito ({totalItems} {totalItems === 1 ? 'foto' : 'fotos'})
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeCart}
            aria-label="Cerrar carrito"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Tu carrito está vacío</p>
              <p className="text-sm text-gray-400 mt-2">
                Agrega fotos desde la galería
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.photoId}
                  className="flex gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Photo Thumbnail */}
                  {item.watermarkUrl && (
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <Image
                        src={item.watermarkUrl}
                        alt={item.filename}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  
                  {/* Item Details */}
                  <div className="flex-1">
                    <h3 className="text-sm font-medium line-clamp-1">
                      {item.filename}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatCurrency(item.price)} c/u
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.photoId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="text-sm font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.photoId, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      
                      <div className="ml-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => removeItem(item.photoId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtotal */}
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(totalPrice)}
              </span>
            </div>
            
            {/* Actions */}
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  closeCart();
                  onCheckout();
                }}
              >
                Proceder al Pago
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={clearCart}
              >
                Vaciar Carrito
              </Button>
            </div>
            
            {/* Info */}
            <p className="text-xs text-gray-500 text-center">
              Los pagos se procesan de forma segura a través de Mercado Pago
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Cart Button Component (to open the cart)
export function CartButton({ className }: { className?: string }) {
  const { openCart, getTotalItems } = useUnifiedCartStore();
  const totalItems = getTotalItems();
  
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("relative", className)}
      onClick={openCart}
      aria-label={`Carrito con ${totalItems} items`}
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Button>
  );
}