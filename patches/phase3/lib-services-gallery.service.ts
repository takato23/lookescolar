// @ts-nocheck
import { catalogService, type CatalogData } from '@/lib/services/catalog.service';
import {
  publicAccessService,
  type ResolvedAccess,
  type PublicAccessTokenType,
  type EventSummary,
  type FolderSummary,
  type SubjectSummary,
  type StudentSummary,
  type PublicAccessShareToken,
} from '@/lib/services/public-access.service';
import {
  familyService,
  type PhotoAssignment,
  type GroupPhoto,
} from '@/lib/services/family.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

type DbClient = SupabaseClient<Database>;

type ShareKind = 'event' | 'folder' | 'photos';

const PUBLIC_BUCKETS = ['assets', 'photos', 'photo-public'] as const;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 60;

export type GalleryErrorCode =
  | 'invalid_token'
  | 'inactive_token'
  | 'token_expired'
  | 'max_views_reached'
  | 'rate_limited'
  | 'unsupported_token'
  | 'photo_not_found'
  | 'db_error';

export class GalleryServiceError extends Error {
  readonly code: GalleryErrorCode;
  readonly status: number;
  readonly details?: Record<string, any>;

  constructor(
    code: GalleryErrorCode,
    message: string,
    status = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'GalleryServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface GalleryRequestOptions {
  token: string;
  page?: number;
  limit?: number;
  photoId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  includeCatalog?: boolean;
  skipRateLimit?: boolean;
}

export interface GalleryAsset {
  id: string;
  filename: string;
  previewUrl: string | null;
  signedUrl: string | null;
  downloadUrl: string | null;
  createdAt: string | null;
  size: number | null;
  mimeType: string | null;
  folderId: string | null;
  type: string | null;
  origin: 'assets' | 'photos';
  assignmentId?: string | null;
  storagePath?: string | null;
  metadata?: Record<string, any> | null;
}

export interface GalleryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface RateLimitMetadata {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

export interface GalleryResult {
  token: Promise<{
    token: string;
    accessType: PublicAccessTokenType;
    isLegacy: boolean;
    isActive: boolean;
    expiresAt: string | null;
    maxViews: number | null;
    viewCount: number;
  }>;
  event: EventSummary | null;
  folder: FolderSummary | null;
  subject: SubjectSummary | null;
  student: StudentSummary | null;
  share?: {
    shareType: ShareKind;
    allowDownload: boolean;
    allowComments: boolean;
    metadata: Record<string, any>;
  };
  items: GalleryAsset[];
  pagination: GalleryPagination;
  catalog?: CatalogData | null;
  activeOrder?: {
    id: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    itemsCount: number;
  } | null;
  legacyFallbackUsed: boolean;
  rateLimit: RateLimitMetadata;
}

interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

interface RateLimitState {
  count: number;
  limit: number;
  resetAt: number;
}

interface ShareContext {
  shareType: ShareKind;
  folderIds: string[] | null;
  photoIds: string[] | null;
  allowDownload: boolean;
  allowComments: boolean;
  metadata: Record<string, any>;
  shareRecord: PublicAccessShareToken | null;
  subjectFilter: string | null;
}

class GalleryService {
  private readonly defaultRateLimit: RateLimitConfig = {
    requests: 60,
    windowMs: 60_000,
  };

  private readonly shareRateLimit: RateLimitConfig = {
    requests: 120,
    windowMs: 60_000,
  };

  private readonly familyRateLimit: RateLimitConfig = {
    requests: 30,
    windowMs: 60_000,
  };

  private readonly rateLimitStore = new Map<string, RateLimitState>();

  async getGallery(options: GalleryRequestOptions): Promise<GalleryResult> {
    const {
      token,
      photoId,
      ipAddress,
      userAgent,
      includeCatalog = false,
      skipRateLimit = false,
    } = options;
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));

    const resolved = await publicAccessService.resolveAccessToken(token);
    if (!resolved) {
      throw new GalleryServiceError('invalid_token', 'Token inválido', 404);
    }

    const rateConfig = this.getRateConfig(resolved);
    const rateCheck = skipRateLimit
      ? { allowed: true, meta: this.createBypassRateMeta(rateConfig) }
      : this.enforceRateLimit(resolved.token.token, ipAddress, rateConfig);

    if (!rateCheck.allowed) {
      throw new GalleryServiceError('rate_limited', 'Límite de peticiones excedido', 429, {
        retryAfter: rateCheck.meta.retryAfter,
        limit: rateCheck.meta.limit,
      });
    }

