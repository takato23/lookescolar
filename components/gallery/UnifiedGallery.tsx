'use client';

import React, { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, Eye } from 'lucide-react';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface UnifiedGalleryProps {
  mode: 'public' | 'private' | 'store';
  eventId?: string;
  folderToken?: string;
  storeToken?: string;
  title?: string;
  description?: string;
}

export default function UnifiedGallery({
  mode,
  eventId,
  folderToken,
  storeToken,
  title = 'Galería de Fotos',
  description = 'Selecciona las fotos que te gusten',
}: UnifiedGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { items, addItem, removeItem, updateQuantity, clearCart } =
    useCartStore();

  // Determinar la URL de la API basada en el modo
  const getApiUrl = () => {
    switch (mode) {
      case 'public':
        return `/api/public/gallery/event/${eventId}/photos`;
      case 'private':
        return `/api/private/gallery/folder/${folderToken}/photos`;
      case 'store':
        return `/api/store/${storeToken}/photos`;
      default:
        return '';
    }
  };

  // Cargar fotos
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl());

        if (!response.ok) {
          throw new Error('Error cargando fotos');
        }

        const data = await response.json();
        setPhotos(data.photos || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (getApiUrl()) {
      loadPhotos();
    }
  }, [mode, eventId, folderToken, storeToken]);

  // Agregar al carrito
  const handleAddToCart = (photo: Photo) => {
    addItem({
      photoId: photo.id,
      filename: photo.filename,
      previewUrl: photo.preview_url,
      price: mode === 'store' ? 1500 : 0, // Solo precio en modo store
      quantity: 1,
    });
  };

  // Remover del carrito
  const handleRemoveFromCart = (photoId: string) => {
    removeItem(photoId);
  };

  // Actualizar cantidad
  const handleUpdateQuantity = (photoId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(photoId);
    } else {
      updateQuantity(photoId, quantity);
    }
  };

  // Ir al checkout (solo en modo store)
  const handleCheckout = () => {
    if (mode === 'store' && storeToken) {
      window.location.href = `/store/${storeToken}/checkout`;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-32 w-32 animate-spin rounded-full border-b-2"></div>
          <p className="mt-4 text-lg">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-red-600">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Moderno */}
      <div className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 shadow-lg backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-3">
              <h1 className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-4xl font-bold text-transparent lg:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-gray-600">
                {description}
              </p>
            </div>

            {/* Carrito flotante mejorado */}
            {mode === 'store' && (
              <div className="group relative">
                <Button
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className="transform rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl"
                >
                  <ShoppingCart className="mr-3 h-6 w-6" />
                  <span className="mr-2">Carrito</span>
                  <Badge className="border-0 bg-white/20 px-3 py-1 text-base text-white">
                    {items.length}
                  </Badge>
                  {items.length > 0 && (
                    <div className="ml-3 border-l border-white/30 pl-3">
                      <span className="text-sm opacity-90">Total</span>
                      <div className="text-lg font-bold">
                        $
                        {items.reduce(
                          (total, item) => total + item.price * item.quantity,
                          0
                        ) / 100}
                      </div>
                    </div>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid de fotos mejorado */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {photos.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-indigo-100">
              <Eye className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold text-gray-700">
              No hay fotos disponibles
            </h3>
            <p className="text-lg text-gray-500">
              Las fotos aparecerán aquí cuando estén listas
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => {
              const cartItem = items.find((item) => item.photoId === photo.id);
              const isInCart = !!cartItem;

              return (
                <Card
                  key={photo.id}
                  className="group overflow-hidden rounded-3xl border-0 bg-white/70 shadow-lg backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:bg-white hover:shadow-2xl"
                >
                  <CardContent className="p-0">
                    {/* Imagen con overlay mejorado */}
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={photo.preview_url}
                        alt={photo.filename}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      />

                      {/* Overlay con acciones mejorado */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100">
                        <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full bg-white/95 px-4 py-2 text-gray-900 shadow-lg hover:bg-white"
                            onClick={() =>
                              window.open(photo.preview_url, '_blank')
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Button>

                          {mode === 'store' && !isInCart && (
                            <Button
                              size="sm"
                              className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700"
                              onClick={() => handleAddToCart(photo)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Agregar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Información de la foto mejorada */}
                    <div className="p-6">
                      <h3 className="mb-3 line-clamp-2 text-lg font-semibold leading-tight text-gray-900">
                        {photo.filename.replace(/\.[^/.]+$/, '')}
                      </h3>

                      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
                        <span className="rounded-full bg-gray-100 px-3 py-1">
                          {Math.round(photo.size / 1024)} KB
                        </span>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                          {photo.width} × {photo.height}
                        </span>
                      </div>

                      {/* Controles del carrito mejorados */}
                      {mode === 'store' && (
                        <div className="space-y-3">
                          {isInCart ? (
                            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                              <div className="flex items-center gap-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-10 w-10 rounded-full p-0 transition-colors hover:bg-blue-600 hover:text-white"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      photo.id,
                                      (cartItem?.quantity || 1) - 1
                                    )
                                  }
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>

                                <span className="min-w-[2rem] text-center text-lg font-bold text-blue-700">
                                  {cartItem?.quantity || 1}
                                </span>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-10 w-10 rounded-full p-0 transition-colors hover:bg-blue-600 hover:text-white"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      photo.id,
                                      (cartItem?.quantity || 1) + 1
                                    )
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>

                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-10 w-10 rounded-full p-0 hover:bg-red-600"
                                onClick={() => handleRemoveFromCart(photo.id)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="lg"
                              className="w-full transform rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                              onClick={() => handleAddToCart(photo)}
                            >
                              <Plus className="mr-2 h-5 w-5" />
                              Agregar al Carrito
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
