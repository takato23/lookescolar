'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { HeartIcon, CheckCircleIcon, ZoomInIcon, AlertCircleIcon } from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { Button } from '@/components/ui/button';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface Subject {
  id: string;
  name: string;
  grade_section: string;
  event: {
    name: string;
    school_name: string;
  };
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
  {
    id: 'option-a',
    name: 'OPCIÓN A',
    price: 18500,
    description: 'Carpeta impresa con diseño personalizado (20x30)',
    includes: [
      '1 foto INDIVIDUAL (15x21)',
      '4 fotos 4x5 (de la misma individual)',
      '1 foto grupal (15x21)'
    ],
    photoRequirements: {
      individual: 1,
      group: 1
    }
  },
  {
    id: 'option-b',
    name: 'OPCIÓN B',
    price: 28500,
    description: 'Carpeta impresa con diseño personalizado (20x30)',
    includes: [
      '2 fotos INDIVIDUALES (15x21)',
      '8 fotos 4x5 (de las mismas individuales)',
      '1 foto grupal (15x21)'
    ],
    photoRequirements: {
      individual: 2,
      group: 1
    }
  }
];

const EXTRA_COPIES = [
  { id: 'extra-4x5', name: '4x5 (4 fotitos)', price: 2800 },
  { id: 'extra-10x15', name: 'Foto 10x15', price: 2200 },
  { id: 'extra-13x18', name: 'Foto 13x18', price: 3200 },
  { id: 'extra-15x21', name: 'Foto 15x21', price: 4500 },
  { id: 'extra-20x30', name: 'Poster 20x30', price: 7800 }
];

interface UnifiedGalleryPageProps {
  token: string;
}