    this.ensureTokenIsUsable(resolved);

    const supabase = await createServerSupabaseServiceClient();

    let items: GalleryAsset[] = [];
    let total = 0;
    let legacyFallbackUsed = false;
    let sharePayload: GalleryResult['share'];
    let activeOrder: GalleryResult['activeOrder'] = null;

    if (resolved.share || resolved.folder) {
      const shareResult = await this.fetchShareAssets(supabase, resolved, {
        page,
        limit,
        photoId,
      });
      items = shareResult.items;
      total = shareResult.total;
      legacyFallbackUsed = shareResult.legacyFallback;
      sharePayload = shareResult.share;
    } else if (resolved.subject || resolved.student) {
      const familyResult = await this.fetchFamilyAssets(resolved, page, limit, photoId);
      items = familyResult.items;
      total = familyResult.total;
      legacyFallbackUsed = familyResult.legacyFallback;
      activeOrder = familyResult.activeOrder;
    } else {
      throw new GalleryServiceError(
        'unsupported_token',
        'Este token no tiene acceso a la galería requerida',
        400
      );
    }

    if (photoId && items.length === 0) {
      throw new GalleryServiceError('photo_not_found', 'Foto no encontrada', 404);
    }

    const pagination = this.buildPagination(page, limit, total);

    const updatedViewCount = await this.recordView(
      resolved,
      ipAddress,
      userAgent,
      items.length
    );

    const catalog = includeCatalog ? await this.loadCatalog(resolved) : null;

    return {
      token: {
        token: resolved.token.token,
        accessType: resolved.token.accessType,
        isLegacy: resolved.token.isLegacy,
        isActive: resolved.token.isActive,
        expiresAt: resolved.token.expiresAt ?? null,
        maxViews: resolved.token.maxViews ?? null,
        viewCount: updatedViewCount,
      },
      event: resolved.event ?? null,
      folder: resolved.folder ?? null,
      subject: resolved.subject ?? null,
      student: resolved.student ?? null,
      share: sharePayload,
      items,
      pagination,
      catalog: includeCatalog ? catalog : undefined,
      activeOrder,
      legacyFallbackUsed,
      rateLimit: rateCheck.meta,
    };
  }

  private getRateConfig(resolved: ResolvedAccess): RateLimitConfig {
    const type = resolved.token.accessType;
    if (type === 'family_subject' || type === 'family_student') {
      return this.familyRateLimit;
    }
    if (
      type === 'share_event' ||
      type === 'share_folder' ||
      type === 'share_photos' ||
      type === 'folder_share'
    ) {
      return this.shareRateLimit;
    }
    return this.defaultRateLimit;
  }

  private enforceRateLimit(
    token: string,
    ipAddress: string | null | undefined,
    config: RateLimitConfig
  ): { allowed: boolean; meta: RateLimitMetadata } {
    const key = `${token}|${ipAddress ?? 'unknown'}`;
    const now = Date.now();
    const existing = this.rateLimitStore.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + config.windowMs;
      this.rateLimitStore.set(key, {
        count: 1,
        limit: config.requests,
        resetAt,
      });
      return {
        allowed: true,
        meta: {
          limit: config.requests,
          remaining: Math.max(0, config.requests - 1),
          resetAt,
          retryAfter: Math.max(0, resetAt - now),
        },
      };
    }

    if (existing.count >= existing.limit) {
      return {
        allowed: false,
        meta: {
          limit: existing.limit,
          remaining: 0,
          resetAt: existing.resetAt,
          retryAfter: Math.max(0, existing.resetAt - now),
        },
      };
    }

    existing.count += 1;
    this.rateLimitStore.set(key, existing);

