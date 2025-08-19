// Galería familiar adaptada para el sistema unificado
// Se integra con el diseño y funcionalidades de PublicGallery

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ShoppingCartIcon, HeartIcon, CheckCircleIcon, ZoomInIcon, AlertCircleIcon } from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { EmptyState } from '@/components/public/EmptyState';
import { PhotoModal } from '@/components/public/PhotoModal';
import { CartButton, ShoppingCart as FamilyCartDrawer } from '@/components/family/ShoppingCart';
import { StickyCTA } from '@/components/public/StickyCTA';
import type { GalleryContextData } from '@/lib/gallery-context';
import { debugMigration } from '@/lib/feature-flags';

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

interface FamilyGalleryProps {
  context: GalleryContextData;
}

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

export function FamilyGallery({ context }: FamilyGalleryProps) {
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
  
  const { addItem, getTotalItems, openCart, items, clearCart, setContext } = useUnifiedCartStore();

  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  const token = context.token!; // Ya sabemos que es contexto familiar

  useEffect(() => {
    debugMigration('FamilyGallery mounting', { token: token.slice(0, 8) + '...', eventId: context.eventId });
    
    // Configurar contexto en el cart store unificado
    setContext(context);
    
    if (token) {
      const already = localStorage.getItem(`selection_submitted:${token}`);
      setSubmitted(already === '1');
      // Cargar primera página
      void loadGallery(1);
    }
  }, [token, context, setContext]);

  const loadGallery = async (targetPage: number) => {
    try {
      debugMigration('Loading family gallery', { targetPage, token: token.slice(0, 8) + '...' });
      
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
      
      debugMigration('Family gallery loaded', { photoCount: newPhotos.length, hasMore: data.pagination?.has_more });
      
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando la galería');
      debugMigration('Error loading family gallery', err);
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
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
      <div className="flex min-h-screen items-center justify-center px-4">
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
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const priceText = pkg ? (pkg === 'Combo A' ? '$' + 1000 : pkg === 'Combo B' ? '$' + 1800 : 'sin precio online') : 'sin precio online';

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="sr-only">{submitted ? '¡Listo! Recibimos tu selección.' : ''}</div>
      
      {/* Family Header */}
      <div className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg">
        {/* Main Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🖼️ Tus Fotos</h1>
            {subject?.event && (
              <p className="text-sm text-gray-600 mt-1">
                {subject.event.name} • {subject.event.school_name}
              </p>
            )}
          </div>
          <CartButton />
        </div>
        
        {/* Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">{photos.length} fotos disponibles</span>
            </div>
            {selectedPhotos.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                <ShoppingCartIcon className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-600">{selectedPhotos.size} seleccionadas para comprar</span>
              </div>
            )}
            {favorites.size > 0 && (
              <div className="flex items-center gap-2 text-red-500">
                <HeartIcon className="h-4 w-4 fill-current" />
                <span>{favorites.size} favoritas</span>
              </div>
            )}
          </div>
          
          {/* Instructions */}
          <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
            💡 Tip: ❤️ para favoritos • ✅ para comprar • 🔍 para ampliar
          </div>
        </div>
      </div>

      {submitted && (
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
                  className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  Ver galería nuevamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Gallery */}
      {photos.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
                
                {/* Zoom button on hover */}
                <button
                  onClick={() => setZoomIndex(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Ver foto en tamaño completo"
                >
                  <ZoomInIcon className="h-8 w-8 text-white drop-shadow-lg" />
                </button>

                {/* Watermark Badge */}
                <div className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded-full shadow-lg">
                  MUESTRA
                </div>

                {/* Selection Indicator */}
                <div className="absolute top-3 right-3 z-10">
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transform hover:scale-110 transition-all shadow-lg ${
                      selectedPhotos.has(photo.id) 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/90 text-gray-600 backdrop-blur-sm'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const wasSelected = selectedPhotos.has(photo.id);
                      togglePhotoSelection(photo.id);
                      if (!wasSelected) {
                        addItem({
                          photoId: photo.id,
                          filename: photo.filename,
                          price: 0,
                          watermarkUrl: photo.preview_url,
                        });
                      }
                    }}
                  >
                    {selectedPhotos.has(photo.id) && (
                      <CheckCircleIcon className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Photo Info */}
              <div className="bg-white p-3 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  {/* Photo filename */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {photo.filename}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {Math.round(photo.size / 1024)} KB
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-2">
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(photo.id);
                      }}
                      className={`rounded-full p-1.5 transition-all transform hover:scale-110 ${
                        favorites.has(photo.id)
                          ? 'bg-red-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                      }`}
                      aria-label={favorites.has(photo.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      <HeartIcon
                        className="h-4 w-4"
                        fill={favorites.has(photo.id) ? 'currentColor' : 'none'}
                      />
                    </button>

                    {/* Cart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const wasSelected = selectedPhotos.has(photo.id);
                        togglePhotoSelection(photo.id);
                        if (!wasSelected) {
                          addItem({
                            photoId: photo.id,
                            filename: photo.filename,
                            price: 0,
                            watermarkUrl: photo.preview_url,
                          });
                        }
                      }}
                      className={`rounded-full p-1.5 transition-all transform hover:scale-110 ${
                        selectedPhotos.has(photo.id)
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
                      }`}
                      aria-label={selectedPhotos.has(photo.id) ? 'Quitar de la selección' : 'Agregar a la selección'}
                    >
                      <ShoppingCartIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="aspect-square bg-gray-200 rounded-t-2xl" />
              <div className="p-3">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
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
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-sm">Cargando más fotos...</span>
            </div>
          )}
        </div>
      )}

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

      {/* Cart Drawer for checkout */}
      <FamilyCartDrawer
        onCheckout={async () => {
          try {
            const response = await fetch('/api/family/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token,
                contactInfo: { name: 'Cliente', email: 'cliente@example.com' },
                items: items.map((it) => ({ photoId: it.photoId, quantity: it.quantity, priceType: 'base' })),
              }),
            });
            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || 'Error en checkout');
            }
            const data = await response.json();
            clearCart();
            window.location.href = data.redirectUrl;
          } catch (err) {
            console.error('[Service] Family checkout error:', err);
            alert('No se pudo iniciar el pago');
          }
        }}
      />

      {/* Photo Modal */}
      {zoomIndex !== null && photos[zoomIndex] && (
        <PhotoModal
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