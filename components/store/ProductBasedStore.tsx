'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight, Camera, Package, Grid3x3,
  Calendar, Users, Download, Plus, Check,
  ChevronLeft, Quote, Eye, X, ArrowRight,
  ShoppingCart, Sparkles, Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { SmartMockup } from './SmartMockup';

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  base_price: number;
  config: any;
  featured: boolean;
}

interface PrintPrice {
  size: string;
  dimensions: string;
  price: number;
}

interface ProductBasedStoreProps {
  shareData: {
    token: string;
    type: 'event' | 'folder' | 'photos';
    event_id?: string;
    event_name?: string;
    photos?: Array<{
      id: string;
      storage_path?: string;
      preview_path?: string;
      watermark_path?: string;
    }>;
  };
}

export default function ProductBasedStore({ shareData }: ProductBasedStoreProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [printPrices, setPrintPrices] = useState<PrintPrice[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Map<string, Set<string>>>(new Map());
  const [additionalCopies, setAdditionalCopies] = useState<Map<string, { size: string; quantity: number }[]>>(new Map());
  const [step, setStep] = useState<'products' | 'photos' | 'copies' | 'checkout'>('products');
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<any[]>([]);
  const [showPhotoDetail, setShowPhotoDetail] = useState<string | null>(null);

  // Hero photo for mockups
  const heroPhoto = useMemo(() => {
    if (!photos || photos.length === 0) return undefined;
    // Return the first photo as default, or random if preferred
    return photos[0];
  }, [photos]);

  useEffect(() => {
    fetchProducts();
    fetchPrintPrices();
    fetchPhotos();
  }, []);

  const fetchProducts = async () => {
    try {
      const supabase = createClientSupabaseClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('type', 'physical_package')
        .order('display_order');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrintPrices = async () => {
    try {
      const supabase = createClientSupabaseClient();
      const { data, error } = await supabase
        .from('print_prices')
        .select('*')
        .eq('active', true)
        .order('price');

      if (error) throw error;
      setPrintPrices(data || []);
    } catch (error) {
      console.error('Error fetching print prices:', error);
    }
  };

  const fetchPhotos = async () => {
    // Use provided photos or fetch from API
    if (shareData.photos) {
      setPhotos(shareData.photos);
    }
    // Additional photo fetching logic if needed
  };

  const getSelectedProduct = () => products.find(p => p.id === selectedProduct);

  const getPhotoSelectionCount = () => {
    const product = getSelectedProduct();
    if (!product) return 0;

    return product.config?.includes?.reduce((total: number, item: any) => {
      if (item.type === 'individual_photo' && item.selectable) {
        return total + item.quantity;
      }
      return total;
    }, 0) || 0;
  };

  const getCurrentProductPhotos = () => {
    return selectedPhotos.get(selectedProduct || '') || new Set();
  };

  const getTotalPrice = () => {
    let total = 0;

    // Base product price
    const product = getSelectedProduct();
    if (product) {
      total += product.base_price;
    }

    // Additional copies
    const copies = additionalCopies.get(selectedProduct || '') || [];
    copies.forEach(copy => {
      const printPrice = printPrices.find(p => p.size === copy.size);
      if (printPrice) {
        let copyPrice = printPrice.price * copy.quantity;

        // Apply discount if configured
        if (product?.config?.allows_additional_copies && product.config.additional_copies_discount) {
          copyPrice *= (1 - product.config.additional_copies_discount);
        }

        total += copyPrice;
      }
    });

    return total;
  };

  const handlePhotoSelection = (photoId: string) => {
    const currentPhotos = new Set(getCurrentProductPhotos());
    const maxPhotos = getPhotoSelectionCount();

    if (currentPhotos.has(photoId)) {
      currentPhotos.delete(photoId);
    } else if (currentPhotos.size < maxPhotos) {
      currentPhotos.add(photoId);
    } else {
      toast.error(`Puedes seleccionar máximo ${maxPhotos} fotos para este paquete`);
      return;
    }

    const newSelectedPhotos = new Map(selectedPhotos);
    newSelectedPhotos.set(selectedProduct!, currentPhotos);
    setSelectedPhotos(newSelectedPhotos);
  };

  const handleAddCopy = (photoId: string, size: string) => {
    const currentCopies = additionalCopies.get(selectedProduct || '') || [];
    const existingCopy = currentCopies.find(c => c.size === size);

    const newCopies = existingCopy
      ? currentCopies.map(c => c.size === size ? { ...c, quantity: c.quantity + 1 } : c)
      : [...currentCopies, { size, quantity: 1 }];

    const newAdditionalCopies = new Map(additionalCopies);
    newAdditionalCopies.set(selectedProduct!, newCopies);
    setAdditionalCopies(newAdditionalCopies);
  };

  const handleCheckout = () => {
    const checkoutData = {
      token: shareData.token,
      product_id: selectedProduct,
      selected_photos: Array.from(getCurrentProductPhotos()),
      additional_copies: additionalCopies.get(selectedProduct || '') || [],
      total: getTotalPrice()
    };

    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    router.push(`/store-unified/${shareData.token}`);
  };

  const getPhotoUrl = (photo: any) => {
    return photo.preview_path || photo.watermark_path || photo.storage_path ||
      `https://picsum.photos/600/800?random=${photo.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white border-b border-gray-100"
      >
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-sm font-semibold tracking-wider">LOOKESCOLAR</h1>
                  <p className="text-xs text-gray-500 tracking-wide">
                    {shareData.event_name || 'GALERÍA FOTOGRÁFICA'}
                  </p>
                </div>
              </div>

              {/* Steps */}
              <div className="hidden md:flex items-center gap-8">
                {[
                  { id: 'products', label: 'PRODUCTOS' },
                  { id: 'photos', label: 'SELECCIONAR FOTOS' },
                  { id: 'copies', label: 'COPIAS ADICIONALES' },
                  { id: 'checkout', label: 'FINALIZAR' }
                ].map((item, i) => (
                  <div key={item.id} className="flex items-center gap-8">
                    <button
                      className={`text-xs tracking-wider transition-all ${step === item.id
                        ? 'font-semibold text-black'
                        : 'text-gray-400'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs
                          ${step === item.id
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-400'
                          }
                        `}>
                          {i + 1}
                        </span>
                        {item.label}
                      </span>
                    </button>
                    {i < 3 && <span className="text-gray-200">―</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Cart */}
            <div className="flex items-center gap-4">
              <ShoppingCart className="w-5 h-5" />
              <div className="text-right">
                <p className="text-xs text-gray-500">TOTAL</p>
                <p className="text-sm font-semibold">{formatCurrency(getTotalPrice())}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence mode="wait">
        {/* Step 1: Product Selection */}
        {step === 'products' && (
          <motion.div
            key="products"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <section className="py-16">
              <div className="max-w-[1400px] mx-auto px-8">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-light mb-4">
                    Elige tu <span className="font-semibold">Producto</span>
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Carpetas personalizadas con las mejores fotos del evento.
                    Incluye fotos individuales, copias pequeñas y foto grupal.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <div
                        className={`
                          relative bg-white border-2 cursor-pointer transition-all overflow-hidden group
                          ${selectedProduct === product.id
                            ? 'border-black shadow-xl ring-1 ring-black/5'
                            : 'border-gray-100 hover:border-gray-300 hover:shadow-lg'
                          }
                        `}
                        onClick={() => setSelectedProduct(product.id)}
                      >
                        {product.featured && (
                          <div className="absolute top-4 right-4 z-20">
                            <div className="bg-black text-white text-[10px] font-bold px-3 py-1 tracking-widest uppercase shadow-lg">
                              Recomendado
                            </div>
                          </div>
                        )}

                        {/* Visual Mockup Area */}
                        <div className="bg-gray-50 p-8 flex items-center justify-center min-h-[300px]">
                          {(() => {
                            const productName = product.name.toLowerCase();
                            const productType = product.type.toLowerCase();
                            let mockupPath = null;

                            if (productName.includes('carpeta') || productName.includes('folder')) {
                              mockupPath = '/placeholders/mockups/school-folder-open.png';
                            } else if (productName.includes('marco') || productName.includes('frame') || productName.includes('cuadro')) {
                              mockupPath = '/placeholders/mockups/framed-photo.png';
                            } else if (productName.includes('digital') || productName.includes('galería') || productName.includes('gallery')) {
                              mockupPath = '/placeholders/mockups/gallery-on-mobile.png';
                            } else if (productName.includes('pack') || productName.includes('paquete') || productName.includes('print') || productName.includes('impresiones')) {
                              mockupPath = '/placeholders/mockups/print-package.png';
                            }

                            if (mockupPath) {
                              return (
                                <div className="relative w-full max-w-[280px] aspect-[4/3] group-hover:scale-105 transition-transform duration-500 shadow-lg">
                                  <img
                                    src={mockupPath}
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded-md"
                                  />
                                  {/* Optional: Overlay actual photo if we want to get fancy later, but for now just the mockup is cleaner */}
                                </div>
                              );
                            }

                            return (
                              <SmartMockup
                                type={product.type === 'physical_package' ? 'package' : 'print'}
                                photoUrl={heroPhoto ? getPhotoUrl(heroPhoto) : undefined}
                                className="w-full max-w-[240px] transition-transform duration-500 group-hover:scale-105"
                              />
                            );
                          })()}
                        </div>

                        <div className="p-8">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-bold mb-1">{product.name}</h3>
                              <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-light tracking-tight">
                                {formatCurrency(product.base_price)}
                              </p>
                            </div>
                          </div>

                          {/* What's included */}
                          <div className="space-y-3 mb-8 bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Incluye</p>
                            {product.config?.includes?.map((item: any, j: number) => (
                              <div key={j} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                  <Check className="w-3 h-3 text-black" />
                                </div>
                                <span className="text-sm text-gray-700">
                                  <strong>{item.quantity}x</strong> {item.type === 'individual_photo' ? 'Foto Individual' :
                                    item.type === 'small_copies' ? `Copias ${item.size}` :
                                      item.type === 'group_photo' ? 'Foto Grupal' : item.type}
                                  {item.size && ` (${item.size})`}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Features */}
                          {product.config?.allows_additional_copies && (
                            <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded mb-6 flex items-center gap-2">
                              <Sparkles className="w-3 h-3" />
                              <span className="font-medium">{(product.config.additional_copies_discount * 100).toFixed(0)}% OFF en copias extra</span>
                            </div>
                          )}

                          <button
                            className={`
                              w-full py-4 font-medium tracking-wider text-sm transition-all flex items-center justify-center gap-2
                              ${selectedProduct === product.id
                                ? 'bg-black text-white shadow-lg'
                                : 'bg-white text-black border border-black hover:bg-black hover:text-white'
                              }
                            `}
                          >
                            {selectedProduct === product.id ? (
                              <>
                                <Check className="w-4 h-4" />
                                SELECCIONADO
                              </>
                            ) : 'SELECCIONAR PAQUETE'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mt-12"
                >
                  <button
                    onClick={() => setStep('photos')}
                    disabled={!selectedProduct}
                    className={`
                      inline-flex items-center gap-3 px-12 py-4 text-sm tracking-wider transition-all
                      ${selectedProduct
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    CONTINUAR
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </motion.div>
              </div>
            </section>
          </motion.div>
        )}

        {/* Step 2: Photo Selection */}
        {step === 'photos' && (
          <motion.div
            key="photos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="max-w-[1400px] mx-auto px-8 py-12">
              <div className="mb-8">
                <h2 className="text-3xl font-light mb-2">
                  Selecciona tus <span className="font-semibold">Fotos</span>
                </h2>
                <p className="text-gray-600">
                  Elige {getPhotoSelectionCount()} fotos individuales para tu carpeta
                </p>

                {/* Selection counter */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold">{getCurrentProductPhotos().size}</span> de {getPhotoSelectionCount()} fotos seleccionadas
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-black h-2 rounded-full transition-all"
                      style={{ width: `${(getCurrentProductPhotos().size / getPhotoSelectionCount()) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-4 gap-4 mb-12">
                {photos.map((photo, i) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="group cursor-pointer"
                    onClick={() => handlePhotoSelection(photo.id)}
                  >
                    <div className="relative aspect-[3/4]">
                      <img
                        src={getPhotoUrl(photo)}
                        alt=""
                        className="w-full h-full object-cover"
                      />

                      {/* Selection Overlay */}
                      <div className={`
                        absolute inset-0 transition-all flex items-center justify-center
                        ${getCurrentProductPhotos().has(photo.id)
                          ? 'bg-black/60'
                          : 'bg-black/0 group-hover:bg-black/30'
                        }
                      `}>
                        {getCurrentProductPhotos().has(photo.id) ? (
                          <div className="bg-white rounded-full p-3">
                            <Check className="w-6 h-6 text-black" strokeWidth={2} />
                          </div>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-8 h-8 text-white" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>

                      {/* Quick View */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPhotoDetail(photo.id);
                        }}
                        className="absolute bottom-2 right-2 p-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('products')}
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm">VOLVER</span>
                </button>
                <button
                  onClick={() => setStep('copies')}
                  disabled={getCurrentProductPhotos().size !== getPhotoSelectionCount()}
                  className={`
                    inline-flex items-center gap-3 px-12 py-4 text-sm tracking-wider transition-all
                    ${getCurrentProductPhotos().size === getPhotoSelectionCount()
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  CONTINUAR
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Additional Copies */}
        {step === 'copies' && (
          <motion.div
            key="copies"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="max-w-[1400px] mx-auto px-8 py-12">
              <div className="mb-8">
                <h2 className="text-3xl font-light mb-2">
                  Copias <span className="font-semibold">Adicionales</span>
                </h2>
                <p className="text-gray-600">
                  ¿Quieres copias adicionales de alguna foto? Aprovecha el descuento especial
                </p>

                {getSelectedProduct()?.config?.additional_copies_discount && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {(getSelectedProduct()!.config.additional_copies_discount * 100).toFixed(0)}% de descuento aplicado
                    </span>
                  </div>
                )}
              </div>

              {/* Print Sizes */}
              <div className="grid grid-cols-5 gap-4 mb-8">
                {printPrices.map((print) => (
                  <div key={print.size} className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="font-semibold text-sm">{print.dimensions}</p>
                    <p className="text-lg mt-1">{formatCurrency(print.price)}</p>
                    {getSelectedProduct()?.config?.additional_copies_discount && (
                      <p className="text-xs text-green-600 line-through">
                        {formatCurrency(print.price * (1 - getSelectedProduct()!.config.additional_copies_discount))}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected Photos with Copy Options */}
              <div className="grid grid-cols-2 gap-6 mb-12">
                {Array.from(getCurrentProductPhotos()).map((photoId) => {
                  const photo = photos.find(p => p.id === photoId);
                  if (!photo) return null;

                  return (
                    <div key={photoId} className="flex gap-4 p-4 border rounded-lg">
                      <img
                        src={getPhotoUrl(photo)}
                        alt=""
                        className="w-32 h-40 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold mb-4">Copias adicionales</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {printPrices.slice(0, 4).map((print) => (
                            <button
                              key={print.size}
                              onClick={() => handleAddCopy(photoId, print.size)}
                              className="text-xs p-2 border rounded hover:bg-gray-50 transition-colors"
                            >
                              <span className="block font-semibold">{print.dimensions}</span>
                              <span className="text-gray-500">+{formatCurrency(print.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Current Additional Copies */}
              {(additionalCopies.get(selectedProduct || '')?.length || 0) > 0 && (
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-3">Copias adicionales seleccionadas:</h4>
                  <div className="space-y-2">
                    {additionalCopies.get(selectedProduct || '')?.map((copy, i) => {
                      const print = printPrices.find(p => p.size === copy.size);
                      if (!print) return null;

                      const price = print.price * copy.quantity;
                      const discountedPrice = getSelectedProduct()?.config?.additional_copies_discount
                        ? price * (1 - getSelectedProduct()!.config.additional_copies_discount)
                        : price;

                      return (
                        <div key={i} className="flex justify-between">
                          <span>{copy.quantity}x {print.dimensions}</span>
                          <span className="font-semibold">{formatCurrency(discountedPrice)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('photos')}
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm">VOLVER</span>
                </button>
                <button
                  onClick={() => setStep('checkout')}
                  className="inline-flex items-center gap-3 px-12 py-4 bg-black text-white hover:bg-gray-800 transition-colors text-sm tracking-wider"
                >
                  PROCEDER AL PAGO
                  <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Checkout */}
        {step === 'checkout' && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-[1200px] mx-auto px-8 py-12"
          >
            <div className="grid grid-cols-12 gap-12">
              {/* Order Summary */}
              <div className="col-span-7">
                <h2 className="text-3xl font-light mb-8">
                  Resumen de tu <span className="font-semibold">Pedido</span>
                </h2>

                <div className="bg-gray-50 p-8 mb-8">
                  {/* Product */}
                  <div className="pb-6 mb-6 border-b border-gray-200">
                    <h3 className="font-semibold text-lg mb-4">{getSelectedProduct()?.name}</h3>
                    <div className="space-y-2">
                      {getSelectedProduct()?.config?.includes?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.type === 'individual_photo' ? 'Foto Individual' :
                              item.type === 'small_copies' ? `Copias ${item.size}` :
                                item.type === 'group_photo' ? 'Foto Grupal' : item.type}
                          </span>
                          <span>Incluido</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between">
                      <span>Precio del paquete</span>
                      <span className="font-semibold">{formatCurrency(getSelectedProduct()?.base_price || 0)}</span>
                    </div>
                  </div>

                  {/* Additional Copies */}
                  {(additionalCopies.get(selectedProduct || '')?.length || 0) > 0 && (
                    <div className="pb-6 mb-6 border-b border-gray-200">
                      <h4 className="font-semibold mb-3">Copias Adicionales</h4>
                      {additionalCopies.get(selectedProduct || '')?.map((copy, i) => {
                        const print = printPrices.find(p => p.size === copy.size);
                        if (!print) return null;

                        const price = print.price * copy.quantity;
                        const discountedPrice = getSelectedProduct()?.config?.additional_copies_discount
                          ? price * (1 - getSelectedProduct()!.config.additional_copies_discount)
                          : price;

                        return (
                          <div key={i} className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">{copy.quantity}x {print.dimensions}</span>
                            <span>{formatCurrency(discountedPrice)}</span>
                          </div>
                        );
                      })}
                      {getSelectedProduct()?.config?.additional_copies_discount && (
                        <div className="mt-2 text-xs text-green-600">
                          Descuento del {(getSelectedProduct()!.config.additional_copies_discount * 100).toFixed(0)}% aplicado
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-semibold">Total a pagar</p>
                      <p className="text-sm text-gray-500">Impuestos incluidos</p>
                    </div>
                    <p className="text-4xl font-light">
                      {formatCurrency(getTotalPrice())}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="col-span-5">
                <div className="bg-white border border-gray-200 p-8">
                  <h3 className="text-xl font-semibold mb-6">Información de contacto</h3>

                  <form className="space-y-5" onSubmit={(e) => {
                    e.preventDefault();
                    handleCheckout();
                  }}>
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Nombre completo</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder="Juan Pérez"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Correo electrónico</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder="juan@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Teléfono</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none transition-colors"
                        placeholder="+54 11 1234-5678"
                      />
                    </div>

                    <div className="pt-6">
                      <button
                        type="submit"
                        className="w-full py-4 bg-black text-white hover:bg-gray-800 transition-colors text-sm tracking-wider font-medium"
                      >
                        PROCEDER CON MERCADO PAGO
                      </button>

                      <p className="text-xs text-center text-gray-500 mt-4">
                        Serás redirigido a Mercado Pago para completar el pago de forma segura
                      </p>
                    </div>
                  </form>
                </div>

                <button
                  onClick={() => setStep('copies')}
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors mt-6"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm">Modificar selección</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Detail Modal */}
      <AnimatePresence>
        {showPhotoDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
            onClick={() => setShowPhotoDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-full">
                <div className="flex-1">
                  <img
                    src={getPhotoUrl(photos.find(p => p.id === showPhotoDetail) || {})}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-80 p-8">
                  <button
                    onClick={() => setShowPhotoDetail(null)}
                    className="ml-auto mb-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h3 className="text-xl font-semibold mb-6">Detalles de la foto</h3>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-gray-600">Resolución</span>
                      <span className="font-medium">Alta (300 DPI)</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-gray-600">Formato</span>
                      <span className="font-medium">Digital</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handlePhotoSelection(showPhotoDetail);
                      setShowPhotoDetail(null);
                    }}
                    className={`
                      w-full py-3 text-sm tracking-wider transition-all
                      ${getCurrentProductPhotos().has(showPhotoDetail)
                        ? 'bg-black text-white'
                        : 'bg-white text-black border border-black hover:bg-gray-50'
                      }
                    `}
                  >
                    {getCurrentProductPhotos().has(showPhotoDetail)
                      ? 'QUITAR DE LA SELECCIÓN'
                      : 'AGREGAR A LA SELECCIÓN'
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
