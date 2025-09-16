'use client';

import { useState, useMemo } from 'react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/ui/lazy-image';
import {
  Heart,
  Eye,
  Plus,
  Minus,
  X,
  ShoppingCart,
  ArrowRight,
  Star,
  Quote,
  Calendar,
  MapPin,
  Sparkles,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface FashionEditorialTemplateProps {
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
}

interface CartItem {
  photoId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  photoUrl?: string;
}

export function FashionEditorialTemplate({
  settings,
  photos,
  token,
  subject,
  totalPhotos,
  isPreselected = false
}: FashionEditorialTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const activeProducts = useMemo(() =>
    Object.entries(settings.products)
      .filter(([_, product]) => product.enabled)
      .map(([id, product]) => ({ id, ...product }))
  , [settings.products]);

  const heroPhoto = photos[0];
  const featuredPhotos = photos.slice(1, 9);
  const remainingPhotos = photos.slice(9);

  const addToCart = (photoId: string, productId: string) => {
    const product = activeProducts.find(p => p.id === productId);
    const photo = photos.find(p => p.id === photoId);
    if (!product) return;

    setCart(prev => {
      const existingItem = prev.find(
        item => item.photoId === photoId && item.productId === productId
      );

      if (existingItem) {
        return prev.map(item =>
          item.photoId === photoId && item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, {
        photoId,
        productId,
        productName: product.name,
        price: product.price,
        quantity: 1,
        photoUrl: photo?.url
      }];
    });

    toast.success(`${product.name} agregado al carrito`);
  };

  const removeFromCart = (photoId: string, productId: string) => {
    setCart(prev => prev.filter(
      item => !(item.photoId === photoId && item.productId === productId)
    ));
  };

  const updateQuantity = (photoId: string, productId: string, quantity: number) => {
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

  const toggleFavorite = (photoId: string) => {
    setFavorites(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const openLightbox = (photoIndex: number) => {
    setCurrentPhotoIndex(photoIndex);
    setLightboxOpen(true);
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const formatPrice = (price: number) => {
    const symbol = settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : '$';
    return `${symbol}${price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50">
      {/* Fashion-inspired header */}
      <header className="relative border-b border-rose-200 bg-white/80 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-100/50 to-pink-100/50" />
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            {settings.custom_branding?.logo_url ? (
              <img
                src={settings.custom_branding.logo_url}
                alt={settings.custom_branding?.brand_name || 'Logo'}
                className="h-12 mx-auto mb-4"
              />
            ) : (
              <div className="inline-flex items-center gap-2 mb-4">
                <Sparkles className="h-8 w-8 text-rose-600" />
                <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                  {settings.custom_branding?.brand_name || settings.texts.hero_title}
                </span>
              </div>
            )}

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {settings.texts.hero_title}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {settings.texts.hero_subtitle}
            </p>

            {subject && (
              <div className="mt-6 inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full border border-rose-200">
                <Calendar className="h-4 w-4 text-rose-600" />
                <span className="font-medium text-gray-800">
                  {subject.name} - {subject.grade} {subject.section}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Floating cart button */}
        {cartItemCount > 0 && (
          <button
            onClick={() => setShowCart(true)}
            className="fixed top-6 right-6 z-40 bg-gradient-to-r from-rose-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:from-rose-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 bg-white text-rose-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            </div>
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero section with main photo */}
        {heroPhoto && (
          <section className="mb-16">
            <div className="relative group cursor-pointer" onClick={() => openLightbox(0)}>
              <div className="aspect-[16/9] rounded-3xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100 shadow-2xl">
                <LazyImage
                  src={heroPhoto.url}
                  alt={heroPhoto.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                    <div className="flex items-center gap-2 text-gray-800">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm font-medium">Ver foto completa</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating action buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(heroPhoto.id);
                  }}
                  className={cn(
                    "p-3 rounded-full backdrop-blur-sm transition-all duration-200",
                    favorites.includes(heroPhoto.id)
                      ? "bg-rose-500 text-white"
                      : "bg-white/80 text-gray-700 hover:bg-rose-500 hover:text-white"
                  )}
                >
                  <Heart className={cn("h-4 w-4", favorites.includes(heroPhoto.id) && "fill-current")} />
                </button>
              </div>
            </div>

            {/* Featured products for hero */}
            {activeProducts.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeProducts.slice(0, 3).map(product => (
                  <Card key={product.id} className="border-rose-200 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                          {formatPrice(product.price)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                      <Button
                        onClick={() => addToCart(heroPhoto.id, product.id)}
                        className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white border-0"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar al Carrito
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Featured gallery with fashion-inspired layout */}
        {featuredPhotos.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Galería Destacada</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Una selección especial de los mejores momentos capturados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredPhotos.map((photo, index) => (
                <div key={photo.id} className="group relative">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100 shadow-lg">
                    <LazyImage
                      src={photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-500"
                      onClick={() => openLightbox(index + 1)}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Overlay actions */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleFavorite(photo.id)}
                          className={cn(
                            "p-3 rounded-full backdrop-blur-sm transition-all duration-200",
                            favorites.includes(photo.id)
                              ? "bg-rose-500 text-white"
                              : "bg-white/90 text-gray-700 hover:bg-rose-500 hover:text-white"
                          )}
                        >
                          <Heart className={cn("h-4 w-4", favorites.includes(photo.id) && "fill-current")} />
                        </button>
                        <button
                          onClick={() => openLightbox(index + 1)}
                          className="p-3 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm hover:bg-white transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick add to cart */}
                  {activeProducts.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <Button
                        size="sm"
                        onClick={() => activeProducts[0] && addToCart(photo.id, activeProducts[0].id)}
                        className="w-full bg-white/90 text-gray-800 hover:bg-white backdrop-blur-sm border border-white/50 shadow-lg"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Agregar Rápido
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Products showcase */}
        {activeProducts.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Nuestros Productos</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Descubre nuestras opciones de productos fotográficos premium
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeProducts.map(product => (
                <Card key={product.id} className="border-rose-200 bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-300 hover:shadow-xl">
                  <CardContent className="p-8">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-rose-100 to-pink-100 rounded-full mb-6">
                        <Camera className="h-8 w-8 text-rose-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{product.name}</h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>
                      <div className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-6">
                        {formatPrice(product.price)}
                      </div>

                      {(product as any).features && (
                        <div className="mb-6 space-y-2">
                          {(product as any).features.includes && (
                            <div className="text-sm text-gray-600">
                              {(product as any).features.includes.map((feature: string, i: number) => (
                                <div key={i} className="flex items-center justify-center gap-2">
                                  <Star className="h-3 w-3 text-rose-500" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Remaining photos grid */}
        {remainingPhotos.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Más Fotos</h2>
              <p className="text-gray-600">
                {remainingPhotos.length} fotos adicionales de esta sesión
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {remainingPhotos.map((photo, index) => (
                <div key={photo.id} className="group relative">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100">
                    <LazyImage
                      src={photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                      onClick={() => openLightbox(featuredPhotos.length + 1 + index)}
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Heart button */}
                    <button
                      onClick={() => toggleFavorite(photo.id)}
                      className={cn(
                        "absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100",
                        favorites.includes(photo.id)
                          ? "bg-rose-500 text-white"
                          : "bg-white/80 text-gray-700 hover:bg-rose-500 hover:text-white"
                      )}
                    >
                      <Heart className={cn("h-3 w-3", favorites.includes(photo.id) && "fill-current")} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-rose-200 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-rose-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                {settings.custom_branding?.brand_name || 'Fashion Editorial'}
              </span>
            </div>
            <p className="text-gray-600 mb-6">
              {settings.texts.footer_text}
            </p>

            {(settings.texts.contact_email || settings.texts.contact_phone) && (
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                {settings.texts.contact_email && (
                  <a href={`mailto:${settings.texts.contact_email}`} className="hover:text-rose-600 transition-colors">
                    {settings.texts.contact_email}
                  </a>
                )}
                {settings.texts.contact_phone && (
                  <a href={`tel:${settings.texts.contact_phone}`} className="hover:text-rose-600 transition-colors">
                    {settings.texts.contact_phone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="sm:max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Carrito de Compras</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Tu carrito está vacío</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={`${item.photoId}-${item.productId}`} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.productName}</h4>
                      <p className="text-xs text-gray-500">Foto #{item.photoId.slice(-4)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium px-2">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                      <button
                        onClick={() => removeFromCart(item.photoId, item.productId)}
                        className="text-red-500 hover:text-red-700 text-xs mt-1"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold text-lg mb-4">
                    <span>Total:</span>
                    <span className="text-rose-600">{formatPrice(cartTotal)}</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white">
                    Proceder al Pago
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-6xl p-0">
          <div className="relative">
            {photos[currentPhotoIndex] && (
              <img
                src={photos[currentPhotoIndex].url}
                alt={photos[currentPhotoIndex].alt}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  →
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}