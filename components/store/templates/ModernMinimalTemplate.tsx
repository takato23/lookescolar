'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
  Heart,
  Eye,
  Plus,
  Minus,
  X,
  Filter,
  Search,
  ArrowRight,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TemplateBaseProps } from '@/lib/types/folder-hierarchy-types';
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
import { PLACEHOLDER_IMAGES } from '@/lib/config/placeholder-images';

const CanvasGlowBackground = dynamic(
  () => import('./backgrounds/CanvasGlowBackground'),
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

interface ModernMinimalTemplateProps extends TemplateBaseProps {
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
  photoUrl?: string;
  options?: ProductOptions;
}

export function ModernMinimalTemplate({
  settings,
  photos,
  token,
  subject,
  folderHierarchy: _folderHierarchy,
  onFolderNavigate: _onFolderNavigate,
  isNavigatingFolder: _isNavigatingFolder,
  isPreselected: _isPreselected = false,
  totalPhotos: _totalPhotos = 0,
  onLoadMorePhotos,
  hasMorePhotos = false,
  loadingMore = false,
}: ModernMinimalTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { favorites, toggleFavorite: toggleFavoriteApi } = useTemplateFavorites(photos, token);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
  const coverUrl = settings.banner_url || settings.logo_url || photos[0]?.url || PLACEHOLDER_IMAGES.heroes.studentPortrait;
  const showCoverImage = design.cover.style !== 'none';
  const showNavText = design.grid.nav === 'icons_text';

  // Brand colors from config
  const brandColors = {
    primary: (settings as any)?.brand_colors?.primary || palette.accent,
    secondary: (settings as any)?.brand_colors?.secondary || palette.accentSoft,
    accent: (settings as any)?.brand_colors?.accent || palette.accent,
  };
  const heroLayout =
    design.cover.style === 'center' || design.cover.style === 'joy'
      ? 'grid-cols-1 text-center'
      : 'md:grid-cols-[1fr_1.2fr] text-left';
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
      price: p.price,
      description: p.description,
      options: {
        sizes: (p as any).options?.sizes || ['10x15', '13x18', '15x21'],
        formats: (p as any).options?.formats || ['Brillante', 'Mate'],
        quality: (p as any).options?.quality || 'standard',
      },
    }));
  }, [activeProducts]);

  // Handler para abrir el selector de opciones
  const handleOpenOptionsSelector = useCallback((photo: Photo) => {
    setSelectedPhotoForOptions(photo);
    setOptionsSelectorOpen(true);
  }, []);

  // Handler cuando se confirman las opciones
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

  const filteredPhotos = photos.filter(photo => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      photo.student?.toLowerCase().includes(searchLower) ||
      photo.subject?.toLowerCase().includes(searchLower) ||
      photo.alt.toLowerCase().includes(searchLower)
    );
  });

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowCart(false);
    setCheckoutOpen(true);
  };

  return (
    <div
      className={cn('relative min-h-screen', typography.baseClass)}
      style={{ backgroundColor: palette.background, color: palette.text }}
    >
      <CanvasGlowBackground className="-z-10 opacity-80" />
      {/* Elegant Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-sm border-b"
        style={{ backgroundColor: palette.surface, borderColor: palette.border }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center space-x-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-8 w-auto" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColors.primary }}>
                  <span className="text-white font-bold text-sm">L</span>
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold" style={{ color: palette.text }}>
                  {settings.texts?.hero_title || subject?.name || 'Galería'}
                </h1>
                {subject && (
                  <p className="text-sm" style={{ color: palette.muted }}>
                    {subject.grade} {subject.section} - {subject.name}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size={showNavText ? 'sm' : 'icon'}
                onClick={() => setShowFilters(!showFilters)}
                className={cn('hidden md:flex', showNavText && 'gap-2')}
              >
                <Filter className="h-4 w-4" />
                {showNavText && <span className="text-xs">Filtros</span>}
              </Button>

              <Button
                variant="ghost"
                size={showNavText ? 'sm' : 'icon'}
                onClick={() => setShowCart(!showCart)}
                className={cn('relative', showNavText && 'gap-2')}
              >
                <ShoppingCart className="h-5 w-5" />
                {showNavText && <span className="text-xs">Carrito</span>}
                {cart.length > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs px-1"
                    style={{ backgroundColor: brandColors.primary }}
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          {showFilters && (
            <div className="border-t border-gray-100 py-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  />
                </div>
                
                {favorites.length > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {favorites.length} favoritos
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className={cn('grid items-center gap-8 mb-16', heroLayout)}>
          <div className={cn('space-y-4', heroLayout.includes('text-center') ? 'mx-auto max-w-2xl' : '')}>
            <div className={cn('text-xs uppercase tracking-[0.3em]', typography.headingClass)} style={{ color: palette.muted }}>
              Colección escolar
            </div>
            <h2 className={cn('text-4xl font-light', typography.headingClass)}>
              {settings.texts?.hero_title || subject?.name || 'Galería Fotográfica'}
            </h2>
            <p className="text-lg" style={{ color: palette.muted }}>
              {settings.texts?.welcome_message || settings.texts?.hero_subtitle ||
                'Encuentra los mejores momentos de tu experiencia escolar.'}
            </p>
          </div>

          {showCoverImage && (
            <div>
              <div className={coverFrameClass} style={{ borderColor: palette.border }}>
                {design.cover.variant === 'label' && (
                  <div
                    className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
                    style={{ backgroundColor: palette.surface, color: palette.text }}
                  >
                    Edición especial
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
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-64 w-full"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent} 60%, ${palette.text} 100%)`,
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredPhotos.length}
            </div>
            <div className="text-sm text-gray-600">
              Fotos Disponibles
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {activeProducts.length}
            </div>
            <div className="text-sm text-gray-600">
              Productos
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {favorites.length}
            </div>
            <div className="text-sm text-gray-600">
              Favoritos
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div className="text-sm text-gray-600">
              En Carrito
            </div>
          </div>
        </div>

        {/* Products Showcase */}
        {activeProducts.length > 0 && (
          <section className="mb-16">
            <h3 className="text-2xl font-light text-gray-900 text-center mb-12">
              Productos Disponibles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {activeProducts.map(product => (
                <Card key={product.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Download className="h-6 w-6 text-gray-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {product.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {product.description}
                    </p>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-light text-gray-900">
              Galería de Fotos
            </h3>
            <div className="text-sm text-gray-600">
              {filteredPhotos.length} de {photos.length} fotos
            </div>
          </div>

          <div className={cn('grid', gridLayout.colsClass, gridLayout.gapClass)}>
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                className="group relative cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                  <div className={cn('relative', gridLayout.aspectClass)}>
                    <img
                      src={photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    
                    {/* Actions */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(photo.id);
                          }}
                        className={`w-8 h-8 p-0 rounded-full ${
                          favorites.includes(photo.id) 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-white/90 hover:bg-white'
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${favorites.includes(photo.id) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>

                    {/* Quick view */}
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhoto(photo);
                        }}
                        className="w-full bg-white/90 hover:bg-white text-gray-900 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>

                  {/* Photo Info */}
                  <CardContent className="p-4">
                    {photo.student && (
                      <p className="font-medium text-gray-900 text-sm truncate mb-1">
                        {photo.student}
                      </p>
                    )}
                    {photo.subject && (
                      <p className="text-xs text-gray-500 truncate">
                        {photo.subject}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Favorite indicator */}
                {favorites.includes(photo.id) && (
                  <div className="absolute top-2 left-2">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <Heart className="h-3 w-3 text-red-600 fill-current" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {hasMorePhotos && onLoadMorePhotos && (
            <div className="mt-10 flex justify-center">
              <Button
                onClick={onLoadMorePhotos}
                disabled={loadingMore}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {loadingMore ? 'Cargando...' : 'Cargar mas fotos'}
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Carrito</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                    <p className="text-gray-500 mb-2 font-medium">Tu carrito está vacío</p>
                    <p className="text-sm text-gray-400">
                      Agrega fotos para comenzar tu compra
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto mb-6">
                    {cart.map((item, index) => {
                      const photo = photos.find(p => p.id === item.photoId);
                      return (
                        <Card key={index} className="border-0 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              {photo && (
                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                  <img
                                    src={photo.url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.productName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatPrice(item.price)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium min-w-[20px] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-lg font-medium text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(getTotalPrice())}
                        </span>
                      </div>
                      <Button
                        onClick={handleCheckout}
                        className="w-full text-white h-12"
                        style={{ backgroundColor: brandColors.primary }}
                      >
                        Proceder al Pago
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </>
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

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-white z-50 overflow-y-auto"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {selectedPhoto.student || 'Foto Escolar'}
                  </h3>
                  {selectedPhoto.subject && (
                    <p className="text-gray-600">{selectedPhoto.subject}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(selectedPhoto.id);
                    }}
                    className={favorites.includes(selectedPhoto.id) ? 'text-red-600' : ''}
                  >
                    <Heart className={`h-4 w-4 ${favorites.includes(selectedPhoto.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image */}
                <div className="lg:col-span-2">
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.alt}
                      className="w-full h-auto"
                    />
                  </Card>
                </div>

                {/* Products - Single CTA Button */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Agregar al Carrito
                    </h4>
                    {activeProducts.length > 0 ? (
                      <Button
                        onClick={() => {
                          const photoToAdd = selectedPhoto;
                          setSelectedPhoto(null);
                          setTimeout(() => {
                            if (photoToAdd) {
                              handleOpenOptionsSelector(photoToAdd);
                            }
                          }, 100);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Seleccionar opciones
                      </Button>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No hay productos disponibles
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
