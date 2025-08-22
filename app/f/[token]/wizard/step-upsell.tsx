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
  const { 
    selectedOption, 
    selectedUpsells, 
    setUpsell, 
    calculatePrices 
  } = useWizardStore();
  
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

  const hasUpsells = Object.values(selectedUpsells).some(qty => qty > 0);

  // Group upsells by category
  const upsellsByCategory = {
    copy: AVAILABLE_UPSELLS.filter(u => u.category === 'copy'),
    size: AVAILABLE_UPSELLS.filter(u => u.category === 'size'),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ¿Querés agregar extras?
        </h1>
        <p className="text-lg text-gray-600">
          Agregá copias adicionales o cambiá el tamaño de tus fotos
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <GiftIcon className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm text-blue-700">Los extras son opcionales, podés continuar sin agregar nada</span>
        </div>
      </div>

      {/* Current Selection Summary */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-2">Tu selección actual:</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700">{selectedOption?.name}</p>
            <p className="text-sm text-gray-600">{selectedOption?.photos} foto{selectedOption?.photos !== 1 ? 's' : ''} seleccionada{selectedOption?.photos !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-xl font-bold text-purple-600">
            {formatPrice(priceBreakdown.basePrice)}
          </div>
        </div>
      </div>

      {/* Upsells Sections */}
      <div className="space-y-8 mb-8">
        {/* Copy Extras */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ShoppingCartIcon className="h-6 w-6 mr-2 text-gray-600" />
            Copias adicionales
          </h3>
          <div className="grid gap-4">
            {upsellsByCategory.copy.map((upsell) => {
              const quantity = selectedUpsells[upsell.id] || 0;
              const totalPrice = upsell.price * quantity;
              
              return (
                <div
                  key={upsell.id}
                  className={`border-2 rounded-xl p-6 transition-all ${
                    quantity > 0
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{upsell.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatPrice(upsell.price)} por unidad
                      </p>
                      {quantity > 0 && (
                        <p className="text-sm font-medium text-purple-600 mt-1">
                          Total: {formatPrice(totalPrice)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(upsell.id, -1)}
                        disabled={quantity === 0}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          quantity > 0
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                      
                      <span className="w-12 text-center font-semibold text-lg">
                        {quantity}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityChange(upsell.id, 1)}
                        className="w-10 h-10 rounded-full bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center transition-colors"
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
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="h-6 w-6 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
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
                  className={`border-2 rounded-xl p-6 transition-all ${
                    quantity > 0
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{upsell.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatPrice(upsell.price)} por foto
                      </p>
                      {quantity > 0 && (
                        <p className="text-sm font-medium text-purple-600 mt-1">
                          Total: {formatPrice(totalPrice)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(upsell.id, -1)}
                        disabled={quantity === 0}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          quantity > 0
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                      
                      <span className="w-12 text-center font-semibold text-lg">
                        {quantity}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityChange(upsell.id, 1)}
                        className="w-10 h-10 rounded-full bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center transition-colors"
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Resumen de precios</h3>
        <div className="space-y-2">
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
          
          {hasUpsells && (
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal extras</span>
                <span className="font-medium">{formatPrice(priceBreakdown.upsellsPrice)}</span>
              </div>
            </div>
          )}
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-purple-600">{formatPrice(priceBreakdown.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          ← Cambiar fotos
        </button>
        
        <button
          onClick={onNext}
          className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all"
        >
          Ver resumen final →
        </button>
      </div>
    </div>
  );
}