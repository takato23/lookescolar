'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { Photo } from '@/lib/services/photo.service';
import { FolderHierarchy } from '@/lib/types/gallery';
import { getTemplateTheme, getTemplateStyleProps } from '@/lib/utils/template-theming';

import PixiesetGalleryMain from '@/components/store/PixiesetGalleryMain';
import PixiesetPackageSelector from '@/components/store/PixiesetPackageSelector';
import PixiesetPhotoSelector from '@/components/store/PixiesetPhotoSelector';
import PixiesetShoppingCart from '@/components/store/PixiesetShoppingCart';

interface PixiesetFlowTemplateProps {
  settings: StoreSettings;
  photos: Photo[];
  token: string;
  subject?: {
    name: string;
    course?: string;
  };
  totalPhotos?: number;
  isPreselected?: boolean;
  folderHierarchy?: FolderHierarchy;
  onFolderNavigate?: (folderId: string) => void;
  isNavigatingFolder?: boolean;
}

type FlowStep = 'gallery' | 'package-selection' | 'photo-selection' | 'cart' | 'checkout';

interface PackageOption {
  id: string;
  name: string;
  price: number;
  description: string;
  itemCount: number;
  contents: {
    individualPhotos: number;
    groupPhotos: number;
    copyPhotos: number;
  };
}

interface CartItem {
  id: string;
  packageId: string;
  packageName: string;
  price: number;
  quantity: number;
  contents: {
    individualPhotos: number;
    groupPhotos: number;
    copyPhotos: number;
  };
  selectedPhotos?: {
    individual: string[];
    group: string[];
  };
}

