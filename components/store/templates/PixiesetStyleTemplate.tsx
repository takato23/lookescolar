'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Heart, ShoppingCart, Share2, Play, ChevronLeft, Plus } from 'lucide-react';

import { PixiesetLanding } from '@/components/store/PixiesetLanding';
import { PixiesetGalleryHeader } from '@/components/store/PixiesetGalleryHeader';
import { PixiesetBuyModal } from '@/components/store/PixiesetBuyModal';
import { PixiesetCartSummary } from '@/components/store/PixiesetCartSummary';
import { PLACEHOLDER_IMAGES, getRandomGalleryPlaceholder } from '@/lib/config/placeholder-images';

// Photo component with fallback
function PhotoWithFallback({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}) {
  const [imageSrc, setImageSrc] = React.useState(src);
  const [hasError, setHasError] = React.useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(getRandomGalleryPlaceholder());
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt || 'Photo'}
      className={className}
      onClick={onClick}
      onError={handleError}
    />
  );
}

// Types
interface Photo {
  id: string;
  url: string;
  preview_url?: string;
  watermark_url?: string;
  alt?: string;
  filename?: string;
  isGroupPhoto?: boolean;
  isFavorite?: boolean;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  itemCount: number;
  description: string;
  imageUrl?: string;
}

interface CartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  details?: string[];
  selectedPhotos?: string[];
}

interface StoreSettings {
  products?: Record<string, {
    enabled: boolean;
    name: string;
    price: number;
    description?: string;
  }>;
  texts?: {
    hero_title?: string;
    hero_subtitle?: string;
  };
  banner_url?: string;
  colors?: {
    primary?: string;
    accent?: string;
    text?: string;
    background?: string;
  };
}

interface PixiesetStyleTemplateProps {
  settings: StoreSettings;
  photos: Photo[];
  token: string;
  eventName?: string;
  eventDate?: string;
  brandName?: string;
  className?: string;
}

type FlowStep = 'landing' | 'gallery' | 'cart' | 'checkout';

/**
 * Complete store template styled like Pixieset
 * Features landing page, gallery, buy modal, and cart
 */
