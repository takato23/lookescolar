'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  CheckCircleIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  EditIcon,
} from 'lucide-react';
import { useWizardStore, AVAILABLE_UPSELLS } from '@/lib/stores/wizard-store';
import { formatPrice, calculatePriceBreakdown } from '@/lib/pricing';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
}

interface StepSummaryProps {
  photos: Photo[];
  onPrev: () => void;
  onCheckout: () => void;
  loading?: boolean;
}

export default function StepSummary({
  photos,
  onPrev,
  onCheckout,
  loading = false,
}: StepSummaryProps) {
  const { selectedOption, selectedPhotos, selectedUpsells, setStep } =
    useWizardStore();

  // Calculate price breakdown
  const priceBreakdown = calculatePriceBreakdown(
    selectedOption,
    selectedUpsells,
    AVAILABLE_UPSELLS
  );

  // Flatten enhanced selectedPhotos structure
  const selectedPhotosFlat = [
    ...(selectedPhotos?.individual || []),
    ...(selectedPhotos?.group || []),
  ];

  // Get selected photos with counts
  const photoCounts = selectedPhotosFlat.reduce(
    (counts, photoId) => {
      counts[photoId] = (counts[photoId] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>
  );

  const selectedPhotoObjects = Object.keys(photoCounts)
    .map((photoId) => photos.find((p) => p.id === photoId))
    .filter(Boolean) as Photo[];

  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Confirmá tu pedido
        </h1>
        <p className="text-lg text-gray-600">
          Revisá todos los detalles antes de proceder al pago
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Order Details */}
        <div className="space-y-6">
          {/* Package Selection */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Paquete seleccionado
              </h3>
              <button
                onClick={() => setStep(1)}
                className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                <EditIcon className="mr-1 h-4 w-4" />
                Cambiar
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-purple-100 p-3">
                <ShoppingBagIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  {selectedOption?.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedOption?.description}
                </p>
                <p className="mt-1 text-lg font-semibold text-purple-600">
                  {formatPrice(priceBreakdown.basePrice)}
                </p>
              </div>
            </div>
          </div>

          {/* Selected Photos */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Fotos seleccionadas ({selectedPhotosFlat.length})
              </h3>
              <button
                onClick={() => setStep(2)}
                className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                <EditIcon className="mr-1 h-4 w-4" />
                Cambiar
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {selectedPhotoObjects.map((photo) => {
                const count = photoCounts[photo.id];
                return (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-lg"
                  >
                    <Image
                      src={photo.preview_url}
                      alt={photo.filename}
                      fill
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />
                    {count > 1 && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
                        {count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upsells */}
          {priceBreakdown.upsellsPrice > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Extras agregados
                </h3>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  <EditIcon className="mr-1 h-4 w-4" />
                  Cambiar
                </button>
              </div>
              <div className="space-y-3">
                {priceBreakdown.items
                  .filter((item) => item.category !== 'base')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatPrice(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-medium text-gray-900">
                        {formatPrice(item.totalPrice)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary & Checkout */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <div className="sticky top-8 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Resumen del pedido
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{selectedOption?.name}</span>
                <span className="font-medium">
                  {formatPrice(priceBreakdown.basePrice)}
                </span>
              </div>

              {priceBreakdown.items
                .filter((item) => item.category !== 'base')
                .map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatPrice(item.totalPrice)}
                    </span>
                  </div>
                ))}

              {priceBreakdown.upsellsPrice > 0 && (
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal extras</span>
                    <span className="font-medium">
                      {formatPrice(priceBreakdown.upsellsPrice)}
                    </span>
                  </div>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-purple-600">
                    {formatPrice(priceBreakdown.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="mr-2 h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Pago seguro
                  </p>
                  <p className="text-xs text-green-600">
                    Procesado por Mercado Pago
                  </p>
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              disabled={loading}
              className={`mt-6 flex w-full items-center justify-center rounded-xl py-4 text-lg font-semibold transition-all ${
                loading
                  ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                  : 'bg-purple-600 text-white shadow-lg hover:bg-purple-700 hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCardIcon className="mr-2 h-6 w-6" />
                  Pagar {formatPrice(priceBreakdown.total)}
                </>
              )}
            </button>

            {/* Payment Info */}
            <div className="mt-4 text-center text-xs text-gray-500">
              <p>Al hacer clic en "Pagar" serás redirigido a Mercado Pago</p>
              <p className="mt-1">
                Aceptamos tarjetas de crédito, débito y otros medios de pago
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-8 text-center">
        <button
          onClick={onPrev}
          className="rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          ← Volver a extras
        </button>
      </div>
    </div>
  );
}
