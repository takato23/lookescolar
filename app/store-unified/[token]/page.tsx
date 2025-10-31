'use client';

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useParams } from 'next/navigation';

// Lazy loading de componentes para bundle splitting
// Use direct import + dynamic to avoid Vercel alias resolution issues
const PixiesetFlowTemplate = lazy(
  () => import('@/components/store/templates/PixiesetFlowTemplate')
);

// Componente de loading optimizado para Suspense
const StoreLoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors duration-300">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
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

function buildCatalogFromSettings(
  settings: StoreSettings | null
): CatalogForStore {
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
    const productAny = product as any; // Cast to access additional properties

    if (normalizedType === 'package') {
      packages.push({
        id,
        name: product.name ?? id,
        description: product.description ?? '',
        basePrice: productAny.basePrice ?? product.price ?? 0,
        price: product.price ?? productAny.basePrice ?? 0,
        type: 'package',
        enabled: true,
        highlight: Boolean(productAny.highlight),
        order: productAny.order,
        contents: (product.features as ProductOption['contents']) ?? {},
        features: product.features ?? {},
      } as ProductOption);
    } else if (
      normalizedType === 'additional-copy' ||
      normalizedType === 'additional_copy'
    ) {
      additionalCopies.push({
        id,
        name: product.name ?? id,
        size:
          (productAny.size as string | undefined) ??
          (product.features?.size as string | undefined) ??
          '',
        price: product.price ?? 0,
        isSet: Boolean(productAny.setQuantity && productAny.setQuantity > 1),
        setQuantity: productAny.setQuantity,
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
  const [storeData, setStoreData] = useState<
    UnifiedStoreData['rawStoreResponse'] | null
  >(null);
  const [photos, setPhotos] = useState<UnifiedStorePhoto[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [_catalog, _setCatalog] = useState<NormalizedCatalog | null>(null);

  // Estado para paginación
  const [photosPerPage] = useState(20); // Carga inicial reducida
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [pagination, setPagination] = useState<UnifiedStorePagination | null>(
    null
  );
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
        setTotalPhotos(
          (prev) =>
            pageInfo?.total ??
            (append ? prev + mappedPhotos.length : mappedPhotos.length)
        );
        setPhotos((prev) =>
          append ? [...prev, ...mappedPhotos] : mappedPhotos
        );
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

      const [_catalogValue] = [result.catalog];
      setStoreData(result.rawStoreResponse);
      setPhotos(result.photos);
      setPagination(result.pagination);
      setTotalPhotos(result.pagination?.total ?? result.photos.length);

      const heroTitle =
        result.rawStoreResponse?.store?.name ||
        result.event?.name ||
        result.settings.texts?.hero_title ||
        'Galería Fotográfica';

      // Convert SafeStoreSettings to StoreSettings
      // We'll use a type assertion since SafeStoreSettings is compatible
      const finalSettings = {
        ...result.settings,
        template: 'pixieset' as const,
        texts: {
          hero_title: heroTitle,
          hero_subtitle:
            result.settings.texts?.hero_subtitle ||
            'Galería Fotográfica Escolar',
          footer_text: result.settings.texts?.footer_text ?? '',
          contact_email: result.settings.texts?.contact_email ?? '',
          contact_phone: result.settings.texts?.contact_phone ?? '',
          terms_url: result.settings.texts?.terms_url ?? '',
          privacy_url: result.settings.texts?.privacy_url ?? '',
        },
        colors: result.settings.colors ?? {
          primary: '#1f2937',
          secondary: '#6b7280',
          accent: '#3b82f6',
          background: '#f9fafb',
          surface: '#ffffff',
          text: '#111827',
          text_secondary: '#6b7280',
        },
        payment_methods: result.settings.payment_methods ?? {},
        logo_url: result.settings.logo_url ?? '',
        banner_url: result.settings.banner_url ?? '',
      } as StoreSettings;

      setSettings(finalSettings);
      setCatalogInStore(buildCatalogFromSettings(finalSettings));
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
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors duration-300">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors duration-300">
        <div className="mx-auto max-w-md p-6 text-center">
          <div className="absolute right-4 top-4">
            <ThemeToggleSimple />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-foreground">Error</h1>
          <p className="mb-6 text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!settings || photos.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors duration-300">
        <div className="mx-auto max-w-md p-6 text-center">
          <div className="absolute right-4 top-4">
            <ThemeToggleSimple />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-foreground">
            Galería no disponible
          </h1>
          <p className="text-muted-foreground">
            No se encontraron fotos en esta galería.
          </p>
        </div>
      </div>
    );
  }

  return (
    <StoreErrorBoundary>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Theme Toggle - Fixed position for all states */}
        <div className="fixed right-4 top-4 z-50">
          <ThemeToggleSimple />
        </div>

        <Suspense fallback={<StoreLoadingFallback />}>
          <PixiesetFlowTemplate
            settings={settings}
            photos={
              photos.map((photo) => ({
                id: photo.id,
                url: photo.url,
                preview_url: photo.preview_url ?? photo.url,
                alt: photo.alt,
                download_url: photo.download_url,
                type: photo.type ?? undefined,
              })) as any
            }
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
