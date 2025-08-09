'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCartIcon, HeartIcon, CheckCircleIcon } from 'lucide-react';

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
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

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
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-gray-600">Cargando fotos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-red-600">Error</h2>
          <p className="text-gray-700">{error}</p>
          <p className="mt-4 text-sm text-gray-500">
            Verifica que tu enlace sea correcto o contacta con el fotógrafo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {submitted && (
        <div className="bg-emerald-50 border-b border-emerald-200 py-3 text-center text-emerald-700">
          Selección recibida. Podés guardar este link para consultar más tarde.
        </div>
      )}
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              Galería de {subject?.name}
            </h1>
            {subject?.event && (
              <p className="mt-2 text-gray-600">
                {subject.event.name} - {subject.event.school_name}
              </p>
            )}
            {subject?.grade_section && (
              <p className="text-sm text-gray-500">
                Grado: {subject.grade_section}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              <span className="text-sm font-medium text-gray-700">
                {photos.length} fotos disponibles
              </span>
              <span className="text-sm font-medium text-purple-600">
                {favorites.size} favoritas
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2">
              <ShoppingCartIcon className="h-5 w-5 text-purple-600" />
              <span className="font-bold text-purple-600">
                {selectedPhotos.size} seleccionadas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="container mx-auto px-4 py-8">
        {photos.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-lg">
            <p className="text-xl text-gray-600">
              No hay fotos asignadas todavía.
            </p>
            <p className="mt-2 text-gray-500">
              El fotógrafo está procesando las imágenes. Vuelve a verificar más
              tarde.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-all hover:shadow-xl"
              >
                {/* Image */}
                <div className="aspect-square">
                  <img
                    src={photo.preview_url}
                    alt={photo.filename}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Watermark Badge */}
                <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs font-bold text-white">
                  MUESTRA
                </div>

                {/* Actions Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
                  <div className="flex gap-2 opacity-0 transition-all group-hover:opacity-100">
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(photo.id)}
                      className={`rounded-full p-2 transition-all ${
                        favorites.has(photo.id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-red-100'
                      }`}
                    >
                      <HeartIcon
                        className="h-5 w-5"
                        fill={favorites.has(photo.id) ? 'white' : 'none'}
                      />
                    </button>

                    {/* Select Button */}
                    <button
                      aria-label={selectedPhotos.has(photo.id) ? 'Quitar selección' : 'Seleccionar foto'}
                      tabIndex={0}
                      onClick={() => togglePhotoSelection(photo.id)}
                      className={`rounded-full p-2 transition-all ${
                        selectedPhotos.has(photo.id)
                          ? 'bg-purple-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      {selectedPhotos.has(photo.id) ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <ShoppingCartIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Selected Indicator */}
                {selectedPhotos.has(photo.id) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-purple-500 p-1 text-center text-xs font-bold text-white">
                    SELECCIONADA
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Lazy load trigger */}
        {hasMore && (
          <div
            ref={sentinelRef}
            aria-label="Cargador infinito"
            className="h-10 w-full"
          />
        )}
        {isLoadingMore && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-lg bg-white shadow-sm">
                <div className="aspect-square bg-gray-200" />
                <div className="space-y-2 p-3">
                  <div className="h-3 rounded bg-gray-200" />
                  <div className="h-3 w-2/3 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2">
        <div className="rounded-full bg-white/90 p-2 shadow">
          <select
            aria-label="Seleccionar paquete"
            className="rounded-full border px-3 py-1 text-sm"
            value={pkg}
            onChange={(e) => setPkg(e.target.value)}
          >
            <option value="Combo A">Combo A</option>
            <option value="Combo B">Combo B</option>
            <option value="Solo Digital">Solo Digital</option>
          </select>
        </div>
        {selectedPhotos.size > 0 && !submitted && (
          <button
            aria-label="Enviar selección"
            onClick={handleSend}
            className="flex items-center gap-3 rounded-full bg-purple-600 px-6 py-3 text-white shadow-lg transition-all hover:bg-purple-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            disabled={sending}
          >
            <ShoppingCartIcon className="h-6 w-6" />
            <span className="font-bold">
              {sending ? 'Enviando…' : `Enviar selección (${selectedPhotos.size})`}
            </span>
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="container mx-auto px-4 pb-8">
        <div className="rounded-lg bg-white/80 p-6 backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold text-gray-800">
            Instrucciones:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              • Las fotos muestran una marca de agua "MUESTRA" para protección
            </li>
            <li>• Marca tus fotos favoritas con el ❤️</li>
            <li>• Selecciona las fotos que quieres comprar con el 🛒</li>
            <li>
              • Una vez seleccionadas, procede al carrito para realizar tu
              pedido
            </li>
            <li>
              • Recibirás las fotos originales sin marca de agua después del
              pago
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
