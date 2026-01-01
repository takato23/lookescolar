'use client';

import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Check,
  X,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import type { ProductOptions } from '@/lib/stores/unified-cart-store';
import { getRandomGalleryPlaceholder } from '@/lib/config/placeholder-images';

// Tipo de producto de la configuracion de tienda
export interface StoreProduct {
  id: string;
  name: string;
  type: 'physical' | 'digital';
  enabled: boolean;
  price: number; // en centavos
  description?: string;
  options?: {
    sizes?: string[];
    formats?: string[];
    quality?: 'standard' | 'premium';
  };
}

interface ProductOptionsSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (options: ProductOptions, finalPrice: number) => void;
  products: StoreProduct[];
  photoUrl: string;
  photoName?: string;
  defaultProductId?: string;
}

// Precios adicionales por opcion (en centavos)
const SIZE_PRICE_MULTIPLIERS: Record<string, number> = {
  '10x15': 1.0,
  '13x18': 1.3,
  '15x21': 1.5,
  '20x30': 2.0,
  '30x40': 2.5,
};

const FORMAT_PRICE_ADDITIONS: Record<string, number> = {
  'Brillante': 0,
  'Mate': 5000, // +$50
  'Satinado': 3000, // +$30
};

const QUALITY_MULTIPLIERS: Record<string, number> = {
  'standard': 1.0,
  'premium': 1.5,
};

