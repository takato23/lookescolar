'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import type { PaymentMethod } from '@/lib/hooks/useStoreSettings';
import { Photo } from '@/lib/services/photo.service';
import { FolderHierarchy } from '@/lib/types/gallery';
import { getTemplateTheme, getTemplateStyleProps } from '@/lib/utils/template-theming';

import PixiesetGalleryMain from '@/components/store/PixiesetGalleryMain';

const formatConfigKey = (key: string) => {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
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
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  // Navigation history management
  const [navigationHistory, setNavigationHistory] = useState<FlowStep[]>(['gallery']);

  // Extract theme from settings
  const theme = useMemo(() => getTemplateTheme(settings), [settings]);
  const themeStyles = useMemo(() => getTemplateStyleProps(theme), [theme]);
  const defaultContactPhone = settings?.texts?.contact_phone || '+54 11 1234-5678';

  const availablePaymentMethods = useMemo(() => {
    const enabledEntries = Object.entries(settings?.payment_methods || {}).filter(
      ([, method]) => Boolean(method?.enabled)
    ) as [string, PaymentMethod][];

    if (enabledEntries.length > 0) {
      return enabledEntries;
    }

    const fallback: PaymentMethod = {
      enabled: true,
      name: 'Coordinación por WhatsApp',
      description: 'Coordinamos el pago por mensaje.',
      instructions: [
        'Te vamos a escribir por WhatsApp para confirmar tu pedido.',
        `También podés enviarnos un mensaje al ${defaultContactPhone}.`,
      ],
    };

    return [['manual-whatsapp', fallback] as [string, PaymentMethod]];
  }, [settings?.payment_methods, defaultContactPhone]);

  useEffect(() => {
    if (!selectedPaymentMethod && availablePaymentMethods.length > 0) {
      setSelectedPaymentMethod(availablePaymentMethods[0][0]);
    }
  }, [availablePaymentMethods, selectedPaymentMethod]);

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

  const selectedPaymentMethodEntry = useMemo(
    () => availablePaymentMethods.find(([id]) => id === selectedPaymentMethod),
    [availablePaymentMethods, selectedPaymentMethod]
  );
  const selectedPaymentMethodData = selectedPaymentMethodEntry?.[1];

  const handleContactInputChange = (field: keyof typeof contactForm, value: string) => {
    setContactForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFormErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const validateContactForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!contactForm.name.trim()) {
      errors.name = 'Ingresá tu nombre completo';
    }
    if (!contactForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      errors.email = 'Ingresá un email válido';
    }
    if (!contactForm.phone.trim()) {
      errors.phone = 'Ingresá un teléfono de contacto';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [contactForm]);

  const resetCheckoutState = useCallback(() => {
    setContactForm({
      name: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
    });
    setFormErrors({});
    setCustomerNotes('');
    setPaymentMethodError(null);
    setSelectedPaymentMethod(availablePaymentMethods[0]?.[0] ?? null);
  }, [availablePaymentMethods]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

    const validContact = validateContactForm();
    if (!validContact) {
      toast.error('Completá tu nombre, email y teléfono');
      return;
    }

    if (!selectedPaymentMethodEntry) {
      setPaymentMethodError('Seleccioná un método de pago para continuar');
      toast.error('Seleccioná un método de pago');
      return;
    }

    setPaymentMethodError(null);

    const baseItem = cart[0];
    if (!baseItem) {
      toast.error('No encontramos el paquete seleccionado');
      return;
    }

    const totalPrice = getTotalPrice();
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const trimmedNotes = customerNotes.trim();

    const orderPayload = {
      order: {
        id: orderId,
        token,
        basePackage: {
          id: baseItem.packageId,
          name: baseItem.packageName,
          basePrice: baseItem.price * baseItem.quantity,
        },
        selectedPhotos: {
          individual: baseItem.selectedPhotos?.individual || [],
          group: baseItem.selectedPhotos?.group || [],
        },
        additionalCopies: [] as Array<{
          id: string;
          productId: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }>,
        contactInfo: {
          name: contactForm.name.trim(),
          email: contactForm.email.trim(),
          phone: contactForm.phone.trim(),
          address: {
            street: contactForm.street.trim(),
            city: contactForm.city.trim(),
            state: contactForm.state.trim(),
            zipCode: contactForm.zipCode.trim(),
            country: 'Argentina',
          },
        },
        totalPrice,
        paymentMethod: selectedPaymentMethodEntry[0],
        ...(trimmedNotes ? { customerNotes: trimmedNotes } : {}),
      },
    };

    setIsSubmittingOrder(true);
    try {
      const response = await fetch('/api/store/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'No pudimos registrar tu pedido.');
      }

      const result = await response.json();
      toast.success(result?.message || 'Pedido creado. ¡Gracias!');

      resetCheckoutState();
      setCart([]);
      setSelectedPackageId(null);
      setSelectedPackageForPhotoSelection(null);
      setFavorites([]);
      setNavigationHistory(['gallery']);
      setCurrentStep('gallery');
    } catch (error) {
      console.error('Error creating order', error);
      toast.error(error instanceof Error ? error.message : 'No pudimos crear tu pedido');
    } finally {
      setIsSubmittingOrder(false);
    }
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

      case 'checkout': {
        const orderTotal = getTotalPrice();

        const getMethodColor = (id: string) => {
          if (id.includes('mercado') || id.includes('mercadopago')) return 'bg-sky-600 text-white hover:bg-sky-500';
          if (id.includes('cash') || id.includes('efectivo')) return 'bg-amber-500 text-amber-50 hover:bg-amber-400';
          if (id.includes('transfer') || id.includes('banco') || id.includes('deposit')) return 'bg-emerald-600 text-emerald-50 hover:bg-emerald-500';
          return 'bg-primary text-primary-foreground hover:bg-primary/90';
        };

        const getMethodIcon = (id: string) => {
          if (id.includes('mercado') || id.includes('mercadopago')) {
            return (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            );
          }
          if (id.includes('cash') || id.includes('efectivo')) {
            return (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            );
          }
          if (id.includes('transfer') || id.includes('banco') || id.includes('deposit')) {
            return (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            );
          }
          return (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785" />
            </svg>
          );
        };

        return (
          <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-lg mx-auto bg-card p-3 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl border border-border backdrop-blur-sm">
              <div className="text-center mb-3 sm:mb-6 lg:mb-8">
                <div className="mx-auto w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary rounded-full flex items-center justify-center mb-2 sm:mb-4 lg:mb-6 shadow-lg">
                  <svg className="w-5 h-5 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-foreground mb-1 sm:mb-3">
                  Checkout
                </h1>
                <p className="text-muted-foreground text-xs sm:text-base font-medium">
                  Completá tus datos para generar el pedido
                </p>
              </div>

              <div className="space-y-3 sm:space-y-5 lg:space-y-6">
                <div className="p-2.5 sm:p-4 lg:p-6 bg-muted/40 rounded-lg sm:rounded-2xl border border-border space-y-2 sm:space-y-4">
                  <h3 className="font-black text-foreground flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-8 sm:w-8">
                      <span className="text-xs font-bold">1</span>
                    </span>
                    Resumen del pedido
                  </h3>
                  <div className="space-y-1.5 sm:space-y-3">
                    {cart.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 rounded-lg border border-border bg-background p-2.5 sm:p-3.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm lg:text-base font-semibold text-foreground truncate">
                            {item.packageName}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">
                            Cantidad: <span className="font-semibold text-primary">{item.quantity}</span>
                          </p>
                        </div>
                        <p className="text-xs sm:text-sm lg:text-base font-bold text-foreground">
                          ${(item.price * item.quantity / 100).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-primary px-3 py-2 sm:px-4 sm:py-3 text-primary-foreground">
                      <span className="text-sm sm:text-lg font-semibold uppercase tracking-wide">Total</span>
                      <span className="text-lg sm:text-2xl font-black">
                        ${(orderTotal / 100).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 sm:p-4 lg:p-6 bg-muted/30 rounded-lg sm:rounded-2xl border border-border space-y-3 sm:space-y-4">
                  <h3 className="font-black text-foreground flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-8 sm:w-8">
                      <span className="text-xs font-bold">2</span>
                    </span>
                    Tus datos
                  </h3>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        value={contactForm.name}
                        onChange={(event) => handleContactInputChange('name', event.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="María González"
                      />
                      {formErrors.name ? (
                        <p className="text-[11px] text-destructive">{formErrors.name}</p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={(event) => handleContactInputChange('email', event.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="maria@mail.com"
                        />
                        {formErrors.email ? (
                          <p className="text-[11px] text-destructive">{formErrors.email}</p>
                        ) : null}
                      </div>
                      <div className="grid gap-1">
                        <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                          Teléfono *
                        </label>
                        <input
                          type="tel"
                          value={contactForm.phone}
                          onChange={(event) => handleContactInputChange('phone', event.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="+54 9 11 1234-5678"
                        />
                        {formErrors.phone ? (
                          <p className="text-[11px] text-destructive">{formErrors.phone}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Dirección (opcional)
                      </label>
                      <input
                        type="text"
                        value={contactForm.street}
                        onChange={(event) => handleContactInputChange('street', event.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                        placeholder="Calle y número"
                      />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="text"
                          value={contactForm.city}
                          onChange={(event) => handleContactInputChange('city', event.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                          placeholder="Ciudad"
                        />
                        <input
                          type="text"
                          value={contactForm.state}
                          onChange={(event) => handleContactInputChange('state', event.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                          placeholder="Provincia"
                        />
                        <input
                          type="text"
                          value={contactForm.zipCode}
                          onChange={(event) => handleContactInputChange('zipCode', event.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                          placeholder="CP"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 sm:p-4 lg:p-6 bg-muted/30 rounded-lg sm:rounded-2xl border border-border space-y-3 sm:space-y-4">
                  <h3 className="font-black text-foreground flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-8 sm:w-8">
                      <span className="text-xs font-bold">3</span>
                    </span>
                    Método de pago
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Elegí cómo querés completar el pago. Podés cambiarlo más adelante si necesitás.
                  </p>
                  <div className="space-y-2">
                    {availablePaymentMethods.map(([methodId, method]) => {
                      const isSelected = selectedPaymentMethod === methodId;
                      return (
                        <button
                          key={methodId}
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMethod(methodId);
                            setPaymentMethodError(null);
                          }}
                          className={`w-full rounded-xl border border-border/60 px-3 py-3 sm:px-4 sm:py-4 transition-all text-left flex items-center justify-between gap-3 ${isSelected ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getMethodColor(methodId)}`}>
                              {getMethodIcon(methodId)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm sm:text-base font-semibold text-foreground truncate">
                                {method.name}
                              </p>
                              {method.description ? (
                                <p className="text-xs text-muted-foreground truncate">
                                  {method.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/20 text-muted-foreground'}`}>
                            {isSelected ? (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3" viewBox="0 0 8 8" fill="currentColor">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {paymentMethodError ? (
                    <p className="text-xs text-destructive">{paymentMethodError}</p>
                  ) : null}
                  {selectedPaymentMethodData?.instructions?.length ? (
                    <div className="rounded-md bg-muted/40 p-3 sm:p-4 text-xs sm:text-sm">
                      <p className="font-semibold text-foreground mb-2">Instrucciones para el pago</p>
                      <ul className="space-y-1">
                        {selectedPaymentMethodData.instructions.map((item, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {selectedPaymentMethodData?.config && Object.values(selectedPaymentMethodData.config).filter(Boolean).length > 0 ? (
                    <div className="rounded-md bg-muted/20 p-3 text-xs sm:text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-2">Datos de pago</p>
                      <dl className="space-y-1.5">
                        {Object.entries(selectedPaymentMethodData.config || {})
                          .filter(([, value]) => Boolean(value))
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-2">
                              <dt className="font-medium text-foreground/80">{formatConfigKey(key)}</dt>
                              <dd className="text-right break-words">{value}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  ) : null}
                </div>

                <div className="p-2.5 sm:p-4 lg:p-6 bg-muted/20 rounded-lg sm:rounded-2xl border border-border space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nota para el equipo (opcional)
                  </label>
                  <textarea
                    value={customerNotes}
                    onChange={(event) => setCustomerNotes(event.target.value)}
                    className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                    placeholder="Ej: Puedo pasar a retirar el viernes por la tarde."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Usaremos estos datos solo para coordinar tu pedido. Nunca compartimos tu información.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSubmittingOrder}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm sm:text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingOrder ? 'Creando pedido...' : `Confirmar pedido (${(orderTotal / 100).toLocaleString()} ARS)`}
                </button>
              </div>

              <button
                onClick={navigateBack}
                className="mt-3 w-full text-muted-foreground hover:text-foreground text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4 rounded-md sm:rounded-xl hover:bg-muted transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Volver al carrito</span>
                <span className="sm:hidden">Volver</span>
              </button>

              <div className="text-center mt-3 sm:mt-6 lg:mt-8 pt-2 sm:pt-4 lg:pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Powered by <span className="font-semibold text-primary">LookEscolar</span> ✨
                </p>
              </div>
            </div>
          </div>
        );
      }
      default:
        return <div>Error: Step not found</div>;
    }
  };

  // Apply theme styling and custom CSS
  return (
    <div
      className={`pixieset-store-template bg-background text-foreground min-h-screen transition-colors duración-300 ${theme.branding.fontFamily !== 'Inter, sans-serif' ? 'custom-font' : ''}`}
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