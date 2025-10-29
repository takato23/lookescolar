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
import { ThemeToggleSimple } from '@/components/ui/theme-toggle-enhanced';
import { StoreErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useUnifiedStore } from '@/lib/stores/unified-store';
import type { StoreSettings } from '@/lib/hooks/useStoreSettings';
import type { AdditionalCopy, ProductOption } from '@/lib/types/unified-store';
import {
  fetchStoreAssetsPage,
  getUnifiedStoreData,
  type NormalizedCatalog,
  type UnifiedStoreData,
  type UnifiedStorePhoto,
  type UnifiedStorePagination,
} from '@/lib/services/unified-store-data';

interface CatalogForStore {
  packages: ProductOption[];
  additionalCopies: AdditionalCopy[];
  pricing: {
    currency: string;
    shippingCost: number;
    freeShippingThreshold: number;
    taxIncluded?: boolean;
  };
}

function buildCatalogFromSettings(settings: StoreSettings | null): CatalogForStore {
  if (!settings) {
    return {
      packages: [],
      additionalCopies: [],
      pricing: {
        currency: 'ARS',
        shippingCost: 0,
        freeShippingThreshold: 0,
        taxIncluded: true,
      },
    };
  }

  const packages: ProductOption[] = [];
  const additionalCopies: AdditionalCopy[] = [];

  Object.entries(settings.products ?? {}).forEach(([id, product]) => {
    if (!product || product.enabled === false) return;
    const normalizedType = (product.type ?? 'package').toLowerCase();

    if (normalizedType === 'package') {
      packages.push({
        id,
        name: product.name ?? id,
        description: product.description ?? '',
        basePrice: product.basePrice ?? product.price ?? 0,
        price: product.price ?? product.basePrice ?? 0,
        type: 'package',
        enabled: true,
        highlight: Boolean((product as any).highlight),
        order: (product as any).order,
        contents: (product.features as ProductOption['contents']) ?? {},
        features: product.features ?? {},
      } as ProductOption);
    } else if (normalizedType === 'additional-copy' || normalizedType === 'additional_copy') {
      additionalCopies.push({
        id,
        name: product.name ?? id,
        size:
          ((product as any).size as string | undefined) ??
          (product.features?.size as string | undefined) ??
          '',
        price: product.price ?? 0,
        isSet: Boolean(product.setQuantity && product.setQuantity > 1),
        setQuantity: product.setQuantity,
        description: product.description,
      });
    }
  });

  return {
    packages,
    additionalCopies,
    pricing: {
      currency: settings.currency ?? 'ARS',
      shippingCost: 0,
      freeShippingThreshold: 0,
      taxIncluded: true,
    },
  };
}

export default function UnifiedStorePage() {
  const params = useParams();
  const token = params.token as string;
  const setTokenInStore = useUnifiedStore((state) => state.setToken);
  const setEventInfoInStore = useUnifiedStore((state) => state.setEventInfo);
  const setCatalogInStore = useUnifiedStore((state) => state.setCatalog);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<UnifiedStoreData['rawStoreResponse'] | null>(null);
  const [photos, setPhotos] = useState<UnifiedStorePhoto[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [catalog, setCatalog] = useState<NormalizedCatalog | null>(null);

  // Estado para paginación
  const [photosPerPage] = useState(20); // Carga inicial reducida
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [pagination, setPagination] = useState<UnifiedStorePagination | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (token) {
      setTokenInStore(token);
    }
  }, [token, setTokenInStore]);

  useEffect(() => {
    fetchStoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchPhotos = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setLoadingMore(true);
        const offset = (page - 1) * photosPerPage;
        const { photos: mappedPhotos, pagination: pageInfo } =
          await fetchStoreAssetsPage(token, {
            limit: photosPerPage,
            offset,
          });

        setPagination(pageInfo);
        setTotalPhotos((prev) => pageInfo?.total ?? (append ? prev + mappedPhotos.length : mappedPhotos.length));
        setPhotos((prev) => (append ? [...prev, ...mappedPhotos] : mappedPhotos));
      } catch (error) {
        console.error('[StoreUnified] Error al cargar fotos:', error);
        setError('Error al cargar las fotos. Intente recargar la página.');
      } finally {
        setLoadingMore(false);
      }
    },
    [token, photosPerPage]
  );

  // Cargar más fotos al hacer scroll
  const loadMorePhotos = useCallback(() => {
    if (!loadingMore && (pagination?.hasMore ?? false)) {
      const nextPage = (pagination?.page ?? 1) + 1;
      fetchPhotos(nextPage, true);
    }
  }, [loadingMore, pagination, fetchPhotos]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const result = await getUnifiedStoreData(token, {
        limit: photosPerPage,
        includeAssets: true,
      });

      const _catalog = result.catalog;
      setStoreData(result.rawStoreResponse);
      setPhotos(result.photos);
      setPagination(result.pagination);
      setTotalPhotos(result.pagination?.total ?? result.photos.length);

      const heroTitle =
        result.rawStoreResponse?.store?.name ||
        result.event?.name ||
        result.settings.texts.hero_title ||
        'Galería Fotográfica';

      const finalSettings: StoreSettings = {
        ...result.settings,
        template: 'pixieset',
        texts: {
          ...result.settings.texts,
          hero_title: heroTitle,
          hero_subtitle:
            result.settings.texts.hero_subtitle || 'Galería Fotográfica Escolar',
        },
      };

      setSettings(finalSettings);
      setCatalogInStore(buildCatalogFromSettings(result.settings));
      setEventInfoInStore({
        name: heroTitle,
        schoolName: result.rawStoreResponse?.event?.school_name ?? '',
        gradeSection: result.subject?.course ?? '',
      });
      setError(null);
    } catch (error) {
      console.error('Error loading store:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
            hasMorePhotos={Boolean(pagination?.hasMore)}
            loadingMore={loadingMore}
          />
        </Suspense>
      </div>
    </StoreErrorBoundary>
  );
}