export function ProductOptionsSelector({
  open,
  onClose,
  onConfirm,
  products,
  photoUrl,
  photoName,
  defaultProductId,
}: ProductOptionsSelectorProps) {
  // Filtrar solo productos habilitados
  const enabledProducts = useMemo(
    () => products.filter((p) => p.enabled),
    [products]
  );

  // Estado de seleccion
  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultProductId || enabledProducts[0]?.id || ''
  );
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedQuality, setSelectedQuality] = useState<'standard' | 'premium'>('standard');
  const [activeTab, setActiveTab] = useState<'packages' | 'prints'>('packages');
  const [imageError, setImageError] = useState(false);

  // Producto seleccionado actual
  const selectedProduct = enabledProducts.find((p) => p.id === selectedProductId);

  // Opciones disponibles del producto seleccionado
  const availableSizes = selectedProduct?.options?.sizes || ['10x15', '13x18', '15x21'];
  const availableFormats = selectedProduct?.options?.formats || ['Brillante', 'Mate'];
  const productQuality = selectedProduct?.options?.quality || 'standard';

  // Separar packages y prints
  const packages = enabledProducts.filter(p =>
    p.id.includes('opcion') || p.id.includes('carpeta') || p.name.toLowerCase().includes('opción')
  );
  const prints = enabledProducts.filter(p =>
    p.id.includes('copy') || p.id.includes('copia') || p.name.toLowerCase().includes('copia')
  );

  // Auto-seleccionar primera opcion cuando cambia el producto
  useEffect(() => {
    if (selectedProduct) {
      setSelectedSize(availableSizes[0] || '');
      setSelectedFormat(availableFormats[0] || '');
      setSelectedQuality(productQuality);
    }
  }, [selectedProductId]);

  // Calcular precio final
  const calculateFinalPrice = useMemo(() => {
    if (!selectedProduct) return 0;

    let price = selectedProduct.price;

    // Aplicar multiplicador de tamano
    const sizeMultiplier = SIZE_PRICE_MULTIPLIERS[selectedSize] || 1.0;
    price = Math.round(price * sizeMultiplier);

    // Agregar precio de formato
    const formatAddition = FORMAT_PRICE_ADDITIONS[selectedFormat] || 0;
    price += formatAddition;

    // Aplicar multiplicador de calidad
    const qualityMultiplier = QUALITY_MULTIPLIERS[selectedQuality] || 1.0;
    price = Math.round(price * qualityMultiplier);

    return price;
  }, [selectedProduct, selectedSize, selectedFormat, selectedQuality]);

  // Formatear precio para mostrar
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Manejar confirmacion
  const handleConfirm = () => {
    if (!selectedProduct) return;

    const options: ProductOptions = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      size: selectedSize,
      format: selectedFormat,
      quality: selectedQuality,
    };

    onConfirm(options, calculateFinalPrice);
    onClose();
  };

  // Resetear al cerrar
  const handleClose = () => {
    setSelectedProductId(defaultProductId || enabledProducts[0]?.id || '');
    setSelectedSize('');
    setSelectedFormat('');
    setSelectedQuality('standard');
    setImageError(false);
    onClose();
  };

  const displayImageUrl = imageError ? getRandomGalleryPlaceholder() : photoUrl;

  if (enabledProducts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm bg-white p-0 rounded-none border-0 shadow-xl">
          <div className="p-8 text-center">
            <p className="text-sm text-neutral-500">No hay productos configurados para esta tienda.</p>
            <button
              onClick={handleClose}
              className="mt-6 text-xs uppercase tracking-wider text-[#8b7355] hover:text-[#7a6349]"
            >
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-white p-0 gap-0 overflow-hidden rounded-none border-0 shadow-2xl">
        <div className="flex h-[80vh] max-h-[700px]">
          {/* Left Side - Photo Preview (Pixieset style) */}
          <div className="relative hidden w-1/2 bg-[#f5f4f2] lg:flex lg:items-center lg:justify-center">
            <img
              src={displayImageUrl}
              alt={photoName || 'Foto seleccionada'}
              className="max-h-[90%] max-w-[90%] object-contain shadow-lg"
              onError={() => setImageError(true)}
            />

            {/* Back button */}
            <button
              onClick={handleClose}
              className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center bg-white text-neutral-500 shadow-sm transition-colors hover:text-neutral-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Right Side - Options (Pixieset style) */}
          <div className="flex w-full flex-col lg:w-1/2">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
              <h2 className="text-base font-normal tracking-wide text-neutral-800">
                Comprar esta foto
              </h2>
              <button
                onClick={handleClose}
                className="text-neutral-400 transition-colors hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs - Pixieset style */}
            <div className="border-b border-neutral-100 px-6">
              <div className="flex gap-10">
                <button
                  onClick={() => setActiveTab('packages')}
                  className={cn(
                    'relative py-3 text-[13px] font-normal uppercase tracking-wider transition-colors',
                    activeTab === 'packages'
                      ? 'text-neutral-900'
                      : 'text-neutral-400 hover:text-neutral-600'
                  )}
                >
                  Paquetes
                  {activeTab === 'packages' && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-neutral-800" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('prints')}
                  className={cn(
                    'relative py-3 text-[13px] font-normal uppercase tracking-wider transition-colors',
                    activeTab === 'prints'
                      ? 'text-neutral-900'
                      : 'text-neutral-400 hover:text-neutral-600'
                  )}
                >
                  Copias
                  {activeTab === 'prints' && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-neutral-800" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {activeTab === 'packages' && (
                <div className="space-y-2">
                  {packages.length > 0 ? (
                    packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => setSelectedProductId(pkg.id)}
                        className={cn(
                          'w-full text-left transition-all border px-4 py-3',
                          selectedProductId === pkg.id
                            ? 'border-[#8b7355] bg-[#fcfbfa]'
                            : 'border-neutral-150 hover:border-neutral-300'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <h3 className="text-sm font-normal text-neutral-800">
                              {pkg.name}
                            </h3>
                            {pkg.description && (
                              <p className="mt-0.5 text-xs text-neutral-400 line-clamp-2">
                                {pkg.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-700">
                              {formatPrice(pkg.price)}
                            </span>
                            {selectedProductId === pkg.id && (
                              <Check className="h-4 w-4 text-[#8b7355]" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="py-8 text-center text-xs text-neutral-400">
                      No hay paquetes disponibles
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'prints' && (
                <div className="space-y-2">
                  {prints.length > 0 ? (
                    prints.map((print) => (
                      <button
                        key={print.id}
                        onClick={() => setSelectedProductId(print.id)}
                        className={cn(
                          'w-full text-left transition-all border px-4 py-3',
                          selectedProductId === print.id
                            ? 'border-[#8b7355] bg-[#fcfbfa]'
                            : 'border-neutral-150 hover:border-neutral-300'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-normal text-neutral-800">
                              {print.name}
                            </h3>
                            {print.description && (
                              <p className="text-xs text-neutral-400">{print.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-700">
                              {formatPrice(print.price)}
                            </span>
                            {selectedProductId === print.id && (
                              <Check className="h-4 w-4 text-[#8b7355]" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="py-8 text-center text-xs text-neutral-400">
                      No hay copias adicionales disponibles
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Selected Product Detail & Add to Cart */}
            {selectedProduct && (
              <div className="border-t border-neutral-100 bg-white px-6 py-5">
                <div className="space-y-3">
                  {/* Product Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-normal text-neutral-800">
                        {selectedProduct.name}
                      </h3>
                      {selectedProduct.description && (
                        <p className="mt-0.5 text-xs text-neutral-400 line-clamp-1">
                          {selectedProduct.description}
                        </p>
                      )}
                    </div>
                    <p className="text-lg font-normal text-neutral-900 ml-4">
                      {formatPrice(calculateFinalPrice)}
                    </p>
                  </div>

                  {/* Add to Cart Button - Pixieset style */}
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedProduct}
                    className="w-full bg-[#8b7355] py-3 text-[11px] font-medium tracking-[0.2em] text-white uppercase transition-colors hover:bg-[#7a6349] disabled:opacity-50"
                  >
                    Agregar al carrito
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductOptionsSelector;
