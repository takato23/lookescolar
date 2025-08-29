'use client';

import { useState } from 'react';
import { PlusIcon, MinusIcon, ShoppingCartIcon, GiftIcon } from 'lucide-react';
import { useWizardStore, AVAILABLE_UPSELLS } from '@/lib/stores/wizard-store';
import { formatPrice, calculatePriceBreakdown } from '@/lib/pricing';

interface StepUpsellProps {
  onNext: () => void;
  onPrev: () => void;
}

export default function StepUpsell({ onNext, onPrev }: StepUpsellProps) {
  const { selectedOption, selectedUpsells, setUpsell, calculatePrices } =
    useWizardStore();

  // Calculate price breakdown
  const priceBreakdown = calculatePriceBreakdown(
    selectedOption,
    selectedUpsells,
    AVAILABLE_UPSELLS
  );

  const handleQuantityChange = (upsellId: string, delta: number) => {
    const currentQuantity = selectedUpsells[upsellId] || 0;
    const newQuantity = Math.max(0, currentQuantity + delta);
    setUpsell(upsellId, newQuantity);
  };

  const hasUpsells = Object.values(selectedUpsells).some((qty) => qty > 0);

  // Group upsells by category
  const upsellsByCategory = {
    copy: AVAILABLE_UPSELLS.filter((u) => u.category === 'copy'),
    size: AVAILABLE_UPSELLS.filter((u) => u.category === 'size'),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          ¿Querés agregar extras?
        </h1>
        <p className="text-lg text-gray-600">
          Agregá copias adicionales o cambiá el tamaño de tus fotos
        </p>
        <div className="mt-4 inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <GiftIcon className="mr-2 h-5 w-5 text-blue-600" />
          <span className="text-sm text-blue-700">
            Los extras son opcionales, podés continuar sin agregar nada
          </span>
        </div>
      </div>

      {/* Current Selection Summary */}
      <div className="mb-8 rounded-xl border border-purple-200 bg-purple-50 p-6">
        <h3 className="mb-2 font-semibold text-gray-900">
          Tu selección actual:
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700">{selectedOption?.name}</p>
            <p className="text-sm text-gray-600">
              {selectedOption?.photos} foto
              {selectedOption?.photos !== 1 ? 's' : ''} seleccionada
              {selectedOption?.photos !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-xl font-bold text-purple-600">
            {formatPrice(priceBreakdown.basePrice)}
          </div>
        </div>
      </div>

      {/* Upsells Sections */}
      <div className="mb-8 space-y-8">
        {/* Copy Extras */}
        <div>
          <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900">
            <ShoppingCartIcon className="mr-2 h-6 w-6 text-gray-600" />
            Copias adicionales
          </h3>
          <div className="grid gap-4">
            {upsellsByCategory.copy.map((upsell) => {
              const quantity = selectedUpsells[upsell.id] || 0;
              const totalPrice = upsell.price * quantity;

              return (
                <div
                  key={upsell.id}
                  className={`rounded-xl border-2 p-6 transition-all ${
                    quantity > 0
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {upsell.name}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatPrice(upsell.price)} por unidad
                      </p>
                      {quantity > 0 && (
                        <p className="mt-1 text-sm font-medium text-purple-600">
                          Total: {formatPrice(totalPrice)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(upsell.id, -1)}
                        disabled={quantity === 0}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                          quantity > 0
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'cursor-not-allowed bg-gray-100 text-gray-400'
                        }`}
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>

                      <span className="w-12 text-center text-lg font-semibold">
                        {quantity}
                      </span>

                      <button
                        onClick={() => handleQuantityChange(upsell.id, 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Size Extras */}
        <div>
          <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900">
            <svg
              className="mr-2 h-6 w-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5"
              />
            </svg>
            Tamaños especiales
          </h3>
          <div className="grid gap-4">
            {upsellsByCategory.size.map((upsell) => {
              const quantity = selectedUpsells[upsell.id] || 0;
              const totalPrice = upsell.price * quantity;

              return (
                <div
                  key={upsell.id}
                  className={`rounded-xl border-2 p-6 transition-all ${
                    quantity > 0
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {upsell.name}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatPrice(upsell.price)} por foto
                      </p>
                      {quantity > 0 && (
                        <p className="mt-1 text-sm font-medium text-purple-600">
                          Total: {formatPrice(totalPrice)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(upsell.id, -1)}
                        disabled={quantity === 0}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                          quantity > 0
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'cursor-not-allowed bg-gray-100 text-gray-400'
                        }`}
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>

                      <span className="w-12 text-center text-lg font-semibold">
                        {quantity}
                      </span>

                      <button
                        onClick={() => handleQuantityChange(upsell.id, 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-gray-900">Resumen de precios</h3>
        <div className="space-y-2">
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

          {hasUpsells && (
            <div className="mt-2 border-t pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal extras</span>
                <span className="font-medium">
                  {formatPrice(priceBreakdown.upsellsPrice)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-2 border-t pt-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-purple-600">
                {formatPrice(priceBreakdown.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          ← Cambiar fotos
        </button>

        <button
          onClick={onNext}
          className="rounded-xl bg-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-purple-700 hover:shadow-xl"
        >
          Ver resumen final →
        </button>
      </div>
    </div>
  );
}
