'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircleIcon, CreditCardIcon, ShoppingBagIcon, EditIcon } from 'lucide-react';
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

export default function StepSummary({ photos, onPrev, onCheckout, loading = false }: StepSummaryProps) {
  const { 
    selectedOption, 
    selectedPhotos, 
    selectedUpsells, 
    setStep 
  } = useWizardStore();
  
  // Calculate price breakdown
  const priceBreakdown = calculatePriceBreakdown(
    selectedOption,
    selectedUpsells,
    AVAILABLE_UPSELLS
  );
  
  // Get selected photos with counts
  const photoCounts = selectedPhotos.reduce((counts, photoId) => {
    counts[photoId] = (counts[photoId] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const selectedPhotoObjects = Object.keys(photoCounts)
    .map(photoId => photos.find(p => p.id === photoId))
    .filter(Boolean) as Photo[];

  const BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Confirmá tu pedido
        </h1>
        <p className="text-lg text-gray-600">
          Revisá todos los detalles antes de proceder al pago
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Details */}
        <div className="space-y-6">
          {/* Package Selection */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Paquete seleccionado</h3>
              <button
                onClick={() => setStep(1)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center"
              >
                <EditIcon className="h-4 w-4 mr-1" />
                Cambiar
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 rounded-lg p-3">
                <ShoppingBagIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{selectedOption?.name}</h4>
                <p className="text-sm text-gray-600">{selectedOption?.description}</p>
                <p className="text-lg font-semibold text-purple-600 mt-1">
                  {formatPrice(priceBreakdown.basePrice)}
                </p>
              </div>
            </div>
          </div>

          {/* Selected Photos */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Fotos seleccionadas ({selectedPhotos.length})
              </h3>
              <button
                onClick={() => setStep(2)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center"
              >
                <EditIcon className="h-4 w-4 mr-1" />
                Cambiar
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {selectedPhotoObjects.map((photo) => {
                const count = photoCounts[photo.id];
                return (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={photo.preview_url}
                      alt={photo.filename}
                      fill
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />
                    {count > 1 && (
                      <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
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
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Extras agregados</h3>
                <button
                  onClick={() => setStep(3)}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center"
                >
                  <EditIcon className="h-4 w-4 mr-1" />
                  Cambiar
                </button>
              </div>
              <div className="space-y-3">
                {priceBreakdown.items
                  .filter(item => item.category !== 'base')
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
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
          <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del pedido</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{selectedOption?.name}</span>
                <span className="font-medium">{formatPrice(priceBreakdown.basePrice)}</span>
              </div>
              
              {priceBreakdown.items
                .filter(item => item.category !== 'base')
                .map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
              
              {priceBreakdown.upsellsPrice > 0 && (
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal extras</span>
                    <span className="font-medium">{formatPrice(priceBreakdown.upsellsPrice)}</span>
                  </div>
                </div>
              )}
              
              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-purple-600">{formatPrice(priceBreakdown.total)}</span>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">Pago seguro</p>
                  <p className="text-xs text-green-600">Procesado por Mercado Pago</p>
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              disabled={loading}
              className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center ${
                loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCardIcon className="h-6 w-6 mr-2" />
                  Pagar {formatPrice(priceBreakdown.total)}
                </>
              )}
            </button>

            {/* Payment Info */}
            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>Al hacer clic en "Pagar" serás redirigido a Mercado Pago</p>
              <p className="mt-1">Aceptamos tarjetas de crédito, débito y otros medios de pago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-8 text-center">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          ← Volver a extras
        </button>
      </div>
    </div>
  );
}