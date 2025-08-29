/**
 * Store Access Button
 *
 * Provides access to the unified store from family galleries
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreAccessButtonProps {
  token: string;
  className?: string;
  variant?: 'button' | 'card' | 'banner';
  selectedPhotos?: string[];
}

export function StoreAccessButton({
  token,
  className,
  variant = 'button',
  selectedPhotos = [],
}: StoreAccessButtonProps) {
  const router = useRouter();

  const handleAccessStore = () => {
    const queryParams =
      selectedPhotos.length > 0 ? `?selected=${selectedPhotos.join(',')}` : '';

    router.push(`/f/${token}/store${queryParams}`);
  };

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white shadow-lg',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-lg font-semibold">¡Nueva Tienda Online!</h3>
              <Badge variant="secondary" className="bg-white/20 text-white">
                Nuevo
              </Badge>
            </div>
            <p className="mb-4 text-white/90">
              Crea carpetas personalizadas con tus fotos favoritas. Productos
              físicos de alta calidad entregados en tu casa.
            </p>
            <div className="flex items-center gap-4 text-sm text-white/80">
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span>Carpetas 20x30</span>
              </div>
              <div className="flex items-center gap-1">
                <ShoppingCart className="h-4 w-4" />
                <span>Desde $8,500</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAccessStore}
            variant="secondary"
            size="lg"
            className="bg-white text-purple-600 hover:bg-white/90"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Ir a la Tienda
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 p-4',
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-2">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Tienda Online</h4>
              <p className="text-xs text-gray-600">
                Productos físicos personalizados
              </p>
            </div>
          </div>
          <Badge variant="secondary">Nuevo</Badge>
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Opción A</span>
            <span className="font-medium">$8,500</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Opción B</span>
            <span className="font-medium">$12,500</span>
          </div>
          <div className="text-xs text-gray-500">
            + Copias adicionales disponibles
          </div>
        </div>

        <Button onClick={handleAccessStore} className="w-full" size="sm">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Explorar Productos
        </Button>
      </div>
    );
  }

  // Default button variant
  return (
    <Button
      onClick={handleAccessStore}
      className={cn('flex items-center gap-2', className)}
    >
      <ShoppingCart className="h-4 w-4" />
      Tienda
      {selectedPhotos.length > 0 && (
        <Badge variant="secondary" className="ml-1">
          {selectedPhotos.length}
        </Badge>
      )}
    </Button>
  );
}

export default StoreAccessButton;
