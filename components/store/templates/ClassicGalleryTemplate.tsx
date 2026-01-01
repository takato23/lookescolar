'use client';

import { useState, useMemo, useCallback } from 'react';
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
  Camera,
  CheckCircle2,
  Grid3x3,
  Layout,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { TemplateBaseProps } from '@/lib/types/folder-hierarchy-types';
import { useTemplateFavorites } from '@/hooks/useTemplateFavorites';

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface ClassicGalleryTemplateProps extends TemplateBaseProps {
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
  engagementStats?: {
    totalPhotos: number;
    totalFavorites: number;
    totalInCart: number;
    totalPurchased: number;
  };
}

interface CartItem {
  photoId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  photoUrl?: string;
}

export function ClassicGalleryTemplate({
  settings,
  photos,
  token,
  folderHierarchy: _folderHierarchy,
  onFolderNavigate: _onFolderNavigate,
  isNavigatingFolder: _isNavigatingFolder,
  subject,
  totalPhotos,
  isPreselected = false,
  engagementStats,
}: ClassicGalleryTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const {
    favorites,
    toggleFavorite: toggleFavoriteApi,
  } = useTemplateFavorites(photos, token);
  const [showCart, setShowCart] = useState(false);
  const [viewMode, setViewMode] = useState<'masonry' | 'grid'>('masonry');
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const derivedStats = useMemo(() => {
    if (engagementStats) {
      return engagementStats;
    }

    const totals = photos.reduce(
      (acc, photo) => {
        if (photo.engagement?.is_favorite) {
          acc.totalFavorites += 1;
        }
        acc.totalInCart += photo.engagement?.in_cart_quantity ?? 0;
        acc.totalPurchased += photo.engagement?.purchased_quantity ?? 0;
        return acc;
      },
      {
        totalPhotos: totalPhotos ?? photos.length,
        totalFavorites: 0,
        totalInCart: 0,
        totalPurchased: 0,
      }
    );

    if (!totals.totalPhotos) {
      totals.totalPhotos = totalPhotos ?? photos.length;
    }

    return totals;
  }, [engagementStats, photos, totalPhotos]);

  const unpurchasedCount = useMemo(() => {
    const total = derivedStats.totalPhotos ?? photos.length;
    return Math.max(0, total - derivedStats.totalPurchased);
  }, [derivedStats, photos.length]);

  const activeProducts = useMemo(() => 
    Object.entries(settings.products)
      .filter(([_, product]) => product.enabled)
      .map(([id, product]) => ({ id, ...product }))
  , [settings.products]);

  const filteredPhotos = useMemo(() => {
    if (!searchTerm) return photos;
    return photos.filter(photo => 
      photo.student?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.alt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [photos, searchTerm]);

  const handleToggleFavorite = useCallback(
    (photoId: string) => {
      toggleFavoriteApi(photoId).catch(() => {
        toast.error('No pudimos actualizar tus favoritos. Intentalo nuevamente.');
      });
    },
    [toggleFavoriteApi]
  );

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

    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (photoId: string, productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(
        item => !(item.photoId === photoId && item.productId === productId)
      ));
      return;
    }

    setCart(prev => prev.map(item =>
      item.photoId === photoId && item.productId === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const openLightbox = (photo: Photo) => {
    setSelectedPhoto(photo);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
    setLightboxOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Classic Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif text-gray-900">
                {subject?.name || 'Photography Collection'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isPreselected 
                  ? `${derivedStats.totalPhotos} carefully selected photos`
                  : `${derivedStats.totalPhotos} photos available`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-gray-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-red-600">
                  <Heart className="h-3 w-3" />
                  {derivedStats.totalFavorites} favoritas
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-600">
                  <ShoppingCart className="h-3 w-3" />
                  {derivedStats.totalInCart} en carrito
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {derivedStats.totalPurchased} compradas
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                  <Camera className="h-3 w-3" />
                  {unpurchasedCount} pendientes
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('masonry')}
                  className={cn(
                    "px-3 py-2 text-sm",
                    viewMode === 'masonry' 
                      ? "bg-gray-900 text-white" 
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Layout className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-3 py-2 text-sm border-l border-gray-300",
                    viewMode === 'grid' 
                      ? "bg-gray-900 text-white" 
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
              </div>

              {/* Cart */}
              <Button
                variant="outline"
                onClick={() => setShowCart(true)}
                className="relative border-gray-300"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart
                {cart.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs"
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Gallery */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Products Section */}
        {activeProducts.length > 0 && (
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-xl font-serif text-gray-900 mb-2">Available Products</h2>
              <p className="text-gray-600">Choose from our carefully curated print options</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {activeProducts.map(product => (
                <Card key={product.id} className="text-center border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                    <div className="text-xl font-bold text-gray-900">
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
          {viewMode === 'masonry' ? (
            // Masonry Layout
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
              {filteredPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  className="group break-inside-avoid cursor-pointer relative overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-300"
                  onClick={() => openLightbox(photo)}
                >
                  <LazyImage
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full block group-hover:scale-[1.02] transition-transform duration-300"
                    showProtectionBadge={false}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4">
                      {photo.student && (
                        <p className="text-white text-sm font-medium mb-2">{photo.student}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(photo.id);
                          }}
                          >
                            <Heart 
                              className={cn(
                                "h-4 w-4",
                                favorites.includes(photo.id) 
                                  ? "fill-red-500 text-red-500" 
                                  : "text-gray-600"
                              )} 
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLightbox(photo);
                            }}
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                        {activeProducts.length > 0 && (
                          <Button
                            size="sm"
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(photo.id, activeProducts[0].id);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favorite indicator */}
                  {favorites.includes(photo.id) && (
                    <div className="absolute top-3 right-3">
                      <Heart className="h-5 w-5 text-red-500 fill-red-500 drop-shadow-lg" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Grid Layout
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  className="group aspect-square cursor-pointer relative overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-300"
                  onClick={() => openLightbox(photo)}
                >
                  <LazyImage
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    showProtectionBadge={false}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/90 hover:bg-white h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(photo.id);
                          }}
                          >
                            <Heart 
                              className={cn(
                                "h-3 w-3",
                                favorites.includes(photo.id) 
                                  ? "fill-red-500 text-red-500" 
                                  : "text-gray-600"
                              )} 
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/90 hover:bg-white h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLightbox(photo);
                            }}
                          >
                            <Eye className="h-3 w-3 text-gray-600" />
                          </Button>
                        </div>
                        {activeProducts.length > 0 && (
                          <Button
                            size="sm"
                            className="bg-gray-900 hover:bg-gray-800 text-white h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(photo.id, activeProducts[0].id);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favorite indicator */}
                  {favorites.includes(photo.id) && (
                    <div className="absolute top-2 right-2">
                      <Heart className="h-4 w-4 text-red-500 fill-red-500 drop-shadow-lg" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0">
          {selectedPhoto && (
            <div className="grid lg:grid-cols-[2fr_1fr] h-full">
              {/* Image */}
              <div className="relative bg-gray-100 min-h-[60vh] lg:min-h-[80vh] flex items-center justify-center">
                <LazyImage
                  src={selectedPhoto.url}
                  alt={selectedPhoto.alt}
                  className="max-w-full max-h-full object-contain"
                  showProtectionBadge={false}
                  loading="eager"
                />
              </div>
              
              {/* Details */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-serif text-gray-900 mb-2">
                    {selectedPhoto.student || 'Photo Details'}
                  </h3>
                  {selectedPhoto.subject && (
                    <p className="text-gray-600">{selectedPhoto.subject}</p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => handleToggleFavorite(selectedPhoto.id)}
                    className={cn(
                      "flex-1",
                      favorites.includes(selectedPhoto.id) && "border-red-500 text-red-500"
                    )}
                  >
                    <Heart 
                      className={cn(
                        "h-4 w-4 mr-2",
                        favorites.includes(selectedPhoto.id) 
                          ? "fill-red-500 text-red-500" 
                          : "text-gray-600"
                      )} 
                    />
                    {favorites.includes(selectedPhoto.id) ? 'Favorited' : 'Add to Favorites'}
                  </Button>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Available Products</h4>
                  <div className="space-y-3">
                    {activeProducts.map(product => (
                      <Card key={product.id} className="border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-900">{product.name}</h5>
                            <span className="font-bold text-gray-900">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                          <Button
                            onClick={() => {
                              addToCart(selectedPhoto.id, product.id);
                              closeLightbox();
                            }}
                            className="w-full bg-gray-900 hover:bg-gray-800"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowCart(false)}
          />
          
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-gray-200">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-serif text-gray-900">Shopping Cart</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 text-lg mb-2">Your cart is empty</p>
                    <p className="text-gray-400">Add photos to get started</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto">
                    {cart.map((item, index) => (
                      <Card key={index} className="border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex space-x-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {item.photoUrl && (
                                <LazyImage
                                  src={item.photoUrl}
                                  alt="Cart item"
                                  className="w-full h-full object-cover"
                                  showProtectionBadge={false}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {item.productName}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatPrice(item.price)}
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium min-w-[20px] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg font-medium text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatPrice(getTotalPrice())}
                      </span>
                    </div>
                    <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3">
                      Proceed to Checkout
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
