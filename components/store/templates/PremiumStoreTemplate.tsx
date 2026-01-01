'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Heart,
  Eye,
  Plus,
  Minus,
  X,
  Search,
  CreditCard,
  ArrowRight,
  Check,
  Download,
  Package,
  Image as ImageIcon,
  Sparkles,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Grid,
  LayoutGrid,
  Filter,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TemplateBaseProps } from '@/lib/types/folder-hierarchy-types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTemplateFavorites } from '@/hooks/useTemplateFavorites';
import { StoreCheckoutDialog } from '@/components/store/StoreCheckoutDialog';
import { ProductOptionsSelector, type StoreProduct } from '@/components/store/ProductOptionsSelector';
import { useUnifiedCartStore, type ProductOptions } from '@/lib/stores/unified-cart-store';
import {
  getGridClasses,
  getPaletteTokens,
  getTypographyPreset,
  resolveStoreDesign
} from '@/lib/store/store-design';

const WebGLHeroBackground = dynamic(
  () => import('./backgrounds/WebGLHeroBackground'),
  { ssr: false, loading: () => null }
);

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface Subject {
  name: string;
  grade: string;
  section: string;
}

interface PremiumStoreTemplateProps extends TemplateBaseProps {
  settings: StoreSettings;
  photos: Photo[];
  token: string;
  subject?: Subject;
  isPreselected?: boolean;
  totalPhotos?: number;
  onLoadMorePhotos?: () => void;
  hasMorePhotos?: boolean;
  loadingMore?: boolean;
}

interface CartItem {
  photoId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  photo?: Photo;
  options?: ProductOptions;
  photoUrl?: string;
}

type ViewMode = 'grid' | 'list' | 'masonry';

