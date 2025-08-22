'use client';

import { useState } from 'react';
import { CheckCircleIcon, ShoppingCartIcon, PlusIcon, MinusIcon, InfoIcon } from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { PACKAGE_OPTIONS, ADDITIONAL_COPIES, calculateUnifiedTotal, formatPrice, PackageOption, AdditionalCopy } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface ShoppingSectionProps {
  token: string;
  photos: Array<{ id: string; filename: string; preview_url: string }>;
  className?: string;
}

export function ShoppingSection({ token, photos, className }: ShoppingSectionProps) {
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [additionalCopies, setAdditionalCopies] = useState<Record<string, number>>({});
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  
  const { items, getTotalItems } = useUnifiedCartStore();

  // Calculate totals
  const { packagePrice, additionalPrice, total, breakdown } = calculateUnifiedTotal(selectedPackage, additionalCopies);

  const handlePackageSelect = (pkg: PackageOption) => {
    setSelectedPackage(pkg);
  };

  const handleAdditionalCopyChange = (copyId: string, change: number) => {
    setAdditionalCopies(prev => {
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
        selectedPhotos: items.map(item => item.photoId),
        total
      });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
    <div className={cn("space-y-6", className)}>
      {/* Shopping Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-200 sticky top-6">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingCartIcon className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Opciones de Compra</h2>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-start gap-3">
            <InfoIcon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Cómo funciona:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
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
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">1. Selecciona tu Paquete</h3>
        
        <div className="space-y-4">
          {PACKAGE_OPTIONS.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                "border-2 rounded-xl p-4 cursor-pointer transition-all",
                selectedPackage?.id === pkg.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => handlePackageSelect(pkg)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-bold text-gray-900">{pkg.name}</h4>
                    {selectedPackage?.id === pkg.id && (
                      <CheckCircleIcon className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
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
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                      <span>
                        {include.quantity} {include.description} ({include.size})
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
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">2. Selección de Fotos</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">Fotos necesarias para tu paquete</p>
                <p className="text-sm text-gray-600">Selecciona fotos en la galería de la izquierda</p>
              </div>
              <div className="text-right">
                <div className={cn(
                  "text-2xl font-bold",
                  getSelectedPhotosCount() >= getRequiredPhotosForPackage() 
                    ? "text-green-600" 
                    : "text-orange-600"
                )}>
                  {getSelectedPhotosCount()} / {getRequiredPhotosForPackage()}
                </div>
                <p className="text-xs text-gray-500">seleccionadas</p>
              </div>
            </div>

            {getSelectedPhotosCount() > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-800">Fotos seleccionadas:</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {items.slice(0, 6).map((item) => (
                    <div key={item.photoId} className="text-xs text-green-700 truncate">
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
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800">
                  Necesitas seleccionar {getRequiredPhotosForPackage() - getSelectedPhotosCount()} fotos más para completar tu paquete.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Copies */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">3. Copias Adicionales (Opcional)</h3>
        
        <div className="space-y-3">
          {ADDITIONAL_COPIES.map((copy) => (
            <div key={copy.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{copy.name}</h4>
                <p className="text-sm text-gray-600">{copy.description} • {copy.size}</p>
                <p className="text-sm font-medium text-purple-600">{formatPrice(copy.price)} c/u</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAdditionalCopyChange(copy.id, -1)}
                  disabled={!additionalCopies[copy.id]}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                
                <span className="w-8 text-center font-medium">
                  {additionalCopies[copy.id] || 0}
                </span>
                
                <button
                  onClick={() => handleAdditionalCopyChange(copy.id, 1)}
                  className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors"
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
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Resumen del Pedido</h3>
          
          <div className="space-y-3">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {item.quantity > 1 && (
                    <span className="text-sm text-gray-600 ml-1">× {item.quantity}</span>
                  )}
                </div>
                <span className="font-medium text-gray-900">
                  {formatPrice(item.total)}
                </span>
              </div>
            ))}
            
            <div className="flex items-center justify-between py-3 border-t-2 border-purple-200">
              <span className="text-xl font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-purple-600">
                {formatPrice(total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Button */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <button
          onClick={handleCheckout}
          disabled={!canProceedToCheckout() || isCheckoutLoading}
          className={cn(
            "w-full py-4 px-6 rounded-xl font-bold text-lg transition-all",
            canProceedToCheckout() && !isCheckoutLoading
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          {isCheckoutLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Procesando...
            </div>
          ) : canProceedToCheckout() ? (
            `Comprar ahora - ${formatPrice(total)}`
          ) : (
            "Selecciona un paquete y fotos para continuar"
          )}
        </button>
        
        {!selectedPackage && (
          <p className="text-sm text-gray-500 text-center mt-2">
            Primero selecciona un paquete arriba
          </p>
        )}
        
        {selectedPackage && getSelectedPhotosCount() === 0 && (
          <p className="text-sm text-gray-500 text-center mt-2">
            Selecciona fotos en la galería para continuar
          </p>
        )}
        
        {selectedPackage && getSelectedPhotosCount() > 0 && getSelectedPhotosCount() < getRequiredPhotosForPackage() && (
          <p className="text-sm text-orange-600 text-center mt-2">
            Selecciona {getRequiredPhotosForPackage() - getSelectedPhotosCount()} fotos más
          </p>
        )}
      </div>
    </div>
  );
}