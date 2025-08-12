'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCartIcon, HeartIcon, CheckCircleIcon, XIcon, ZoomInIcon, AlertCircleIcon } from 'lucide-react';
import { PublicHero } from '@/components/public/PublicHero'
import { PhotoCard as PublicPhotoCard } from '@/components/public/PhotoCard'
import { PhotoModal as PublicPhotoModal } from '@/components/public/PhotoModal'
import { StickyCTA } from '@/components/public/StickyCTA'
import { EmptyState } from '@/components/public/EmptyState'

async function submitSelection(payload: {
  token: string;
  selectedPhotoIds: string[];
  package: string;
  contact?: { name?: string; email?: string; phone?: string };
}) {
  const res = await fetch('/api/public/selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error enviando selección');
  return (await res.json()) as { ok: boolean; orderId: string };
}

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

export default function SimpleGalleryPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [pkg, setPkg] = useState<string>('Combo A');
  const [sending, setSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (token) {
      const already = localStorage.getItem(`selection_submitted:${token}`);
      setSubmitted(already === '1');
      // Cargar primera página
      void loadGallery(1);
    }
  }, [token]);

  const loadGallery = async (targetPage: number) => {
    try {
      const response = await fetch(`/api/family/gallery-simple/${token}?page=${targetPage}&limit=60`);

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Error cargando galería');
        setLoading(false);
        return;
      }

      const data = await response.json();
      const newPhotos = (data.photos || []) as Photo[];
      setPhotos((prev) => (targetPage === 1 ? newPhotos : [...prev, ...newPhotos]));
      setHasMore(Boolean(data.pagination?.has_more ?? (newPhotos.length >= 60)));
      setPage(targetPage);
      setSubject(data.subject);

      // Cargar favoritos del localStorage
      const savedFavorites = localStorage.getItem(`favorites_${token}`);
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }

      // Cargar selección del sessionStorage
      const savedSelection = sessionStorage.getItem(`cart_${token}`);
      if (savedSelection) {
        setSelectedPhotos(new Set(JSON.parse(savedSelection)));
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando la galería');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // IntersectionObserver para infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
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
  }, [page, hasMore, isLoadingMore]);

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
    sessionStorage.setItem(
      `cart_${token}`,
      JSON.stringify(Array.from(newSelection))
    );
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

  const handleSend = async () => {
    try {
      setSending(true);
      const ids = Array.from(selectedPhotos);
      if (ids.length === 0 || !pkg) {
        alert('Selecciona al menos una foto y un paquete');
        setSending(false);
        return;
      }
      const result = await submitSelection({ token, selectedPhotoIds: ids, package: pkg });
      if (result.ok) {
        localStorage.setItem(`selection_submitted:${token}`, '1');
        setSubmitted(true);
      }
    } catch (e) {
      console.error(e);
      alert('No se pudo enviar la selección');
    } finally {
      setSending(false);
    }
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
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Posibles soluciones:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Verifica que el enlace sea correcto</li>
                  <li>Asegúrate de usar el QR o código proporcionado</li>
                  <li>Contacta con el fotógrafo si el problema persiste</li>
                </ul>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2 text-white font-medium hover:bg-purple-700 transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Precios mockeados locales (si hay lista en el futuro, reemplazar)
  const priceText = pkg ? (pkg === 'Combo A' ? '$' + 1000 : pkg === 'Combo B' ? '$' + 1800 : 'sin precio online') : 'sin precio online';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      <div aria-live="polite" className="sr-only">{submitted ? '¡Listo! Recibimos tu selección.' : ''}</div>
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tu Galería Privada</h1>
            {subject?.event && (
              <p className="text-lg text-gray-600">
                {subject.event.name} • {subject.event.school_name}
              </p>
            )}
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">{photos.length} fotos disponibles</span>
              </div>
              {selectedPhotos.size > 0 && (
                <div className="flex items-center space-x-2">
                  <ShoppingCartIcon className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-600">{selectedPhotos.size} seleccionadas</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {submitted && (
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 p-1">
            <div className="rounded-lg bg-white p-6">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">¡Selección enviada con éxito!</h2>
                  <p className="text-gray-600 mb-4">
                    Hemos recibido tu selección de fotos. El fotógrafo se pondrá en contacto contigo pronto.
                  </p>
                  <button 
                    onClick={() => setSubmitted(false)} 
                    className="rounded-lg bg-purple-600 px-6 py-2 text-white font-medium hover:bg-purple-700 transition-colors"
                  >
                    Ver galería nuevamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Main Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {photos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-lg transition-all duration-200"
              >
                {/* Image */}
                <div className="aspect-square relative bg-gray-100">
                  <img
                    src={photo.preview_url}
                    alt={photo.filename}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Zoom button on hover */}
                  <button
                    onClick={() => setZoomIndex(idx)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Ver foto en tamaño completo"
                  >
                    <ZoomInIcon className="h-8 w-8 text-white drop-shadow-lg" />
                  </button>
                </div>

                {/* Watermark Badge */}
                <div className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  MUESTRA
                </div>

                {/* Action Buttons */}
                <div className="absolute bottom-2 right-2 flex gap-2">
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(photo.id);
                    }}
                    className={`rounded-full p-2 shadow-lg transition-all transform hover:scale-110 ${
                      favorites.has(photo.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white/90 backdrop-blur text-gray-700 hover:bg-red-50'
                    }`}
                    aria-label={favorites.has(photo.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  >
                    <HeartIcon
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      fill={favorites.has(photo.id) ? 'currentColor' : 'none'}
                    />
                  </button>

                  {/* Select Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePhotoSelection(photo.id);
                    }}
                    className={`rounded-full p-2 shadow-lg transition-all transform hover:scale-110 ${
                      selectedPhotos.has(photo.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/90 backdrop-blur text-gray-700 hover:bg-purple-50'
                    }`}
                    aria-label={selectedPhotos.has(photo.id) ? 'Quitar de la selección' : 'Agregar a la selección'}
                  >
                    {selectedPhotos.has(photo.id) ? (
                      <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>

                {/* Selected Indicator */}
                {selectedPhotos.has(photo.id) && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-purple-600 text-white rounded-full p-1 shadow-lg">
                      <CheckCircleIcon className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-lg bg-white shadow-sm">
                <div className="aspect-square bg-gray-200" />
              </div>
            ))}
          </div>
        )}
        
        {/* Infinite scroll trigger */}
        {hasMore && (
          <div
            ref={sentinelRef}
            className="h-20 flex items-center justify-center"
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

      {/* Sticky CTA */}
      {!submitted && selectedPhotos.size > 0 && (
        <StickyCTA
          selectedCount={selectedPhotos.size}
          pkg={pkg}
          setPkg={setPkg}
          onContinue={handleSend}
          disabled={sending || selectedPhotos.size === 0 || !pkg}
          priceText={priceText}
        />
      )}

      {/* Photo Modal */}
      {zoomIndex !== null && photos[zoomIndex] && (
        <PublicPhotoModal
          photo={{
            id: photos[zoomIndex].id,
            preview_url: photos[zoomIndex].preview_url,
            filename: photos[zoomIndex].filename
          }}
          isOpen={true}
          onClose={() => setZoomIndex(null)}
          onPrev={() => setZoomIndex((i) => (i === null || i === 0 ? i : i - 1))}
          onNext={() => setZoomIndex((i) => (i === null || i === photos.length - 1 ? i : i + 1))}
          hasNext={zoomIndex < photos.length - 1}
          hasPrev={zoomIndex > 0}
          currentIndex={zoomIndex + 1}
          totalPhotos={photos.length}
          isSelected={selectedPhotos.has(photos[zoomIndex].id)}
          isFavorite={favorites.has(photos[zoomIndex].id)}
          onToggleSelection={() => togglePhotoSelection(photos[zoomIndex].id)}
          onToggleFavorite={() => toggleFavorite(photos[zoomIndex].id)}
        />
      )}
    </div>
  );
}