export function PremiumStoreTemplate({
  settings,
  photos,
  token,
  subject,
  isPreselected: _isPreselected = false,
  totalPhotos: _totalPhotos = 0,
  onLoadMorePhotos,
  hasMorePhotos = false,
  loadingMore = false,
}: PremiumStoreTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { favorites, toggleFavorite: toggleFavoriteApi } = useTemplateFavorites(photos, token);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Product Options Selector State
  const [optionsSelectorOpen, setOptionsSelectorOpen] = useState(false);
  const [selectedPhotoForOptions, setSelectedPhotoForOptions] = useState<Photo | null>(null);

  // Unified Cart Store
  const unifiedCart = useUnifiedCartStore();

  const design = resolveStoreDesign(
    settings.design ?? settings.theme_customization?.design ?? null
  );
  const palette = getPaletteTokens(design.color.palette);
  const typography = getTypographyPreset(design.typography.preset);
  const gridLayout = getGridClasses(design.grid);
  const showNavText = design.grid.nav === 'icons_text';

  // Brand colors from config
  const brandColors = {
    primary: (settings as any)?.brand_colors?.primary || palette.accent,
    secondary: (settings as any)?.brand_colors?.secondary || palette.accentSoft,
    accent: (settings as any)?.brand_colors?.accent || palette.accent,
  };

  // Default products if none are configured
  const defaultProducts = [
    {
      id: 'digital',
      name: 'Foto Digital HD',
      description: 'Descarga digital en alta resolución',
      price: 500,
      enabled: true
    },
    {
      id: 'print_10x15',
      name: 'Impresión 10x15cm',
      description: 'Foto impresa en papel fotográfico premium',
      price: 800,
      enabled: true
    },
    {
      id: 'pack_5',
      name: 'Pack 5 Fotos',
      description: 'Selecciona 5 fotos digitales con descuento',
      price: 2000,
      enabled: true
    }
  ];

  const activeProducts = settings.products && Object.keys(settings.products).length > 0
    ? Object.entries(settings.products)
        .filter(([_, product]) => product.enabled)
        .map(([id, product]) => ({ id, ...product }))
    : defaultProducts;

  // Convert activeProducts to StoreProduct format for ProductOptionsSelector
  const storeProducts: StoreProduct[] = useMemo(() => {
    return activeProducts.map(p => ({
      id: p.id,
      name: p.name,
      type: (p as any).type === 'digital' ? 'digital' as const : 'physical' as const,
      enabled: p.enabled,
      price: p.price,
      description: p.description,
      options: {
        sizes: (p as any).options?.sizes || ['10x15', '13x18', '15x21'],
        formats: (p as any).options?.formats || ['Brillante', 'Mate'],
        quality: (p as any).options?.quality || 'standard',
      },
    }));
  }, [activeProducts]);

  // Handler to open the options selector
  const handleOpenOptionsSelector = useCallback((photo: Photo) => {
    setSelectedPhotoForOptions(photo);
    setOptionsSelectorOpen(true);
  }, []);

  // Handler when options are confirmed
  const handleOptionsConfirm = useCallback((options: ProductOptions, finalPrice: number) => {
    if (!selectedPhotoForOptions) return;

    const photo = selectedPhotoForOptions;

    setCart(prev => {
      const existingItem = prev.find(
        item => item.photoId === photo.id &&
                item.productId === options.productId &&
                item.options?.size === options.size
      );

      if (existingItem) {
        return prev.map(item =>
          item.photoId === photo.id &&
          item.productId === options.productId &&
          item.options?.size === options.size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, {
        photoId: photo.id,
        productId: options.productId || '',
        productName: options.productName || '',
        price: finalPrice,
        quantity: 1,
        photoUrl: photo.url,
        photo,
        options,
      }];
    });

    // Sync with unified cart
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
        context: 'family',
        token,
      },
    });

    toast.success(`${options.productName} agregado al carrito`);
    setSelectedPhotoForOptions(null);
    setShowCart(true);
  }, [selectedPhotoForOptions, token, unifiedCart]);

  // addToCart now opens the options selector
  const addToCart = useCallback((photoId: string, _productId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    handleOpenOptionsSelector(photo);
  }, [photos, handleOpenOptionsSelector]);

  const removeFromCart = useCallback((photoId: string, productId: string) => {
    setCart(prev => prev.filter(
      item => !(item.photoId === photoId && item.productId === productId)
    ));
  }, []);

  const updateQuantity = useCallback((photoId: string, productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(photoId, productId);
      return;
    }

    setCart(prev => prev.map(item =>
      item.photoId === photoId && item.productId === productId
        ? { ...item, quantity }
        : item
    ));
  }, [removeFromCart]);

  const handleToggleFavorite = useCallback((photoId: string) => {
    toggleFavoriteApi(photoId).catch((err) => {
      console.error('No se pudo actualizar favoritos', err);
    });
  }, [toggleFavoriteApi]);

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: settings.currency || 'ARS',
    }).format(price);
  };

  const filteredPhotos = useMemo(() => {
    let filtered = photos;

    // Filter by favorites
    if (showOnlyFavorites) {
      filtered = filtered.filter(photo => favorites.includes(photo.id));
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(photo =>
        photo.student?.toLowerCase().includes(searchLower) ||
        photo.subject?.toLowerCase().includes(searchLower) ||
        photo.alt.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [photos, searchTerm, showOnlyFavorites, favorites]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowCart(false);
    setCheckoutOpen(true);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto?.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'next'
      ? (currentIndex + 1) % photos.length
      : (currentIndex - 1 + photos.length) % photos.length;

    setSelectedPhoto(photos[newIndex]);
    setCurrentPhotoIndex(newIndex);
  };

  return (
    <div
      className={cn('relative min-h-screen', typography.baseClass)}
      style={{ backgroundColor: palette.background, color: palette.text }}
    >
      <WebGLHeroBackground className="-z-10 opacity-70" />
      {/* Premium Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b shadow-sm"
        style={{ backgroundColor: palette.surface, borderColor: palette.border }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-10 w-auto rounded-xl shadow-lg" />
              ) : (
                <div className="flex items-center justify-center w-10 h-10 rounded-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent})` }}>
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-300">
                  {settings.texts?.hero_title || 'Galería Premium'}
                </h1>
                {subject && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {subject.name} • {subject.grade} {subject.section}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle - Desktop only */}
              <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    showNavText && "flex items-center gap-2 px-3 text-xs",
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                  )}
                >
                  <Grid className="h-4 w-4" />
                  {showNavText && <span>Grilla</span>}
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    showNavText && "flex items-center gap-2 px-3 text-xs",
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {showNavText && <span>Lista</span>}
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    showNavText && "flex items-center gap-2 px-3 text-xs",
                    viewMode === 'masonry' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                  )}
                >
                  <ImageIcon className="h-4 w-4" />
                  {showNavText && <span>Mosaico</span>}
                </button>
              </div>

              {/* Filter Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="h-4 w-4" />
                {(searchTerm || showOnlyFavorites) && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </Button>

              {/* Favorites Toggle */}
              <Button
                variant={showOnlyFavorites ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className="relative"
              >
                <Heart className={cn("h-4 w-4", showOnlyFavorites && "fill-current")} />
                {favorites.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 min-w-[18px] h-[18px] text-[10px] px-1"
                  >
                    {favorites.length}
                  </Badge>
                )}
              </Button>

              {/* Cart Button */}
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCart(!showCart)}
                className="relative text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent})` }}
              >
                <ShoppingCart className="h-4 w-4" />
                {cart.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs px-1"
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          {showFilters && (
            <div className="border-t border-gray-100 py-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar fotos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Info className="h-4 w-4" />
                  <span>
                    Mostrando {filteredPhotos.length} de {photos.length} fotos
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {settings.texts?.hero_subtitle || 'Captura los Mejores Momentos'}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {settings.texts?.welcome_message || 'Fotos profesionales de alta calidad listas para descargar. Selecciona tus favoritas y completa tu pedido de forma segura.'}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium text-gray-900">Pago Seguro</p>
              <p className="text-xs text-gray-500">Con Mercado Pago</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-4 text-center">
              <Download className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium text-gray-900">Descarga Digital</p>
              <p className="text-xs text-gray-500">Alta resolución</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium text-gray-900">Envío Incluido</p>
              <p className="text-xs text-gray-500">A todo el país</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-medium text-gray-900">Entrega Rápida</p>
              <p className="text-xs text-gray-500">24-48 horas</p>
            </CardContent>
          </Card>
        </div>

        {/* Photo Gallery */}
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron fotos
            </h3>
            <p className="text-gray-600">
              {showOnlyFavorites
                ? 'No tienes fotos favoritas aún. Marca algunas fotos como favoritas para verlas aquí.'
                : 'Intenta ajustar los filtros de búsqueda.'}
            </p>
            {showOnlyFavorites && (
              <Button
                onClick={() => setShowOnlyFavorites(false)}
                className="mt-4"
                variant="outline"
              >
                Ver todas las fotos
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              viewMode === 'grid' && cn('grid', gridLayout.colsClass, gridLayout.gapClass),
              viewMode === 'list' && 'space-y-4',
              viewMode === 'masonry' && 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4'
            )}
          >
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className={cn(
                  "group relative cursor-pointer",
                  viewMode === 'masonry' && "break-inside-avoid mb-4"
                )}
                onClick={() => {
                  setSelectedPhoto(photo);
                  setCurrentPhotoIndex(index);
                }}
              >
                <Card className={cn(
                  "overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300",
                  "transform hover:-translate-y-1",
                  viewMode === 'list' && "flex"
                )}>
                  <div
                    className={cn(
                      'relative overflow-hidden bg-gray-100',
                      viewMode === 'grid' && gridLayout.aspectClass,
                      viewMode === 'masonry' && 'aspect-square',
                      viewMode === 'list' && 'w-32 h-32 flex-shrink-0'
                    )}
                  >
                    <img
                      src={photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(photo.id);
                            }}
                          className={cn(
                            "w-8 h-8 p-0 rounded-full backdrop-blur-sm",
                            favorites.includes(photo.id)
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-white/90 hover:bg-white'
                          )}
                        >
                          <Heart className={cn(
                            "h-4 w-4",
                            favorites.includes(photo.id) && "fill-current"
                          )} />
                        </Button>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhoto(photo);
                            setCurrentPhotoIndex(index);
                          }}
                          className="w-full bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 text-xs shadow-lg"
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          Ver Detalles
                        </Button>
                      </div>
                    </div>

                    {/* Favorite indicator */}
                    {favorites.includes(photo.id) && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                          <Heart className="h-4 w-4 text-white fill-current" />
                        </div>
                      </div>
                    )}

                    {/* Cart indicator */}
                    {cart.some(item => item.photoId === photo.id) && (
                      <div className="absolute bottom-2 right-2 z-10">
                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          En carrito
                        </div>
                      </div>
                    )}
                  </div>

                  {viewMode === 'list' && (
                    <CardContent className="flex-1 p-4 flex items-center justify-between">
                      <div>
                        {photo.student && (
                          <p className="font-medium text-gray-900 mb-1">
                            {photo.student}
                          </p>
                        )}
                        {photo.subject && (
                          <p className="text-sm text-gray-500">
                            {photo.subject}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(photo.id);
                            }}
                        >
                          <Heart className={cn(
                            "h-4 w-4",
                            favorites.includes(photo.id) && "fill-current text-red-500"
                          )} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeProducts.length > 0) {
                              addToCart(photo.id, activeProducts[0].id);
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            ))}
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

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowCart(false)}
          />

          <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform">
            <div className="h-full flex flex-col">
              {/* Cart Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5 text-white" />
                    <h3 className="text-lg font-semibold text-white">Mi Carrito</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCart(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <ShoppingCart className="h-20 w-20 mx-auto mb-4 text-gray-200" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Tu carrito está vacío
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">
                      Agrega fotos para comenzar tu pedido
                    </p>
                    <Button
                      onClick={() => setShowCart(false)}
                      variant="outline"
                    >
                      Continuar Comprando
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.map((item, index) => (
                      <Card key={index} className="border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {item.photo && (
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <img
                                  src={item.photo.url}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-1">
                                {item.productName}
                              </h5>
                              <p className="text-sm text-gray-500 mb-2">
                                {formatPrice(item.price)} c/u
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium w-8 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <div className="ml-auto">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromCart(item.photoId, item.productId)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Cart Footer */}
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-lg font-medium text-gray-900">
                          {formatPrice(getTotalPrice())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                        <span className="text-gray-600">Envío:</span>
                        <span className="text-sm text-green-600 font-medium">
                          Gratis
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(getTotalPrice())}
                        </span>
                      </div>
                      <Button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Continuar al checkout
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      <p className="text-xs text-center text-gray-500">
                        Elegi tu metodo de pago en el siguiente paso
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Detalle de Foto
                    </h3>
                    <p className="text-sm text-gray-500">
                      {currentPhotoIndex + 1} de {photos.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigatePhoto('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigatePhoto('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(selectedPhoto.id)}
                      className={favorites.includes(selectedPhoto.id) ? 'text-red-500' : ''}
                    >
                      <Heart className={cn(
                        "h-4 w-4",
                        favorites.includes(selectedPhoto.id) && "fill-current"
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPhoto(null)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 max-h-[calc(90vh-80px)]">
                {/* Image Section */}
                <div className="lg:col-span-2 bg-black flex items-center justify-center p-4 overflow-hidden">
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.alt}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Products Section */}
                <div className="bg-gray-50 p-6 overflow-y-auto">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Opciones de Compra
                  </h4>

                  <div className="space-y-3">
                    {activeProducts.map(product => {
                      const inCart = cart.some(
                        item => item.photoId === selectedPhoto.id && item.productId === product.id
                      );

                      return (
                        <Card key={product.id} className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h5 className="font-medium text-gray-900">
                                {product.name}
                              </h5>
                              <span className="text-lg font-bold text-blue-600">
                                {formatPrice(product.price)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                              {product.description}
                            </p>
                            <Button
                              onClick={() => {
                                if (inCart) {
                                  removeFromCart(selectedPhoto.id, product.id);
                                } else {
                                  addToCart(selectedPhoto.id, product.id);
                                }
                              }}
                              variant={inCart ? "secondary" : "default"}
                              className="w-full"
                            >
                              {inCart ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  En el carrito
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Agregar al carrito
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {selectedPhoto.student && (
                    <div className="mt-6 p-4 bg-white rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Información
                      </h5>
                      <dl className="space-y-1">
                        {selectedPhoto.student && (
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-500">Estudiante:</dt>
                            <dd className="text-gray-900 font-medium">{selectedPhoto.student}</dd>
                          </div>
                        )}
                        {selectedPhoto.subject && (
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-500">Clase:</dt>
                            <dd className="text-gray-900">{selectedPhoto.subject}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <StoreCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        token={token}
        settings={settings}
        cartItems={cart}
        photos={photos}
        onOrderComplete={() => setCart([])}
      />

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
    </div>
  );
}
