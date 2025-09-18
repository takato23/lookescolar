'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  InfoIcon,
} from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import {
  PACKAGE_OPTIONS,
  ADDITIONAL_COPIES,
  calculateUnifiedTotal,
  formatPrice,
  PackageOption,
  AdditionalCopy,
} from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface ShoppingSectionProps {
  token: string;
  photos: Array<{ id: string; filename: string; preview_url: string }>;
  className?: string;
}

export function ShoppingSection({
  token,
  photos,
  className,
}: ShoppingSectionProps) {
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(
    null
  );
  const [additionalCopies, setAdditionalCopies] = useState<
    Record<string, number>
  >({});
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const { items, getTotalItems } = useUnifiedCartStore();

  // Calculate totals
  const { packagePrice, additionalPrice, total, breakdown } =
    calculateUnifiedTotal(selectedPackage, additionalCopies);

  const handlePackageSelect = (pkg: PackageOption) => {
    setSelectedPackage(pkg);
  };

  const handleAdditionalCopyChange = (copyId: string, change: number) => {
    setAdditionalCopies((prev) => {
      const currentQuantity = prev[copyId] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);

      if (newQuantity === 0) {
        const { [copyId]: removed, ...rest } = prev;
        return rest;
      }

      return { ...prev, [copyId]: newQuantity };
    });
  };

  const canProceedToCheckout = () => {
    return selectedPackage && getTotalItems() > 0;
  };

  const getSelectedPhotosCount = () => {
    return getTotalItems();
  };

  const getRequiredPhotosForPackage = () => {
    if (!selectedPackage) return 0;

    // Calculate total photos needed for package
    return selectedPackage.includes.reduce((total, include) => {
      if (include.type === 'individual' || include.type === 'grupo') {
        return total + include.quantity;
      }
      if (include.type === 'mini') {
        return total + include.quantity; // Each mini photo can be different
      }
      return total;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!canProceedToCheckout()) return;

    setIsCheckoutLoading(true);
    try {
      // Here you would implement the actual checkout logic
      // For now, we'll simulate the process
      console.log('Checkout data:', {
        package: selectedPackage,
        additionalCopies,
        selectedPhotos: items.map((item) => item.photoId),
        total,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In real implementation, redirect to payment processor
      alert(`Checkout iniciado por ${formatPrice(total)}`);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error al iniciar el checkout. Por favor, intenta de nuevo.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Shopping Header */}
      <div className="sticky top-6 rounded-2xl border border-purple-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <ShoppingCartIcon className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Opciones de Compra
          </h2>
        </div>

        <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
          <div className="flex items-start gap-3">
            <InfoIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600" />
            <div className="text-sm text-gray-700">
              <p className="mb-1 font-semibold">Cómo funciona:</p>
              <ol className="list-inside list-decimal space-y-1 text-xs">
                <li>Selecciona un paquete base (OPCIÓN A o B)</li>
                <li>Elige las fotos que quieres incluir</li>
                <li>Añade copias adicionales si lo deseas</li>
                <li>Completa tu compra</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Package Selection */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-bold text-gray-900">
          1. Selecciona tu Paquete
        </h3>

        <div className="space-y-4">
          {PACKAGE_OPTIONS.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                'cursor-pointer rounded-xl border-2 p-4 transition-all',
                selectedPackage?.id === pkg.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              onClick={() => handlePackageSelect(pkg)}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-bold text-gray-900">
                      {pkg.name}
                    </h4>
                    {selectedPackage?.id === pkg.id && (
                      <CheckCircleIcon className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {pkg.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPrice(pkg.price)}
                  </div>
                </div>
              </div>

              {/* Package includes */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Incluye:</p>
                <div className="grid grid-cols-1 gap-2">
                  {pkg.includes.map((include, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-purple-400"></div>
                      <span>
                        {include.quantity} {include.description} ({include.size}
                        )
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Selection Status */}
      {selectedPackage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-xl font-bold text-gray-900">
            2. Selección de Fotos
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <div>
                <p className="font-medium text-gray-900">
                  Fotos necesarias para tu paquete
                </p>
                <p className="text-sm text-gray-600">
                  Selecciona fotos en la galería de la izquierda
                </p>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    'text-2xl font-bold',
                    getSelectedPhotosCount() >= getRequiredPhotosForPackage()
                      ? 'text-green-600'
                      : 'text-orange-600'
                  )}
                >
                  {getSelectedPhotosCount()} / {getRequiredPhotosForPackage()}
                </div>
                <p className="text-xs text-gray-500">seleccionadas</p>
              </div>
            </div>

            {getSelectedPhotosCount() > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-800">
                    Fotos seleccionadas:
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {items.slice(0, 6).map((item) => (
                    <div
                      key={item.photoId}
                      className="truncate text-xs text-green-700"
                    >
                      {item.filename}
                    </div>
                  ))}
                  {items.length > 6 && (
                    <div className="text-xs text-green-700">
                      +{items.length - 6} más...
                    </div>
                  )}
                </div>
              </div>
            )}

            {getSelectedPhotosCount() < getRequiredPhotosForPackage() && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 p-4">
                <p className="text-sm text-orange-800">
                  Necesitas seleccionar{' '}
                  {getRequiredPhotosForPackage() - getSelectedPhotosCount()}{' '}
                  fotos más para completar tu paquete.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Copies */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-bold text-gray-900">
          3. Copias Adicionales (Opcional)
        </h3>

        <div className="space-y-3">
          {ADDITIONAL_COPIES.map((copy) => (
            <div
              key={copy.id}
              className="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{copy.name}</h4>
                <p className="text-sm text-gray-600">
                  {copy.description} • {copy.size}
                </p>
                <p className="text-sm font-medium text-purple-600">
                  {formatPrice(copy.price)} c/u
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAdditionalCopyChange(copy.id, -1)}
                  disabled={!additionalCopies[copy.id]}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>

                <span className="w-8 text-center font-medium">
                  {additionalCopies[copy.id] || 0}
                </span>

                <button
                  onClick={() => handleAdditionalCopyChange(copy.id, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      {selectedPackage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Resumen del Pedido
          </h3>

          <div className="space-y-3">
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
              >
                <div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {item.quantity > 1 && (
                    <span className="ml-1 text-sm text-gray-600">
                      × {item.quantity}
                    </span>
                  )}
                </div>
                <span className="font-medium text-gray-900">
                  {formatPrice(item.total)}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between border-t-2 border-purple-200 py-3">
              <span className="text-xl font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-purple-600">
                {formatPrice(total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Button */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <button
          onClick={handleCheckout}
          disabled={!canProceedToCheckout() || isCheckoutLoading}
          className={cn(
            'w-full rounded-xl px-6 py-4 text-lg font-bold transition-all',
            canProceedToCheckout() && !isCheckoutLoading
              ? 'transform bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:scale-105 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          )}
        >
          {isCheckoutLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Procesando...
            </div>
          ) : canProceedToCheckout() ? (
            `Comprar ahora - ${formatPrice(total)}`
          ) : (
            'Selecciona un paquete y fotos para continuar'
          )}
        </button>

        {!selectedPackage && (
          <p className="mt-2 text-center text-sm text-gray-500">
            Primero selecciona un paquete arriba
          </p>
        )}

        {selectedPackage && getSelectedPhotosCount() === 0 && (
          <p className="mt-2 text-center text-sm text-gray-500">
            Selecciona fotos en la galería para continuar
          </p>
        )}

        {selectedPackage &&
          getSelectedPhotosCount() > 0 &&
          getSelectedPhotosCount() < getRequiredPhotosForPackage() && (
            <p className="mt-2 text-center text-sm text-orange-600">
              Selecciona{' '}
              {getRequiredPhotosForPackage() - getSelectedPhotosCount()} fotos
              más
            </p>
          )}
      </div>
    </div>
  );
}
