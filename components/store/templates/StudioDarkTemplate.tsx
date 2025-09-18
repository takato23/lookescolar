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
  Camera,
  Zap,
  Crown,
  Palette,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid,
  List
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

interface StudioDarkTemplateProps {
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

export function StudioDarkTemplate({ 
  settings, 
  photos, 
  token, 
  subject, 
  totalPhotos, 
  isPreselected = false 
}: StudioDarkTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const activeProducts = useMemo(() => 
    Object.entries(settings.products)
      .filter(([_, product]) => product.enabled)
      .map(([id, product]) => ({ id, ...product }))
  , [settings.products]);

  const filteredPhotos = useMemo(() => {
    if (filter === 'favorites') {
      return photos.filter(photo => favorites.includes(photo.id));
    }
    return photos;
  }, [photos, favorites, filter]);

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

    toast.success(`${product.name} added to cart`, {
      style: { backgroundColor: '#1a1a1a', color: '#ffffff', border: '1px solid #333' }
    });
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

  const toggleFavorite = (photoId: string) => {
    setFavorites(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
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

  const openLightbox = (photo: Photo, index?: number) => {
    setSelectedPhoto(photo);
    setCurrentPhotoIndex(index || photos.findIndex(p => p.id === photo.id));
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
    setLightboxOpen(false);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? Math.min(currentPhotoIndex + 1, photos.length - 1)
      : Math.max(currentPhotoIndex - 1, 0);
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Dark Studio Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {subject?.name || 'Studio Gallery'}
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Professional Photography Collection
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Filter */}
              <div className="flex border border-zinc-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setFilter('all')}
                  className={cn(
                    "px-4 py-2 text-sm transition-colors",
                    filter === 'all' 
                      ? "bg-amber-600 text-white" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                >
                  All ({photos.length})
                </button>
                <button
                  onClick={() => setFilter('favorites')}
                  className={cn(
                    "px-4 py-2 text-sm border-l border-zinc-700 transition-colors",
                    filter === 'favorites' 
                      ? "bg-amber-600 text-white" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                >
                  Favorites ({favorites.length})
                </button>
              </div>

              {/* View Mode */}
              <div className="flex border border-zinc-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-3 py-2 transition-colors",
                    viewMode === 'grid' 
                      ? "bg-amber-600 text-white" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={cn(
                    "px-3 py-2 border-l border-zinc-700 transition-colors",
                    viewMode === 'masonry' 
                      ? "bg-amber-600 text-white" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Cart */}
              <Button
                variant="outline"
                onClick={() => setShowCart(true)}
                className="relative border-zinc-700 bg-transparent hover:bg-zinc-800 text-white"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart
                {cart.length > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs bg-amber-600 hover:bg-amber-700 text-white border-none"
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Featured Section */}
      <section className="py-12 bg-gradient-to-b from-zinc-900 to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Crown className="h-6 w-6 text-amber-500" />
              <h2 className="text-2xl font-bold text-white">Premium Studio Collection</h2>
            </div>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              {isPreselected 
                ? `${photos.length} handpicked professional photographs, carefully curated for excellence.`
                : `${photos.length} stunning photographs captured with precision and artistry.`}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{photos.length}</div>
              <div className="text-sm text-zinc-400">Total Photos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{activeProducts.length}</div>
              <div className="text-sm text-zinc-400">Print Options</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{favorites.length}</div>
              <div className="text-sm text-zinc-400">Favorites</div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      {activeProducts.length > 0 && (
        <section className="py-16 bg-zinc-950">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Palette className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold text-white">Premium Print Collection</h2>
              </div>
              <p className="text-zinc-400">
                Museum-grade prints crafted with precision and attention to detail
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProducts.map(product => (
                <Card key={product.id} className="bg-zinc-900 border-zinc-800 hover:border-amber-500/50 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white group-hover:text-amber-500 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">{product.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-amber-500">
                          {formatPrice(product.price)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-zinc-500">
                        <Zap className="h-3 w-3 mr-2 text-amber-500" />
                        <span>Premium quality guarantee</span>
                      </div>
                      <div className="flex items-center text-xs text-zinc-500">
                        <Crown className="h-3 w-3 mr-2 text-amber-500" />
                        <span>Professional finishing</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Gallery */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400 text-lg">No favorites selected yet</p>
              <p className="text-zinc-500 text-sm mt-2">
                Click the heart icon on photos to add them to your favorites
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredPhotos.map((photo, index) => (
                    <div 
                      key={photo.id}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-zinc-900 hover:ring-2 hover:ring-amber-500/50 transition-all duration-300"
                      onClick={() => openLightbox(photo, index)}
                    >
                      <LazyImage
                        src={photo.url}
                        alt={photo.alt}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        showProtectionBadge={false}
                      />
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="flex justify-between items-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="bg-black/50 hover:bg-black/70 text-white h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(photo.id);
                              }}
                            >
                              <Heart 
                                className={cn(
                                  "h-3 w-3",
                                  favorites.includes(photo.id) 
                                    ? "fill-amber-500 text-amber-500" 
                                    : "text-white"
                                )} 
                              />
                            </Button>
                            {activeProducts.length > 0 && (
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white h-7 px-2 text-xs"
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
                          <Heart className="h-4 w-4 text-amber-500 fill-amber-500 drop-shadow-lg" />
                        </div>
                      )}

                      {/* Photo info */}
                      {photo.student && (
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                          <p className="text-xs text-white font-medium">{photo.student}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Masonry Layout
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
                  {filteredPhotos.map((photo, index) => (
                    <div 
                      key={photo.id}
                      className="group break-inside-avoid cursor-pointer relative overflow-hidden rounded-lg bg-zinc-900 hover:ring-2 hover:ring-amber-500/50 transition-all duration-300"
                      onClick={() => openLightbox(photo, index)}
                    >
                      <LazyImage
                        src={photo.url}
                        alt={photo.alt}
                        className="w-full block group-hover:scale-[1.02] transition-transform duration-500"
                        showProtectionBadge={false}
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-3 left-3 right-3">
                          {photo.student && (
                            <p className="text-white text-sm font-medium mb-2">{photo.student}</p>
                          )}
                          <div className="flex justify-between items-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="bg-black/50 hover:bg-black/70 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(photo.id);
                              }}
                            >
                              <Heart 
                                className={cn(
                                  "h-4 w-4",
                                  favorites.includes(photo.id) 
                                    ? "fill-amber-500 text-amber-500" 
                                    : "text-white"
                                )} 
                              />
                            </Button>
                            {activeProducts.length > 0 && (
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white"
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
                          <Heart className="h-5 w-5 text-amber-500 fill-amber-500 drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-zinc-800">
          {selectedPhoto && (
            <div className="relative h-[95vh] flex items-center justify-center">
              {/* Navigation */}
              <Button
                variant="ghost"
                size="lg"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 z-10"
                onClick={() => navigatePhoto('prev')}
                disabled={currentPhotoIndex === 0}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 z-10"
                onClick={() => navigatePhoto('next')}
                disabled={currentPhotoIndex === photos.length - 1}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>

              {/* Close button */}
              <Button
                variant="ghost"
                size="lg"
                className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
                onClick={closeLightbox}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Image */}
              <LazyImage
                src={selectedPhoto.url}
                alt={selectedPhoto.alt}
                className="max-w-full max-h-full object-contain"
                showProtectionBadge={false}
                loading="eager"
              />

              {/* Control Bar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm border border-zinc-700 rounded-xl px-6 py-3">
                <div className="flex items-center space-x-4">
                  <div className="text-white">
                    <p className="text-sm font-medium">
                      {selectedPhoto.student || 'Professional Photo'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {currentPhotoIndex + 1} of {photos.length}
                    </p>
                  </div>
                  
                  <div className="w-px h-8 bg-zinc-700" />
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10"
                      onClick={() => toggleFavorite(selectedPhoto.id)}
                    >
                      <Heart 
                        className={cn(
                          "h-4 w-4 mr-2",
                          favorites.includes(selectedPhoto.id) 
                            ? "fill-amber-500 text-amber-500" 
                            : "text-white"
                        )} 
                      />
                      {favorites.includes(selectedPhoto.id) ? 'Favorited' : 'Favorite'}
                    </Button>
                    
                    {activeProducts.length > 0 && (
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => {
                          addToCart(selectedPhoto.id, activeProducts[0].id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    )}
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
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCart(false)}
          />
          
          <div className="fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-amber-500" />
                  <h3 className="text-xl font-bold text-white">Your Cart</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
                    <p className="text-zinc-300 text-lg mb-2">Your cart is empty</p>
                    <p className="text-zinc-500">Add photos to begin your order</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto">
                    {cart.map((item, index) => (
                      <Card key={index} className="bg-zinc-800 border-zinc-700">
                        <CardContent className="p-4">
                          <div className="flex space-x-4">
                            <div className="w-16 h-16 bg-zinc-700 rounded-lg overflow-hidden flex-shrink-0">
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
                              <p className="font-medium text-white truncate mb-1">
                                {item.productName}
                              </p>
                              <p className="text-sm text-amber-500 font-semibold mb-3">
                                {formatPrice(item.price)}
                              </p>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                                  className="h-7 w-7 p-0 border-zinc-600 hover:bg-zinc-700"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium text-white min-w-[20px] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                                  className="h-7 w-7 p-0 border-zinc-600 hover:bg-zinc-700"
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

                  <div className="border-t border-zinc-800 pt-6 mt-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg font-medium text-white">Total:</span>
                      <span className="text-2xl font-bold text-amber-500">
                        {formatPrice(getTotalPrice())}
                      </span>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 text-lg font-medium">
                      Secure Checkout
                    </Button>
                    <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-zinc-500">
                      <span>• Secure payment</span>
                      <span>• Premium quality</span>
                      <span>• Fast delivery</span>
                    </div>
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