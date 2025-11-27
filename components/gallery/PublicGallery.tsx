'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import Image from 'next/image';
import { usePublicCartStore } from '@/lib/stores/unified-cart-store';
import { ShoppingCart, Heart, Share2, ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import {
  MagazineStyle,
  PolaroidStyle,
  EditorialStyle,
  MinimalCardsStyle,
  FilmStripStyle,
  PixiesetStyle,
  GalleryStyleType,
  getStyleColors,
} from './GalleryStyles';

interface Photo {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
  signed_url: string;
}

interface GalleryMetadata {
  gallery_style?: GalleryStyleType;
  cover_image?: string;
  cover_title?: string;
  cover_subtitle?: string;
  logo_url?: string;
  accent_color?: string;
  show_share_button?: boolean;
  show_favorites?: boolean;
}

interface GalleryData {
  event: {
    id: string;
    name: string;
    school: string;
    date: string;
    created_at: string;
    metadata?: GalleryMetadata;
  };
  photos: Photo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
    total_pages: number;
  };
}

interface PublicGalleryProps {
  eventId: string;
}

// Memoized loading spinner component
const LoadingSpinner = memo(function LoadingSpinner({ message = 'CARGANDO GALERÍA' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        <p className="text-sm text-gray-400 tracking-wider">{message}</p>
      </div>
    </div>
  );
});

