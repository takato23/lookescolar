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
  description = 'Selecciona las fotos que te gusten'
}: UnifiedGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { items, addItem, removeItem, updateQuantity, clearCart } = useCartStore();

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
      quantity: 1
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Moderno */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                {description}
              </p>
            </div>
            
            {/* Carrito flotante mejorado */}
            {mode === 'store' && (
              <div className="relative group">
                <Button
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-semibold text-lg"
                >
                  <ShoppingCart className="w-6 h-6 mr-3" />
                  <span className="mr-2">Carrito</span>
                  <Badge className="bg-white/20 text-white border-0 px-3 py-1 text-base">
                    {items.length}
                  </Badge>
                  {items.length > 0 && (
                    <div className="ml-3 pl-3 border-l border-white/30">
                      <span className="text-sm opacity-90">Total</span>
                      <div className="font-bold text-lg">
                        ${items.reduce((total, item) => total + (item.price * item.quantity), 0) / 100}
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
      <div className="max-w-7xl mx-auto px-6 py-12">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
              <Eye className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">No hay fotos disponibles</h3>
            <p className="text-gray-500 text-lg">Las fotos aparecerán aquí cuando estén listas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {photos.map((photo) => {
              const cartItem = items.find(item => item.photoId === photo.id);
              const isInCart = !!cartItem;

              return (
                <Card key={photo.id} className="group bg-white/70 backdrop-blur-sm hover:bg-white hover:shadow-2xl transition-all duration-500 overflow-hidden rounded-3xl border-0 shadow-lg hover:scale-105">
                  <CardContent className="p-0">
                    {/* Imagen con overlay mejorado */}
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={photo.preview_url}
                        alt={photo.filename}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      
                      {/* Overlay con acciones mejorado */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/95 hover:bg-white text-gray-900 rounded-full px-4 py-2 shadow-lg"
                            onClick={() => window.open(photo.preview_url, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver
                          </Button>
                          
                          {mode === 'store' && !isInCart && (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-4 py-2 shadow-lg"
                              onClick={() => handleAddToCart(photo)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Información de la foto mejorada */}
                    <div className="p-6">
                      <h3 className="font-semibold text-gray-900 text-lg mb-3 line-clamp-2 leading-tight">
                        {photo.filename.replace(/\.[^/.]+$/, '')}
                      </h3>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span className="bg-gray-100 px-3 py-1 rounded-full">
                          {Math.round(photo.size / 1024)} KB
                        </span>
                        <span className="bg-blue-100 px-3 py-1 rounded-full text-blue-700">
                          {photo.width} × {photo.height}
                        </span>
                      </div>

                      {/* Controles del carrito mejorados */}
                      {mode === 'store' && (
                        <div className="space-y-3">
                          {isInCart ? (
                            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full w-10 h-10 p-0 hover:bg-blue-600 hover:text-white transition-colors"
                                  onClick={() => handleUpdateQuantity(photo.id, (cartItem?.quantity || 1) - 1)}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                
                                <span className="min-w-[2rem] text-center font-bold text-lg text-blue-700">
                                  {cartItem?.quantity || 1}
                                </span>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full w-10 h-10 p-0 hover:bg-blue-600 hover:text-white transition-colors"
                                  onClick={() => handleUpdateQuantity(photo.id, (cartItem?.quantity || 1) + 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="destructive"
                                className="rounded-full w-10 h-10 p-0 hover:bg-red-600"
                                onClick={() => handleRemoveFromCart(photo.id)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="lg"
                              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl py-3 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                              onClick={() => handleAddToCart(photo)}
                            >
                              <Plus className="w-5 h-5 mr-2" />
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