export default function UnifiedGalleryPage({ token }: UnifiedGalleryPageProps) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<{
    individual: string[];
    group: string[];
  }>({ individual: [], group: [] });
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { addItem, getTotalItems, setContext } = useUnifiedCartStore();

  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  useEffect(() => {
    if (token) {
      setContext({
        context: 'family',
        token: token,
        eventId: subject?.id || 'unknown'
      });
      loadGallery(1).catch(console.error);
    }
  }, [token, subject?.id]);

  const loadGallery = async (targetPage: number) => {
    try {
      const response = await fetch(`/api/family/gallery-simple/${token}?page=${targetPage}&limit=24`);

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Error cargando galería');
        setLoading(false);
        return;
      }

      const data = await response.json();
      const newPhotos = (data.photos || []) as Photo[];
      setPhotos((prev) => (targetPage === 1 ? newPhotos : [...prev, ...newPhotos]));
      setHasMore(Boolean(data.pagination?.has_more ?? (newPhotos.length >= 24)));
      setPage(targetPage);
      setSubject(data.subject);

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

  const handlePhotoSelection = (photoId: string, type: 'individual' | 'group') => {
    if (!selectedPackage) return;

    setSelectedPhotos(prev => {
      const newSelection = { ...prev };
      const currentArray = newSelection[type];
      const maxAllowed = selectedPackage.photoRequirements[type];

      if (currentArray.includes(photoId)) {
        // Remove photo
        newSelection[type] = currentArray.filter(id => id !== photoId);
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
    localStorage.setItem(`favorites_${token}`, JSON.stringify(Array.from(newFavorites)));
  };

  const handleExtraChange = (extraId: string, quantity: number) => {
    setSelectedExtras(prev => ({
      ...prev,
      [extraId]: Math.max(0, quantity)
    }));
  };

  const calculateTotal = () => {
    const packagePrice = selectedPackage?.price || 0;
    const extrasPrice = Object.entries(selectedExtras).reduce((total, [extraId, quantity]) => {
      const extra = EXTRA_COPIES.find(e => e.id === extraId);
      return total + (extra ? extra.price * quantity : 0);
    }, 0);
    return packagePrice + extrasPrice;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const canProceedToCheckout = () => {
    if (!selectedPackage) return false;
    const { individual, group } = selectedPackage.photoRequirements;
    return selectedPhotos.individual.length === individual && 
           selectedPhotos.group.length === group;
  };

  const handleCheckout = async () => {
    if (!canProceedToCheckout()) return;

    // Here you would implement the checkout logic
    window.open(`/f/${token}/checkout`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <div>
            <p className="text-lg font-medium text-gray-700">Cargando tu galería...</p>
            <p className="text-sm text-gray-500 mt-1">Esto puede tomar unos segundos</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
        <div className="rounded-xl bg-white p-8 shadow-xl max-w-md w-full">
          <div className="flex items-start space-x-3">
            <AlertCircleIcon className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">No pudimos cargar tu galería</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white font-medium hover:bg-purple-700 transition-colors"
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
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🖼️ Tus Fotos</h1>
              {subject?.event && (
                <p className="text-sm text-gray-600 mt-1">
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

      <div className="flex flex-col lg:flex-row max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
        {/* Photo Gallery - Left Side */}
        <div className="flex-1 lg:w-2/3">
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay fotos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl group relative overflow-hidden transition-all duration-300 transform hover:scale-105"
                >
                  {/* Image Container */}
                  <div className="aspect-square relative bg-gray-100 rounded-t-2xl overflow-hidden">
                    <Image
                      src={photo.preview_url}
                      alt={photo.filename}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      loading={idx < 12 ? "eager" : "lazy"}
                      priority={idx < 6}
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />
                    
                    {/* Zoom button */}
                    <button
                      onClick={() => setZoomIndex(idx)}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ZoomInIcon className="h-8 w-8 text-white drop-shadow-lg" />
                    </button>

                    {/* Watermark Badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-purple-600 text-white rounded-full shadow-lg">
                      MUESTRA
                    </div>

                    {/* Selection Indicators */}
                    {selectedPackage && (
                      <div className="absolute top-3 right-3 flex flex-col gap-1">
                        {/* Individual Photo Selection */}
                        <button
                          onClick={() => handlePhotoSelection(photo.id, 'individual')}
                          disabled={!selectedPhotos.individual.includes(photo.id) && 
                                   selectedPhotos.individual.length >= selectedPackage.photoRequirements.individual}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-lg ${
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
                          onClick={() => handlePhotoSelection(photo.id, 'group')}
                          disabled={!selectedPhotos.group.includes(photo.id) && 
                                   selectedPhotos.group.length >= selectedPackage.photoRequirements.group}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-lg ${
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
                  <div className="bg-white p-3 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {photo.filename}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {Math.round(photo.size / 1024)} KB
                        </p>
                      </div>
                      
                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(photo.id)}
                        className={`rounded-full p-1.5 transition-all transform hover:scale-110 ${
                          favorites.has(photo.id)
                            ? 'bg-red-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                        }`}
                      >
                        <HeartIcon
                          className="h-4 w-4"
                          fill={favorites.has(photo.id) ? 'currentColor' : 'none'}
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
        <div className="lg:w-1/3 lg:sticky lg:top-24 lg:h-fit">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🛒 Opciones de Compra</h2>
            
            {/* Package Selection */}
            <div className="space-y-4 mb-6">
              {PACKAGE_OPTIONS.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    selectedPackage?.id === pkg.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                    <span className="text-xl font-bold text-purple-600">
                      {formatCurrency(pkg.price)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {pkg.includes.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Photo Selection Status */}
            {selectedPackage && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <h4 className="font-bold text-gray-900 mb-2">Selección de Fotos:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Fotos individuales:</span>
                    <span className={`font-bold ${
                      selectedPhotos.individual.length === selectedPackage.photoRequirements.individual
                        ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {selectedPhotos.individual.length}/{selectedPackage.photoRequirements.individual}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fotos grupales:</span>
                    <span className={`font-bold ${
                      selectedPhotos.group.length === selectedPackage.photoRequirements.group
                        ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {selectedPhotos.group.length}/{selectedPackage.photoRequirements.group}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Usa los botones <span className="bg-blue-600 text-white px-1 rounded">I</span> y <span className="bg-green-600 text-white px-1 rounded">G</span> en las fotos
                </p>
              </div>
            )}

            {/* Extra Copies */}
            {selectedPackage && (
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3">Copias Adicionales:</h4>
                <div className="space-y-2">
                  {EXTRA_COPIES.map((extra) => (
                    <div key={extra.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{extra.name}</span>
                        <span className="text-sm text-gray-600 ml-2">{formatCurrency(extra.price)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleExtraChange(extra.id, (selectedExtras[extra.id] || 0) - 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">
                          {selectedExtras[extra.id] || 0}
                        </span>
                        <button
                          onClick={() => handleExtraChange(extra.id, (selectedExtras[extra.id] || 0) + 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
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
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={!canProceedToCheckout()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {canProceedToCheckout() ? 'Completar Compra' : 'Selecciona las fotos requeridas'}
                </Button>
              </div>
            )}

            {!selectedPackage && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Selecciona un paquete para comenzar</p>
                <p className="text-sm text-gray-400">
                  Elige entre las opciones de arriba para ver las fotos requeridas
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}