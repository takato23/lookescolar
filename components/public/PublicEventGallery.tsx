'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoModal as PublicPhotoModal } from '@/components/public/PhotoModal';
import { 
  Camera, 
  ShoppingCart, 
  ArrowLeft, 
  Package, 
  Eye,
  Heart,
  Download,
  Share2,
  Calendar,
  MapPin,
  CheckCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemedGalleryWrapper } from '@/components/gallery/ThemedGalleryWrapper';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Event {
  id: string;
  name: string;
  date: string;
  location?: string;
  photo_count: number;
  colecciones: Collection[];
  pricing: {
    event_album_price: number;
    individual_photo_price: number;
    bulk_discount_threshold: number;
    bulk_discount_percent: number;
  };
}

interface Collection {
  id: string;
  name: string;
  photo_count: number;
  album_price: number;
  subcarpetas: Subcarpeta[];
}

interface Subcarpeta {
  id: string;
  name: string;
  photo_count: number;
  individual_price: number;
  album_price: number;
}

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  thumbnail_url: string;
  dimensions: { width: number; height: number };
  file_size: number;
  created_at: string;
}

interface CartItem {
  id: string;
  type: 'individual' | 'album_subcarpeta' | 'album_coleccion' | 'evento_completo';
  name: string;
  price: number;
  photo_count: number;
  photos?: string[]; // Photo IDs for individual photos
}

interface PublicEventGalleryProps {
  eventId: string;
}

