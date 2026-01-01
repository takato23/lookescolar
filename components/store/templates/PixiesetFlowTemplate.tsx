'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { Photo as ServicePhoto } from '@/lib/services/photo.service';
import { getTemplateTheme, getTemplateStyleProps } from '@/lib/utils/template-theming';
import { AnimatePresence, motion } from 'framer-motion';

import PixiesetGalleryMain from '@/components/store/PixiesetGalleryMain';
import PixiesetPackageSelector from '@/components/store/PixiesetPackageSelector';
import PixiesetPhotoSelector from '@/components/store/PixiesetPhotoSelector';
import PixiesetShoppingCart from '@/components/store/PixiesetShoppingCart';
import {
  CheckoutLayout,
  CheckoutCustomerForm,
  CheckoutOrderSummary,
  CheckoutPaymentMethods,
  checkoutInitialValues,
  CheckoutFormData,
  CheckoutField,
  CheckoutOrderItem,
  CheckoutPaymentMethod,
  validateCheckout,
  mapTouchedErrors,
} from '@/components/store/checkout';
import { Button } from '@/components/ui/button';
import { useTemplateFavorites } from '@/hooks/useTemplateFavorites';

// Extended Photo interface for the store UI
interface StorePhoto extends ServicePhoto {
  url: string;
  alt: string;
  isFavorite?: boolean;
  isGroupPhoto?: boolean;
  // Add other UI-specific properties if needed
}

interface PixiesetFlowTemplateProps {
  settings: StoreSettings;
  photos: ServicePhoto[];
  token: string;
  subject?: {
    name: string;
    course?: string;
  };
  totalPhotos?: number;
  isPreselected?: boolean;
  folderHierarchy?: any; // Relaxed type if not strictly used
  onFolderNavigate?: (folderId: string) => void;
  isNavigatingFolder?: boolean;
  engagementStats?: {
    totalPhotos: number;
    totalFavorites: number;
    totalInCart: number;
    totalPurchased: number;
  };
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

const PAYMENT_TONE_KEYWORDS: Array<[RegExp, NonNullable<CheckoutPaymentMethod['tone']>]> = [
  [/whatsapp|wp|chat/i, 'whatsapp'],
  [/cash|efectivo/i, 'cash'],
  [/mercado|mp|visa|tarjeta|stripe|card/i, 'primary'],
  [/transfer|banco|bank/i, 'neutral'],
  [/qr|pix|virtual/i, 'accent'],
];

function determinePaymentTone(id: string, name?: string): NonNullable<CheckoutPaymentMethod['tone']> {
  const target = `${id} ${name ?? ''}`;
  for (const [pattern, tone] of PAYMENT_TONE_KEYWORDS) {
    if (pattern.test(target)) {
      return tone;
    }
  }
  return 'neutral';
}

function prettifyPaymentTitle(id: string) {
  if (!id) return 'Método de pago';
  const normalized = id
    .replace(/[_-]+/g, ' ')
    .replace(/mercado ?pago/i, 'Mercado Pago')
    .replace(/mp|mpago/i, 'Mercado Pago')
    .replace(/whatsapp/i, 'WhatsApp')
    .replace(/qr/i, 'QR');

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase()).trim();
}

function defaultPaymentDescription(id: string) {
  if (/mercado|mp/i.test(id)) {
    return 'Pagá online con tarjeta, débito o billetera digital Mercado Pago.';
  }
  if (/whatsapp/i.test(id)) {
    return 'Coordinamos el pago y la entrega por WhatsApp en minutos.';
  }
  if (/transfer|banco/i.test(id)) {
    return 'Transferencia bancaria. Te enviamos los datos al confirmar.';
  }
  if (/cash|efectivo/i.test(id)) {
    return 'Abonás en efectivo al momento de retirar o entregar.';
  }
  if (/qr|pix/i.test(id)) {
    return 'Escaneá el QR desde tu banca o billetera preferida.';
  }
  return 'Coordinamos el pago con nuestro equipo de LookEscolar.';
}

const CHECKOUT_TOUCHED_INITIAL: Record<CheckoutField, boolean> = {
  guardianName: false,
  guardianEmail: false,
  guardianPhone: false,
  studentName: false,
  studentGrade: false,
  deliveryPreference: false,
  notes: false,
  acceptPolicies: false,
};

