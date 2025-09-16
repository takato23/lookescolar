// Galería familiar adaptada para el sistema unificado
// Se integra con el diseño y funcionalidades de PublicGallery

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ShoppingCartIcon, HeartIcon, CheckCircleIcon, ZoomInIcon, AlertCircleIcon, Users, Camera, Star, Filter, Grid3X3Icon, List } from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { EmptyState } from '@/components/public/EmptyState';
import { PhotoModal } from '@/components/public/PhotoModal';
import { CartButton, ShoppingCart as FamilyCartDrawer } from '@/components/family/ShoppingCart';
import { StickyCTA } from '@/components/public/StickyCTA';
import type { GalleryContextData } from '@/lib/gallery-context';
import { debugMigration } from '@/lib/feature-flags';
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
      <div className="space-y-8">
        <FamilyGalleryLoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <FamilyGalleryErrorState error={error} onRetry={() => loadGallery(1)} />
    );
  }

  const priceText = pkg ? (pkg === 'Combo A' ? '$' + 1000 : pkg === 'Combo B' ? '$' + 1800 : 'sin precio online') : 'sin precio online';

  // Tabs para navegación familiar
  const familyTabs = [
    { id: 'todas' as const, label: 'Todas', count: photos.length, icon: Grid3X3Icon },
    { id: 'favoritas' as const, label: 'Favoritas', count: favorites.size, icon: HeartIcon },
    { id: 'seleccionadas' as const, label: 'Seleccionadas', count: selectedPhotos.size, icon: ShoppingCartIcon },
  ];

  const [activeTab, setActiveTab] = useState<'todas' | 'favoritas' | 'seleccionadas'>('todas');

  // Filtrar fotos basado en el tab activo
  const getFilteredPhotos = () => {
    switch (activeTab) {
      case 'favoritas':
        return photos.filter(photo => favorites.has(photo.id));
      case 'seleccionadas':
        return photos.filter(photo => selectedPhotos.has(photo.id));
      default:
        return photos;
    }
  };

  const filteredPhotos = getFilteredPhotos();

  return (
    <div className="space-y-8">
      <div aria-live="polite" className="sr-only">{submitted ? '¡Listo! Recibimos tu selección.' : ''}</div>
      
      {/* Family Header mejorado - Liquid glass design */}
      <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-8 shadow-xl shadow-cyan-500/10">
        {/* Main Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="relative bg-gradient-to-br from-cyan-400 to-purple-500 p-4 rounded-2xl shadow-xl">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-br from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                Tus Fotos Privadas
              </h1>
              {subject?.event && (
                <p className="text-gray-600 mt-1 font-medium">
                  {subject.event.name} • {subject.event.school_name}
                </p>
              )}
            </div>
          </div>
          <CartButton />
        </div>
        
        {/* Enhanced Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              <Camera className="h-4 w-4 text-green-600" />
              <span className="text-green-700 font-semibold">{photos.length} fotos disponibles</span>
            </div>
            {selectedPhotos.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 px-4 py-2 rounded-full">
                <ShoppingCartIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedPhotos.size} para comprar</span>
              </div>
            )}
            {favorites.size > 0 && (
              <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full">
                <HeartIcon className="h-4 w-4 text-red-500 fill-current" />
                <span className="font-semibold text-red-600">{favorites.size} favoritas</span>
              </div>
            )}
          </div>
          
          {/* Instructions mejoradas */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-2 rounded-full border border-gray-200">
            <span className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> ❤️ favoritos • ✅ comprar • 🔍 ampliar
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-3 shadow-xl shadow-cyan-500/10">
        <div className="flex space-x-2">
          {familyTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex-1 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300 transform
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:scale-102 hover:shadow-md'
                  }
                `}
                aria-label={`Filtrar por ${tab.label}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-bold
                    ${activeTab === tab.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {tab.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {submitted && (
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-8 shadow-xl shadow-green-500/10">
          <div className="flex items-start space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl shadow-green-500/25">
              <CheckCircleIcon className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Selección enviada con éxito!</h2>
              <p className="text-gray-600 mb-6 text-lg">
                Hemos recibido tu selección de fotos. El fotógrafo se pondrá en contacto contigo pronto para coordinar la entrega.
              </p>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 mb-6">
                <p className="text-sm text-gray-600">
                  📧 <strong>Próximos pasos:</strong> Revisa tu email y teléfono en las próximas 24-48 horas.
                </p>
              </div>
              <Button
                onClick={() => setSubmitted(false)}
                className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 font-bold text-white shadow-lg shadow-green-500/25 transition-all duration-300 hover:scale-105"
              >
                Ver galería nuevamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Gallery */}
      {photos.length === 0 ? (
        <FamilyEmptyState />
      ) : filteredPhotos.length === 0 ? (
        <FamilyEmptyFilterState activeTab={activeTab} />
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredPhotos.map((photo, idx) => (
            <div key={photo.id} className="group">
              <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-3 shadow-xl shadow-cyan-500/10 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-105">
                {/* Image Container */}
                <div className="aspect-square relative bg-gray-100 rounded-2xl overflow-hidden">
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
                  <div className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full shadow-lg">
                    PRIVADA
                  </div>

                  {/* Selection Indicator */}
                  <div className="absolute top-3 right-3 z-10">
                    <div 
                      className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transform hover:scale-110 transition-all shadow-lg ${
                        selectedPhotos.has(photo.id) 
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white scale-110' 
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
                        <CheckCircleIcon className="h-5 w-5" />
                      )}
                    </div>
                  </div>

                  {/* Favorite Indicator */}
                  {favorites.has(photo.id) && (
                    <div className="absolute bottom-3 left-3">
                      <div className="bg-red-500 text-white p-1 rounded-full shadow-lg">
                        <HeartIcon className="h-3 w-3 fill-current" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo Info */}
                <div className="p-3">
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
                    <div className="flex gap-1">
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(photo.id);
                        }}
                        className={`rounded-full p-2 transition-all transform hover:scale-110 ${
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
                        className={`rounded-full p-2 transition-all transform hover:scale-110 ${
                          selectedPhotos.has(photo.id)
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg'
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
            </div>
          ))}
        </div>
      )}
      
      {/* Loading more indicator - Liquid glass design */}
      {isLoadingMore && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => {
            const gradients = [
              'from-orange-300 to-yellow-400',
              'from-cyan-300 to-blue-400', 
              'from-purple-300 to-pink-400',
              'from-green-300 to-emerald-400',
              'from-rose-300 to-red-400',
              'from-indigo-300 to-purple-400'
            ];
            const gradient = gradients[i % gradients.length];
            return (
              <div key={i} className="group">
                <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-3 shadow-xl shadow-cyan-500/10">
                  <div className={`aspect-square animate-pulse rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`} />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
                  </div>
                </div>
              </div>
            );
          })}
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
      {zoomIndex !== null && filteredPhotos[zoomIndex] && (
        <PhotoModal
          photo={{
            id: filteredPhotos[zoomIndex].id,
            preview_url: filteredPhotos[zoomIndex].preview_url,
            filename: filteredPhotos[zoomIndex].filename
          }}
          isOpen={true}
          onClose={() => setZoomIndex(null)}
          onPrev={() => setZoomIndex((i) => (i === null || i === 0 ? i : i - 1))}
          onNext={() => setZoomIndex((i) => (i === null || i === filteredPhotos.length - 1 ? i : i + 1))}
          hasNext={zoomIndex < filteredPhotos.length - 1}
          hasPrev={zoomIndex > 0}
          currentIndex={zoomIndex + 1}
          totalPhotos={filteredPhotos.length}
          isSelected={selectedPhotos.has(filteredPhotos[zoomIndex].id)}
          isFavorite={favorites.has(filteredPhotos[zoomIndex].id)}
          onToggleSelection={() => togglePhotoSelection(filteredPhotos[zoomIndex].id)}
          onToggleFavorite={() => toggleFavorite(filteredPhotos[zoomIndex].id)}
        />
      )}
    </div>
  );
}

// Loading skeleton específico para galería familiar
function FamilyGalleryLoadingSkeleton() {
  const gradients = [
    'from-orange-300 to-yellow-400',
    'from-cyan-300 to-blue-400', 
    'from-purple-300 to-pink-400',
    'from-green-300 to-emerald-400',
    'from-rose-300 to-red-400',
    'from-indigo-300 to-purple-400'
  ];

  return (
    <>
      {/* Header skeleton */}
      <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-8 shadow-xl shadow-cyan-500/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300" />
            <div className="space-y-3">
              <div className="h-8 w-56 animate-pulse rounded-lg bg-gradient-to-br from-gray-200 to-gray-300" />
              <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-12 w-32 animate-pulse rounded-2xl bg-gray-200" />
        </div>
        <div className="flex gap-4">
          <div className="h-8 w-32 animate-pulse rounded-full bg-gray-200" />
          <div className="h-8 w-28 animate-pulse rounded-full bg-gray-200" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-3 shadow-xl shadow-cyan-500/10">
        <div className="flex space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 h-16 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300" />
          ))}
        </div>
      </div>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => {
          const gradient = gradients[i % gradients.length];
          return (
            <div key={i} className="group">
              <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-3 shadow-xl shadow-cyan-500/10">
                <div className={`aspect-square animate-pulse rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`} />
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// Error state específico para galería familiar
function FamilyGalleryErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto max-w-lg">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-red-500/10">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 shadow-2xl shadow-red-500/20">
            <AlertTriangleIcon className="h-16 w-16 text-white" />
          </div>
          <h3 className="mb-6 text-3xl font-bold text-gray-800">
            No pudimos cargar tu galería privada
          </h3>
          <p className="mx-auto mb-8 max-w-md text-gray-600 text-lg leading-relaxed">{error}</p>
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 mb-8">
            <p className="text-sm font-semibold text-gray-700 mb-3">Posibles soluciones:</p>
            <ul className="text-sm text-gray-600 space-y-2 text-left">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                Verifica que el enlace o código QR sea correcto
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full" />
                Asegúrate de usar el acceso proporcionado por el fotógrafo
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                Contacta con el fotógrafo si el problema persiste
              </li>
            </ul>
          </div>
          <Button
            onClick={onRetry}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 px-10 py-4 font-bold text-white shadow-2xl shadow-red-500/25 transition-all duration-300 hover:scale-110 hover:shadow-3xl hover:shadow-red-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="flex items-center gap-3">
              <AlertTriangleIcon className="h-5 w-5" />
              <span>Intentar de nuevo</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Empty state específico para galería familiar
function FamilyEmptyState() {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto max-w-lg">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-cyan-500/10">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-500 shadow-2xl shadow-cyan-500/20">
            <Camera className="h-16 w-16 text-white" />
          </div>
          <h3 className="mb-6 text-3xl font-bold text-gray-800">
            ¡Aún no hay fotos privadas!
          </h3>
          <p className="mx-auto max-w-md text-gray-600 text-lg leading-relaxed mb-6">
            Tus fotos aparecerán aquí cuando estén disponibles.
          </p>
          <div className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">💡 <strong>Mientras esperas:</strong></p>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• El fotógrafo está procesando las imágenes</li>
              <li>• Las fotos aparecerán automáticamente cuando estén listas</li>
              <li>• Este enlace es privado y seguro para tu familia</li>
              <li>• Guarda este enlace para volver más tarde</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state para filtros
function FamilyEmptyFilterState({ activeTab }: { activeTab: string }) {
  const messages = {
    favoritas: {
      title: '¡Aún no tienes favoritas!',
      description: 'Toca el corazón ❤️ en las fotos que más te gusten para marcarlas como favoritas.',
      icon: HeartIcon,
      gradient: 'from-red-400 via-pink-400 to-rose-500'
    },
    seleccionadas: {
      title: '¡Aún no has seleccionado fotos!',
      description: 'Toca el botón de carrito 🛒 en las fotos que quieras comprar.',
      icon: ShoppingCartIcon,
      gradient: 'from-blue-400 via-cyan-400 to-teal-500'
    }
  };

  const config = messages[activeTab as keyof typeof messages] || messages.seleccionadas;
  const Icon = config.icon;

  return (
    <div className="py-20 text-center">
      <div className="mx-auto max-w-lg">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-gray-500/10">
          <div className={`mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient} shadow-2xl shadow-gray-500/20`}>
            <Icon className="h-16 w-16 text-white" />
          </div>
          <h3 className="mb-6 text-3xl font-bold text-gray-800">
            {config.title}
          </h3>
          <p className="mx-auto max-w-md text-gray-600 text-lg leading-relaxed mb-6">
            {config.description}
          </p>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Usa la pestaña "Todas" para ver todas las fotos disponibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}