export default function PublicEventGallery({ eventId }: PublicEventGalleryProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [currentView, setCurrentView] = useState<'event' | 'collection' | 'subcarpeta'>('event');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedSubcarpeta, setSelectedSubcarpeta] = useState<Subcarpeta | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Load event data
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/public/gallery/event/${eventId}`);
      if (!response.ok) {
        throw new Error('Evento no encontrado');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Error cargando evento');
      }

      setEvent(data.event);
      // Fetch one photo for cover
      try {
        const coverRes = await fetch(`/api/gallery/${eventId}?page=1&limit=1`);
        const coverJson = await coverRes.json();
        const first = coverJson?.data?.photos?.[0] || coverJson?.photos?.[0];
        if (first?.signed_url) setCoverUrl(first.signed_url);
      } catch {}
    } catch (err) {
      console.error('Error loading event:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const loadSubcarpetaPhotos = async (subcarpetaId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/gallery/event/${eventId}/photos?course=${subcarpetaId}`);
      if (!response.ok) throw new Error('Error cargando fotos');

      const data = await response.json();
      if (data.success) {
        setPhotos(data.photos || []);
      }
    } catch (err) {
      console.error('Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      // Remove any conflicting items
      const filtered = prev.filter(existing => {
        if (item.type === 'evento_completo') return false;
        if (existing.type === 'evento_completo') return false;
        if (item.type === 'album_coleccion' && selectedCollection && existing.id === selectedCollection.id) return false;
        if (item.type === 'album_subcarpeta' && selectedSubcarpeta && existing.id === selectedSubcarpeta.id) return false;
        return true;
      });
      
      return [...filtered, item];
    });
    setShowCart(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const addSelectedPhotosToCart = () => {
    if (selectedPhotos.size === 0 || !event) return;

    const selectedPhotosList = Array.from(selectedPhotos);
    let price = selectedPhotosList.length * event.pricing.individual_photo_price;
    
    // Apply bulk discount
    if (selectedPhotosList.length >= event.pricing.bulk_discount_threshold) {
      price = price * (1 - event.pricing.bulk_discount_percent / 100);
    }

    const item: CartItem = {
      id: `individual-${Date.now()}`,
      type: 'individual',
      name: `${selectedPhotosList.length} Foto${selectedPhotosList.length > 1 ? 's' : ''}`,
      price,
      photo_count: selectedPhotosList.length,
      photos: selectedPhotosList,
    };

    addToCart(item);
    setSelectedPhotos(new Set());
  };

  const getTotalCartPrice = () => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  };

  const getTotalCartItems = () => {
    return cart.reduce((sum, item) => sum + item.photo_count, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Camera className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Evento no encontrado'}</p>
          <Button onClick={loadEventData} variant="outline">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const eventTheme = ((event as any)?.theme || 'default') as any;
  const design = (((event as any)?.settings?.design) || {
    grid: { style: 'vertical', thumb: 'regular', spacing: 'regular', nav: 'icons_text' },
  }) as any;
  const gridGapClass = design.grid?.spacing === 'large' ? 'gap-6' : 'gap-4';
  const gridColsClass = design.grid?.thumb === 'large'
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

  return (
    <ThemedGalleryWrapper eventTheme={eventTheme}>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Cover - estilo Pixieset */}
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className={`grid grid-cols-1 gap-6 md:grid-cols-3 ${design?.cover?.style === 'classic' ? 'md:grid-cols-2' : ''}`}>
            <div className={`col-span-1 rounded-xl border p-6 ${design?.cover?.style === 'vintage' ? 'bg-amber-50' : ''} ${design?.cover?.style === 'journal' ? 'bg-slate-50' : ''}`}>
              <div className="text-xs uppercase tracking-wide text-gray-500">{event?.name || 'Colegio'}</div>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">{event?.name}</h1>
              {event?.date && (
                <div className="mt-1 text-sm text-gray-500">
                  {new Date(event.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              )}
              <Button className="mt-4 theme-button">Ver galería</Button>
            </div>
            {design?.cover?.style !== 'none' && (
              <div className={`col-span-2 overflow-hidden ${design?.cover?.style === 'frame' ? 'rounded-2xl border-4 border-gray-200' : 'rounded-xl border'} ${design?.cover?.style === 'stripe' ? 'bg-gradient-to-br from-gray-50 to-white p-4' : ''}`}>
                {coverUrl ? (
                  <img src={coverUrl} alt="Cover" className={`h-full w-full ${design?.cover?.style === 'stripe' ? 'rounded-lg' : ''} max-h-[420px] object-cover`} />
                ) : (
                  <div className="flex h-[280px] w-full items-center justify-center bg-gray-100 text-gray-400">Sin portada</div>
                )}
                {design?.cover?.style === 'divider' && (
                  <div className="mt-3 h-1 w-24 rounded bg-gray-200" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentView !== 'event' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    if (currentView === 'subcarpeta') {
                      setCurrentView('collection');
                      setSelectedSubcarpeta(null);
                      setPhotos([]);
                      setSelectedPhotos(new Set());
                    } else {
                      setCurrentView('event');
                      setSelectedCollection(null);
                    }
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              )}
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString('es-AR')}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    {event.photo_count} foto{event.photo_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Cart Button */}
            <Button
              onClick={() => setShowCart(true)}
              className="relative bg-blue-600 hover:bg-blue-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Carrito
              {cart.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[20px] h-5 text-xs"
                >
                  {getTotalCartItems()}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {currentView === 'event' && (
          <EventView 
            event={event} 
            onSelectCollection={(collection) => {
              setSelectedCollection(collection);
              setCurrentView('collection');
            }}
            onAddToCart={addToCart}
          />
        )}

        {currentView === 'collection' && selectedCollection && (
          <CollectionView 
            collection={selectedCollection}
            event={event}
            onSelectSubcarpeta={(subcarpeta) => {
              setSelectedSubcarpeta(subcarpeta);
              setCurrentView('subcarpeta');
              loadSubcarpetaPhotos(subcarpeta.id);
            }}
            onAddToCart={addToCart}
          />
        )}

        {currentView === 'subcarpeta' && selectedSubcarpeta && (
          <SubcarpetaView
            subcarpeta={selectedSubcarpeta}
            photos={photos}
            selectedPhotos={selectedPhotos}
            onTogglePhoto={togglePhotoSelection}
            onAddToCart={addToCart}
            onAddSelectedToCart={addSelectedPhotosToCart}
            event={event}
            onOpenPhoto={(id) => setLightboxPhotoId(id)}
            gridGapClass={gridGapClass}
            gridColsClass={gridColsClass}
          />
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <CartDrawer
          cart={cart}
          totalPrice={getTotalCartPrice()}
          onClose={() => setShowCart(false)}
          onRemoveItem={removeFromCart}
          eventId={eventId}
        />
      )}

      {/* Lightbox + Buy Photo */}
      {lightboxPhotoId && (
        <PublicPhotoModal
          isOpen={true}
          onClose={() => setLightboxPhotoId(null)}
          photo={(function () {
            const p = photos.find((ph) => ph.id === lightboxPhotoId);
            return p ? { id: p.id, signed_url: (p as any).signed_url || p.preview_url || p.thumbnail_url } : null;
          })()}
          photos={photos.map((p) => ({ id: p.id, signed_url: (p as any).signed_url || p.preview_url || p.thumbnail_url }))}
          price={event?.pricing.individual_photo_price || 1000}
          eventId={eventId}
        />
      )}
    </div>
    </ThemedGalleryWrapper>
  );
}

// Event View Component
function EventView({ 
  event, 
  onSelectCollection, 
  onAddToCart 
}: { 
  event: Event; 
  onSelectCollection: (collection: Collection) => void;
  onAddToCart: (item: CartItem) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Event Album Option */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Álbum Completo del Evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Todas las fotos del evento ({event.photo_count})</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ${(event.pricing.event_album_price / 100).toFixed(2)}
              </p>
              <p className="text-sm text-green-600">¡Mejor precio!</p>
            </div>
            <Button 
              onClick={() => onAddToCart({
                id: 'evento-completo',
                type: 'evento_completo',
                name: 'Álbum Completo del Evento',
                price: event.pricing.event_album_price,
                photo_count: event.photo_count,
              })}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar al Carrito
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Collections */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Colecciones Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {event.colecciones.map((collection) => (
            <Card 
              key={collection.id} 
              className="bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => onSelectCollection(collection)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="group-hover:text-blue-600 transition-colors">
                    {collection.name}
                  </span>
                  <Eye className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-600">
                    {collection.photo_count} foto{collection.photo_count !== 1 ? 's' : ''} • {collection.subcarpetas.length} curso{collection.subcarpetas.length !== 1 ? 's' : ''}
                  </p>
                  <div className="text-sm text-gray-500">
                    {collection.subcarpetas.map(sub => sub.name).join(', ')}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        ${(collection.album_price / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Álbum completo</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart({
                          id: collection.id,
                          type: 'album_coleccion',
                          name: `Álbum ${collection.name}`,
                          price: collection.album_price,
                          photo_count: collection.photo_count,
                        });
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Collection View Component  
function CollectionView({ 
  collection, 
  event,
  onSelectSubcarpeta, 
  onAddToCart 
}: { 
  collection: Collection;
  event: Event;
  onSelectSubcarpeta: (subcarpeta: Subcarpeta) => void;
  onAddToCart: (item: CartItem) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Collection Album Option */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Álbum Completo - {collection.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Todas las fotos del nivel ({collection.photo_count})</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                ${(collection.album_price / 100).toFixed(2)}
              </p>
              <p className="text-sm text-green-600">
                Ahorrás ${(((collection.photo_count * event.pricing.individual_photo_price) - collection.album_price) / 100).toFixed(2)}
              </p>
            </div>
            <Button 
              onClick={() => onAddToCart({
                id: collection.id,
                type: 'album_coleccion',
                name: `Álbum ${collection.name}`,
                price: collection.album_price,
                photo_count: collection.photo_count,
              })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar al Carrito
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subcarpetas */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Cursos Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collection.subcarpetas.map((subcarpeta) => (
            <Card 
              key={subcarpeta.id} 
              className="bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => onSelectSubcarpeta(subcarpeta)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="group-hover:text-blue-600 transition-colors">
                    {subcarpeta.name}
                  </span>
                  <Eye className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-600">
                    {subcarpeta.photo_count} foto{subcarpeta.photo_count !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        ${(subcarpeta.album_price / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Álbum completo</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart({
                          id: subcarpeta.id,
                          type: 'album_subcarpeta',
                          name: `Álbum ${subcarpeta.name}`,
                          price: subcarpeta.album_price,
                          photo_count: subcarpeta.photo_count,
                        });
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Subcarpeta View Component
function SubcarpetaView({ 
  subcarpeta, 
  photos, 
  selectedPhotos, 
  onTogglePhoto, 
  onAddToCart, 
  onAddSelectedToCart,
  event,
  onOpenPhoto,
  gridGapClass,
  gridColsClass,
}: { 
  subcarpeta: Subcarpeta;
  photos: Photo[];
  selectedPhotos: Set<string>;
  onTogglePhoto: (photoId: string) => void;
  onAddToCart: (item: CartItem) => void;
  onAddSelectedToCart: () => void;
  event: Event;
  onOpenPhoto: (photoId: string) => void;
  gridGapClass: string;
  gridColsClass: string;
}) {
  const selectedCount = selectedPhotos.size;
  const selectedPrice = selectedCount * event.pricing.individual_photo_price;
  const discountedPrice = selectedCount >= event.pricing.bulk_discount_threshold 
    ? selectedPrice * (1 - event.pricing.bulk_discount_percent / 100)
    : selectedPrice;

  return (
    <div className="space-y-8">
      {/* Subcarpeta Album Option */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Álbum Completo - {subcarpeta.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Todas las fotos del curso ({subcarpeta.photo_count})</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                ${(subcarpeta.album_price / 100).toFixed(2)}
              </p>
              <p className="text-sm text-green-600">
                Ahorrás ${(((subcarpeta.photo_count * event.pricing.individual_photo_price) - subcarpeta.album_price) / 100).toFixed(2)}
              </p>
            </div>
            <Button 
              onClick={() => onAddToCart({
                id: subcarpeta.id,
                type: 'album_subcarpeta',
                name: `Álbum ${subcarpeta.name}`,
                price: subcarpeta.album_price,
                photo_count: subcarpeta.photo_count,
              })}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar al Carrito
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selection Bar */}
      {selectedCount > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">
                  {selectedCount} foto{selectedCount !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  ${(discountedPrice / 100).toFixed(2)}
                  {selectedCount >= event.pricing.bulk_discount_threshold && (
                    <span className="text-green-600 ml-2">
                      (¡{event.pricing.bulk_discount_percent}% descuento aplicado!)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedPhotos.forEach(id => onTogglePhoto(id))}
                >
                  Limpiar
                </Button>
                <Button 
                  onClick={onAddSelectedToCart}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar al Carrito
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Fotos Individuales 
          <span className="text-sm font-normal text-gray-600 ml-2">
            (${(event.pricing.individual_photo_price / 100).toFixed(2)} c/u)
          </span>
        </h2>
        
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay fotos disponibles</p>
          </div>
        ) : (
          <div className={`grid ${gridColsClass} ${gridGapClass}`}>
            {photos.map((photo) => {
              const isSelected = selectedPhotos.has(photo.id);
              return (
                <div
                  key={photo.id}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-4 ring-blue-500 ring-offset-2' 
                      : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
                  }`}
                  onClick={() => onTogglePhoto(photo.id)}
                  onDoubleClick={() => onOpenPhoto(photo.id)}
                >
                  <img
                    src={photo.thumbnail_url}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Selection Overlay */}
                  <div className={`absolute inset-0 transition-all ${
                    isSelected 
                      ? 'bg-blue-600/20' 
                      : 'bg-black/0 hover:bg-black/10'
                  }`}>
                    <div className="absolute top-2 right-2">
                      {isSelected ? (
                        <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 bg-white rounded-full" />
                      ) : (
                        <div className="h-6 w-6 border-2 border-white rounded-full bg-black/20" />
                      )}
                    </div>
                  </div>
                  
                  {/* Photo Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-medium truncate">
                      {photo.filename}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Cart Drawer Component
function CartDrawer({ 
  cart, 
  totalPrice, 
  onClose, 
  onRemoveItem, 
  eventId 
}: { 
  cart: CartItem[];
  totalPrice: number;
  onClose: () => void;
  onRemoveItem: (itemId: string) => void;
  eventId: string;
}) {
  const router = useRouter();

  const handleCheckout = async () => {
    try {
      // Generate event token for access to unified store
      const response = await fetch(`/api/admin/events/${eventId}/tokens/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiry_days: 1 }) // Short expiry for public access
      });

      if (!response.ok) {
        throw new Error('Error generando acceso a la tienda');
      }

      const data = await response.json();
      const token = data.token;

      // Navigate to unified store with cart data and token
      const cartData = encodeURIComponent(JSON.stringify(cart));
      router.push(`/store-unified/${token}?cart=${cartData}&source=gallery`);
    } catch (error) {
      console.error('Error accessing store:', error);
      // Fallback: try to create a simple public token  
      router.push(`/store-unified/public_${eventId}_${Date.now()}?cart=${encodeURIComponent(JSON.stringify(cart))}&source=gallery`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Mi Carrito</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>
        
        <div className="p-6">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {item.photo_count} foto{item.photo_count !== 1 ? 's' : ''}
                      </p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        ${(item.price / 100).toFixed(2)}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Quitar
                    </Button>
                  </div>
                </Card>
              ))}
              
              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>${(totalPrice / 100).toFixed(2)}</span>
                </div>
                <Button 
                  onClick={handleCheckout}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700"
                  disabled={cart.length === 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Proceder al Checkout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