// Memoized error component
const ErrorDisplay = memo(function ErrorDisplay({
  error,
  onRetry
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="text-sm text-gray-900 underline hover:no-underline"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
});

// Memoized cover component for better performance
const GalleryCover = memo(function GalleryCover({
  coverImage,
  coverTitle,
  coverSubtitle,
  logoUrl,
  photoCount,
  school,
  onEnterGallery,
}: {
  coverImage: string;
  coverTitle: string;
  coverSubtitle?: string;
  logoUrl?: string;
  photoCount: number;
  school?: string;
  onEnterGallery: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Cover Image with fade-in animation */}
      <div className="absolute inset-0">
        <Image
          src={coverImage}
          alt={coverTitle}
          fill
          className={`object-cover transition-all duration-1000 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          priority
          unoptimized
          onLoad={() => setImageLoaded(true)}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Logo (si existe) */}
      {logoUrl && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Image
            src={logoUrl}
            alt="Logo"
            width={120}
            height={60}
            className="object-contain opacity-90"
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center text-white text-center px-4">
        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-light tracking-[0.15em] md:tracking-[0.2em] mb-4 animate-cover-text"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
        >
          {coverTitle.toUpperCase()}
        </h1>

        {coverSubtitle && (
          <p
            className="text-sm md:text-base tracking-[0.3em] text-white/80 mb-4 animate-fade-in"
            style={{ animationDelay: '0.6s' }}
          >
            {coverSubtitle}
          </p>
        )}

        <p
          className="text-xs tracking-[0.2em] text-white/60 mb-12 animate-fade-in"
          style={{ animationDelay: '0.8s' }}
        >
          {photoCount} FOTOGRAFÍAS
        </p>

        <button
          onClick={onEnterGallery}
          className="border border-white/60 px-10 py-4 text-sm tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-500 animate-fade-in-up hover:scale-105"
          style={{ animationDelay: '1s' }}
        >
          VER GALERÍA
        </button>
      </div>

      {/* Footer credit */}
      <div className="absolute bottom-8 left-0 right-0 text-center animate-fade-in" style={{ animationDelay: '1.2s' }}>
        <p className="text-white/50 text-xs tracking-[0.2em]">
          {school?.toUpperCase() || 'FOTOGRAFÍA ESCOLAR'}
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-bounce" style={{ animationDelay: '1.5s' }}>
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-white/60 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
});

// Memoized lightbox component
const Lightbox = memo(function Lightbox({
  photos,
  selectedIndex,
  showFavorites,
  showShareButton,
  isItemInCart,
  onClose,
  onPrev,
  onNext,
  onToggleSelect,
  onSelectPhoto,
}: {
  photos: Photo[];
  selectedIndex: number;
  showFavorites: boolean;
  showShareButton: boolean;
  isItemInCart: (id: string) => boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleSelect: (photo: Photo) => void;
  onSelectPhoto: (index: number) => void;
}) {
  const currentPhoto = photos[selectedIndex];

  // Touch gesture handling for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) onNext();
      else onPrev();
    }
    setTouchStart(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Lightbox Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 md:px-8 h-16 bg-white/90 backdrop-blur">
        <button
          onClick={onClose}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 md:gap-4">
          {showFavorites && (
            <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Heart className="w-5 h-5" />
            </button>
          )}
          {showShareButton && (
            <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => onToggleSelect(currentPhoto)}
            className={`flex items-center gap-2 px-6 py-2 text-sm tracking-wider transition-all duration-300 ${
              isItemInCart(currentPhoto.id)
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {isItemInCart(currentPhoto.id) ? (
              <>
                <Check className="w-4 h-4 animate-scale-in" />
                SELECCIONADA
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                COMPRAR
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div className="absolute inset-0 flex items-center justify-center pt-16 pb-24 px-4 md:px-20">
        <div className="relative w-full h-full max-w-6xl">
          <Image
            src={currentPhoto.signed_url}
            alt=""
            fill
            className="object-contain animate-scale-in"
            priority
            unoptimized
          />
        </div>
      </div>

      {/* Navigation Arrows - Hidden on mobile, use swipe instead */}
      <button
        onClick={onPrev}
        className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-900 transition-all duration-300 hover:scale-110"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button
        onClick={onNext}
        className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-900 transition-all duration-300 hover:scale-110"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Photo counter */}
      <div className="absolute bottom-28 left-0 right-0 text-center">
        <p className="text-sm text-gray-400 tracking-wider">
          {selectedIndex + 1} / {photos.length}
        </p>
      </div>

      {/* Thumbnails strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 justify-center">
          {photos.slice(Math.max(0, selectedIndex - 5), selectedIndex + 6).map((photo, idx) => {
            const actualIndex = Math.max(0, selectedIndex - 5) + idx;
            return (
              <button
                key={photo.id}
                onClick={() => onSelectPhoto(actualIndex)}
                className={`relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0 overflow-hidden transition-all duration-300 ${
                  actualIndex === selectedIndex
                    ? 'ring-2 ring-gray-900 scale-105'
                    : 'opacity-50 hover:opacity-100 hover:scale-105'
                }`}
              >
                <Image
                  src={photo.signed_url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export function PublicGallery({ eventId }: PublicGalleryProps) {
  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showCover, setShowCover] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Cart store
  const cartStore = usePublicCartStore();
  const addItem = cartStore.addItem;
  const removeItem = cartStore.removeItem;
  const isItemInCart = cartStore.isItemInCart;
  const openCart = cartStore.openCart;
  const setContext = cartStore.setContext;
  const setStoreEventId = cartStore.setEventId;
  const getTotalItems = cartStore.getTotalItems;

  const fetchPhotos = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await fetch(`/api/gallery/${eventId}?page=${page}&limit=50`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Evento no encontrado');
          }
          throw new Error('Error al cargar las fotos');
        }

        const apiResponse = await response.json();

        const data: GalleryData = {
          event: apiResponse.data.event,
          photos: apiResponse.data.photos || [],
          pagination: apiResponse.pagination || { page: 1, limit: 50, total: 0, has_more: false, total_pages: 1 }
        };

        setGalleryData((prevData) => {
          if (append && prevData) {
            return {
              ...data,
              photos: [...prevData.photos, ...data.photos],
            };
          }
          return data;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [eventId]
  );

  // Initial fetch
  useEffect(() => {
    fetchPhotos(1, false);
  }, [fetchPhotos]);

  // Set cart context
  useEffect(() => {
    if (!eventId) return;
    setContext({ context: 'public', eventId });
    setStoreEventId(eventId);
  }, [eventId, setContext, setStoreEventId]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (!galleryData?.pagination.has_more || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          fetchPhotos(galleryData.pagination.page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [galleryData?.pagination, loadingMore, fetchPhotos]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedPhotoIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevPhoto();
      if (e.key === 'ArrowRight') goToNextPhoto();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex]);

  const openLightbox = useCallback((index: number) => {
    setSelectedPhotoIndex(index);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedPhotoIndex(null);
    document.body.style.overflow = '';
  }, []);

  const goToPrevPhoto = useCallback(() => {
    if (selectedPhotoIndex !== null && galleryData) {
      setSelectedPhotoIndex(selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : galleryData.photos.length - 1);
    }
  }, [selectedPhotoIndex, galleryData]);

  const goToNextPhoto = useCallback(() => {
    if (selectedPhotoIndex !== null && galleryData) {
      setSelectedPhotoIndex(selectedPhotoIndex < galleryData.photos.length - 1 ? selectedPhotoIndex + 1 : 0);
    }
  }, [selectedPhotoIndex, galleryData]);

  const togglePhotoSelection = useCallback((photo: Photo) => {
    if (isItemInCart(photo.id)) {
      removeItem(photo.id);
    } else {
      addItem({
        photoId: photo.id,
        filename: photo.storage_path.split('/').pop() || photo.id,
        price: 1000,
        watermarkUrl: photo.signed_url,
      });
    }
  }, [isItemInCart, removeItem, addItem]);

  const handleEnterGallery = useCallback(() => {
    setShowCover(false);
  }, []);

  // Loading state
  if (loading && !galleryData) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return <ErrorDisplay error={error} onRetry={() => fetchPhotos(1, false)} />;
  }

  if (!galleryData || galleryData.photos.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">No hay fotos disponibles</p>
      </div>
    );
  }

  const { photos, pagination, event } = galleryData;

  // Configuración del fotógrafo (desde metadata del evento)
  const metadata = event.metadata || {};
  const galleryStyle: GalleryStyleType = metadata.gallery_style || 'pixieset';
  const coverImage = metadata.cover_image || photos[0]?.signed_url;
  const coverTitle = metadata.cover_title || event.name;
  const coverSubtitle = metadata.cover_subtitle;
  const logoUrl = metadata.logo_url;
  const showShareButton = metadata.show_share_button !== false;
  const showFavorites = metadata.show_favorites !== false;

  const styleColors = getStyleColors(galleryStyle);

  const formattedDate = new Date(event.date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  // Folders (por ahora solo "TODAS")
  const folders = [
    { id: 'all', name: 'TODAS', count: photos.length },
  ];

  // Props for style components
  const styleProps = {
    photos,
    isItemInCart,
    onPhotoClick: openLightbox,
    onToggleSelect: togglePhotoSelection,
  };

  // Render style component
  const renderGalleryStyle = () => {
    switch (galleryStyle) {
      case 'magazine':
        return <MagazineStyle {...styleProps} />;
      case 'polaroid':
        return <PolaroidStyle {...styleProps} />;
      case 'editorial':
        return <EditorialStyle {...styleProps} />;
      case 'cards':
        return <MinimalCardsStyle {...styleProps} />;
      case 'film':
        return <FilmStripStyle {...styleProps} />;
      case 'pixieset':
      default:
        return <PixiesetStyle {...styleProps} />;
    }
  };

  // Cover/Hero View
  if (showCover) {
    return (
      <GalleryCover
        coverImage={coverImage}
        coverTitle={coverTitle}
        coverSubtitle={coverSubtitle || formattedDate}
        logoUrl={logoUrl}
        photoCount={photos.length}
        school={event.school}
        onEnterGallery={handleEnterGallery}
      />
    );
  }

  // Gallery View
  return (
    <div className={`min-h-screen ${styleColors.background}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${styleColors.header}`}>
        <div className="max-w-[1800px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo/Event name and folders */}
            <div className="flex items-center gap-8">
              {/* Back to cover button */}
              <button
                onClick={() => setShowCover(true)}
                className={`p-2 -ml-2 transition-colors ${styleColors.textMuted} hover:${styleColors.text}`}
                aria-label="Volver a la portada"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div>
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={100}
                    height={40}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <>
                    <h1 className={`text-sm font-medium tracking-wide ${styleColors.text}`}>
                      {event.name.toUpperCase()}
                    </h1>
                    <p className={`text-xs ${styleColors.textMuted}`}>
                      {event.school?.toUpperCase() || 'FOTOGRAFÍA ESCOLAR'}
                    </p>
                  </>
                )}
              </div>

              {/* Folder tabs */}
              <nav className="hidden md:flex items-center gap-6">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setActiveFolder(folder.id)}
                    className={`text-xs tracking-wider transition-colors ${
                      activeFolder === folder.id || (!activeFolder && folder.id === 'all')
                        ? styleColors.accent
                        : `${styleColors.textMuted} hover:${styleColors.text}`
                    }`}
                  >
                    {folder.name}
                    <span className="ml-1 opacity-50">({folder.count})</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Cart */}
              <button
                onClick={openCart}
                className={`relative p-2 transition-colors ${styleColors.textMuted} hover:${styleColors.text}`}
                aria-label={`Carrito (${getTotalItems()} items)`}
              >
                <ShoppingCart className="w-5 h-5" />
                {getTotalItems() > 0 && (
                  <span className={`absolute -top-1 -right-1 w-5 h-5 text-[10px] rounded-full flex items-center justify-center ${styleColors.accentBg} text-white font-medium animate-scale-in`}>
                    {getTotalItems()}
                  </span>
                )}
              </button>

              {/* Favorites */}
              {showFavorites && (
                <button
                  className={`p-2 transition-colors ${styleColors.textMuted} hover:${styleColors.text}`}
                  aria-label="Favoritos"
                >
                  <Heart className="w-5 h-5" />
                </button>
              )}

              {/* Share */}
              {showShareButton && (
                <button
                  className={`p-2 transition-colors ${styleColors.textMuted} hover:${styleColors.text}`}
                  aria-label="Compartir"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Photo Grid - Style configured by photographer */}
      <main className="animate-fade-in">
        {renderGalleryStyle()}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-4" />

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm tracking-wider">CARGANDO MÁS FOTOS...</span>
            </div>
          </div>
        )}

        {/* End of gallery message */}
        {!pagination.has_more && photos.length > 50 && (
          <div className="flex justify-center py-8">
            <p className={`text-sm tracking-wider ${styleColors.textMuted}`}>
              FIN DE LA GALERÍA - {photos.length} FOTOS
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-12 text-center border-t mt-16 ${styleColors.border}`}>
        <p className={`text-xs tracking-wider ${styleColors.textMuted}`}>
          Desarrollado por <span className="tracking-[0.3em]">LOOKESCOLAR</span>
        </p>
      </footer>

      {/* Lightbox */}
      {selectedPhotoIndex !== null && (
        <Lightbox
          photos={photos}
          selectedIndex={selectedPhotoIndex}
          showFavorites={showFavorites}
          showShareButton={showShareButton}
          isItemInCart={isItemInCart}
          onClose={closeLightbox}
          onPrev={goToPrevPhoto}
          onNext={goToNextPhoto}
          onToggleSelect={togglePhotoSelection}
          onSelectPhoto={setSelectedPhotoIndex}
        />
      )}
    </div>
  );
}
