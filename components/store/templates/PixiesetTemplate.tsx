// @ts-nocheck
'use client';

import { useState, useMemo, useEffect } from 'react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggleSimple } from '@/components/ui/theme-toggle-enhanced';
import { LazyImage } from '@/components/ui/lazy-image';
import { _Lightbox } from '@/components/ui/lightbox';
import { PhotoGridSkeleton, ProductGridSkeleton } from '@/components/ui/photo-skeleton';
import { 
  ShoppingCart, 
  Heart, 
  _Download, 
  Eye, 
  Plus,
  _Minus,
  _X,
  Package,
  Camera,
  Grid3x3,
  List,
  CheckCircle2,
  _Check,
  _Star,
  Sparkles,
  ArrowRight,
  _Phone,
  _Mail,
  _MapPin,
  _Facebook,
  _Instagram,
  _Twitter,
  _Users,
  Image
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getGridClasses,
  getPaletteTokens,
  getTypographyPreset,
  resolveStoreDesign
} from '@/lib/store/store-design';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { _DEFAULT_PRODUCTS, _getProductsByType, _getHighlightedProducts } from '@/lib/config/default-products';
import { TrustBadges } from '@/components/ui/trust-badges';
import { StoreFAQ } from '@/components/ui/faq';
import { _FolderSelector } from '@/components/store/FolderSelector';
import { FolderPreview } from '@/components/store/FolderPreview';
import { PaymentMethodSelector, type PaymentMethod } from '@/components/store/PaymentMethodSelector';
import { CartSidebar } from '@/components/store/CartSidebar';
import { PhotoGallerySelector } from '@/components/store/PhotoGallerySelector';
import { _FolderHierarchyDisplay } from '@/components/store/FolderHierarchyDisplay';
import type { FolderHierarchyProps, _FolderNavigationHandlers } from '@/lib/types/folder-hierarchy-types';
import { useTemplateFavorites } from '@/hooks/useTemplateFavorites';
import { PLACEHOLDER_IMAGES } from '@/lib/config/placeholder-images';
import { ProductOptionsSelector, type StoreProduct } from '@/components/store/ProductOptionsSelector';
import { useUnifiedCartStore, type ProductOptions } from '@/lib/stores/unified-cart-store';

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface PixiesetTemplateProps {
  settings: StoreSettings;
  photos: Photo[];
  token: string;
  subject?: {
    name: string;
    grade: string;
    section: string;
  };
  totalPhotos?: number;
  isPreselected?: boolean;
  folderHierarchy?: FolderHierarchyProps;
  onFolderNavigate?: (folderId: string, folderName: string) => void;
  isNavigatingFolder?: boolean;
  onLoadMorePhotos?: () => void;
  hasMorePhotos?: boolean;
  loadingMore?: boolean;
}

interface CartItem {
  id: string;
  type: 'folder' | 'extra_print';
  name: string;
  price: number;
  quantity: number;
  photos?: Array<{ id: string; url: string }>;
  photoId?: string;
  productId?: string;
  productName?: string;
  photoUrl?: string;
}

