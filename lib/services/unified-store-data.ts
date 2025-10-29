import { mergeWithGuaranteedSettings, type SafeStoreSettings } from '@/lib/services/store-initialization.service';

export interface UnifiedStorePhoto {
  id: string;
  url: string;
  preview_url?: string | null;
  alt: string;
  download_url?: string | null;
  type?: string | null;
  /**
   * Raw asset payload, útil para depurar diferencias entre entornos.
   */
  raw?: Record<string, any>;
}

export interface UnifiedStorePagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

export interface NormalizedCatalog {
  items: any[];
  overrides: any[];
  [key: string]: any;
}

export interface UnifiedStoreData {
  settings: SafeStoreSettings;
  catalog: NormalizedCatalog | null;
  store: Record<string, any> | null;
  event: Record<string, any> | null;
  subject?: Record<string, any> | null;
  photos: UnifiedStorePhoto[];
  pagination: UnifiedStorePagination | null;
  gallery?: Record<string, any> | null;
  mercadoPagoConnected?: boolean;
  rawStoreResponse: Record<string, any>;
  rawConfigResponse?: Record<string, any>;
}

export interface UnifiedStoreFetchOptions {
  limit?: number;
  offset?: number;
  password?: string;
  baseUrl?: string;
  includeAssets?: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

interface FetchResponseWithStatus<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

const DEFAULT_LIMIT = 20;

function buildUrl(baseUrl: string | undefined, pathname: string): string {
  if (!baseUrl || baseUrl.length === 0) {
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  }

  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${trimmedBase}${normalizedPath}`;
}

async function parseJsonResponse<T>(response: Response): Promise<FetchResponseWithStatus<T>> {
  const result: FetchResponseWithStatus<T> = {
    ok: response.ok,
    status: response.status,
    data: null,
  };

  try {
    const text = await response.text();
    if (!text) {
      return result;
    }
    result.data = JSON.parse(text) as T;
  } catch (error) {
    console.warn('[UnifiedStore] Failed to parse JSON response', error);
  }

  return result;
}

export function normalizeCatalog(rawCatalog: any): NormalizedCatalog | null {
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

export function mapAssetsToPhotos(rawAssets: any[] | undefined): UnifiedStorePhoto[] {
  if (!Array.isArray(rawAssets) || rawAssets.length === 0) {
    return [];
  }

  return rawAssets.map((asset) => ({
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
    alt: asset.filename || asset.original_filename || 'Foto',
    download_url: asset.downloadUrl ?? asset.download_url ?? null,
    type: asset.type ?? asset.photo_type ?? null,
    raw: asset,
  }));
}

function extractPagination(storePayload: any, limit: number, offset: number): UnifiedStorePagination | null {
  const galleryPagination = storePayload?.gallery?.pagination;
  const apiPagination = storePayload?.pagination;

  const source = galleryPagination ?? apiPagination;

  if (!source) {
    const total = Array.isArray(storePayload?.assets)
      ? storePayload.assets.length
      : 0;
    return {
      limit,
      offset,
      total,
      hasMore: total > offset + limit,
      page: Math.floor(offset / limit) + 1,
      totalPages: total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    };
  }

  return {
    limit: source.limit ?? limit,
    offset: source.offset ?? offset,
    total: source.total ?? 0,
    hasMore: Boolean(
      source.hasMore ??
        source.has_more ??
        (source.total ?? 0) > ((source.offset ?? offset) + (source.limit ?? limit))
    ),
    page:
      source.page ??
      Math.floor(((source.offset ?? offset)) / (source.limit ?? limit)) + 1,
    totalPages: source.total_pages ?? source.totalPages ?? 1,
  };
}

export async function getUnifiedStoreData(
  token: string,
  options: UnifiedStoreFetchOptions = {}
): Promise<UnifiedStoreData> {
  const {
    limit = DEFAULT_LIMIT,
    offset = 0,
    password,
    baseUrl,
    includeAssets = true,
    signal,
    fetchImpl = fetch,
  } = options;

  if (!token) {
    throw new Error('Token is required to load store data');
  }

  const storeUrl = buildUrl(
    baseUrl,
    `/api/store/${token}?include_assets=${includeAssets ? 'true' : 'false'}&limit=${limit}&offset=${offset}`
  );

  const storeResponse = await fetchImpl(storeUrl, {
    headers: password ? { 'X-Store-Password': password } : undefined,
    signal,
  });

  const storePayload = await parseJsonResponse<Record<string, any>>(storeResponse);

  if (!storePayload.ok || !storePayload.data) {
    const message = storePayload.data?.error || 'No se pudo cargar la tienda';
    const error = new Error(message);
    (error as any).status = storePayload.status;
    throw error;
  }

  const guaranteedSettings = mergeWithGuaranteedSettings(
    storePayload.data.settings ?? null
  );

  const catalogSource =
    storePayload.data.gallery_catalog ?? storePayload.data.catalog ?? null;
  const normalizedCatalog = normalizeCatalog(catalogSource);

  const photos = mapAssetsToPhotos(
    storePayload.data.gallery?.items ?? storePayload.data.assets
  );

  const pagination = extractPagination(storePayload.data, limit, offset);

  const event = storePayload.data.event ?? null;
  const subject = storePayload.data.subject ?? null;

  return {
    settings: guaranteedSettings,
    catalog: normalizedCatalog,
    store: storePayload.data.store ?? null,
    event,
    subject,
    photos,
    pagination,
    gallery: storePayload.data.gallery ?? null,
    mercadoPagoConnected: storePayload.data.mercadoPagoConnected,
    rawStoreResponse: storePayload.data,
    rawConfigResponse: undefined,
  };
}

export async function fetchStoreAssetsPage(
  token: string,
  options: UnifiedStoreFetchOptions = {}
): Promise<{
  photos: UnifiedStorePhoto[];
  pagination: UnifiedStorePagination | null;
  rawResponse: Record<string, any>;
}> {
  const {
    limit = DEFAULT_LIMIT,
    offset = 0,
    password,
    baseUrl,
    includeAssets = true,
    signal,
    fetchImpl = fetch,
  } = options;

  const storeUrl = buildUrl(
    baseUrl,
    `/api/store/${token}?include_assets=${includeAssets ? 'true' : 'false'}&limit=${limit}&offset=${offset}`
  );

  const response = await fetchImpl(storeUrl, {
    headers: password ? { 'X-Store-Password': password } : undefined,
    signal,
  });

  const parsed = await parseJsonResponse<Record<string, any>>(response);

  if (!parsed.ok || !parsed.data) {
    const message = parsed.data?.error || 'No se pudieron cargar las fotos';
    const error = new Error(message);
    (error as any).status = parsed.status;
    throw error;
  }

  return {
    photos: mapAssetsToPhotos(parsed.data.gallery?.items ?? parsed.data.assets),
    pagination: extractPagination(parsed.data, limit, offset),
    rawResponse: parsed.data,
  };
}