export function PixiesetFlowTemplate({
  settings,
  photos: servicePhotos,
  token,
  subject,
  totalPhotos = 0,
  isPreselected: _isPreselected = false,
  folderHierarchy: _folderHierarchy,
  onFolderNavigate: _onFolderNavigate,
  isNavigatingFolder: _isNavigatingFolder = false,
  engagementStats,
}: PixiesetFlowTemplateProps) {

  const [currentStep, setCurrentStep] = useState<FlowStep>('gallery');
  const [selectedPhoto, setSelectedPhoto] = useState<StorePhoto | null>(null);
  const {
    favorites,
    toggleFavorite: toggleFavoriteApi,
  } = useTemplateFavorites(servicePhotos, token);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPackageForPhotoSelection, setSelectedPackageForPhotoSelection] = useState<PackageOption | null>(null);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormData>(checkoutInitialValues);
  const [checkoutTouched, setCheckoutTouched] = useState<Record<CheckoutField, boolean>>({
    ...CHECKOUT_TOUCHED_INITIAL,
  });
  const [checkoutErrors, setCheckoutErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [showAllCheckoutErrors, setShowAllCheckoutErrors] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  // Navigation history management
  const [navigationHistory, setNavigationHistory] = useState<FlowStep[]>(['gallery']);
  const isCartEmpty = cart.length === 0;

  // Extract theme from settings
  const theme = useMemo(() => getTemplateTheme(settings), [settings]);
  const themeStyles = useMemo(() => getTemplateStyleProps(theme), [theme]);

  // Transform ServicePhoto to StorePhoto
  const photos: StorePhoto[] = useMemo(() => {
    return servicePhotos.map(photo => ({
      ...photo,
      url: photo.preview_path || photo.storage_path, // Use preview path as URL for now, or signed URL if available
      alt: photo.original_filename,
      isFavorite: favorites.includes(photo.id),
      // Heuristic for group photos if not explicitly marked in metadata
      isGroupPhoto: photo.metadata?.isGroupPhoto || photo.original_filename.toLowerCase().includes('grupal')
    }));
  }, [servicePhotos, favorites]);

  const derivedStats = useMemo(() => {
    if (engagementStats) {
      return engagementStats;
    }

    const totals = photos.reduce(
      (acc, photo) => {
        if (photo.isFavorite) {
          acc.totalFavorites += 1;
        }
        // Mock cart/purchased stats if not available in photo object
        acc.totalInCart += (photo as any)?.engagement?.in_cart_quantity ?? 0;
        acc.totalPurchased += (photo as any)?.engagement?.purchased_quantity ?? 0;
        return acc;
      },
      {
        totalPhotos: totalPhotos || photos.length,
        totalFavorites: 0,
        totalInCart: 0,
        totalPurchased: 0,
      }
    );

    if (!totals.totalPhotos) {
      totals.totalPhotos = totalPhotos || photos.length;
    }

    return totals;
  }, [engagementStats, photos, totalPhotos]);

  const unpurchasedCount = useMemo(() => {
    const total = derivedStats.totalPhotos || photos.length;
    return Math.max(0, total - derivedStats.totalPurchased);
  }, [derivedStats, photos.length]);

  useEffect(() => {
    if (selectedPaymentMethod || !settings?.payment_methods) {
      return;
    }

    const firstEnabled = Object.entries(settings.payment_methods).find(([, method]) => method && method.enabled !== false);
    if (firstEnabled) {
      setSelectedPaymentMethod(firstEnabled[0]);
    }
  }, [settings?.payment_methods, selectedPaymentMethod]);

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
    } else {
      const fallbackStep: FlowStep = currentStep === 'checkout' && !isCartEmpty ? 'cart' : 'gallery';
      setNavigationHistory([fallbackStep]);
      setCurrentStep(fallbackStep);

      const url = new URL(window.location.href);
      url.searchParams.set('step', fallbackStep);
      window.history.replaceState({ step: fallbackStep, timestamp: Date.now() }, '', url.toString());
    }
  }, [navigationHistory, currentStep, isCartEmpty]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const stepParam = url.searchParams.get('step') as FlowStep | null;

    if (stepParam && ['gallery', 'package-selection', 'photo-selection', 'cart', 'checkout'].includes(stepParam)) {
      setCurrentStep(stepParam);
      setNavigationHistory([stepParam]);
      window.history.replaceState({ step: stepParam, timestamp: Date.now() }, '', url.toString());
    } else if (!url.searchParams.has('step')) {
      url.searchParams.set('step', 'gallery');
      window.history.replaceState({ step: 'gallery', timestamp: Date.now() }, '', url.toString());
    }
  }, []);

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

        // Allow configuration of group photos from settings
        // Cast product to any to access 'features' or 'contents' which might not be strictly typed in StoreProduct
        const productAny = product as any;
        const features = productAny.features || {};
        const contentsData = productAny.contents || features;

        const defaultContents = {
          individualPhotos: isOptionA ? 1 : isOptionB ? 2 : 1,
          groupPhotos: 1, // Default: require 1 group photo
          copyPhotos: isOptionA ? 4 : isOptionB ? 8 : 4
        };

        const contents = {
          individualPhotos: contentsData.individualPhotos ?? defaultContents.individualPhotos,
          groupPhotos: contentsData.groupPhotos ?? defaultContents.groupPhotos,
          copyPhotos: contentsData.copyPhotos ?? defaultContents.copyPhotos
        };

        return {
          id,
          name: product.name,
          price: product.price,
          description: product.description || '',
          itemCount: isOptionA ? 6 : isOptionB ? 11 : 6, // Default to 6 if unknown
          contents
        };
      })
      .sort((a, b) => (a.name < b.name ? -1 : 1));
  }, [settings.products]);

  // Event info for the gallery
  const eventInfo = {
    name: subject?.course || settings.texts?.hero_title || theme.branding.brandName,
    subtitle: settings.texts?.hero_subtitle || theme.branding.brandTagline,
    date: 'SEPTEMBER 1ST, 2025',
    location: 'Colegio', // Placeholder as location is not in settings
    photographer: 'BALOSKIER',
    totalPhotos: totalPhotos || photos.length
  };

  const paymentOptions = useMemo<CheckoutPaymentMethod[]>(() => {
    const entries = settings?.payment_methods ? Object.entries(settings.payment_methods) : [];

    return entries
      .filter(([, method]) => method && method.enabled !== false)
      .map(([id, method]) => {
        // Cast method to any to access potential untyped fields
        const methodAny = method as any;
        const title = (method && (methodAny.label || method.name)) || prettifyPaymentTitle(id);
        const helper = methodAny.helper || methodAny.message || methodAny.notes;
        const badge = methodAny.badge || (id.includes('mercado') ? 'Recomendado' : undefined);

        return {
          id,
          title,
          description: method?.description || defaultPaymentDescription(id),
          helper: helper || undefined,
          badge,
          tone: determinePaymentTone(id, method?.name || methodAny.label),
          fee: typeof methodAny.fee === 'number' ? methodAny.fee : undefined,
        } satisfies CheckoutPaymentMethod;
      });
  }, [settings?.payment_methods]);

  const orderSummaryItems = useMemo<CheckoutOrderItem[]>(
    () =>
      cart.map((item) => ({
        id: item.id,
        name: item.packageName,
        quantity: item.quantity,
        totalCents: item.price * item.quantity,
      })),
    [cart]
  );

  const orderTotalCents = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );

  const checkoutValidationResult = useMemo(() => validateCheckout(checkoutForm), [checkoutForm]);
  const displayedCheckoutErrors = showAllCheckoutErrors ? checkoutValidationResult.errors : checkoutErrors;
  const hasPaymentMethods = paymentOptions.length > 0;
  const canSubmitCheckout = Boolean(
    hasPaymentMethods &&
    selectedPaymentMethod &&
    !isCartEmpty &&
    checkoutValidationResult.valid &&
    !checkoutSubmitting
  );

  const handlePhotoClick = (_photo: StorePhoto) => {
    // Para el nuevo flujo, hacer clic en una foto no hace nada especial
    // Las fotos se seleccionan desde el photo selector
    console.log('Photo clicked:', _photo.id);
  };

  const handleBuyPhoto = (_photo: StorePhoto) => {
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
    } catch { }
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
    } catch { }
  };

  const handleContinueShopping = () => {
    // Reset to gallery but clear history to start fresh
    setNavigationHistory(['gallery']);
    setCurrentStep('gallery');

    const url = new URL(window.location.href);
    url.searchParams.set('step', 'gallery');
    window.history.replaceState({ step: 'gallery', timestamp: Date.now() }, '', url.toString());
  };

  const handleBackToCartFromCheckout = useCallback(() => {
    if (navigationHistory.length > 1) {
      navigateBack();
      return;
    }

    const fallbackStep: FlowStep = !isCartEmpty ? 'cart' : 'gallery';
    setNavigationHistory([fallbackStep]);
    setCurrentStep(fallbackStep);

    const url = new URL(window.location.href);
    url.searchParams.set('step', fallbackStep);
    window.history.replaceState({ step: fallbackStep, timestamp: Date.now() }, '', url.toString());
  }, [navigationHistory, navigateBack, isCartEmpty]);

  const handleToggleFavorite = useCallback(
    (photoId: string) => {
      toggleFavoriteApi(photoId).catch(() => {
        const { toast } = require('sonner');
        toast.error('No pudimos actualizar tus favoritos. Intentalo nuevamente.');
      });
    },
    [toggleFavoriteApi]
  );

  const handleShareEvent = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      const { toast } = require('sonner');
      toast.success('Enlace copiado al portapapeles');
    } catch {
      try {
        const { toast } = require('sonner');
        toast.error('No se pudo copiar el enlace');
      } catch { }
    }
  };

  const handleCheckoutFieldChange = useCallback(
    <T extends CheckoutField>(field: T, value: CheckoutFormData[T]) => {
      const nextForm = { ...checkoutForm, [field]: value } as CheckoutFormData;
      setCheckoutForm(nextForm);

      const validation = validateCheckout(nextForm);

      if (showAllCheckoutErrors) {
        setCheckoutErrors(validation.errors);
        if (validation.valid) {
          setShowAllCheckoutErrors(false);
        }
      } else {
        setCheckoutErrors(mapTouchedErrors(checkoutTouched, validation.errors));
      }
    },
    [checkoutForm, checkoutTouched, showAllCheckoutErrors]
  );

  const handleCheckoutFieldBlur = useCallback(
    (field: CheckoutField) => {
      if (!checkoutTouched[field]) {
        const updatedTouched = { ...checkoutTouched, [field]: true };
        setCheckoutTouched(updatedTouched);

        const validation = validateCheckout(checkoutForm);
        if (showAllCheckoutErrors) {
          setCheckoutErrors(validation.errors);
        } else {
          setCheckoutErrors(mapTouchedErrors(updatedTouched, validation.errors));
        }
        return;
      }

      if (!showAllCheckoutErrors) {
        const validation = validateCheckout(checkoutForm);
        setCheckoutErrors(mapTouchedErrors(checkoutTouched, validation.errors));
      }
    },
    [checkoutForm, checkoutTouched, showAllCheckoutErrors]
  );

  const handleSelectPaymentMethod = useCallback((methodId: string) => {
    setSelectedPaymentMethod(methodId);
  }, []);

  const handleCheckoutSubmit = useCallback(async () => {
    const validation = validateCheckout(checkoutForm);

    if (!validation.valid || !selectedPaymentMethod || isCartEmpty) {
      setShowAllCheckoutErrors(true);
      const touchedAll = Object.keys(CHECKOUT_TOUCHED_INITIAL).reduce<Record<CheckoutField, boolean>>(
        (acc, key) => ({ ...acc, [key as CheckoutField]: true }),
        {} as Record<CheckoutField, boolean>
      );
      setCheckoutTouched(touchedAll);
      setCheckoutErrors(validation.errors);

      if (isCartEmpty) {
        try {
          const { toast } = require('sonner');
          toast.error('Tu carrito está vacío. Volvé al catálogo para elegir una opción.');
        } catch { }
      }

      if (!selectedPaymentMethod) {
        try {
          const { toast } = require('sonner');
          toast.error('Elegí un método de pago para continuar.');
        } catch { }
      }

      return;
    }

    setCheckoutErrors(validation.errors);
    setCheckoutSubmitting(true);

    try {
      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          cart,
          customer: checkoutForm,
          paymentMethod: selectedPaymentMethod,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al procesar el pedido');
      }

      const { toast } = require('sonner');
      toast.success('¡Pedido iniciado! Redirigiendo...');

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        // Success but no redirect (e.g. cash/transfer without link)
        toast.success('¡Pedido confirmado! Te enviamos los detalles por correo.');
        setCart([]);
        // Optional: Navigate to a success view or reset
        navigateToStep('gallery');
      }

    } catch (error: any) {
      console.error('Checkout submission error', error);
      try {
        const { toast } = require('sonner');
        toast.error(error.message || 'No pudimos confirmar tu pedido. Intentá nuevamente.');
      } catch { }
    } finally {
      setCheckoutSubmitting(false);
    }
  }, [checkoutForm, isCartEmpty, selectedPaymentMethod]);

  // Transform cart items for PixiesetShoppingCart
  const shoppingCartItems = useMemo(() => {
    return cart.map(item => {
      // Find the first selected individual photo to use as preview
      const firstPhotoId = item.selectedPhotos?.individual?.[0];
      const firstPhoto = photos.find(p => p.id === firstPhotoId);

      return {
        id: item.id,
        name: item.packageName,
        price: item.price,
        quantity: item.quantity,
        photoId: firstPhotoId || 'unknown',
        image: firstPhoto?.url,
        description: `Incluye ${item.contents.individualPhotos} fotos individuales y ${item.contents.copyPhotos} copias.`
      };
    });
  }, [cart, photos]);

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 'gallery':
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-red-600">
                ♥ {derivedStats.totalFavorites} favoritas
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-600">
                🛒 {derivedStats.totalInCart} en carrito
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                ✓ {derivedStats.totalPurchased} compradas
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                ⏳ {unpurchasedCount} pendientes
              </span>
            </div>

            <PixiesetGalleryMain
              eventInfo={eventInfo}
              photos={photos}
              packages={packages}
              onPhotoClick={handlePhotoClick}
              onBuyPhoto={handleBuyPhoto}
              onPackageSelect={handleSelectPackage}
              onToggleFavorite={handleToggleFavorite}
              onShareEvent={handleShareEvent}
              settings={settings}
              theme={theme}
            />
          </div>
        );

      case 'package-selection':
        return (
          <PixiesetPackageSelector
            photo={null} // No necesitamos una foto específica para el nuevo flujo
            packages={packages}
            onBack={handleBackToGallery}
            onSelectPackage={handleSelectPackage}
            onAddToCart={() => { }} // Esta función ya no se usa en el nuevo flujo
            settings={settings}
            theme={theme}
          />
        );

      case 'photo-selection':
        return selectedPackageForPhotoSelection ? (
          <PixiesetPhotoSelector
            package={selectedPackageForPhotoSelection}
            photos={photos}
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
            items={shoppingCartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            onContinueShopping={handleContinueShopping}
            settings={settings}
          />
        );

      case 'checkout':
        return (
          <CheckoutLayout
            header={{
              badge: 'Paso 4 · Checkout',
              title: 'Revisá tu pedido antes de confirmar',
              subtitle:
                'Completá los datos del responsable e invitado/a para coordinar la entrega educativa.',
            }}
            sidebar={
              <CheckoutOrderSummary
                items={orderSummaryItems}
                totalCents={orderTotalCents}
                note="Incluye material digital + acceso al aula virtual LookEscolar."
              />
            }
            mobileSummary={
              <CheckoutOrderSummary
                variant="mobile"
                items={orderSummaryItems}
                totalCents={orderTotalCents}
                note="Incluye material digital + acceso al aula virtual LookEscolar."
              />
            }
            footer={
              <div className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-soft sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-foreground">¿Necesitás ayuda?</p>
                    <p className="text-muted-foreground">
                      Escribinos por WhatsApp y te acompañamos durante el proceso.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      variant="secondary"
                      onClick={handleBackToCartFromCheckout}
                      disabled={checkoutSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Volver al carrito
                    </Button>
                    <Button
                      onClick={handleCheckoutSubmit}
                      disabled={!canSubmitCheckout}
                      loading={checkoutSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Confirmar pedido
                    </Button>
                  </div>
                </div>
              </div>
            }
          >
            {isCartEmpty ? (
              <div className="rounded-3xl border border-accent/40 bg-accent/10 p-5 text-sm text-accent-foreground shadow-soft sm:p-6 lg:p-8">
                <p className="font-semibold">Tu carrito está vacío.</p>
                <p className="mt-1 text-muted-foreground">
                  Volvé al catálogo para elegir una opción antes de confirmar el pedido.
                </p>
              </div>
            ) : null}

            <CheckoutCustomerForm
              value={checkoutForm}
              errors={displayedCheckoutErrors}
              onFieldChange={handleCheckoutFieldChange}
              onFieldBlur={handleCheckoutFieldBlur}
              disabled={checkoutSubmitting}
            />

            <CheckoutPaymentMethods
              methods={paymentOptions}
              selectedId={selectedPaymentMethod}
              onSelect={handleSelectPaymentMethod}
              disabled={checkoutSubmitting}
            />
          </CheckoutLayout>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background" style={themeStyles as React.CSSProperties}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
