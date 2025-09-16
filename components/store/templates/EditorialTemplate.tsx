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
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FolderHierarchyDisplay } from '@/components/store/FolderHierarchyDisplay';
import type { TemplateBaseProps } from '@/lib/types/folder-hierarchy-types';

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface EditorialTemplateProps extends TemplateBaseProps {
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

export function EditorialTemplate({
  settings,
  photos,
  token,
  subject,
  folderHierarchy,
  onFolderNavigate,
  isNavigatingFolder, 
  totalPhotos, 
  isPreselected = false 
}: EditorialTemplateProps) {
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
  const featuredPhotos = photos.slice(1, 7);
  const remainingPhotos = photos.slice(7);

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

    toast.success(`${product.name} added to collection`);
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
    <div className="min-h-screen bg-stone-50">
      {/* Editorial Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-2 tracking-tight">
                {subject?.name || 'Editorial Collection'}
              </h1>
              <div className="flex items-center justify-center md:justify-start space-x-6 text-sm text-stone-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>2024 Collection</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{subject?.grade || 'Studio Session'}</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  <span>{photos.length} Images</span>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowCart(true)}
              className="relative border-stone-300 hover:border-stone-400"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Collection
              {cart.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs bg-stone-900 hover:bg-stone-800"
                >
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {heroPhoto && (
        <section className="relative">
          <div className="h-[70vh] relative overflow-hidden cursor-pointer" onClick={() => openLightbox(heroPhoto, 0)}>
            <LazyImage
              src={heroPhoto.url}
              alt={heroPhoto.alt}
              className="w-full h-full object-cover"
              showProtectionBadge={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            
            {/* Hero Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="max-w-6xl mx-auto">
                <div className="max-w-2xl">
                  <Quote className="h-8 w-8 text-white/80 mb-4" />
                  <p className="text-xl md:text-2xl text-white font-light leading-relaxed mb-6">
                    Capturing life's most precious moments with timeless elegance and artistry.
                  </p>
                  {heroPhoto.student && (
                    <p className="text-white/90 text-lg font-serif">
                      Featured: {heroPhoto.student}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action overlay */}
            <div className="absolute top-6 right-6 flex space-x-3 opacity-0 hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(heroPhoto.id);
                }}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4",
                    favorites.includes(heroPhoto.id) 
                      ? "fill-red-500 text-red-500" 
                      : "text-stone-600"
                  )} 
                />
              </Button>
              {activeProducts.length > 0 && (
                <Button
                  size="sm"
                  className="bg-stone-900 hover:bg-stone-800 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(heroPhoto.id, activeProducts[0].id);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Collection
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Products Showcase */}
      {activeProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif text-stone-900 mb-4">Premium Print Collection</h2>
              <p className="text-stone-600 text-lg max-w-2xl mx-auto leading-relaxed">
                Each photograph is carefully crafted using archival-quality materials 
                to ensure your memories last for generations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeProducts.map(product => (
                <Card key={product.id} className="border-stone-200 hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                  <CardContent className="p-8 text-center">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="h-8 w-8 text-stone-600" />
                      </div>
                      <h3 className="text-xl font-serif text-stone-900 mb-2">{product.name}</h3>
                      <p className="text-stone-600 mb-4 leading-relaxed">{product.description}</p>
                      <div className="text-2xl font-bold text-stone-900 mb-4">
                        {formatPrice(product.price)}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-stone-500">
                      <p>• Museum-quality paper</p>
                      <p>• Professional finishing</p>
                      <p>• Protective packaging</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Gallery */}
      <section className="py-16 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif text-stone-900 mb-4">Featured Moments</h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              A curated selection highlighting the most beautiful moments from your session.
            </p>
          </div>
          
          {/* Featured Photos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
            {featuredPhotos.map((photo, index) => (
              <div 
                key={photo.id}
                className="group relative cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-500"
                onClick={() => openLightbox(photo, index + 1)}
              >
                <div className={cn(
                  "relative overflow-hidden",
                  index === 0 || index === 3 ? "aspect-[4/5]" : "aspect-square"
                )}>
                  <LazyImage
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    showProtectionBadge={false}
                  />
                  
                  {/* Elegant overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4">
                      {photo.student && (
                        <p className="text-white font-serif text-sm mb-2">{photo.student}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/90 hover:bg-white backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(photo.id);
                          }}
                        >
                          <Heart 
                            className={cn(
                              "h-4 w-4",
                              favorites.includes(photo.id) 
                                ? "fill-red-500 text-red-500" 
                                : "text-stone-600"
                            )} 
                          />
                        </Button>
                        {activeProducts.length > 0 && (
                          <Button
                            size="sm"
                            className="bg-stone-900 hover:bg-stone-800 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(photo.id, activeProducts[0].id);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favorite indicator */}
                  {favorites.includes(photo.id) && (
                    <div className="absolute top-4 right-4">
                      <Heart className="h-5 w-5 text-red-500 fill-red-500 drop-shadow-lg" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* View All Photos Button */}
          {remainingPhotos.length > 0 && (
            <div className="text-center">
              <Button variant="outline" size="lg" className="border-stone-300 hover:border-stone-400">
                View All {photos.length} Images
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Complete Gallery */}
      {remainingPhotos.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif text-stone-900 mb-4">Complete Collection</h2>
              <p className="text-stone-600">Every moment captured with artistic vision</p>
            </div>
            
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
              {remainingPhotos.map((photo, index) => (
                <div 
                  key={photo.id}
                  className="group break-inside-avoid cursor-pointer relative overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-300"
                  onClick={() => openLightbox(photo, index + 7)}
                >
                  <LazyImage
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full block group-hover:scale-[1.02] transition-transform duration-500"
                    showProtectionBadge={false}
                  />
                  
                  {/* Minimal overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/90 hover:bg-white backdrop-blur-sm h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(photo.id);
                          }}
                        >
                          <Heart 
                            className={cn(
                              "h-4 w-4",
                              favorites.includes(photo.id) 
                                ? "fill-red-500 text-red-500" 
                                : "text-stone-600"
                            )} 
                          />
                        </Button>
                        {activeProducts.length > 0 && (
                          <Button
                            size="sm"
                            className="bg-stone-900 hover:bg-stone-800 text-white h-8 px-3"
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
                    <div className="absolute top-3 left-3">
                      <Heart className="h-4 w-4 text-red-500 fill-red-500 drop-shadow-lg" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-black">
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
                <ArrowRight className="h-6 w-6 rotate-180" />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 z-10"
                onClick={() => navigatePhoto('next')}
                disabled={currentPhotoIndex === photos.length - 1}
              >
                <ArrowRight className="h-6 w-6" />
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

              {/* Photo info overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center justify-between text-white">
                  <div>
                    {selectedPhoto.student && (
                      <p className="font-serif text-lg">{selectedPhoto.student}</p>
                    )}
                    <p className="text-sm text-white/80">
                      {currentPhotoIndex + 1} of {photos.length}
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                      onClick={() => toggleFavorite(selectedPhoto.id)}
                    >
                      <Heart 
                        className={cn(
                          "h-4 w-4 mr-2",
                          favorites.includes(selectedPhoto.id) 
                            ? "fill-red-500 text-red-500" 
                            : "text-white"
                        )} 
                      />
                      {favorites.includes(selectedPhoto.id) ? 'Favorited' : 'Add to Favorites'}
                    </Button>
                    {activeProducts.length > 0 && (
                      <Button
                        size="sm"
                        className="bg-white text-stone-900 hover:bg-white/90"
                        onClick={() => {
                          addToCart(selectedPhoto.id, activeProducts[0].id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Collection
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
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowCart(false)}
          />
          
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-stone-200">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-serif text-stone-900">Your Collection</h3>
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
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                    <p className="text-stone-600 text-lg mb-2">Your collection is empty</p>
                    <p className="text-stone-400">Add photos to begin curating</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto">
                    {cart.map((item, index) => (
                      <Card key={index} className="border-stone-200">
                        <CardContent className="p-4">
                          <div className="flex space-x-4">
                            <div className="w-20 h-20 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                              {item.photoUrl && (
                                <LazyImage
                                  src={item.photoUrl}
                                  alt="Collection item"
                                  className="w-full h-full object-cover"
                                  showProtectionBadge={false}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-serif text-lg text-stone-900 truncate mb-1">
                                {item.productName}
                              </p>
                              <p className="text-sm text-stone-600 mb-3">
                                {formatPrice(item.price)}
                              </p>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                                  className="h-8 w-8 p-0 border-stone-300"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium min-w-[24px] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                                  className="h-8 w-8 p-0 border-stone-300"
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

                  <div className="border-t border-stone-200 pt-6 mt-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg font-medium text-stone-900">Collection Total:</span>
                      <span className="text-2xl font-serif font-bold text-stone-900">
                        {formatPrice(getTotalPrice())}
                      </span>
                    </div>
                    <Button className="w-full bg-stone-900 hover:bg-stone-800 text-white py-3 text-lg">
                      Complete Your Order
                    </Button>
                    <p className="text-xs text-stone-500 text-center mt-3">
                      Secure checkout with premium packaging included
                    </p>
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