export function PixiesetTemplate({
  settings,
  photos,
  token,
  subject,
  totalPhotos: _totalPhotos,
  isPreselected = false,
  folderHierarchy,
  onFolderNavigate,
  isNavigatingFolder,
  onLoadMorePhotos,
  hasMorePhotos = false,
  loadingMore = false
}: PixiesetTemplateProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [_selectedPhotoIds, _setSelectedPhotoIds] = useState<string[]>([]);
  const [_showProductPreview, _setShowProductPreview] = useState(false);
  
  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { favorites, toggleFavorite: toggleFavoriteApi } = useTemplateFavorites(photos, token);
  const [_showCart, _setShowCart] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Argentina',
    },
  });
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry');

  // Product Options Selector State
  const [optionsSelectorOpen, setOptionsSelectorOpen] = useState(false);
  const [selectedPhotoForOptions, setSelectedPhotoForOptions] = useState<Photo | null>(null);

  // Unified Cart Store (para sincronizar con el sistema unificado)
  const unifiedCart = useUnifiedCartStore();

  // Álbum/paquete (opción A/B) y selección de fotos
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  
  // Get package products from settings
  const packageProducts = useMemo(() => {
    return Object.entries(settings.products)
      .filter(([id, product]) => {
        const productData = product as any;
        return productData.enabled && (productData.type === 'package' || id === 'carpetaA' || id === 'carpetaB');
      })
      .map(([id, product]) => ({ id, ...product as any }))
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [settings.products]);
  
  const selectedPackage = useMemo(() => (
    packageProducts.find((p) => p.id === selectedPackageId) || null
  ), [selectedPackageId, packageProducts]);
  const [selectedIndividual, setSelectedIndividual] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercado_pago');
  const design = resolveStoreDesign(
    settings.design ?? settings.theme_customization?.design ?? null
  );
  const palette = getPaletteTokens(design.color.palette);
  const typography = getTypographyPreset(design.typography.preset);
  const gridLayout = getGridClasses(design.grid);
  // Apply dynamic configuration from database
  const coverUrl = settings.banner_url || settings.logo_url || photos[0]?.url || PLACEHOLDER_IMAGES.heroes.groupPrimary;
  const showNavText = design.grid.nav === 'icons_text';
  const heroLayout =
    design.cover.style === 'center' || design.cover.style === 'joy'
      ? 'md:grid-cols-1'
      : 'md:grid-cols-3';
  const heroTextAlign =
    design.cover.style === 'center' || design.cover.style === 'joy'
      ? 'text-center items-center'
      : 'text-left items-start';
  const showCoverImage = design.cover.style !== 'none';

  // Brand colors from config
  const brandColors = {
    primary: (settings as any)?.brand_colors?.primary || palette.accent,
    secondary: (settings as any)?.brand_colors?.secondary || palette.accentSoft,
    accent: (settings as any)?.brand_colors?.accent || palette.accent,
  };
  const coverFrameClass = cn(
    'relative overflow-hidden',
    design.cover.style === 'frame' && 'rounded-3xl border-4',
    design.cover.style === 'stripe' && 'rounded-2xl p-3',
    design.cover.style === 'divider' && 'rounded-2xl border-l-4',
    design.cover.variant === 'journal' && 'border border-dashed',
    design.cover.variant === 'stamp' && 'border-2 border-dotted',
    design.cover.variant === 'outline' && 'border',
    design.cover.variant === 'border' && 'border-4',
    design.cover.variant === 'album' && 'rounded-3xl shadow-lg',
    design.cover.variant === 'cliff' && 'rounded-t-[2.5rem] rounded-b-2xl',
    design.cover.variant === 'split' && 'rounded-2xl',
    design.cover.variant === 'none' && 'rounded-2xl'
  );
  const showCoverLabel = design.cover.variant === 'label';

  // Compatibilidad de paquetes según cantidad de fotos disponibles
  const _isPackageCompatible = (pkgId: string) => {
    const pkg = packageProducts.find((p) => p.id === pkgId);
    if (!pkg) return true; // If no requirements specified, assume compatible
    if (!pkg.features || typeof pkg.features !== 'object') return true;
    const features = pkg.features as any;
    const required = (features.photos || 0);
    return photos.length >= required;
  };

  const activeProducts = Object.entries(settings.products)
    .filter(([_, product]) => product.enabled)
    .map(([id, product]) => ({ id, ...product }));

  // Convert activeProducts to StoreProduct format for ProductOptionsSelector
  const storeProducts: StoreProduct[] = useMemo(() => {
    return activeProducts.map(p => ({
      id: p.id,
      name: p.name,
      type: (p as any).type === 'digital' ? 'digital' as const : 'physical' as const,
      enabled: p.enabled,
      price: p.price, // ya en centavos
      description: p.description,
      options: {
        sizes: (p as any).options?.sizes || ['10x15', '13x18', '15x21'],
        formats: (p as any).options?.formats || ['Brillante', 'Mate'],
        quality: (p as any).options?.quality || 'standard',
      },
    }));
  }, [activeProducts]);

  // Handler para abrir el selector de opciones
  const handleOpenOptionsSelector = (photo: Photo) => {
    setSelectedPhotoForOptions(photo);
    setOptionsSelectorOpen(true);
  };

  // Handler cuando se confirman las opciones
  const handleOptionsConfirm = (options: ProductOptions, finalPrice: number) => {
    if (!selectedPhotoForOptions) return;

    const photo = selectedPhotoForOptions;

    // Agregar al carrito local (legacy)
    setCart(prev => {
      // Buscar si ya existe un item con las mismas opciones
      const existingItem = prev.find(
        item => item.photoId === photo.id &&
                item.productId === options.productId &&
                (item as any).options?.size === options.size
      );

      if (existingItem) {
        return prev.map(item =>
          item.photoId === photo.id &&
          item.productId === options.productId &&
          (item as any).options?.size === options.size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, {
        id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'extra_print' as const,
        name: `${options.productName || 'Foto'} ${options.size || ''}`.trim(),
        photoId: photo.id,
        productId: options.productId,
        productName: options.productName,
        price: finalPrice,
        quantity: 1,
        photoUrl: photo.url,
        options, // Guardamos las opciones completas
      } as CartItem];
    });

    // Agregar también al store unificado para sincronización
    unifiedCart.addItem({
      photoId: photo.id,
      filename: photo.alt || photo.id,
      price: finalPrice,
      watermarkUrl: photo.url,
      options: {
        productId: options.productId,
        productName: options.productName,
        size: options.size,
        format: options.format,
        quality: options.quality,
      },
      metadata: {
        eventId: undefined, // Se setea desde el contexto
        context: 'family',
        token,
      },
    });

    toast.success(`${options.productName} agregado al carrito`);
    setSelectedPhotoForOptions(null);
  };

  // Legacy addToCart - ahora abre el selector de opciones
  const addToCart = (photoId: string, _productId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    handleOpenOptionsSelector(photo);
  };

  const removeFromCart = (photoId: string, productId: string) => {
    setCart(prev => prev.filter(
      item => !(item.photoId === photoId && item.productId === productId)
    ));
  };

  const _updateQuantity = (photoId: string, productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(photoId, productId);
      return;
    }

    setCart(prev => prev.map(item =>
      item.photoId === photoId && item.productId === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const handleToggleFavorite = (photoId: string) => {
    toggleFavoriteApi(photoId).catch((err) => {
      console.error('No se pudo actualizar favoritos', err);
      toast.error('No pudimos actualizar tus favoritos. Intentalo nuevamente.');
    });
  };

  const getSubtotal = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const getShippingCost = () => {
    const subtotal = getSubtotal();
    // Use default shipping values or from settings if available
    const shippingCost = 1500;
    const freeShippingThreshold = 15000;
    return subtotal >= freeShippingThreshold ? 0 : shippingCost;
  };
  const getTotalPrice = () => getSubtotal() + getShippingCost();
  // Reglas del paquete
  const getPackagePhotoCount = (pkg: any) => {
    if (!pkg || !pkg.features) return 10; // Default
    if (typeof pkg.features.photos === 'number') return pkg.features.photos;
    return 10; // Default
  };
  
  const canSelectMoreIndividual = selectedPackage
    ? selectedIndividual.length < getPackagePhotoCount(selectedPackage)
    : false;
  const needsGroup = false; // Simplified for now
  const isPackageReady = selectedPackage
    ? selectedIndividual.length >= Math.min(getPackagePhotoCount(selectedPackage), photos.length)
    : true;

  const toggleSelectIndividual = (photoId: string) => {
    if (!selectedPackage) return;
    setSelectedIndividual((prev) => {
      if (prev.includes(photoId)) return prev.filter((id) => id !== photoId);
      if (prev.length < getPackagePhotoCount(selectedPackage)) return [...prev, photoId];
      // Reemplazar el último
      const copy = [...prev];
      copy[copy.length - 1] = photoId;
      return copy;
    });
  };

  const toggleSelectGroup = (photoId: string) => {
    if (!selectedPackage) return;
    setSelectedGroup((curr) => (curr === photoId ? null : photoId));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const _handlePhotoSelect = (photoId: string) => {
    setSelectedPhotoIds(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const _openLightbox = (photoId: string) => {
    const index = photos.findIndex(p => p.id === photoId);
    setLightboxIndex(index);
  };

  const _closeLightbox = () => setLightboxIndex(-1);

  const _nextPhoto = () => {
    if (lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const _previousPhoto = () => {
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const _missingForFreeShipping = getShippingCost() > 0 ? 15000 - getSubtotal() : 0;

  // Opciones desde settings (admin → store-settings)
  const features = (settings as any)?.features || {};
  const allowExtrasOnly = features.allowExtrasOnly ?? true;

  const rawPaymentMethods = useMemo(() => {
    return (
      (settings as any)?.payment_methods ||
      (settings as any)?.paymentMethods ||
      {}
    );
  }, [settings]);

  const hasPaymentConfig = useMemo(
    () => Object.keys(rawPaymentMethods || {}).length > 0,
    [rawPaymentMethods]
  );

  const mpConfig = rawPaymentMethods['mercado-pago'] || rawPaymentMethods['mercado_pago'];
  const bankConfig = rawPaymentMethods['bank-transfer'] || rawPaymentMethods['bank_transfer'];
  const cashConfig =
    rawPaymentMethods['cash'] ||
    rawPaymentMethods['cash-payment'] ||
    rawPaymentMethods['cash_on_delivery'] ||
    rawPaymentMethods['efectivo'];

  const resolveEnabled = (methodConfig: any, fallback: boolean) => {
    if (methodConfig && typeof methodConfig.enabled === 'boolean') {
      return methodConfig.enabled;
    }
    if (methodConfig) {
      return true;
    }
    return fallback;
  };

  const mpConnected = (settings as any)?.mercadoPagoConnected ?? true;
  const mpEnabled = resolveEnabled(mpConfig, true);
  const bankEnabled = resolveEnabled(bankConfig, !hasPaymentConfig);
  const cashEnabled = resolveEnabled(cashConfig, !hasPaymentConfig);

  const availablePaymentMethods = useMemo(() => {
    const methods: PaymentMethod[] = [];
    if (mpEnabled && mpConnected) methods.push('mercado_pago');
    if (bankEnabled) methods.push('bank_transfer');
    if (cashEnabled) methods.push('cash');
    return methods;
  }, [mpEnabled, mpConnected, bankEnabled, cashEnabled]);

  const paymentMethodDetails = useMemo(() => {
    const details: Partial<Record<PaymentMethod, any>> = {};

    if (mpConfig) {
      details.mercado_pago = {
        name: mpConfig.name,
        description: mpConfig.description,
        icon: mpConfig.icon,
        enabled: mpEnabled && mpConnected,
      };
    } else {
      details.mercado_pago = {
        enabled: mpEnabled && mpConnected,
      };
    }

    const formatBankInstructions = (config: Record<string, string | undefined>) => {
      if (!config) return [];
      const labelMap: Record<string, string> = {
        accountNumber: 'Número de cuenta',
        accountHolder: 'Titular',
        bankName: 'Banco',
        cbu: 'CBU',
        alias: 'Alias',
        clabe: 'CLABE',
      };
      return Object.entries(config)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
        .map(([key, value]) => {
          const label = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          return `${label}: ${value}`;
        });
    };

    const bankConfigAny = bankConfig as any;
    const bankInstructions = Array.isArray(bankConfigAny?.instructions)
      ? bankConfigAny.instructions
      : bankConfigAny?.config
      ? formatBankInstructions(bankConfigAny.config)
      : undefined;

    details.bank_transfer = {
      name: bankConfig?.name,
      description: bankConfig?.description,
      icon: bankConfig?.icon,
      enabled: bankEnabled,
      instructions: bankInstructions && bankInstructions.length > 0 ? bankInstructions : undefined,
    };

    const cashConfigAny = cashConfig as any;
    const cashConfigInstructions = Array.isArray(cashConfigAny?.instructions)
      ? cashConfigAny.instructions
      : Array.isArray(cashConfigAny?.config?.instructions)
      ? cashConfigAny.config.instructions
      : undefined;

    let cashInstructions = cashConfigInstructions?.filter((item: string) => item && item.trim().length > 0);

    if ((!cashInstructions || cashInstructions.length === 0) && cashConfig?.config && typeof cashConfig.config === 'object') {
      cashInstructions = Object.entries(cashConfig.config)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
        .map(([key, value]) => {
          const normalizedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          const label = normalizedKey.charAt(0).toUpperCase() + normalizedKey.slice(1);
          return `${label}: ${value}`;
        });
    }

    details.cash = {
      name: cashConfig?.name,
      description: cashConfig?.description,
      icon: cashConfig?.icon,
      enabled: cashEnabled,
      instructions: cashInstructions && cashInstructions.length > 0 ? cashInstructions : undefined,
    };

    return details;
  }, [mpConfig, mpEnabled, mpConnected, bankConfig, bankEnabled, cashConfig, cashEnabled]);

  useEffect(() => {
    if (availablePaymentMethods.length === 0) {
      return;
    }
    if (!availablePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0]);
    }
  }, [availablePaymentMethods, paymentMethod]);

  const isCurrentPaymentDisabled =
    (paymentMethod === 'mercado_pago' && (!mpEnabled || !mpConnected)) ||
    (paymentMethod === 'bank_transfer' && !bankEnabled) ||
    (paymentMethod === 'cash' && !cashEnabled);

  const hasPaymentOptions = availablePaymentMethods.length > 0;

  // Unique photo ids in cart (for schema selectedPhotos)
  const uniquePhotoIds = useMemo(() => {
    const s = new Set<string>();
    cart.forEach((c) => s.add(c.photoId));
    return Array.from(s);
  }, [cart]);

  const _canCheckout = cart.length > 0 && (selectedPackage ? isPackageReady : allowExtrasOnly);

  const validateContact = () => {
    if (!contact.name.trim()) return 'Ingresá tu nombre completo';
    if (!contact.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) return 'Ingresá un email válido';
    if (!contact.address.street.trim()) return 'Ingresá la calle y número';
    if (!contact.address.city.trim()) return 'Ingresá la ciudad';
    if (!contact.address.state.trim()) return 'Ingresá la provincia';
    if (!contact.address.zipCode.trim()) return 'Ingresá el código postal';
    return null;
  };

  const handleCreatePreference = async () => {
    const err = validateContact();
    if (err) {
      setFormError(err);
      return;
    }

    if (!availablePaymentMethods.includes(paymentMethod)) {
      setFormError('Seleccioná un método de pago disponible');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      // Validaciones de paquete
      if (selectedPackage && !isPackageReady) {
        setSubmitting(false);
        setFormError('Completá la selección requerida del álbum');
        return;
      }

      const orderData = {
        id: orderId,
        token,
        basePackage: selectedPackage
          ? { id: selectedPackage.id, name: selectedPackage.name, basePrice: selectedPackage.basePrice }
          : { id: 'cart', name: 'Compra de fotos', basePrice: 0 },
        selectedPhotos: selectedPackage
          ? { individual: selectedIndividual, group: selectedGroup ? [selectedGroup] : [] }
          : { individual: uniquePhotoIds, group: [] },
        additionalCopies: cart.map((item) => {
          const cartOptions = (item as any).options;
          return {
            id: `${item.productId}_${item.photoId}`,
            productId: item.productId || '',
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            photoId: item.photoId,
            options: cartOptions ? {
              size: cartOptions.size,
              format: cartOptions.format,
              quality: cartOptions.quality,
              productName: cartOptions.productName || item.productName,
            } : undefined,
          };
        }),
        contactInfo: contact,
        totalPrice: getTotalPrice(),
        paymentMethod,
      };

      // Handle different payment methods
      if (paymentMethod === 'mercado_pago') {
        // Create MercadoPago preference
        const payload = {
          order: orderData,
          callbackBase: 'store-unified' as const,
        };

        const res = await fetch('/api/store/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo iniciar el pago');
        }

        const _data = await res.json();
        if (_data?.init_point) {
          window.location.href = _data.init_point;
        } else if (_data?.sandbox_init_point) {
          window.location.href = _data.sandbox_init_point;
        } else {
          throw new Error('Respuesta inválida del proveedor de pagos');
        }
      } else {
        // For bank transfer and cash, create order without payment
        const res = await fetch('/api/store/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: orderData }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo crear el pedido');
        }

        const _data = await res.json();
        
        // Show success message with instructions
        setCheckoutOpen(false);
        setCart([]);
        
        if (paymentMethod === 'bank_transfer') {
          alert(`¡Pedido confirmado! 📦\n\nNúmero de pedido: ${orderId}\n\nRealizá la transferencia de ${formatPrice(getTotalPrice())} a:\nCBU: 0000003100019925293912\nAlias: LOOKESCOLAR.FOTOS\n\nEnviá el comprobante por WhatsApp al +54 11 1234-5678`);
        } else {
          alert(`¡Pedido confirmado! 📦\n\nNúmero de pedido: ${orderId}\n\nTe contactaremos pronto para coordinar el pago en efectivo de ${formatPrice(getTotalPrice())}.`);
        }
      }
    } catch (e: any) {
      setFormError(e?.message || 'Error al procesar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="h-16 bg-white/50 dark:bg-slate-800/50 border-b" />
          
          <div className="container mx-auto px-4 py-8">
            {/* Hero Skeleton */}
            <div className="h-32 bg-white/50 dark:bg-slate-800/50 rounded-xl mb-8" />
            
            {/* Products Skeleton */}
            <ProductGridSkeleton className="mb-12" />
            
            {/* Photos Skeleton */}
            <PhotoGridSkeleton count={12} className="gap-6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('min-h-screen transition-all duration-500', typography.baseClass)}
      style={{ backgroundColor: palette.background, color: palette.text }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{ backgroundColor: palette.surface, borderColor: palette.border }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-8 w-auto" />
              ) : (
                <Camera className="h-6 w-6" style={{ color: brandColors.primary }} />
              )}
              <h1 className="text-xl font-semibold text-foreground">
                {settings.texts?.hero_title || subject?.name || 'Galería'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size={showNavText ? 'sm' : 'icon'}
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className={cn('hidden sm:inline-flex', showNavText && 'gap-2 px-3')}
              >
                {viewMode === 'grid' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid3x3 className="h-4 w-4" />
                )}
                {showNavText && (
                  <span className="text-xs font-medium">
                    {viewMode === 'grid' ? 'Lista' : 'Grilla'}
                  </span>
                )}
              </Button>
              
              <ThemeToggleSimple />
            </div>
          </div>
        </div>
      </header>

      {/* Folder Hierarchy Navigation */}
      {folderHierarchy && (folderHierarchy.childFolders?.length || folderHierarchy.path) && (
        <div className="container mx-auto px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          {/* Breadcrumb */}
          {folderHierarchy.path && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <button
                onClick={() => onFolderNavigate?.('', 'Root')}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Inicio
              </button>
              {folderHierarchy.path.split('/').filter(Boolean).map((segment, index, arr) => (
                <span key={index} className="flex items-center gap-2">
                  <span className="text-gray-400">/</span>
                  <button
                    className={cn(
                      "hover:text-gray-900 dark:hover:text-gray-100",
                      index === arr.length - 1
                        ? "text-gray-900 dark:text-gray-100 font-medium"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                    disabled={index === arr.length - 1}
                  >
                    {segment}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Child Folders */}
          {folderHierarchy.childFolders && folderHierarchy.childFolders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {folderHierarchy.childFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => onFolderNavigate?.(folder.id, folder.name)}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  disabled={isNavigatingFolder}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Image className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm truncate">{folder.name}</span>
                  </div>
                  {folder.photo_count !== undefined && (
                    <p className="text-xs text-gray-500">{folder.photo_count} fotos</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content with Sidebar Layout */}
      <div className="container mx-auto px-4 py-6">
        <section className="mb-8">
          <div
            className={cn('grid gap-6 rounded-3xl border', heroLayout)}
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
          >
            <div className={cn('space-y-3 p-6', heroTextAlign)}>
              <div
                className={cn('text-xs uppercase tracking-[0.3em]', typography.headingClass)}
                style={{ color: palette.muted }}
              >
                Colección escolar
              </div>
              <h2 className={cn('text-3xl font-semibold', typography.headingClass)}>
                {settings.texts?.hero_title || subject?.name || 'Galería Fotográfica'}
              </h2>
              <p className="text-sm" style={{ color: palette.muted }}>
                {settings.texts?.hero_subtitle || settings.texts?.welcome_message || 'Ordena tus recuerdos en una experiencia premium.'}
              </p>
              {settings.texts?.welcome_message && (
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: palette.accentSoft }}>
                  <p className="text-sm">{settings.texts.welcome_message}</p>
                </div>
              )}
              <Button
                className="w-fit rounded-full text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ backgroundColor: brandColors.primary, color: '#ffffff' }}
              >
                Ver galería
              </Button>
            </div>

            {showCoverImage && (
              <div className={cn('p-6', design.cover.style === 'center' ? '' : 'md:col-span-2')}>
                <div
                  className={coverFrameClass}
                  style={{ borderColor: palette.border }}
                >
                  {showCoverLabel && (
                    <div
                      className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
                      style={{ backgroundColor: palette.surface, color: palette.text }}
                    >
                      Especial
                    </div>
                  )}
                  {design.cover.variant === 'split' && (
                    <div
                      className="absolute inset-y-0 left-1/2 w-px"
                      style={{ backgroundColor: palette.border }}
                    />
                  )}
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt="Portada"
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-56 w-full"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent} 60%, ${palette.text} 100%)`,
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Full Width Photo Gallery at Top */}
        <section className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {subject?.name || 'Galería Fotográfica'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {isPreselected 
                ? `${photos.length} fotos seleccionadas especialmente para ti`
                : `${photos.length} fotos disponibles para tu álbum`}
            </p>
          </div>
          
          {/* Large Photo Gallery - Grid Layout */}
          <div className="relative">
            <div className={cn('grid mb-6', gridLayout.colsClass, gridLayout.gapClass)}>
              {photos.slice(0, 24).map((photo) => (
                <div
                  key={photo.id}
                  className={cn(
                    'relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group',
                    gridLayout.aspectClass
                  )}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <LazyImage
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                    showProtectionBadge={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                      <Eye className="h-4 w-4 text-white" />
                      {favorites.includes(photo.id) && (
                        <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {photos.length > 24 && (
              <div className="text-center">
                <Button variant="outline" size="sm" onClick={() => {/* Implement show more */}}>
                  Ver las {photos.length - 24} fotos restantes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </section>

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
          {/* Main Content Area */}
          <main className="space-y-6">
        
            {/* Banner de fotos pre-seleccionadas */}
            {isPreselected && (
              <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-500/20 p-2">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      Fotos Seleccionadas Especialmente Para Ti
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      El fotógrafo ha elegido estas {photos.length} fotos destacadas de tu evento. 
                      Estas son las únicas fotos disponibles para comprar en este enlace.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Integrated Package Selection - More Compact */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Paso 1: Elegí tu Paquete
                </h3>
                {selectedPackageId && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Seleccionado
                  </Badge>
                )}
              </div>
          
              {/* Compact Package Cards in Single Row */}
              <div className="grid grid-cols-2 gap-3">
            {packageProducts.map((option) => (
              <Card 
                key={option.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg",
                  selectedPackageId === option.id 
                    ? "ring-2 ring-primary border-primary" 
                    : "hover:border-primary/50"
                )}
                onClick={() => {
                  setSelectedPackageId(option.id);
                  setSelectedIndividual([]);
                  setSelectedGroup(null);
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{option.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-primary">
                        ${(option.price || 0).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    {option.features && typeof option.features === 'object' && (
                      <>
                        {option.features.photos && (
                          <div className="flex items-center gap-2">
                            <Camera className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            <span>{option.features.photos} fotos incluidas</span>
                          </div>
                        )}
                        {option.features.includes && Array.isArray(option.features.includes) && (
                          <>
                            {option.features.includes.slice(0, 2).map((feature: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span className="text-[10px]">{feature}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                  
                  {selectedPackageId === option.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
              </div>
            </div>
            
            {/* Photo Selection Section - Only shows when package is selected */}
            {selectedPackage && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    Paso 2: Seleccioná tus Fotos
                  </h3>
                  {isPackageReady && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completo
                    </Badge>
                  )}
                </div>
                
                <PhotoGallerySelector
                  photos={photos.map(photo => ({
                    ...photo,
                    isGroupPhoto: photo.subject?.toLowerCase().includes('grupal') || false
                  }))}
                  selectedPackage={selectedPackage}
                  selectedIndividual={selectedIndividual}
                  selectedGroup={selectedGroup}
                  onSelectIndividual={toggleSelectIndividual}
                  onSelectGroup={(id) => setSelectedGroup(id)}
                  onRemoveIndividual={(id) => {
                    setSelectedIndividual(selectedIndividual.filter(photoId => photoId !== id));
                  }}
                  onRemoveGroup={() => setSelectedGroup(null)}
                />
              </div>
            )}

            {/* Folder Preview - Compact */}
            {selectedPackage && isPackageReady && (
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Vista Previa de tu Carpeta
                </h3>
                <FolderPreview
              selectedPackage={selectedPackage}
              selectedIndividualPhotos={selectedIndividual.map(id => {
                const photo = photos.find(p => p.id === id);
                return photo ? { id: photo.id, url: photo.url } : null;
              }).filter(Boolean) as Array<{ id: string; url: string }>}
              selectedGroupPhoto={selectedGroup ? (() => {
                const photo = photos.find(p => p.id === selectedGroup);
                return photo ? { id: photo.id, url: photo.url } : undefined;
              })() : undefined}
                />
              </div>
            )}

            {/* Additional Copies Section - More Integrated */}
            {selectedPackage && isPackageReady && (
              <Card className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4 text-purple-600" />
                    Paso 3: Copias Adicionales (Opcional)
                  </h3>
                </div>
            
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {/* Additional copies - filter print type products */}
                {Object.entries(settings.products)
                  .filter(([_id, product]) => {
                    const prod = product as any;
                    return prod.enabled && prod.type === 'print';
                  })
                  .map(([_id, product]) => {
                    const copy = product as any;
                    return (
                      <Card key={_id} className="flex-shrink-0 w-32 p-3 hover:shadow-lg transition-shadow">
                        <div className="space-y-2">
                          <div className="text-center">
                            <p className="font-medium text-xs">{copy.name}</p>
                            {copy.features?.size && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">{copy.features.size}</p>
                            )}
                            <p className="text-lg font-bold text-primary">
                              ${copy.price}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs"
                            onClick={() => {
                              if (selectedIndividual[0]) {
                                const photo = photos.find(p => p.id === selectedIndividual[0]);
                                if (photo) {
                                  const extraPrint: CartItem = {
                                    id: `extra_${Date.now()}`,
                                    type: 'extra_print',
                                    name: `Copia ${copy.name}`,
                                    price: copy.price,
                                    quantity: 1,
                                    photos: [{ id: photo.id, url: photo.url }]
                                  };
                                  setCart([...cart, extraPrint]);
                                  toast.success(`Copia ${copy.name} agregada al carrito`);
                                }
                              } else {
                                toast.error('Primero seleccioná las fotos de tu carpeta');
                              }
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
              </Card>
            )}

        {/* Legacy Photo Grid - Hidden when using PhotoGallerySelector */}
        {!selectedPackage && (
          <div className={cn(
            "grid gap-4",
            viewMode === 'grid' 
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
              : "grid-cols-1"
          )}>
            {photos.map((photo) => {
            const isIndividualSelected = selectedIndividual.includes(photo.id);
            const isGroupSelected = selectedGroup === photo.id;
            const isSelected = isIndividualSelected || isGroupSelected;
            
            return (
              <Card 
                key={photo.id}
                className={cn(
                  "group overflow-hidden hover:shadow-lg transition-all duration-300",
                  "border-gray-200 dark:border-gray-700",
                  isSelected && "ring-2 ring-primary ring-offset-2",
                  viewMode === 'list' && "flex"
                )}
              >
                <div className={cn(
                  "relative overflow-hidden bg-gray-100 dark:bg-gray-800",
                  viewMode === 'grid' ? "aspect-[4/3]" : "w-48 h-36 flex-shrink-0"
                )}>
                  <LazyImage src={photo.url} alt={photo.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" showProtectionBadge={false} />
                  
                  {/* Selection Badge */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className={cn(
                        "shadow-lg",
                        isIndividualSelected && "bg-blue-500 text-white",
                        isGroupSelected && "bg-purple-500 text-white"
                      )}>
                        {isIndividualSelected && "Individual"}
                        {isGroupSelected && "Grupal"}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                    Vista protegida
                  </div>
                  
                  {/* Click layer: abrir modal de detalle con la foto seleccionada */}
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(photo)}
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Ampliar"
                  />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800"
                        onClick={() => handleToggleFavorite(photo.id)}
                      >
                        <Heart 
                          className={cn(
                            "h-4 w-4",
                            favorites.includes(photo.id) 
                              ? "fill-red-500 text-red-500" 
                              : "text-gray-600 dark:text-gray-400"
                          )}
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <CardContent className={cn(
                  "p-3",
                  viewMode === 'list' && "flex-1 flex items-center justify-between"
                )}>
                  <div className={cn(
                    'space-y-2',
                    viewMode === 'list' && 'flex-1 space-y-0'
                  )}>
                    {selectedPackage && (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant={isIndividualSelected ? 'default' : 'outline'}
                          onClick={() => toggleSelectIndividual(photo.id)}
                          className="w-full"
                        >
                          {isIndividualSelected ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Individual
                            </>
                          ) : canSelectMoreIndividual ? (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Individual
                            </>
                          ) : (
                            'Reemplazar'
                          )}
                        </Button>
                        {needsGroup && (
                          <Button
                            size="sm"
                            variant={isGroupSelected ? 'default' : 'outline'}
                            onClick={() => toggleSelectGroup(photo.id)}
                            className="w-full"
                          >
                            {isGroupSelected ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Grupal
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Grupal
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Add to cart for extra copies */}
                    {!selectedPackage && activeProducts.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToCart(photo.id, activeProducts[0].id)}
                        className="w-full"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Agregar
                      </Button>
                    )}
                  </div>
                  
                  {viewMode === 'list' && !selectedPackage && (
                    <div className="flex items-center space-x-2">
                      {activeProducts.slice(0, 2).map(product => (
                        <Button
                          key={product.id}
                          size="sm"
                          variant="outline"
                          onClick={() => addToCart(photo.id, product.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {formatPrice(product.price)}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}

        {hasMorePhotos && onLoadMorePhotos && (
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={onLoadMorePhotos}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando...' : 'Cargar mas fotos'}
            </Button>
          </div>
        )}
          </main>

          {/* Cart Sidebar - Desktop Only */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <CartSidebar
                selectedPackage={selectedPackage}
                selectedIndividualPhotos={selectedIndividual.map(id => {
                  const photo = photos.find(p => p.id === id);
                  return photo ? { id: photo.id, url: photo.url } : null;
                }).filter(Boolean) as Array<{ id: string; url: string }>}
                selectedGroupPhoto={selectedGroup ? (() => {
                  const photo = photos.find(p => p.id === selectedGroup);
                  return photo ? { id: photo.id, url: photo.url } : undefined;
                })() : undefined}
                extraPrints={cart.filter(item => item.type === 'extra_print')}
                onAddExtraPrint={() => {
                  // Open modal for selecting photos for extra prints
                  if (selectedIndividual.length > 0) {
                    const firstPhoto = photos.find(p => p.id === selectedIndividual[0]);
                    if (firstPhoto) {
                      const extraPrint: CartItem = {
                        id: `extra_${Date.now()}`,
                        type: 'extra_print',
                        name: 'Copia Extra 15x21',
                        price: 1500,
                        quantity: 1,
                        photos: [{ id: firstPhoto.id, url: firstPhoto.url }]
                      };
                      setCart([...cart, extraPrint]);
                    }
                  }
                }}
                onRemoveExtraPrint={(id) => {
                  setCart(cart.filter(item => item.id !== id));
                }}
                onUpdateQuantity={(id, quantity) => {
                  setCart(cart.map(item => 
                    item.id === id ? { ...item, quantity } : item
                  ));
                }}
                onCheckout={() => {
                  setCheckoutOpen(true);
                }}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Photo Detail Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPhoto.alt || 'Foto'}</DialogTitle>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <LazyImage src={selectedPhoto.url} alt={selectedPhoto.alt} className="w-full h-full object-cover" showProtectionBadge={false} loading="eager" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Información</h3>
                    <div className="space-y-2 text-sm">
                      {selectedPackage && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={selectedIndividual.includes(selectedPhoto.id) ? 'default' : 'outline'}
                            onClick={() => toggleSelectIndividual(selectedPhoto.id)}
                          >
                            {selectedIndividual.includes(selectedPhoto.id)
                              ? 'Quitar Individual'
                              : canSelectMoreIndividual
                              ? 'Sel. Individual'
                              : 'Reemplazar'}
                          </Button>
                          {needsGroup && (
                            <Button
                              size="sm"
                              variant={selectedGroup === selectedPhoto.id ? 'default' : 'outline'}
                              onClick={() => toggleSelectGroup(selectedPhoto.id)}
                            >
                              {selectedGroup === selectedPhoto.id ? 'Quitar Grupal' : 'Sel. Grupal'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold mb-3">Productos Disponibles</h3>
                    <div className="space-y-2">
                      {activeProducts.length > 0 ? (
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            // Guardar referencia antes de cerrar el modal
                            const photoToAdd = selectedPhoto;
                            setSelectedPhoto(null);
                            // Pequeño delay para que el modal de detalle se cierre antes de abrir el selector
                            setTimeout(() => {
                              if (photoToAdd) {
                                handleOpenOptionsSelector(photoToAdd);
                              }
                            }, 100);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Seleccionar opciones y agregar al carrito
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay productos disponibles
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* Checkout Modal */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Payment Method Selection */}
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelect={setPaymentMethod}
              totalAmount={getTotalPrice()}
              enabledMethods={{
                mercadoPago: mpEnabled && mpConnected,
                bankTransfer: bankEnabled,
                cash: cashEnabled,
              }}
              methodDetails={paymentMethodDetails}
            />
            {!hasPaymentOptions && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                No hay métodos de pago habilitados en este momento. Contactá al administrador para finalizar tu compra.
              </div>
            )}

            <Separator />

            {/* Contact Form */}
            <div className="space-y-4">
              <h3 className="font-semibold">Datos de Contacto y Envío</h3>
              {formError && (
                <div className="error-message text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Nombre y apellido</label>
                <input
                  className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Teléfono (opcional)</label>
                  <input
                    className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                    value={contact.phone}
                    onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Calle y número</label>
                <input
                  className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                  value={contact.address.street}
                  onChange={(e) => setContact((c) => ({ ...c, address: { ...c.address, street: e.target.value } }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Ciudad</label>
                  <input
                    className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                    value={contact.address.city}
                    onChange={(e) => setContact((c) => ({ ...c, address: { ...c.address, city: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Provincia</label>
                  <input
                    className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                    value={contact.address.state}
                    onChange={(e) => setContact((c) => ({ ...c, address: { ...c.address, state: e.target.value } }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Código Postal</label>
                  <input
                    className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                    value={contact.address.zipCode}
                    onChange={(e) => setContact((c) => ({ ...c, address: { ...c.address, zipCode: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">País</label>
                  <input
                    className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                    value={contact.address.country}
                    onChange={(e) => setContact((c) => ({ ...c, address: { ...c.address, country: e.target.value } }))}
                  />
                </div>
              </div>
            </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total a pagar</span>
              <span className="text-lg font-semibold">{formatPrice(getTotalPrice())}</span>
            </div>
            <Button 
              className="w-full" 
              disabled={submitting || !hasPaymentOptions || isCurrentPaymentDisabled} 
              onClick={handleCreatePreference}
            >
              {submitting ? 'Procesando...' : 
               paymentMethod === 'mercado_pago' ? 'Ir a Mercado Pago' :
               paymentMethod === 'bank_transfer' ? 'Confirmar Pedido' :
               'Confirmar Pedido'}
            </Button>
            <TrustBadges className="mt-2" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Zoom modal eliminado: se usa el modal de detalle (selectedPhoto) */}

      {/* Product Options Selector Modal */}
      <ProductOptionsSelector
        open={optionsSelectorOpen}
        onClose={() => {
          setOptionsSelectorOpen(false);
          setSelectedPhotoForOptions(null);
        }}
        onConfirm={handleOptionsConfirm}
        products={storeProducts}
        photoUrl={selectedPhotoForOptions?.url || ''}
        photoName={selectedPhotoForOptions?.alt}
        defaultProductId={storeProducts[0]?.id}
      />

      {/* Sticky mobile checkout bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-3 left-3 right-3 z-40 rounded-xl border bg-white dark:bg-gray-900 p-3 shadow-lg sm:hidden flex items-center justify-between">
          <div className="text-sm">
            <div className="font-semibold">{formatPrice(getTotalPrice())}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </div>
          <Button size="sm" onClick={() => setCheckoutOpen(true)}>Finalizar compra</Button>
        </div>
      )}

      {/* FAQ al final */}
      <div className="container mx-auto px-4 pb-12">
        <StoreFAQ className="mt-8" />
      </div>
    </div>
  );
}
