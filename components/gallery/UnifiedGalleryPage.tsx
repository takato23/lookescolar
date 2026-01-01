'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  HeartIcon,
  CheckCircleIcon,
  ZoomInIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { Button } from '@/components/ui/button';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
  signed_url?: string | null;
  download_url?: string | null;
  type?: string | null;
}

interface Subject {
  id: string;
  name: string;
  grade?: string | null;
  section?: string | null;
  event?: {
    name?: string | null;
    school_name?: string | null;
  } | null;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  description: string;
  includes: string[];
  photoRequirements: {
    individual: number;
    group: number;
  };
}

const PACKAGE_OPTIONS: PackageOption[] = [
  // These will be loaded dynamically from the API
  // Default structure kept for typing
];

const EXTRA_COPIES = [
  // These will be loaded dynamically from the API
  // Default structure kept for typing
];

interface UnifiedGalleryPageProps {
  token: string;
}

export default function UnifiedGalleryPage({ token }: UnifiedGalleryPageProps) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(
    null
  );
  const [selectedPhotos, setSelectedPhotos] = useState<{
    individual: string[];
    group: string[];
  }>({ individual: [], group: [] });
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>(
    {}
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Dynamic pricing state
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [extraCopies, setExtraCopies] = useState<
    Array<{ id: string; name: string; price: number; description?: string }>
  >([]);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { addItem, getTotalItems, setContext } = useUnifiedCartStore();

  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  useEffect(() => {
    if (token) {
      setContext({
        context: 'family',
        token: token,
        eventId: subject?.id || 'unknown',
      });
      loadGallery(1).catch(console.error);
    }
  }, [token, subject?.id]);

  useEffect(() => {
    // Load pricing data
    const loadPricing = async () => {
      try {
        const response = await fetch('/api/admin/pricing');
        if (response.ok) {
          const pricingData = await response.json();
          setPackageOptions(pricingData.packages || []);
          setExtraCopies(pricingData.extraCopies || []);
        } else {
          // Use fallback pricing if API fails
          console.warn('Failed to load pricing, using fallback');
          setPackageOptions([
            {
              id: 'option-a',
              name: 'OPCIÓN A',
              price: 0,
              description: 'Carpeta impresa con diseño personalizado (20x30)',
              includes: [
                '1 foto INDIVIDUAL (15x21)',
                '4 fotos 4x5 (de la misma individual elegida)',
                '1 foto grupal (15x21)',
              ],
              photoRequirements: { individual: 1, group: 1 },
            },
            {
              id: 'option-b',
              name: 'OPCIÓN B',
              price: 0,
              description: 'Carpeta impresa con diseño personalizado (20x30)',
              includes: [
                '2 fotos INDIVIDUALES (15x21)',
                '8 fotos 4x5 (de las mismas individuales elegidas)',
                '1 foto grupal (15x21)',
              ],
              photoRequirements: { individual: 2, group: 1 },
            },
          ]);
          setExtraCopies([
            { id: 'extra-4x5', name: '4x5 (4 fotitos)', price: 0 },
            { id: 'extra-10x15', name: 'Foto 10x15', price: 0 },
            { id: 'extra-13x18', name: 'Foto 13x18', price: 0 },
            { id: 'extra-15x21', name: 'Foto 15x21', price: 0 },
            { id: 'extra-20x30', name: 'Poster 20x30', price: 0 },
          ]);
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
      } finally {
        setPricingLoaded(true);
      }
    };

    loadPricing();
  }, []);

  const loadGallery = async (targetPage: number) => {
    try {
      const response = await fetch(
        `/api/family/gallery/${token}?page=${targetPage}&limit=24`
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

      const newPhotos: Photo[] = (gallery.items || []).map((item: any) => ({
        id: item.id,
        filename: item.filename || 'foto',
        preview_url:
          item.previewUrl ||
          item.signedUrl ||
          item.downloadUrl ||
          '/placeholder-image.svg',
        size: item.size ?? 0,
        width: item.metadata?.width ?? 0,
        height: item.metadata?.height ?? 0,
        signed_url: item.signedUrl ?? null,
        download_url: item.downloadUrl ?? null,
        type: item.type ?? null,
      }));

      setPhotos((prev) =>
        targetPage === 1 ? newPhotos : [...prev, ...newPhotos]
      );
      setHasMore(Boolean(gallery.pagination?.hasMore));
      setPage(targetPage);
      setSubject(gallery.subject ?? gallery.student ?? null);

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

  const handlePhotoSelection = (
    photoId: string,
    type: 'individual' | 'group'
  ) => {
    if (!selectedPackage) return;

    setSelectedPhotos((prev) => {
      const newSelection = { ...prev };
      const currentArray = newSelection[type];
      const maxAllowed = selectedPackage.photoRequirements[type];

      if (currentArray.includes(photoId)) {
        // Remove photo
        newSelection[type] = currentArray.filter((id) => id !== photoId);
      } else {
        // Add photo if within limit
        if (currentArray.length < maxAllowed) {
          newSelection[type] = [...currentArray, photoId];
        }
      }

      return newSelection;
    });
  };

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

  const handleExtraChange = (extraId: string, quantity: number) => {
    setSelectedExtras((prev) => ({
      ...prev,
      [extraId]: Math.max(0, quantity),
    }));
  };

  const calculateTotal = () => {
    const packagePrice = selectedPackage?.price || 0;
    const extrasPrice = Object.entries(selectedExtras).reduce(
      (total, [extraId, quantity]) => {
        const extra = extraCopies.find((e) => e.id === extraId);
        return total + (extra ? extra.price * quantity : 0);
      },
      0
    );
    return packagePrice + extrasPrice;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const canProceedToCheckout = () => {
    if (!selectedPackage) return false;
    const { individual, group } = selectedPackage.photoRequirements;
    return (
      selectedPhotos.individual.length === individual &&
      selectedPhotos.group.length === group
    );
  };

  const handleCheckout = async () => {
    if (!canProceedToCheckout()) return;

    // Here you would implement the checkout logic
    window.open(`/store-unified/${token}`, '_blank');
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
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
          <div className="flex items-start space-x-3">
            <AlertCircleIcon className="mt-1 h-6 w-6 flex-shrink-0 text-red-500" />
            <div className="flex-1">
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                No pudimos cargar tu galería
              </h2>
              <p className="mb-4 text-gray-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🖼️ Tus Fotos</h1>
              {subject?.event && (
                <p className="mt-1 text-sm text-gray-600">
                  {subject.event.name} • {subject.event.school_name}
                </p>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {photos.length} fotos disponibles
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        {/* Photo Gallery - Left Side */}
        <div className="flex-1 lg:w-2/3">
          {photos.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No hay fotos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="group relative transform overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-gray-100">
                    <Image
                      src={photo.preview_url}
                      alt={photo.filename}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      loading={idx < 12 ? 'eager' : 'lazy'}
                      priority={idx < 6}
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />

                    {/* Zoom button */}
                    <button
                      onClick={() => setZoomIndex(idx)}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors hover:bg-black/30 group-hover:opacity-100"
                    >
                      <ZoomInIcon className="h-8 w-8 text-white drop-shadow-lg" />
                    </button>

                    {/* Watermark Badge */}
                    <div className="absolute left-3 top-3 rounded-full bg-purple-600 px-2 py-1 text-xs font-medium text-white shadow-lg">
                      MUESTRA
                    </div>

                    {/* Selection Indicators */}
                    {selectedPackage && (
                      <div className="absolute right-3 top-3 flex flex-col gap-1">
                        {/* Individual Photo Selection */}
                        <button
                          onClick={() =>
                            handlePhotoSelection(photo.id, 'individual')
                          }
                          disabled={
                            !selectedPhotos.individual.includes(photo.id) &&
                            selectedPhotos.individual.length >=
                              selectedPackage.photoRequirements.individual
                          }
                          className={`flex h-6 w-6 items-center justify-center rounded-full shadow-lg transition-all ${
                            selectedPhotos.individual.includes(photo.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/90 text-gray-600 hover:bg-blue-50'
                          } disabled:opacity-50`}
                          title="Seleccionar como foto individual"
                        >
                          <span className="text-xs font-bold">I</span>
                        </button>

                        {/* Group Photo Selection */}
                        <button
                          onClick={() =>
                            handlePhotoSelection(photo.id, 'group')
                          }
                          disabled={
                            !selectedPhotos.group.includes(photo.id) &&
                            selectedPhotos.group.length >=
                              selectedPackage.photoRequirements.group
                          }
                          className={`flex h-6 w-6 items-center justify-center rounded-full shadow-lg transition-all ${
                            selectedPhotos.group.includes(photo.id)
                              ? 'bg-green-600 text-white'
                              : 'bg-white/90 text-gray-600 hover:bg-green-50'
                          } disabled:opacity-50`}
                          title="Seleccionar como foto grupal"
                        >
                          <span className="text-xs font-bold">G</span>
                        </button>
                      </div>
                    )}
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

                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(photo.id)}
                        className={`transform rounded-full p-1.5 transition-all hover:scale-110 ${
                          favorites.has(photo.id)
                            ? 'bg-red-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                        }`}
                      >
                        <HeartIcon
                          className="h-4 w-4"
                          fill={
                            favorites.has(photo.id) ? 'currentColor' : 'none'
                          }
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shopping Section - Right Side */}
        <div className="lg:sticky lg:top-24 lg:h-fit lg:w-1/3">
          <div className="rounded-2xl border border-purple-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              🛒 Opciones de Compra
            </h2>

            {/* Package Selection */}
            <div className="mb-6 space-y-4">
              {!pricingLoaded ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-20 rounded-xl bg-gray-200"></div>
                  <div className="h-20 rounded-xl bg-gray-200"></div>
                </div>
              ) : (
                packageOptions.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      selectedPackage?.id === pkg.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">
                        {pkg.name}
                      </h3>
                      <span className="text-xl font-bold text-purple-600">
                        {pkg.price > 0
                          ? formatCurrency(pkg.price)
                          : 'Precio a definir'}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-gray-600">
                      {pkg.description}
                    </p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {pkg.includes.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>

            {/* Photo Selection Status */}
            {selectedPackage && (
              <div className="mb-6 rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4">
                <h4 className="mb-2 font-bold text-gray-900">
                  Selección de Fotos:
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Fotos individuales:</span>
                    <span
                      className={`font-bold ${
                        selectedPhotos.individual.length ===
                        selectedPackage.photoRequirements.individual
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {selectedPhotos.individual.length}/
                      {selectedPackage.photoRequirements.individual}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fotos grupales:</span>
                    <span
                      className={`font-bold ${
                        selectedPhotos.group.length ===
                        selectedPackage.photoRequirements.group
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {selectedPhotos.group.length}/
                      {selectedPackage.photoRequirements.group}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  Usa los botones{' '}
                  <span className="rounded bg-blue-600 px-1 text-white">I</span>{' '}
                  y{' '}
                  <span className="rounded bg-green-600 px-1 text-white">
                    G
                  </span>{' '}
                  en las fotos
                </p>
              </div>
            )}

            {/* Extra Copies */}
            {selectedPackage && pricingLoaded && (
              <div className="mb-6">
                <h4 className="mb-3 font-bold text-gray-900">
                  Copias Adicionales:
                </h4>
                <div className="space-y-2">
                  {extraCopies.map((extra) => (
                    <div
                      key={extra.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          {extra.name}
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          {extra.price > 0
                            ? formatCurrency(extra.price)
                            : 'Precio a definir'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleExtraChange(
                              extra.id,
                              (selectedExtras[extra.id] || 0) - 1
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">
                          {selectedExtras[extra.id] || 0}
                        </span>
                        <button
                          onClick={() =>
                            handleExtraChange(
                              extra.id,
                              (selectedExtras[extra.id] || 0) + 1
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total and Checkout */}
            {selectedPackage && (
              <div className="border-t pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    Total:
                  </span>
                  <span className="text-2xl font-bold text-purple-600">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={!canProceedToCheckout()}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-3 text-lg font-bold text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {canProceedToCheckout()
                    ? 'Completar Compra'
                    : 'Selecciona las fotos requeridas'}
                </Button>
              </div>
            )}

            {!selectedPackage && (
              <div className="py-8 text-center">
                <p className="mb-4 text-gray-500">
                  Selecciona un paquete para comenzar
                </p>
                <p className="text-sm text-gray-400">
                  Elige entre las opciones de arriba para ver las fotos
                  requeridas
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
