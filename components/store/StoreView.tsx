'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Download,
  Eye,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Heart,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Asset {
  id: string;
  filename: string;
  preview_url?: string;
  watermark_url?: string;
  file_size?: number;
  created_at: string;
}

interface Store {
  name: string;
  view_count: number;
  settings: {
    allow_download?: boolean;
    watermark_enabled?: boolean;
    store_title?: string;
    store_description?: string;
    contact_info?: string;
  };
  asset_count: number;
}

interface Event {
  id: string;
  name: string;
  date?: string;
}

interface StoreViewProps {
  token: string;
  store: Store;
  event: Event;
  initialAssets: Asset[];
}

export default function StoreView({
  token,
  store,
  event,
  initialAssets,
}: StoreViewProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialAssets.length >= 20);
  const [offset, setOffset] = useState(initialAssets.length);

  // Cargar más assets
  const loadMoreAssets = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/store/${token}?offset=${offset}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        const newAssets = data.assets || [];

        setAssets((prev) => [...prev, ...newAssets]);
        setOffset((prev) => prev + newAssets.length);
        setHasMore(data.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error('Error loading more assets:', error);
      toast.error('Error cargando más fotos');
    } finally {
      setLoading(false);
    }
  };

  // Manejar selección de asset
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(assetId)) {
        newSelection.delete(assetId);
      } else {
        newSelection.add(assetId);
      }
      return newSelection;
    });
  };

  // Obtener URL de imagen
  const getImageUrl = (asset: Asset): string => {
    if (store.settings.watermark_enabled && asset.watermark_url) {
      return asset.watermark_url;
    }
    return (
      asset.preview_url ||
      `/admin/previews/${asset.filename.replace(/\.[^/.]+$/, '')}_preview.webp`
    );
  };

  // Compartir tienda
  const shareStore = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${store.name} - ${event.name}`,
          text: `Mira las fotos de ${event.name}`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback a clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Enlace copiado al portapapeles');
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  // Iniciar proceso de compra (placeholder)
  const startPurchase = () => {
    if (selectedAssets.size === 0) {
      toast.error('Selecciona al menos una foto para comprar');
      return;
    }

    toast.info('Sistema de compras próximamente disponible');
    // TODO: Implementar integración con MercadoPago
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {store.settings.store_title || store.name}
              </h1>
              <p className="mt-1 text-lg text-gray-600">{event.name}</p>
              {event.date && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.date).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              )}
              {store.settings.store_description && (
                <p className="mt-2 text-gray-600">
                  {store.settings.store_description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {store.view_count} vistas
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {store.asset_count} fotos
              </Badge>
              <Button variant="outline" size="sm" onClick={shareStore}>
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de selección */}
      {selectedAssets.size > 0 && (
        <div className="bg-blue-600 text-white">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedAssets.size} foto{selectedAssets.size > 1 ? 's' : ''}{' '}
                seleccionada{selectedAssets.size > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={() => setSelectedAssets(new Set())}
                >
                  Limpiar selección
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={startPurchase}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Comprar Seleccionadas
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de fotos */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {assets.length === 0 ? (
          <div className="py-12 text-center">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No hay fotos disponibles
            </h3>
            <p className="text-gray-500">
              Esta tienda aún no tiene fotos publicadas.
            </p>
          </div>
        ) : (
          <>
            {/* Grid responsive */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  imageUrl={getImageUrl(asset)}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelect={() => toggleAssetSelection(asset.id)}
                  allowDownload={store.settings.allow_download}
                />
              ))}
            </div>

            {/* Botón cargar más */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={loadMoreAssets}
                  disabled={loading}
                  className="min-w-[200px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Cargar más fotos'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            {store.settings.contact_info && (
              <p className="mb-2">{store.settings.contact_info}</p>
            )}
            <p>Powered by LookEscolar</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componente para cada foto
interface AssetCardProps {
  asset: Asset;
  imageUrl: string;
  isSelected: boolean;
  onSelect: () => void;
  allowDownload?: boolean;
}

function AssetCard({
  asset,
  imageUrl,
  isSelected,
  onSelect,
  allowDownload,
}: AssetCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <Card
      className={`group cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'shadow-lg ring-2 ring-blue-500' : ''
      }`}
    >
      <CardContent className="relative p-0">
        <div className="relative aspect-square overflow-hidden rounded-lg">
          {/* Loading state */}
          {imageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {/* Error state */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}

          {/* Image */}
          {!imageError && (
            <img
              src={imageUrl}
              alt={asset.filename}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          )}

          {/* Overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-20"
            onClick={onSelect}
          >
            {/* Selection indicator */}
            <div
              className={`absolute right-2 top-2 h-6 w-6 rounded-full border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-white bg-black bg-opacity-20 group-hover:bg-opacity-40'
              }`}
            >
              {isSelected && (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}
            </div>

            {/* Download button */}
            {allowDownload && (
              <Button
                variant="secondary"
                size="sm"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implementar descarga
                  toast.info('Descarga próximamente disponible');
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
