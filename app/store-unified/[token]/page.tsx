'use client';

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useParams } from 'next/navigation';

// Lazy loading de componentes para bundle splitting
const PixiesetFlowTemplate = lazy(() => import('@/components/store/templates/PixiesetFlowTemplate').then(module => ({ default: module.PixiesetFlowTemplate })));

// Componente de loading optimizado para Suspense
const StoreLoadingFallback = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Cargando tienda...</p>
    </div>
  </div>
);
import { mergeWithGuaranteedSettings } from '@/lib/services/store-initialization.service';
import { ThemeToggleSimple } from '@/components/ui/theme-toggle-enhanced';
import { useTheme } from '@/components/providers/theme-provider';
import { StoreErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useUnifiedStore } from '@/lib/stores/unified-store';

interface Photo {
  id: string;
  url: string;
  preview_url?: string | null;
  alt: string;
  download_url?: string | null;
  type?: string | null;
}

interface StoreData {
  store?: {
    name: string;
  };
  event?: {
    name: string;
    school_name?: string;
  };
  assets?: any[];
  subject?: {
    name: string;
    course?: string;
  };
}

function normalizeCatalog(rawCatalog: any | null) {
  if (!rawCatalog) return null;

  const items = Array.isArray(rawCatalog.items)
    ? [...rawCatalog.items].sort((a, b) => {
        const orderA =
          typeof a.sortOrder === 'number'
            ? a.sortOrder
            : typeof a.sort_order === 'number'
              ? a.sort_order
              : 0;
        const orderB =
          typeof b.sortOrder === 'number'
            ? b.sortOrder
            : typeof b.sort_order === 'number'
              ? b.sort_order
              : 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        const labelA = (a.label ?? a.name ?? '').toString();
        const labelB = (b.label ?? b.name ?? '').toString();
        return labelA.localeCompare(labelB);
      })
    : [];

  const overrides = Array.isArray(rawCatalog.overrides)
    ? [...rawCatalog.overrides].sort((a, b) => {
        const keyA = `${a.productId ?? a.product_id ?? ''}::${
          a.comboId ?? a.combo_id ?? ''
        }`;
        const keyB = `${b.productId ?? b.product_id ?? ''}::${
          b.comboId ?? b.combo_id ?? ''
        }`;
        return keyA.localeCompare(keyB);
      })
    : [];

  return {
    ...rawCatalog,
    items,
    overrides,
  };
}

export default function UnifiedStorePage() {
  const params = useParams();
  const token = params.token as string;
  const { resolvedTheme } = useTheme();
  const setTokenInStore = useUnifiedStore((state) => state.setToken);
  const setEventInfoInStore = useUnifiedStore((state) => state.setEventInfo);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);

  // Estado para paginación
  const [photosPerPage] = useState(20); // Carga inicial reducida
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (token) {
      setTokenInStore(token);
    }
  }, [token, setTokenInStore]);

  useEffect(() => {
    fetchStoreData();
  }, [token]);

  const fetchPhotos = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setLoadingMore(true);
      const response = await fetch(`/api/store/${token}?include_assets=true&limit=${photosPerPage}&offset=${(page - 1) * photosPerPage}`);

      if (!response.ok) throw new Error('Error al cargar fotos');

      const data = await response.json();
      const gallery = data.gallery as {
        items?: any[];
        pagination?: { total: number };
      } | undefined;

      const rawAssets = (gallery?.items || data.assets || []) as any[];
      const mappedPhotos: Photo[] = rawAssets.map((asset) => ({
        id: asset.id,
        url:
          asset.previewUrl ??
          asset.preview_url ??
          asset.watermark_url ??
          asset.signedUrl ??
          asset.download_url ??
          '/placeholder-image.svg',
        preview_url:
          asset.previewUrl ?? asset.preview_url ?? asset.watermark_url ?? null,
        alt: asset.filename || 'Foto',
        download_url: asset.downloadUrl ?? asset.download_url ?? null,
        type: asset.type ?? asset.photo_type ?? null,
      }));

      const total = gallery?.pagination?.total ?? data.pagination?.total ?? mappedPhotos.length;

      setTotalPhotos(total);
      setAllPhotos((prev) => (append ? [...prev, ...mappedPhotos] : mappedPhotos));
      setPhotos(mappedPhotos);
    } catch (error) {
      console.error('[StoreUnified] Error al cargar fotos:', error);
      setError('Error al cargar las fotos. Intente recargar la página.');
    } finally {
      setLoadingMore(false);
    }
  }, [token, photosPerPage]);

  // Cargar más fotos al hacer scroll
  const loadMorePhotos = useCallback(() => {
    if (!loadingMore && allPhotos.length < totalPhotos) {
      const nextPage = Math.floor(allPhotos.length / photosPerPage) + 1;
      fetchPhotos(nextPage, true);
    }
  }, [loadingMore, allPhotos.length, totalPhotos, photosPerPage, fetchPhotos]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);

      // Cargar configuración pública de la tienda (con precios reales)
      const configResponse = await fetch('/api/public/store/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      let mergedSettings = mergeWithGuaranteedSettings(null);
      let normalizedCatalog: any = null;

      if (configResponse.ok) {
        const configData = await configResponse.json();
        if (configData.success && configData.settings) {
          mergedSettings = mergeWithGuaranteedSettings(configData.settings);
        }
        normalizedCatalog = normalizeCatalog(configData.catalog ?? null);
        setCatalog(normalizedCatalog);
      } else {
        setCatalog(null);
      }

      // Cargar primera página de fotos con paginación
      await fetchPhotos(1, false);

      // Cargar datos de la tienda (sin assets para evitar duplicación)
      const storeResponse = await fetch(`/api/store/${token}?include_assets=false`);
      if (!storeResponse.ok) {
        throw new Error('Error al cargar la tienda');
      }

      const data = await storeResponse.json();
      setStoreData(data);

      const heroTitle =
        data.store?.name ||
        data.event?.name ||
        mergedSettings.texts?.hero_title ||
        'Galería Fotográfica';

      const finalSettings = {
        ...mergedSettings,
        template: 'pixieset' as const,
        texts: {
          ...mergedSettings.texts,
          hero_title: heroTitle,
          hero_subtitle:
            mergedSettings.texts?.hero_subtitle ||
            'Galería Fotográfica Escolar',
        },
      };

      setSettings(finalSettings);
      setEventInfoInStore({
        name: heroTitle,
        schoolName: data.event?.school_name ?? '',
        gradeSection: data.subject?.course ?? '',
      });

    } catch (error) {
      console.error('Error loading store:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="absolute top-4 right-4">
            <ThemeToggleSimple />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
          <p className="text-destructive mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!settings || photos.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-300">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="absolute top-4 right-4">
            <ThemeToggleSimple />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Galería no disponible</h1>
          <p className="text-muted-foreground">No se encontraron fotos en esta galería.</p>
        </div>
      </div>
    );
  }

  return (
    <StoreErrorBoundary>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Theme Toggle - Fixed position for all states */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggleSimple />
        </div>

        <Suspense fallback={<StoreLoadingFallback />}>
          <PixiesetFlowTemplate
            settings={settings}
            photos={photos}
            token={token}
            subject={storeData?.subject}
            totalPhotos={totalPhotos}
            isPreselected={false}
            onLoadMorePhotos={loadMorePhotos}
            hasMorePhotos={allPhotos.length < totalPhotos}
            loadingMore={loadingMore}
          />
        </Suspense>
      </div>
    </StoreErrorBoundary>
  );
}
