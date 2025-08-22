'use client';

import { useEffect } from 'react';
import { useWizardStore, AVAILABLE_UPSELLS } from '@/lib/stores/wizard-store';
import { formatPrice, calculatePriceBreakdown } from '@/lib/pricing';

interface PriceCalculatorProps {
  className?: string;
  showDetails?: boolean;
}

export default function PriceCalculator({ className = '', showDetails = true }: PriceCalculatorProps) {
  const { 
    selectedOption, 
    selectedUpsells, 
    calculatePrices 
  } = useWizardStore();
  
  // Calculate price breakdown
  const priceBreakdown = calculatePriceBreakdown(
    selectedOption,
    selectedUpsells,
    AVAILABLE_UPSELLS
  );
  
  // Recalculate prices when dependencies change
  useEffect(() => {
    calculatePrices();
  }, [selectedOption, selectedUpsells, calculatePrices]);

  if (!selectedOption) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <h3 className="font-semibold text-gray-900 mb-3">Resumen de precio</h3>
      
      <div className="space-y-2">
        {/* Base price */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{selectedOption.name}</span>
          <span className="font-medium">{formatPrice(priceBreakdown.basePrice)}</span>
        </div>
        
        {/* Upsells */}
        {showDetails && priceBreakdown.items
          .filter(item => item.category !== 'base')
          .map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium">{formatPrice(item.totalPrice)}</span>
            </div>
          ))}
        
        {/* Upsells subtotal */}
        {!showDetails && priceBreakdown.upsellsPrice > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Extras</span>
            <span className="font-medium">{formatPrice(priceBreakdown.upsellsPrice)}</span>
          </div>
        )}
        
        {/* Total */}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-purple-600">{formatPrice(priceBreakdown.total)}</span>
          </div>
        </div>
      </div>
      
      {/* Savings indicator */}
      {priceBreakdown.upsellsPrice > 0 && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <span className="text-green-700">
            💰 Has agregado {formatPrice(priceBreakdown.upsellsPrice)} en extras
          </span>
        </div>
      )}
    </div>
  );
}