export function PixiesetStyleTemplate({
  settings,
  photos,
  token,
  eventName = 'Event Gallery',
  eventDate,
  brandName = 'LOOKESCOLAR',
  className,
}: PixiesetStyleTemplateProps) {
  const [step, setStep] = useState<FlowStep>('landing');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [activeGalleryTab, setActiveGalleryTab] = useState('all');

  // Convert settings products to packages
  const packages: PackageOption[] = useMemo(() => {
    if (!settings?.products) return [];

    return Object.entries(settings.products)
      .filter(([, product]) => product?.enabled)
      .map(([id, product]) => ({
        id,
        name: product.name,
        price: product.price / 100, // Convert cents to currency
        itemCount: id.includes('A') ? 6 : id.includes('B') ? 11 : 4,
        description: product.description || '',
      }))
      .sort((a, b) => a.price - b.price);
  }, [settings?.products]);

  // Gallery tabs based on photo types
  const galleryTabs = useMemo(() => {
    const individualCount = photos.filter(p => !p.isGroupPhoto).length;
    const groupCount = photos.filter(p => p.isGroupPhoto).length;

    return [
      { id: 'all', label: 'All Photos', count: photos.length },
      { id: 'individual', label: 'Individual', count: individualCount },
      { id: 'group', label: 'Group', count: groupCount },
      { id: 'favorites', label: 'Favorites', count: favorites.length },
    ];
  }, [photos, favorites]);

  // Filtered photos based on active tab
  const filteredPhotos = useMemo(() => {
    switch (activeGalleryTab) {
      case 'individual':
        return photos.filter(p => !p.isGroupPhoto);
      case 'group':
        return photos.filter(p => p.isGroupPhoto);
      case 'favorites':
        return photos.filter(p => favorites.includes(p.id));
      default:
        return photos;
    }
  }, [photos, activeGalleryTab, favorites]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // Handlers
  const handleViewGallery = useCallback(() => {
    setStep('gallery');
  }, []);

  const handlePhotoClick = useCallback((photo: Photo) => {
    setSelectedPhoto(photo);
    setShowBuyModal(true);
  }, []);

  const handleToggleFavorite = useCallback((photoId: string) => {
    setFavorites(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  }, []);

  const handleAddToCart = useCallback((packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg || !selectedPhoto) return;

    const newItem: CartItem = {
      id: `${packageId}-${Date.now()}`,
      name: pkg.name,
      description: `Package for ${selectedPhoto.alt || 'photo'}`,
      price: pkg.price,
      quantity: 1,
      imageUrl: selectedPhoto.url,
      details: [`${pkg.itemCount} items included`],
      selectedPhotos: [selectedPhoto.id],
    };

    setCart(prev => [...prev, newItem]);
    setShowBuyModal(false);
  }, [packages, selectedPhoto]);

  const handleRemoveFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const handleCheckout = useCallback(() => {
    setStep('checkout');
  }, []);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    // Toast notification would go here
  }, []);

  // Photo thumbnails for various displays
  const thumbnails = useMemo(() => {
    return photos.slice(0, 5).map(p => ({
      id: p.id,
      url: p.preview_url || p.url,
    }));
  }, [photos]);

  const heroTitle = settings?.texts?.hero_title || eventName;

  return (
    <div className={cn('min-h-screen bg-[#faf9f7]', className)}>
      {/* Google Fonts - Serif for Pixieset style */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap');

        .pixieset-serif {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        /* Pixieset color palette */
        :root {
          --pixieset-brown: #8b7355;
          --pixieset-brown-dark: #7a6349;
          --pixieset-bg: #faf9f7;
          --pixieset-bg-alt: #f5f4f2;
        }
      `}</style>

      <AnimatePresence mode="wait">
        {step === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PixiesetLanding
              brandName={brandName}
              eventName={heroTitle}
              eventDate={eventDate}
              coverImageUrl={settings?.banner_url}
              thumbnails={thumbnails}
              onViewGallery={handleViewGallery}
            />
          </motion.div>
        )}

        {step === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Gallery Header */}
            <PixiesetGalleryHeader
              eventName={heroTitle}
              brandName={brandName}
              tabs={galleryTabs}
              activeTab={activeGalleryTab}
              onTabChange={setActiveGalleryTab}
              cartCount={cart.length}
              favoritesCount={favorites.length}
              onCartClick={() => setStep('cart')}
              onFavoritesClick={() => setActiveGalleryTab('favorites')}
              onShareClick={handleShare}
              onSlideshowClick={() => { }}
              onPrintStoreClick={() => { }}
            />

            {/* Gallery Grid */}
            <main className="px-4 py-8 lg:px-8">
              {filteredPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <p className="text-neutral-500">No photos in this category</p>
                  <button
                    onClick={() => setActiveGalleryTab('all')}
                    className="mt-4 text-sm text-[#8b7355] hover:underline"
                  >
                    View all photos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredPhotos.map((photo) => {
                    const isFavorite = favorites.includes(photo.id);

                    return (
                      <div
                        key={photo.id}
                        className="group relative aspect-[3/4] cursor-pointer overflow-hidden bg-neutral-100"
                      >
                        <PhotoWithFallback
                          src={photo.preview_url || photo.url}
                          alt={photo.alt || photo.filename || 'Photo'}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onClick={() => handlePhotoClick(photo)}
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                          <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            {/* Favorite Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(photo.id);
                              }}
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                                isFavorite
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white/90 text-neutral-600 hover:bg-white'
                              )}
                            >
                              <Heart className={cn('h-5 w-5', isFavorite && 'fill-current')} />
                            </button>

                            {/* Add to Cart Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePhotoClick(photo);
                              }}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-600 transition-colors hover:bg-white"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* Favorite Indicator */}
                        {isFavorite && (
                          <div className="absolute right-2 top-2">
                            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </main>

            {/* Back to Landing */}
            <button
              onClick={() => setStep('landing')}
              className="fixed bottom-6 left-6 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-neutral-600 shadow-lg transition-colors hover:bg-neutral-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </motion.div>
        )}

        {step === 'cart' && (
          <motion.div
            key="cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PixiesetCartSummary
              items={cart}
              subtotal={cartSubtotal}
              total={cartSubtotal}
              onRemoveItem={handleRemoveFromCart}
              onCheckout={handleCheckout}
              onContinueShopping={() => setStep('gallery')}
            />

            {/* Back Button */}
            <button
              onClick={() => setStep('gallery')}
              className="fixed bottom-6 left-6 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-neutral-600 shadow-lg transition-colors hover:bg-neutral-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Gallery
            </button>
          </motion.div>
        )}

        {step === 'checkout' && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
          >
            <div className="max-w-lg text-center">
              <h1 className="pixieset-serif text-4xl text-neutral-900">
                Checkout Coming Soon
              </h1>
              <p className="mt-4 text-neutral-500">
                Complete checkout functionality is being developed.
              </p>
              <button
                onClick={() => setStep('cart')}
                className="mt-8 bg-[#8b7355] px-8 py-3.5 text-xs font-medium tracking-[0.2em] text-white uppercase transition-colors hover:bg-[#7a6349]"
              >
                Back to Cart
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy Modal */}
      <PixiesetBuyModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        photoUrl={
          selectedPhoto?.watermark_url ||
          selectedPhoto?.preview_url ||
          selectedPhoto?.url ||
          ''
        }
        photoAlt={selectedPhoto?.alt}
        thumbnails={thumbnails}
        packages={packages}
        onSelectPackage={() => { }}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

export default PixiesetStyleTemplate;
