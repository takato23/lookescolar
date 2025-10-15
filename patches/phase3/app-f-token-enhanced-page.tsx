// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ShoppingCartIcon,
  HeartIcon,
  CheckCircleIcon,
  ZoomInIcon,
  AlertCircleIcon,
  SparklesIcon,
  Package,
  Camera,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhotoShoppingInterface } from '@/components/products/PhotoShoppingInterface';
import { PhotoModal } from '@/components/gallery/PhotoModal';
import { EmptyState } from '@/components/public/EmptyState';
import { ThemedGalleryWrapper } from '@/components/gallery/ThemedGalleryWrapper';
import WizardPage from '@/app/f/[token]/wizard-page';
import {
  useProductCartStore,
  useProductSelection,
  useProductCartCalculation,
} from '@/lib/stores/product-cart-store';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  signed_url?: string;
  size: number;
  width: number;
  height: number;
  original_filename?: string;
  watermark_url?: string;
}

interface Subject {
  id: string;
  name: string;
  grade_section?: string | null;
  event?: {
    id?: string | null;
    name?: string | null;
    school_name?: string | null;
  } | null;
}

type ViewMode = 'gallery' | 'shopping' | 'wizard';

export default function EnhancedFamilyGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { setProductContext, reset: resetProductCart } = useProductCartStore();

  const { selectedPhotos, isPhotoSelected } = useProductSelection();

  const { totalItems, formattedTotal } = useProductCartCalculation();

  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  useEffect(() => {
    if (token) {
      loadGallery(1);
    }
  }, [token]);

  // Initialize product context when subject is loaded
  useEffect(() => {
    const eventId = subject?.event?.id;
    if (eventId) {
      setProductContext({
        event_id: eventId,
        bulk_discount_threshold: 5,
        bulk_discount_percentage: 10,
      });
    }
  }, [subject, setProductContext]);

  const loadGallery = async (targetPage: number) => {
    try {
      const response = await fetch(
        `/api/family/gallery/${token}?page=${targetPage}&limit=60`
      );

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Error cargando galería');
        setLoading(false);
        return;
      }

      const payload = await response.json();
      const gallery = payload?.data?.gallery;

      if (!gallery) {
        setError(payload?.error || 'Galería no disponible');
        setLoading(false);
        return;
      }

      const enhancedPhotos: Photo[] = (gallery.items || []).map((item: any) => {
        const preview =
          item.signedUrl || item.previewUrl || item.downloadUrl || null;
        return {
          id: item.id,
          filename: item.filename || 'foto',
          preview_url: preview || '/placeholder-image.svg',
          signed_url: preview || '/placeholder-image.svg',
          size: item.size || 0,
          width: (item.metadata as any)?.width || 0,
          height: (item.metadata as any)?.height || 0,
          original_filename: item.filename || 'foto',
          watermark_url: preview || '/placeholder-image.svg',
        };
      });

      setPhotos((prev) =>
        targetPage === 1 ? enhancedPhotos : [...prev, ...enhancedPhotos]
      );
      setHasMore(Boolean(gallery.pagination?.hasMore));
      setPage(gallery.pagination?.page ?? targetPage);
      const subjectSource = gallery.subject ?? gallery.student ?? null;
      const eventInfo = gallery.event
        ? {
            id: gallery.event.id,
            name: gallery.event.name ?? null,
            school_name: (gallery.event as any).school_name ?? null,
          }
        : null;
      const normalizedSubject: Subject | null = subjectSource
        ? {
            id: subjectSource.id,
            name: subjectSource.name ?? 'Galería familiar',
            grade_section:
              [
                (subjectSource as any).grade ?? null,
                (subjectSource as any).section ?? null,
              ]
                .filter(Boolean)
                .join(' ') || null,
            event: eventInfo,
          }
        : eventInfo
        ? {
            id: gallery.token.token,
            name: eventInfo.name ?? 'Galería',
            grade_section: null,
            event: eventInfo,
          }
        : null;
      setSubject(normalizedSubject);

      // Load favorites from localStorage
      const savedFavorites = localStorage.getItem(`favorites_${token}`);
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando la galería');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || viewMode !== 'gallery') return;

    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          void loadGallery(page + 1);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [page, hasMore, isLoadingMore, viewMode]);

  const toggleFavorite = (photoId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(photoId)) {
      newFavorites.delete(photoId);
    } else {
      newFavorites.add(photoId);
    }
    setFavorites(newFavorites);
    localStorage.setItem(
      `favorites_${token}`,
      JSON.stringify(Array.from(newFavorites))
    );
  };

  const handleCheckout = async () => {
    try {
      // Here you would integrate with your existing checkout flow
      // For now, redirect to the existing wizard
      setViewMode('wizard');
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    }
  };

  const handleBackToGallery = () => {
    setViewMode('gallery');
  };

  const handleStartShopping = () => {
    if (selectedPhotos.size === 0) {
      alert('Selecciona al menos una foto para continuar');
      return;
    }
    setViewMode('shopping');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Cargando tu galería...
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Esto puede tomar unos segundos
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircleIcon className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {error}
            <Button
              variant="link"
              className="ml-2 p-0 text-red-700 underline"
              onClick={() => window.location.reload()}
            >
              Intentar de nuevo
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show wizard if requested
  if (viewMode === 'wizard') {
    return <WizardPage onBackToGallery={handleBackToGallery} />;
  }

  // Show shopping interface
  if (viewMode === 'shopping') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="border-b border-gray-200 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={handleBackToGallery}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Volver a la galería</span>
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Tienda de Fotos
                  </h1>
                  {subject?.event && (
                    <p className="text-sm text-gray-600">
                      {subject.event.name} • {subject.event.school_name}
                    </p>
                  )}
                </div>
              </div>

              {totalItems > 0 && (
                <div className="flex items-center space-x-4">
                  <Badge className="bg-purple-100 text-purple-800">
                    {totalItems} productos • {formattedTotal}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <PhotoShoppingInterface
            photos={photos}
            eventId={subject?.event?.id || ''}
            token={token}
            onCheckout={handleCheckout}
          />
        </div>
      </div>
    );
  }

  // Main gallery view
  return (
    <ThemedGalleryWrapper>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  📸 Tus Fotos
                </h1>
                {subject?.event && (
                  <p className="mt-1 text-sm text-gray-600">
                    {subject.event.name} • {subject.event.school_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">
                    {photos.length} fotos disponibles
                  </span>
                </div>

                {selectedPhotos.size > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1">
                    <CheckCircleIcon className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-600">
                      {selectedPhotos.size} seleccionada
                      {selectedPhotos.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {favorites.size > 0 && (
                  <div className="flex items-center gap-2 text-red-500">
                    <HeartIcon className="h-4 w-4 fill-current" />
                    <span>
                      {favorites.size} favorita{favorites.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Enhanced Shopping Button */}
                <Button
                  onClick={handleStartShopping}
                  disabled={selectedPhotos.size === 0}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 font-medium text-white hover:from-purple-700 hover:to-pink-700"
                >
                  <Package className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">
                    Comprar con productos
                  </span>
                  <span className="sm:hidden">Tienda</span>
                </Button>

                {/* Original Wizard Button */}
                <Button
                  onClick={() => setViewMode('wizard')}
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Wizard simple</span>
                  <span className="sm:hidden">Wizard</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {selectedPhotos.size === 0 && (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Camera className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-900">
                      ¡Nueva experiencia de compra!
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Selecciona tus fotos favoritas haciendo clic en ✅, luego
                      usa el botón "Comprar con productos" para acceder a
                      nuestro catálogo completo con diferentes tamaños, acabados
                      y paquetes combo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Gallery */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {photos.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {photos.map((photo, idx) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={idx}
                  isSelected={isPhotoSelected(photo.id)}
                  isFavorite={favorites.has(photo.id)}
                  onSelect={() => {
                    if (isPhotoSelected(photo.id)) {
                      // Remove from selection using product store
                      const { deselectPhoto } = useProductSelection();
                      deselectPhoto(photo.id);
                    } else {
                      // Add to selection using product store
                      const { selectPhoto } = useProductSelection();
                      selectPhoto(photo.id, photo.filename, photo.preview_url);
                    }
                  }}
                  onToggleFavorite={() => toggleFavorite(photo.id)}
                  onZoom={() => setZoomIndex(idx)}
                />
              ))}
            </div>
          )}

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-lg"
                >
                  <div className="aspect-square rounded-t-2xl bg-gray-200" />
                  <div className="p-3">
                    <div className="mb-2 h-4 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div
              ref={sentinelRef}
              className="flex h-20 items-center justify-center"
            >
              {isLoadingMore && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
                  <span className="text-sm">Cargando más fotos...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photo Modal */}
        {zoomIndex !== null && photos[zoomIndex] && (
          <PhotoModal
            photo={{
              id: photos[zoomIndex].id,
              signed_url: photos[zoomIndex].preview_url,
            }}
            photos={photos.map((photo) => ({
              id: photo.id,
              signed_url: photo.preview_url,
            }))}
            isOpen={true}
            onClose={() => setZoomIndex(null)}
            onPrev={() =>
              setZoomIndex((i) => (i === null || i === 0 ? i : i - 1))
            }
            onNext={() =>
              setZoomIndex((i) =>
                i === null || i === photos.length - 1 ? i : i + 1
              )
            }
            currentIndex={zoomIndex + 1}
            totalPhotos={photos.length}
            isSelected={isPhotoSelected(photos[zoomIndex].id)}
            isFavorite={favorites.has(photos[zoomIndex].id)}
            onToggleSelection={() => {
              const photo = photos[zoomIndex];
              if (isPhotoSelected(photo.id)) {
                const { deselectPhoto } = useProductSelection();
                deselectPhoto(photo.id);
              } else {
                const { selectPhoto } = useProductSelection();
                selectPhoto(photo.id, photo.filename, photo.preview_url);
              }
            }}
            onToggleFavorite={() => toggleFavorite(photos[zoomIndex].id)}
            familyMode
          />
        )}
      </div>
    </ThemedGalleryWrapper>
  );
}

// Photo Card Component
interface PhotoCardProps {
  photo: Photo;
  index: number;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onZoom: () => void;
}

function PhotoCard({
  photo,
  index,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onZoom,
}: PhotoCardProps) {
  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  return (
    <div className="group relative transform overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-gray-100">
        <Image
          src={photo.preview_url}
          alt={photo.filename}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />

        {/* Zoom button on hover */}
        <button
          onClick={onZoom}
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors hover:bg-black/30 group-hover:opacity-100"
          aria-label="Ver foto en tamaño completo"
        >
          <ZoomInIcon className="h-8 w-8 text-white drop-shadow-lg" />
        </button>

        {/* Watermark Badge */}
        <div className="absolute left-3 top-3 rounded-full bg-purple-600 px-2 py-1 text-xs font-medium text-white shadow-lg">
          MUESTRA
        </div>

        {/* Selection Indicator */}
        <div className="absolute right-3 top-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`flex h-6 w-6 transform cursor-pointer items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 ${
              isSelected
                ? 'bg-purple-600 text-white'
                : 'bg-white/90 text-gray-600 backdrop-blur-sm'
            }`}
          >
            {isSelected && <CheckCircleIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Photo Info */}
      <div className="rounded-b-2xl bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">
              {photo.filename}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {Math.round(photo.size / 1024)} KB
            </p>
          </div>

          <div className="ml-2 flex gap-2">
            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`transform rounded-full p-1.5 transition-all hover:scale-110 ${
                isFavorite
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-red-50'
              }`}
              aria-label={
                isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
              }
            >
              <HeartIcon
                className="h-4 w-4"
                fill={isFavorite ? 'currentColor' : 'none'}
              />
            </button>

            {/* Select Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className={`transform rounded-full p-1.5 transition-all hover:scale-110 ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
              }`}
              aria-label={isSelected ? 'Quitar selección' : 'Seleccionar foto'}
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