    return {
      allowed: true,
      meta: {
        limit: existing.limit,
        remaining: Math.max(0, existing.limit - existing.count),
        resetAt: existing.resetAt,
        retryAfter: Math.max(0, existing.resetAt - now),
      },
    };
  }

  private createBypassRateMeta(config: RateLimitConfig): RateLimitMetadata {
    const resetAt = Date.now() + config.windowMs;
    return {
      limit: config.requests,
      remaining: config.requests,
      resetAt,
      retryAfter: 0,
    };
  }

  private ensureTokenIsUsable(resolved: ResolvedAccess) {
    if (!resolved.token.isActive) {
      throw new GalleryServiceError('inactive_token', 'El enlace no está activo', 403);
    }

    if (resolved.token.expiresAt) {
      const expiresAt = new Date(resolved.token.expiresAt).getTime();
      if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
        throw new GalleryServiceError('token_expired', 'El enlace ha expirado', 403);
      }
    }

    if (
      resolved.token.maxViews &&
      resolved.token.viewCount >= resolved.token.maxViews
    ) {
      throw new GalleryServiceError(
        'max_views_reached',
        'Se alcanzó el máximo de vistas permitidas',
        403
      );
    }
  }

  private async fetchShareAssets(
    client: DbClient,
    resolved: ResolvedAccess,
    params: { page: number; limit: number; photoId?: string | null }
  ): Promise<{
    items: GalleryAsset[];
    total: number;
    legacyFallback: boolean;
    share: GalleryResult['share'];
  }> {
    const context = await this.resolveShareContext(client, resolved);
    const { shareType, folderIds, photoIds, allowDownload, allowComments, metadata } =
      context;
    const offset = (params.page - 1) * params.limit;

    if (shareType === 'photos' && !params.photoId && (!photoIds || photoIds.length === 0)) {
      return {
        items: [],
        total: 0,
        legacyFallback: false,
        share: Promise<{
          shareType,
          allowDownload,
          allowComments,
          metadata,
        }>,
      };
    }

    const selection = [
      'id',
      'folder_id',
      'filename',
      'original_path',
      'preview_path',
      'watermark_path',
      'storage_path',
      'file_size',
      'mime_type',
      'created_at',
      'status',
      'metadata',
    ];
    let selectExpr = selection.join(', ');

    let query = client
      .from('assets')
      .select(selectExpr, { count: 'exact' })
      .eq('status', 'ready');

    if (context.subjectFilter) {
      selectExpr = `${selectExpr}, asset_subjects!inner(subject_id)`;
      query = client
        .from('assets')
        .select(selectExpr, { count: 'exact' })
        .eq('status', 'ready')
        .eq('asset_subjects.subject_id', context.subjectFilter);
    }

    if (params.photoId) {
      query = query.eq('id', params.photoId);
    } else if (photoIds && photoIds.length > 0) {
      query = query.in('id', photoIds);
    }

    if (folderIds && folderIds.length > 0) {
      query = query.in('folder_id', folderIds);
    }

    const rangeStart = params.photoId ? 0 : offset;
    const rangeEnd = params.photoId
      ? params.limit - 1
      : offset + params.limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    if (error) {
      logger.error('GalleryService: fallo al consultar assets', {
        token: resolved.token.token.slice(0, 8),
        errorContext: {
          message:
            error instanceof Error
              ? error.message
              : (error as any)?.message || 'unknown',
        },
      });
      throw new GalleryServiceError('db_error', 'No se pudo cargar la galería', 500);
    }

    const assetRows = Array.isArray(data) ? data : [];

    let items = await this.mapAssetRows(assetRows, { allowDownload });
    let total = typeof count === 'number' ? count : items.length;
    let legacyFallbackUsed = false;

    const shouldFallback =
      (!items.length || total === 0) &&
      (!!context.shareRecord?.is_legacy || !!context.shareRecord?.legacy_source);

    if (shouldFallback) {
      const fallback = await this.fetchLegacyPhotos(client, {
        shareType,
        eventId: resolved.event?.id ?? context.shareRecord?.event_id ?? null,
        folderIds,
        photoIds,
        page: params.page,
        limit: params.limit,
        photoId: params.photoId ?? null,
        allowDownload,
        subjectFilter: context.subjectFilter,
      });
      if (fallback.used && fallback.items.length > 0) {
        items = fallback.items;
        total = fallback.total;
        legacyFallbackUsed = true;
      }
    }

    return {
      items,
      total,
      legacyFallback: legacyFallbackUsed,
      share: {
        shareType,
        allowDownload,
        allowComments,
        metadata,
      },
    };
  }

  private async resolveShareContext(
    client: DbClient,
    resolved: ResolvedAccess
  ): Promise<ShareContext> {
    let shareRecord: PublicAccessShareToken | null = null;
    try {
      if (resolved.token.shareTokenId) {
        shareRecord = await publicAccessService.getShareTokenById(
          resolved.token.shareTokenId
        );
      } else {
        shareRecord = await publicAccessService.getShareTokenByToken(
          resolved.token.token
        );
      }
    } catch (error) {
      logger.warn('GalleryService: error obteniendo share token', {
        token: resolved.token.token.slice(0, 8),
        errorContext: {
          message: error instanceof Error ? error.message : 'unknown',
        },
      });
    }

    const shareType: ShareKind = (resolved.share?.shareType as ShareKind) ||
      (shareRecord?.share_type as ShareKind) ||
      (resolved.folder ? 'folder' : 'event');

    const folderId =
      resolved.share?.folderId ??
      shareRecord?.folder_id ??
      resolved.folder?.id ??
      null;

    const photoIds =
      resolved.share?.photoIds?.length
        ? resolved.share.photoIds
        : shareRecord?.photo_ids ?? null;

    const allowDownload =
      resolved.share?.allowDownload ?? shareRecord?.allow_download ?? false;
    const allowComments =
      resolved.share?.allowComments ?? shareRecord?.allow_comments ?? false;
    const metadata = shareRecord?.metadata ?? {};
    const subjectFilter = this.extractSubjectFromMetadata(metadata);

    const folderIds = await this.computeFolderIds(
      client,
      shareType,
      folderId,
      resolved.event?.id ?? shareRecord?.event_id ?? null
    );

    return {
      shareType,
      folderIds,
      photoIds,
      allowDownload,
      allowComments,
      metadata,
      shareRecord,
      subjectFilter,
    };
  }

  private async computeFolderIds(
    client: DbClient,
    shareType: ShareKind,
    folderId: string | null,
    eventId: string | null
  ): Promise<string[] | null> {
    if (shareType === 'photos') {
      return null;
    }

    if (shareType === 'folder') {
      if (!folderId) return null;
      const ids = new Set<string>([folderId]);
      try {
        const { data, error } = await client.rpc('get_descendant_folders', {
          p_folder_id: folderId,
        });
        if (!error && Array.isArray(data)) {
          for (const row of data) {
            const id = (row as any)?.id;
            if (typeof id === 'string') ids.add(id);
          }
        }
      } catch (error) {
        logger.warn('GalleryService: get_descendant_folders falló', {
          errorContext: {
            folderId,
            message: error instanceof Error ? error.message : 'unknown',
          },
        });
      }
      return Array.from(ids);
    }

    if (shareType === 'event' && eventId) {
      try {
        const { data, error } = await client
          .from('folders')
          .select('id')
          .eq('event_id', eventId)
          .eq('is_published', true);
        if (error) {
          throw error;
        }
        if (!data) return [];
        return data
          .map((row: any) => row?.id)
          .filter((id: any): id is string => typeof id === 'string');
      } catch (error) {
        logger.warn('GalleryService: error obteniendo carpetas de evento', {
          errorContext: {
            eventId,
            message: error instanceof Error ? error.message : 'unknown',
          },
        });
        return null;
      }
    }

    return null;
  }

  private extractSubjectFromMetadata(
    metadata?: Record<string, any> | null
  ): string | null {
    if (!metadata) return null;
    const candidates = [
      metadata.subject_id,
      metadata.subjectId,
      metadata.student_id,
      metadata.studentId,
      metadata.family_subject_id,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }

  private async mapAssetRows(
    rows: any[],
    options: { allowDownload: boolean }
  ): Promise<GalleryAsset[]> {
    return Promise.all(
      rows.map(async (row: any) => {
        const previewUrl =
          this.resolvePublicUrl(row?.watermark_path) ||
          this.resolvePublicUrl(row?.preview_path);
        const signedPreview = await this.safeSignedUrl(
          row?.watermark_path || row?.preview_path || row?.original_path,
          { quietMissing: true }
        );
        const downloadUrl = options.allowDownload
          ? await this.safeSignedUrl(row?.original_path || row?.storage_path, {
              quietMissing: true,
            })
          : null;

        return {
          id: row?.id,
          filename: row?.filename || row?.original_filename || 'foto',
          previewUrl: previewUrl ?? signedPreview,
          signedUrl: signedPreview,
          downloadUrl,
          createdAt: row?.created_at ?? null,
          size: typeof row?.file_size === 'number' ? row.file_size : null,
          mimeType: row?.mime_type ?? null,
          folderId: row?.folder_id ?? null,
          type:
            row?.photo_type ||
            row?.metadata?.photo_type ||
            row?.type ||
            'asset',
          origin: 'assets',
          storagePath: row?.original_path || row?.storage_path || null,
          metadata: row?.metadata ?? null,
        } satisfies GalleryAsset;
      })
    );
  }

  private async fetchLegacyPhotos(
    client: DbClient,
    params: {
      shareType: ShareKind;
      eventId: string | null;
      folderIds: string[] | null;
      photoIds: string[] | null;
      page: number;
      limit: number;
      photoId: string | null;
      allowDownload: boolean;
      subjectFilter: string | null;
    }
  ): Promise<{ items: GalleryAsset[]; total: number; used: boolean }> {
    if (params.subjectFilter) {
      // Evitar exponer datos sin filtrar en fallback legacy
      return { items: [], total: 0, used: false };
    }

    const offset = (params.page - 1) * params.limit;
    let query = client
      .from('photos')
      .select(
        `
        id,
        event_id,
        folder_id,
        filename,
        original_filename,
        storage_path,
        preview_path,
        watermark_path,
        file_size,
        mime_type,
        created_at,
        photo_type,
        metadata
      `,
        { count: 'exact' }
      )
      .eq('approved', true);

    if (params.photoId) {
      query = query.eq('id', params.photoId);
    } else if (params.photoIds && params.photoIds.length > 0) {
      query = query.in('id', params.photoIds);
    }

    if (params.shareType === 'event' && params.eventId) {
      query = query.eq('event_id', params.eventId);
    }

    if (
      params.shareType === 'folder' &&
      params.folderIds &&
      params.folderIds.length > 0
    ) {
      query = query.in('folder_id', params.folderIds);
    }

    const rangeStart = params.photoId ? 0 : offset;
    const rangeEnd = params.photoId
      ? params.limit - 1
      : offset + params.limit - 1;

    try {
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(rangeStart, rangeEnd);

      if (error) {
        throw error;
      }

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) {
        return { items: [], total: 0, used: true };
      }

      const items = await Promise.all(
        rows.map((row: any) =>
          this.mapLegacyPhotoRow(row, params.allowDownload)
        )
      );

      return {
        items,
        total: typeof count === 'number' ? count : items.length,
        used: true,
      };
    } catch (error) {
      logger.warn('GalleryService: fallback legacy falló', {
        errorContext: {
          message: error instanceof Error ? error.message : 'unknown',
        },
      });
      return { items: [], total: 0, used: true };
    }
  }

  private async mapLegacyPhotoRow(
    row: any,
    allowDownload: boolean
  ): Promise<GalleryAsset> {
    const previewUrl =
      this.resolvePublicUrl(row?.watermark_path) ||
      this.resolvePublicUrl(row?.preview_path);
    const signedPreview = await this.safeSignedUrl(
      row?.watermark_path || row?.preview_path || row?.storage_path,
      { quietMissing: true }
    );
    const downloadUrl = allowDownload
      ? await this.safeSignedUrl(row?.storage_path, { quietMissing: true })
      : null;

    return {
      id: row?.id,
      filename: row?.filename || row?.original_filename || 'foto',
      previewUrl: previewUrl ?? signedPreview,
      signedUrl: signedPreview,
      downloadUrl,
      createdAt: row?.created_at ?? null,
      size: typeof row?.file_size === 'number' ? row.file_size : null,
      mimeType: row?.mime_type ?? null,
      folderId: row?.folder_id ?? null,
      type: row?.photo_type ?? 'photo',
      origin: 'photos',
      storagePath: row?.storage_path ?? null,
      metadata: row?.metadata ?? null,
    } satisfies GalleryAsset;
  }

  private async fetchFamilyAssets(
    resolved: ResolvedAccess,
    page: number,
    limit: number,
    photoId?: string | null
  ): Promise<{
    items: GalleryAsset[];
    total: number;
    legacyFallback: boolean;
    activeOrder: GalleryResult['activeOrder'];
  }> {
    const subjectId = resolved.student?.id ?? resolved.subject?.id;
    if (!subjectId) {
      throw new GalleryServiceError(
        'unsupported_token',
        'El token no referencia a un estudiante válido',
        400
      );
    }

    let photos: Array<PhotoAssignment | GroupPhoto> = [];
    let total = 0;
    let legacyFallback = false;

    if (photoId) {
      const photoInfo = await familyService.getPhotoInfo(photoId, subjectId);
      if (!photoInfo) {
        throw new GalleryServiceError('photo_not_found', 'Foto no encontrada', 404);
      }
      photos = [photoInfo];
      total = 1;
      await familyService.trackPhotoView(photoId, subjectId);
    } else {
      const result = await familyService.getSubjectPhotos(subjectId, page, limit);
      photos = result.photos;
      total = result.total;
      legacyFallback = false;
    }

    const items = await Promise.all(photos.map((entry) => this.mapFamilyPhoto(entry)));

    const activeOrderRaw = await familyService.getActiveOrder(subjectId);
    const activeOrder = activeOrderRaw
      ? {
          id: activeOrderRaw.id,
          status: activeOrderRaw.status,
          totalAmount: activeOrderRaw.total_amount,
          createdAt: activeOrderRaw.created_at,
          itemsCount: activeOrderRaw.items.length,
        }
      : null;

    return { items, total, legacyFallback, activeOrder };
  }

  private async mapFamilyPhoto(
    entry: PhotoAssignment | GroupPhoto
  ): Promise<GalleryAsset> {
    const photo = entry.photo as any;
    const previewUrl =
      this.resolvePublicUrl(photo?.watermark_path) ||
      this.resolvePublicUrl(photo?.preview_path);
    const signedPreview = await this.safeSignedUrl(
      photo?.watermark_path || photo?.preview_path || photo?.storage_path,
      { quietMissing: true }
    );

    return {
      id: photo?.id,
      filename: photo?.filename || 'foto',
      previewUrl: previewUrl ?? signedPreview,
      signedUrl: signedPreview,
      downloadUrl: null,
      createdAt: photo?.created_at ?? null,
      size: null,
      mimeType: null,
      folderId: photo?.folder_id ?? null,
      type: photo?.photo_type ?? 'individual',
      origin: 'photos',
      assignmentId: (entry as any)?.id ?? null,
      storagePath: photo?.storage_path ?? null,
      metadata: {
        course_id: (entry as any)?.course_id ?? null,
        tagged_at: (entry as any)?.tagged_at ?? null,
      },
    } satisfies GalleryAsset;
  }

  private buildPagination(
    page: number,
    limit: number,
    total: number
  ): GalleryPagination {
    const safeLimit = Math.max(1, limit);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      page,
      limit: safeLimit,
      total,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  private async recordView(
    resolved: ResolvedAccess,
    ipAddress: string | null | undefined,
    userAgent: string | null | undefined,
    resultCount: number
  ): Promise<number> {
    const nextViewCount = (resolved.token.viewCount ?? 0) + 1;
    try {
      await publicAccessService.recordShareView({
        publicAccessId: resolved.token.publicAccessId,
        shareTokenId: resolved.token.shareTokenId,
        viewCount: nextViewCount,
        metadata: {
          last_accessed_at: new Date().toISOString(),
          last_ip: ipAddress ?? null,
          last_user_agent: userAgent ?? null,
          last_result_count: resultCount,
        },
      });
    } catch (error) {
      logger.warn('GalleryService: no se pudo registrar la vista', {
        token: resolved.token.token.slice(0, 8),
        errorContext: {
          message: error instanceof Error ? error.message : 'unknown',
        },
      });
    }
    return nextViewCount;
  }

  private resolvePublicUrl(path?: string | null): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const baseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    if (!baseUrl) return null;
    const normalized = path.replace(/^\/+/, '');
    for (const bucket of PUBLIC_BUCKETS) {
      return `${baseUrl}/storage/v1/object/public/${bucket}/${normalized}`;
    }
    return null;
  }

  private async safeSignedUrl(
    key?: string | null,
    options?: { expiresIn?: number; quietMissing?: boolean }
  ): Promise<string | null> {
    if (!key || typeof key !== 'string') {
      return null;
    }
    try {
      return await signedUrlForKey(key, {
        expiresIn: options?.expiresIn ?? 900,
        quietMissing: options?.quietMissing ?? true,
      });
    } catch (error) {
      logger.debug('GalleryService: error generando signed URL', {
        errorContext: {
          key,
          message: error instanceof Error ? error.message : 'unknown',
        },
      });
      return null;
    }
  }

  private async loadCatalog(
    resolved: ResolvedAccess
  ): Promise<CatalogData | null> {
    if (!resolved.event?.id) {
      return null;
    }
    try {
      return await catalogService.getCatalogForEvent(resolved.event.id);
    } catch (error) {
      logger.warn('GalleryService: fallo cargando catálogo', {
        eventId: resolved.event.id,
        errorContext: {
          message: error instanceof Error ? error.message : 'unknown',
        },
      });
      return null;
    }
  }
}

export const galleryService = new GalleryService();