export function PixiesetFlowTemplate({
  settings,
  photos,
  token,
  subject,
  totalPhotos = 0,
  isPreselected = false,
  folderHierarchy,
  onFolderNavigate,
  isNavigatingFolder = false
}: PixiesetFlowTemplateProps) {
  
  const [currentStep, setCurrentStep] = useState<FlowStep>('gallery');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedPackageForPhotoSelection, setSelectedPackageForPhotoSelection] = useState<PackageOption | null>(null);
  
  // Navigation history management
  const [navigationHistory, setNavigationHistory] = useState<FlowStep[]>(['gallery']);

  // Extract theme from settings
  const theme = useMemo(() => getTemplateTheme(settings), [settings]);
  const themeStyles = useMemo(() => getTemplateStyleProps(theme), [theme]);

  // Navigation with browser history support
  const navigateToStep = useCallback((step: FlowStep) => {
    setNavigationHistory(prev => [...prev, step]);
    setCurrentStep(step);
    
    // Add entry to browser history
    const url = new URL(window.location.href);
    url.searchParams.set('step', step);
    window.history.pushState({ step, timestamp: Date.now() }, '', url.toString());
  }, []);

  const navigateBack = useCallback(() => {
    const history = [...navigationHistory];
    if (history.length > 1) {
      // Remove current step from history
      history.pop();
      const previousStep = history[history.length - 1];
      
      setNavigationHistory(history);
      setCurrentStep(previousStep);
      
      // Update browser history
      const url = new URL(window.location.href);
      url.searchParams.set('step', previousStep);
      window.history.replaceState({ step: previousStep, timestamp: Date.now() }, '', url.toString());
      
      // Reset related state based on the step we're going back to
      if (previousStep === 'gallery') {
        setSelectedPhoto(null);
        setSelectedPackageForPhotoSelection(null);
      } else if (previousStep === 'package-selection') {
        setSelectedPackageForPhotoSelection(null);
      }
    }
  }, [navigationHistory]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      
      if (navigationHistory.length > 1) {
        // Navigate back within our app flow
        navigateBack();
      } else {
        // If we're at the first step, allow normal browser navigation
        // but try to prevent it by pushing the current state again
        const url = new URL(window.location.href);
        url.searchParams.set('step', currentStep);
        window.history.pushState({ step: currentStep, timestamp: Date.now() }, '', url.toString());
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initialize browser history on mount
    const url = new URL(window.location.href);
    if (!url.searchParams.has('step')) {
      url.searchParams.set('step', 'gallery');
      window.history.replaceState({ step: 'gallery', timestamp: Date.now() }, '', url.toString());
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep, navigationHistory, navigateBack]);

  // Convert settings to package options 
  const packages: PackageOption[] = useMemo(() => {
    if (!settings?.products) return [];
    
    return Object.entries(settings.products)
      .filter(([id, product]) => {
        // Accept both legacy names (carpetaA/B) and new names (opcionA/B)
        const isMainPackage = ['opcionA', 'opcionB', 'carpetaA', 'carpetaB'].includes(id);
        return product.enabled && isMainPackage;
      })
      .map(([id, product]) => {
        // Handle both old (carpetaA/B) and new (opcionA/B) naming
        const isOptionA = id === 'opcionA' || id === 'carpetaA';
        const isOptionB = id === 'opcionB' || id === 'carpetaB';
        
        return {
          id,
          name: product.name,
          price: product.price,
          description: product.description || '',
          itemCount: isOptionA ? 6 : isOptionB ? 11 : 6, // Default to 6 if unknown
          contents: {
            individualPhotos: isOptionA ? 1 : isOptionB ? 2 : 1,
            groupPhotos: 1,
            copyPhotos: isOptionA ? 4 : isOptionB ? 8 : 4
          }
        };
      })
      .sort((a, b) => (a.name < b.name ? -1 : 1));
  }, [settings.products]);

  // Event info for the gallery
  const eventInfo = {
    name: subject?.course || settings.texts?.hero_title || theme.branding.brandName,
    subtitle: settings.texts?.hero_subtitle || theme.branding.brandTagline,
    date: 'SEPTEMBER 1ST, 2025',
    location: settings.location,
    photographer: 'BALOSKIER',
    totalPhotos: totalPhotos || photos.length
  };

  const handlePhotoClick = (photo: Photo) => {
    // Para el nuevo flujo, hacer clic en una foto no hace nada especial
    // Las fotos se seleccionan desde el photo selector
    console.log('Photo clicked:', photo.id);
  };

  const handleBuyPhoto = (photo: Photo) => {
    // Redirigir al usuario a seleccionar un package primero
    navigateToStep('package-selection');
  };

  const handleBackToGallery = () => {
    navigateBack();
  };

  const handleSelectPackage = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;
    
    setSelectedPackageForPhotoSelection(pkg);
    navigateToStep('photo-selection');
  };

  const handleBackFromPhotoSelection = () => {
    navigateBack();
  };

  const handleAddToCartWithPhotos = (selectedPhotos: { individual: string[]; group: string[] }) => {
    if (!selectedPackageForPhotoSelection) return;

    const cartItem: CartItem = {
      id: `${selectedPackageForPhotoSelection.id}-${Date.now()}`,
      packageId: selectedPackageForPhotoSelection.id,
      packageName: selectedPackageForPhotoSelection.name,
      price: selectedPackageForPhotoSelection.price,
      quantity: 1,
      contents: selectedPackageForPhotoSelection.contents,
      selectedPhotos
    };

    setCart(prev => [...prev, cartItem]);
    navigateToStep('cart');
    
    // Show success message
    try {
      const { toast } = require('sonner');
      toast.success(`${selectedPackageForPhotoSelection.name} agregado al carrito`);
    } catch {}
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleCheckout = () => {
    navigateToStep('checkout');
    // Here you would normally redirect to checkout or open checkout modal
    try {
      const { toast } = require('sonner');
      toast.success('Redirigiendo al checkout...');
    } catch {}
  };

  const handleContinueShopping = () => {
    // Reset to gallery but clear history to start fresh
    setNavigationHistory(['gallery']);
    setCurrentStep('gallery');
    
    const url = new URL(window.location.href);
    url.searchParams.set('step', 'gallery');
    window.history.replaceState({ step: 'gallery', timestamp: Date.now() }, '', url.toString());
  };

  const handleContactUs = () => {
    try {
      const { toast } = require('sonner');
      toast.success('📱 Contactanos por WhatsApp: +54 11 1234-5678');
    } catch {}
  };

  // Calculate total price of cart
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleToggleFavorite = (photoId: string) => {
    setFavorites(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleShareEvent = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      const { toast } = require('sonner');
      toast.success('Enlace copiado al portapapeles');
    } catch {
      try {
        const { toast } = require('sonner');
        toast.error('No se pudo copiar el enlace');
      } catch {}
    }
  };

  // Add favorites info to photos
  const photosWithFavorites = useMemo(() =>
    photos.map(photo => ({
      ...photo,
      isFavorite: favorites.includes(photo.id)
    })),
    [photos, favorites]
  );

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 'gallery':
        return (
          <PixiesetGalleryMain
            eventInfo={eventInfo}
            photos={photosWithFavorites}
            packages={packages}
            onPhotoClick={handlePhotoClick}
            onBuyPhoto={handleBuyPhoto}
            onPackageSelect={handleSelectPackage}
            onToggleFavorite={handleToggleFavorite}
            onShareEvent={handleShareEvent}
            settings={settings}
            theme={theme}
          />
        );

      case 'package-selection':
        return (
          <PixiesetPackageSelector
            photo={null} // No necesitamos una foto específica para el nuevo flujo
            packages={packages}
            onBack={handleBackToGallery}
            onSelectPackage={handleSelectPackage}
            onAddToCart={() => {}} // Esta función ya no se usa en el nuevo flujo
            settings={settings}
            theme={theme}
          />
        );

      case 'photo-selection':
        return selectedPackageForPhotoSelection ? (
          <PixiesetPhotoSelector
            package={selectedPackageForPhotoSelection}
            photos={photosWithFavorites}
            onBack={handleBackFromPhotoSelection}
            onAddToCart={handleAddToCartWithPhotos}
            settings={settings}
            theme={theme}
          />
        ) : (
          <div>Error: No package selected</div>
        );

      case 'cart':
        return (
          <PixiesetShoppingCart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            onContinueShopping={handleContinueShopping}
            onSignUp={handleContactUs}
            settings={settings}
            theme={theme}
          />
        );

      case 'checkout':
        return (
          <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-lg mx-auto bg-card p-3 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl border border-border backdrop-blur-sm">
              {/* Header - More compact on mobile */}
              <div className="text-center mb-3 sm:mb-6 lg:mb-8">
                <div className="mx-auto w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary rounded-full flex items-center justify-center mb-2 sm:mb-4 lg:mb-6 shadow-lg">
                  <svg className="w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-foreground mb-1 sm:mb-3">
                  Checkout
                </h1>
                <p className="text-muted-foreground text-xs sm:text-base font-medium">Completá tu pedido 🚀</p>
              </div>
              
              {/* Order Summary - More compact on mobile */}
              <div className="mb-3 sm:mb-6 lg:mb-8 p-2 sm:p-4 lg:p-6 bg-muted/50 rounded-lg sm:rounded-2xl border border-border">
                <h3 className="font-black text-foreground mb-2 sm:mb-4 lg:mb-5 flex items-center gap-1.5 sm:gap-3 text-xs sm:text-base lg:text-lg">
                  <div className="w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-primary rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  Tu Pedido
                </h3>
                <div className="space-y-1.5 sm:space-y-3 lg:space-y-4">
                  {cart.map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-1.5 sm:p-3 lg:p-4 bg-background rounded-md sm:rounded-xl border border-border hover:shadow-md transition-shadow duration-200 gap-0.5 sm:gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-foreground text-xs sm:text-base lg:text-lg leading-tight">{item.packageName}</span>
                        <span className="text-primary font-black ml-1 sm:ml-2 text-xs sm:text-sm">×{item.quantity}</span>
                      </div>
                      <span className="font-black text-foreground text-xs sm:text-base lg:text-lg self-start sm:self-auto">
                        ${(item.price * item.quantity / 100).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 sm:pt-4 lg:pt-5 mt-2 sm:mt-4 lg:mt-6">
                    <div className="flex justify-between items-center p-2 sm:p-4 lg:p-5 bg-primary rounded-lg sm:rounded-2xl text-primary-foreground">
                      <span className="text-sm sm:text-lg lg:text-xl font-black">TOTAL:</span>
                      <span className="text-base sm:text-xl lg:text-3xl font-black">${(getTotalPrice() / 100).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods - More compact */}
              <div className="space-y-2 sm:space-y-4 mb-3 sm:mb-6 lg:mb-8">
                <h3 className="font-black text-foreground text-sm sm:text-lg lg:text-xl mb-2 sm:mb-4 lg:mb-6 flex items-center gap-1.5 sm:gap-3">
                  <div className="w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-primary rounded-md sm:rounded-xl flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  ¿Cómo querés pagar?
                </h3>
                
                {/* SOLO MÉTODOS HABILITADOS EN ADMIN */}
                {settings?.payment_methods && Object.entries(settings.payment_methods)
                  .filter(([_, method]) => method.enabled)
                  .map(([methodId, method]) => {
                    const getMethodColor = (id: string) => {
                      if (id.includes('mercado') || id.includes('mercadopago')) return 'bg-blue-600 hover:bg-blue-700 text-white';
                      if (id.includes('cash') || id.includes('efectivo')) return 'bg-orange-600 hover:bg-orange-700 text-white';
                      if (id.includes('transfer') || id.includes('banco')) return 'bg-slate-600 hover:bg-slate-700 text-white';
                      if (id.includes('whatsapp')) return 'bg-green-600 hover:bg-green-700 text-white';
                      return 'bg-primary hover:bg-primary/90 text-primary-foreground';
                    };
                    
                    const getMethodIcon = (id: string) => {
                      if (id.includes('mercado') || id.includes('mercadopago')) return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      );
                      if (id.includes('cash') || id.includes('efectivo')) return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      );
                      if (id.includes('transfer') || id.includes('banco')) return (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                      );
                      // WhatsApp icon
                      return (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
                        </svg>
                      );
                    };
                    
                    const getMethodAction = (id: string, method: any) => {
                      if (id.includes('mercado') || id.includes('mercadopago')) {
                        return () => alert('🚧 Próximamente: Integración con MercadoPago\n\nPor ahora contactanos por WhatsApp: +54 11 1234-5678');
                      }
                      if (id.includes('cash') || id.includes('efectivo')) {
                        return () => alert('💵 *PAGO EN EFECTIVO*\n\nPagás cuando retirás el pedido\n📱 Te contactaremos por WhatsApp para coordinar\n+54 11 1234-5678');
                      }
                      if (id.includes('transfer') || id.includes('banco')) {
                        return () => {
                          const cbu = method.description || 'CBU: 1234567890123456789012';
                          alert(`🏦 *TRANSFERENCIA BANCARIA*\n\n${cbu}\nAlias: lookescolar\n\n📱 Enviá el comprobante por WhatsApp: +54 11 1234-5678`);
                        };
                      }
                      // WhatsApp default
                      return () => {
                        const message = `🛒 *PEDIDO LOOKESCOLAR*\n\n${cart.map(item => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity / 100).toLocaleString()}`).join('\n')}\n\n💰 *Total: $${(getTotalPrice() / 100).toLocaleString()}*\n\n¡Quiero hacer este pedido!`;
                        window.open(`https://wa.me/541112345678?text=${encodeURIComponent(message)}`, '_blank');
                      };
                    };

                    return (
                      <button
                        key={methodId}
                        onClick={getMethodAction(methodId, method)}
                        className={`w-full p-2.5 sm:p-4 lg:p-5 ${getMethodColor(methodId)} rounded-md sm:rounded-xl lg:rounded-2xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 shadow-md flex items-center justify-between group border border-border/20 min-h-[44px]`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-3">
                          <div className="w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            {getMethodIcon(methodId)}
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-bold text-xs sm:text-base lg:text-lg leading-tight">{method.name}</div>
                            {method.description && (
                              <div className="text-white/90 text-xs sm:text-sm leading-tight mt-0.5 line-clamp-2">{method.description}</div>
                            )}
                          </div>
                        </div>
                        <svg className="w-3 h-3 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })
                }
                
                {/* Default WhatsApp if no payment methods */}
                {(!settings?.payment_methods || Object.entries(settings.payment_methods).filter(([_, method]) => method.enabled).length === 0) && (
                  <button
                    onClick={() => {
                      const message = `🛒 *PEDIDO LOOKESCOLAR*\n\n${cart.map(item => `• ${item.packageName} x${item.quantity} - $${(item.price * item.quantity / 100).toLocaleString()}`).join('\n')}\n\n💰 *Total: $${(getTotalPrice() / 100).toLocaleString()}*\n\n¡Quiero hacer este pedido!`;
                      window.open(`https://wa.me/541112345678?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="w-full p-2.5 sm:p-4 bg-green-600 hover:bg-green-700 text-white rounded-md sm:rounded-xl transform hover:scale-[1.02] transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-between group min-h-[44px]"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
                        </svg>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-bold text-xs sm:text-base lg:text-lg leading-tight">WhatsApp</div>
                        <div className="text-white/90 text-xs sm:text-sm leading-tight">Método por defecto</div>
                      </div>
                    </div>
                    <svg className="w-3 h-3 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Back Button */}
              <button
                onClick={navigateBack}
                className="w-full text-muted-foreground hover:text-foreground text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4 rounded-md sm:rounded-xl hover:bg-muted transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px]"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Volver al carrito</span>
                <span className="sm:hidden">Volver</span>
              </button>

              {/* Footer */}
              <div className="text-center mt-3 sm:mt-6 lg:mt-8 pt-2 sm:pt-4 lg:pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Powered by <span className="font-semibold text-primary">LookEscolar</span> ✨
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Error: Step not found</div>;
    }
  };

  // Apply theme styling and custom CSS
  return (
    <div
      className={`pixieset-store-template bg-background text-foreground min-h-screen transition-colors duration-300 ${theme.branding.fontFamily !== 'Inter, sans-serif' ? 'custom-font' : ''}`}
      style={{
        ...themeStyles,
        fontFamily: theme.branding.fontFamily,
      }}
    >
      {/* Custom CSS injection */}
      {theme.customization.customCss && (
        <style dangerouslySetInnerHTML={{ __html: theme.customization.customCss }} />
      )}

      {/* Override liquid-glass-card styles for store - use theme background */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .liquid-glass-card {
            background: hsl(var(--background)) !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        `
      }} />

      {renderStepContent()}
    </div>
  );
}

export default PixiesetFlowTemplate;
