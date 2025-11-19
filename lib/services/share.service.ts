import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';
import { deriveEventIdFromContext } from './share-service-fix';

export type ShareScope = 'event' | 'folder' | 'selection';

export interface ShareScopeConfig {
  scope: ShareScope;
  anchorId: string;
  includeDescendants?: boolean;
  filters?: {
    photoIds?: string[];
    folderIds?: string[];
    [key: string]: any;
  };
}

export interface ShareScopeConfigRow {
  scope?: ShareScope;
  anchor_id?: string;
  include_descendants?: boolean;
  filters?: Record<string, any>;
}

export type ShareAudienceType = 'family' | 'group' | 'manual';

export interface ShareAudienceInput {
  type: ShareAudienceType;
  subjectId?: string;
  contactEmail?: string;
  metadata?: Record<string, any>;
}

export interface ResolvedShareAudience {
  id?: string;
  share_token_id: string;
  audience_type: ShareAudienceType;
  subject_id?: string | null;
  contact_email?: string | null;
  status?: string;
  metadata?: Record<string, any>;
}

export interface ShareToken {
  id: string;
  token: string;
  event_id: string;
  folder_id: string | null;
  subject_id: string | null;
  photo_ids: string[] | null;
  share_type: 'folder' | 'photos' | 'event';
  title: string | null;
  description: string | null;
  password_hash: string | null;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  allow_download: boolean;
  allow_comments: boolean;
  is_active: boolean;
  metadata: Record<string, any>;
  security_metadata?: Record<string, any> | null;
  scope_config: ShareScopeConfigRow;
  public_access_token_id: string | null;
  legacy_migrated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShareAccess {
  shareToken: ShareToken;
  event: {
    id: string;
    name: string;
    organization_id: string;
  };
  folder?: {
    id: string;
    name: string;
    path: string;
  };
  photos?: Array<{
    id: string;
    original_filename: string;
    storage_path: string;
    preview_path?: string;
    watermark_path?: string;
    file_size: number;
    width: number;
    height: number;
    metadata: Record<string, any>;
    signed_url?: string;
  }>;
  scopeConfig: ShareScopeConfig;
  audiencesCount: number;
  isPasswordRequired: boolean;
  canDownload: boolean;
  canComment: boolean;
  isExpired: boolean;
  isViewLimitReached: boolean;
}

export interface CreateShareOptions {
  eventId?: string;
  folderId?: string | null;
  photoIds?: string[];
  shareType?: 'folder' | 'photos' | 'event';
  scopeConfig?: ShareScopeConfig;
  subjectId?: string | null;
  includeDescendants?: boolean;
  audiences?: ShareAudienceInput[];
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: Date;
  maxViews?: number;
  allowDownload?: boolean;
  allowComments?: boolean;
  metadata?: Record<string, any>;
}

export interface ValidateAccessOptions {
  token: string;
  password?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ShareService {
  private async getSupabase() {
    return await createServerSupabaseServiceClient();
  }

  /**
   * Create a new share token
   */
  async createShare(
    options: CreateShareOptions
  ): Promise<
    ServiceResult<{
      shareToken: ShareToken;
      shareUrl: string;
      scopeConfig: ShareScopeConfig;
      audiencesCount: number;
    }>
  > {
    try {
      const {
        eventId: explicitEventId,
        folderId: explicitFolderId,
        photoIds: explicitPhotoIds,
        shareType: legacyShareType,
        scopeConfig: providedScopeConfig,
        subjectId,
        includeDescendants,
        audiences = [],
        title,
        description,
        password,
        expiresAt,
        maxViews,
        allowDownload = false,
        allowComments = false,
        metadata = {},
      } = options;

      const supabase = await this.getSupabase();

      const shareType =
        legacyShareType ??
        (providedScopeConfig
          ? this.mapScopeToShareType(providedScopeConfig.scope)
          : undefined);

      if (!shareType) {
        return {
          success: false,
          error: 'Debe especificar shareType o scopeConfig.scope',
        };
      }

      const normalizedPhotoIds = Array.from(
        new Set(
          [
            ...(providedScopeConfig?.filters?.photoIds ?? []),
            ...(explicitPhotoIds ?? []),
          ]
            .map((id) => (typeof id === 'string' ? id.trim() : id))
            .filter((id): id is string => Boolean(id))
        )
      );

      const candidateFolderId =
        (providedScopeConfig?.scope === 'folder'
          ? providedScopeConfig.anchorId
          : undefined) ??
        explicitFolderId ??
        null;

      let resolvedEventId =
        explicitEventId ??
        (providedScopeConfig?.scope === 'event'
          ? providedScopeConfig.anchorId
          : undefined) ??
        null;

      if (!resolvedEventId) {
        resolvedEventId =
          (await deriveEventIdFromContext({
            eventId: explicitEventId,
            folderId: candidateFolderId || undefined,
            photoIds:
              normalizedPhotoIds.length > 0 ? normalizedPhotoIds : undefined,
            shareType,
          })) || null;
      }

      if (!resolvedEventId) {
        return {
          success: false,
          error:
            'No se pudo determinar el evento asociado al enlace de compartición',
        };
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, tenant_id')
        .eq('id', resolvedEventId)
        .single();

      if (eventError || !event) {
        return {
          success: false,
          error: `Evento no encontrado (ID: ${resolvedEventId}). Error: ${
            eventError?.message || 'desconocido'
          }`,
        };
      }

      let resolvedFolderId: string | null = null;

      if (shareType === 'folder') {
        if (!candidateFolderId) {
          return {
            success: false,
            error: 'folderId es requerido para compartir una carpeta',
          };
        }

        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id, event_id')
          .eq('id', candidateFolderId)
          .single();

        if (folderError || !folder || folder.event_id !== event.id) {
          return {
            success: false,
            error:
              'La carpeta indicada no existe o no pertenece al evento seleccionado',
          };
        }

        resolvedFolderId = folder.id;
      }

      let legacyPhotoIds: string[] | null = null;
      if (shareType === 'photos') {
        if (normalizedPhotoIds.length === 0) {
          return {
            success: false,
            error: 'photoIds es requerido para compartir una selección',
          };
        }

        const { data: photos, error: photosError } = await supabase
          .from('photos')
          .select('id, event_id')
          .in('id', normalizedPhotoIds);

        if (photosError || !photos || photos.length !== normalizedPhotoIds.length) {
          return {
            success: false,
            error: 'Algunas fotos no existen o no pudieron validarse',
          };
        }

        const invalidPhoto = photos.find((p: any) => p.event_id !== event.id);
        if (invalidPhoto) {
          return {
            success: false,
            error: 'Algunas fotos no pertenecen al evento indicado',
          };
        }

        legacyPhotoIds = normalizedPhotoIds;
      }

      const normalizedScopeConfig = this.normalizeScopeConfig({
        provided: providedScopeConfig,
        shareType,
        eventId: event.id,
        folderId: resolvedFolderId,
        includeDescendants,
        photoIds: legacyPhotoIds ?? normalizedPhotoIds,
      });

      if (!normalizedScopeConfig.anchorId) {
        normalizedScopeConfig.anchorId =
          shareType === 'folder' && resolvedFolderId
            ? resolvedFolderId
            : event.id;
      }

      const serializedScopeConfig =
        this.serializeScopeConfig(normalizedScopeConfig);

      const token = crypto.randomBytes(32).toString('hex');

      let passwordHash: string | null = null;
      if (password) {
        passwordHash = crypto
          .createHash('sha256')
          .update(password)
          .digest('hex');
      }

      const createdAtIso = new Date().toISOString();

      const shareData = {
        token,
        tenant_id: (event as any).tenant_id || null,
        event_id: event.id,
        folder_id: resolvedFolderId,
        subject_id: subjectId ?? null,
        photo_ids: legacyPhotoIds,
        share_type: shareType,
        title: title || null,
        description: description || null,
        password_hash: passwordHash,
        expires_at: expiresAt?.toISOString() || null,
        max_views: maxViews ?? null,
        view_count: 0,
        allow_download: allowDownload,
        allow_comments: allowComments,
        is_active: true,
        metadata: {
          ...metadata,
          share_scope: normalizedScopeConfig.scope,
          share_anchor: normalizedScopeConfig.anchorId,
          share_include_descendants:
            normalizedScopeConfig.includeDescendants ?? false,
          created_at: createdAtIso,
        },
        scope_config: serializedScopeConfig,
      };

      const fallbackShareData: Record<string, any> = { ...shareData };
      const baseSelectColumns = new Set<string>([
        'id',
        'token',
        'tenant_id',
        'event_id',
        'folder_id',
        'subject_id',
        'photo_ids',
        'share_type',
        'title',
        'description',
        'password_hash',
        'expires_at',
        'max_views',
        'view_count',
        'allow_download',
        'allow_comments',
        'is_active',
        'metadata',
        'scope_config',
        'security_metadata',
        'public_access_token_id',
        'legacy_migrated_at',
        'created_at',
        'updated_at',
      ]);
      const removedColumns: string[] = [];
      let shareToken: ShareToken | null = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const insertQuery = supabase.from('share_tokens').insert(fallbackShareData);
        const selectColumns =
          baseSelectColumns.size > 0 ? Array.from(baseSelectColumns).join(',') : undefined;
        const queryWithSelect = selectColumns
          ? insertQuery.select(selectColumns)
          : insertQuery.select();
        const { data, error } = await queryWithSelect.single();

        if (!error && data) {
          shareToken = data as ShareToken;
          break;
        }

        lastError = error;
        const missingColumn = this.getMissingColumnFromError(error);
        if (missingColumn) {
          if (Object.prototype.hasOwnProperty.call(fallbackShareData, missingColumn)) {
            delete fallbackShareData[missingColumn];
          }
          if (baseSelectColumns.has(missingColumn)) {
            baseSelectColumns.delete(missingColumn);
          }
          removedColumns.push(missingColumn);
          logger.warn('Retrying share token insert without missing column', {
            missingColumn,
            removedColumns,
            shareType,
            eventId: event.id,
          });
          continue;
        }

        break;
      }

      if (!shareToken) {
        const tokenForLookup = fallbackShareData.token as string;
        const minimalColumns =
          'id, token, event_id, folder_id, photo_ids, share_type, expires_at, allow_download, allow_comments, metadata, scope_config, created_at, updated_at';
        const { data: fetchedShareToken, error: fetchError } = await supabase
          .from('share_tokens')
          .select(minimalColumns)
          .eq('token', tokenForLookup)
          .maybeSingle();

        if (fetchError || !fetchedShareToken) {
          const formattedError = this.formatInsertError(lastError || fetchError);
          logger.error('Failed to create share token', {
            options,
            error: lastError?.message || fetchError?.message,
            formattedError,
            removedColumns,
          });
          return { success: false, error: formattedError };
        }

        shareToken = fetchedShareToken as ShareToken;
      }

      if (removedColumns.includes('scope_config')) {
        shareToken = {
          ...shareToken,
          scope_config: serializedScopeConfig,
        } as ShareToken;
        logger.warn(
          'Created share token without persisted scope_config. Run pending migrations to enable unified sharing scopes.'
        );
      } else if (!shareToken.scope_config) {
        shareToken = {
          ...shareToken,
          scope_config: serializedScopeConfig,
        } as ShareToken;
      }

      if (removedColumns.includes('subject_id') || !(shareToken as any).subject_id) {
        (shareToken as any).subject_id = null;
      }

      if (removedColumns.includes('security_metadata') || !(shareToken as any).security_metadata) {
        (shareToken as any).security_metadata = null;
      }

      try {
        await this.populateShareContents(
          supabase,
          shareToken.id,
          normalizedScopeConfig,
          event.id,
          legacyPhotoIds
        );
      } catch (contentsError) {
        logger.warn('Failed to populate share_token_contents', {
          shareTokenId: shareToken.id,
          error:
            contentsError instanceof Error
              ? contentsError.message
              : String(contentsError),
        });
      }

      let audiencesCount = 0;
      try {
        const insertedAudiences = await this.registerAudiences(
          supabase,
          shareToken.id,
          audiences
        );
        audiencesCount = insertedAudiences.length;
      } catch (audienceError) {
        logger.warn('Failed to register share audiences', {
          shareTokenId: shareToken.id,
          error:
            audienceError instanceof Error
              ? audienceError.message
              : String(audienceError),
        });
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const shareUrl = `${baseUrl}/share/${token}`;

      return {
        success: true,
        data: {
          shareToken: {
            ...shareToken,
            scope_config: serializedScopeConfig,
          },
          shareUrl,
          scopeConfig: normalizedScopeConfig,
          audiencesCount,
        },
      };
    } catch (error) {
      logger.error('Unexpected error in createShare', { options, error });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create share',
      };
    }
  }

  /**
   * Validate access to a share and return content
   */
  async validateAccess(
    options: ValidateAccessOptions
  ): Promise<ServiceResult<ShareAccess>> {
    try {
      const { token, password, ipAddress, userAgent } = options;

      const supabase = await this.getSupabase();

      const { data: shareToken, error: shareError } = await supabase
        .from('share_tokens')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (shareError || !shareToken) {
        return { success: false, error: 'Share not found or no longer active' };
      }

      const scopeConfig = this.ensureScopeConfig(shareToken);
      const audiencesCount = await this.countAudiences(
        supabase,
        shareToken.id
      );

      const isExpired =
        shareToken.expires_at && new Date(shareToken.expires_at) < new Date();
      if (isExpired) {
        return { success: false, error: 'Share has expired' };
      }

      const isViewLimitReached =
        shareToken.max_views && shareToken.view_count >= shareToken.max_views;
      if (isViewLimitReached) {
        return { success: false, error: 'Share view limit reached' };
      }

      const isPasswordRequired = !!shareToken.password_hash;
      if (isPasswordRequired) {
        if (!password) {
          return {
            success: true,
            data: {
              shareToken,
              event: { id: '', name: '', organization_id: '' },
              scopeConfig,
              audiencesCount,
              isPasswordRequired: true,
              canDownload: false,
              canComment: false,
              isExpired: false,
              isViewLimitReached: false,
            },
          };
        }

        const hashedPassword = crypto
          .createHash('sha256')
          .update(password)
          .digest('hex');
        if (hashedPassword !== shareToken.password_hash) {
          return { success: false, error: 'Invalid password' };
        }
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', shareToken.event_id)
        .single();

      if (eventError || !event) {
        return { success: false, error: 'Associated event not found' };
      }

      const result: ShareAccess = {
        shareToken,
        event: { id: event.id, name: event.name, organization_id: '' },
        scopeConfig,
        audiencesCount,
        isPasswordRequired: false,
        canDownload: shareToken.allow_download,
        canComment: shareToken.allow_comments,
        isExpired: false,
        isViewLimitReached: false,
      };

      if (
        scopeConfig.scope === 'folder' ||
        shareToken.folder_id ||
        scopeConfig.anchorId
      ) {
        const folderId = scopeConfig.anchorId || shareToken.folder_id;
        if (folderId) {
          const { data: folder, error: folderError } = await supabase
            .from('folders')
            .select('id, name, path')
            .eq('id', folderId)
            .maybeSingle();

          if (folder && !folderError) {
            result.folder = {
              id: folder.id,
              name: folder.name,
              path: folder.path,
            };
          }
        }
      }

      try {
        const { photos } = await this.loadSharePhotos(
          supabase,
          shareToken,
          scopeConfig
        );
        if (photos.length > 0) {
          result.photos = photos;
        }
      } catch (photoError) {
        logger.warn('Failed to load photos for share during validation', {
          shareTokenId: shareToken.id,
          error:
            photoError instanceof Error
              ? photoError.message
              : String(photoError),
        });
      }

      supabase
        .from('share_tokens')
        .update({
          view_count: shareToken.view_count + 1,
          metadata: {
            ...(shareToken.metadata || {}),
            last_accessed: new Date().toISOString(),
            last_ip: ipAddress,
            last_user_agent: userAgent,
          },
        })
        .eq('id', shareToken.id)
        .then(() => {
          logger.info('Incremented share view count', {
            shareTokenId: shareToken.id,
            newCount: shareToken.view_count + 1,
          });
        })
        .catch((updateError) => {
          logger.warn('Failed to increment view count', {
            shareTokenId: shareToken.id,
            error:
              updateError instanceof Error
                ? updateError.message
                : String(updateError),
          });
        });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Unexpected error in validateAccess', { options, error });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to validate share',
      };
    }
  }

  /**
   * Generate signed URLs for photos in a share
   */
  async generateSharePhotoUrls(
    shareToken: ShareToken,
    photoIds: string[] = [],
    useWatermark = true,
    expiryMinutes = 60
  ): Promise<ServiceResult<Record<string, string>>> {
    try {
      const supabase = await this.getSupabase();
      const scopeConfig = this.ensureScopeConfig(shareToken);

      const { photos } = await this.loadSharePhotos(
        supabase,
        shareToken,
        scopeConfig,
        photoIds
      );

      if (!photos.length) {
        return { success: true, data: {} };
      }

      const urlMap: Record<string, string> = {};
      const expirySeconds = expiryMinutes * 60;

      await Promise.all(
        photos.map(async (photo: any) => {
          try {
            let path = photo.storage_path;
            if (useWatermark && photo.watermark_path) {
              path = photo.watermark_path;
            } else if (photo.preview_path) {
              path = photo.preview_path;
            }

            const { data: signedUrlData, error: urlError } =
              await supabase.storage
                .from('photos')
                .createSignedUrl(path, expirySeconds);

            if (urlError) {
              logger.warn('Failed to generate signed URL for shared photo', {
                shareTokenId: shareToken.id,
                photoId: photo.id,
                error: urlError.message,
              });
            } else if (signedUrlData) {
              urlMap[photo.id] = signedUrlData.signedUrl;
            }
          } catch (urlError) {
            logger.warn('Error generating signed URL for shared photo', {
              shareTokenId: shareToken.id,
              photoId: photo.id,
              error:
                urlError instanceof Error
                  ? urlError.message
                  : 'Unknown error',
            });
          }
        })
      );

      return { success: true, data: urlMap };
    } catch (error) {
      logger.error('Unexpected error in generateSharePhotoUrls', {
        shareToken,
        photoIds,
        error,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate signed URLs',
      };
    }
  }

  /**
   * Deactivate a share token
   */
  async deactivateShare(shareId: string): Promise<ServiceResult<ShareToken>> {
    try {
      const supabase = await this.getSupabase();

      const { data: shareToken, error } = await supabase
        .from('share_tokens')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shareId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to deactivate share', {
          shareId,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      return { success: true, data: shareToken };
    } catch (error) {
      logger.error('Unexpected error in deactivateShare', { shareId, error });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to deactivate share',
      };
    }
  }

  async addAudiences(
    shareTokenId: string,
    audiences: ShareAudienceInput[]
  ): Promise<
    ServiceResult<{ audiences: ResolvedShareAudience[]; count: number }>
  > {
    try {
      if (!audiences || audiences.length === 0) {
        return { success: true, data: { audiences: [], count: 0 } };
      }

      const supabase = await this.getSupabase();

      const { data: shareToken, error: shareTokenError } = await supabase
        .from('share_tokens')
        .select('id, metadata')
        .eq('id', shareTokenId)
        .single();

      if (shareTokenError || !shareToken) {
        return { success: false, error: 'Share token not found' };
      }

      const inserted = await this.registerAudiences(
        supabase,
        shareTokenId,
        audiences
      );

      await supabase
        .from('share_tokens')
        .update({
          metadata: {
            ...(shareToken.metadata || {}),
            last_audience_update: new Date().toISOString(),
          },
        })
        .eq('id', shareTokenId);

      return {
        success: true,
        data: {
          audiences: inserted,
          count: inserted.length,
        },
      };
    } catch (error) {
      logger.error('Unexpected error adding share audiences', {
        shareTokenId,
        error,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to add share audiences',
      };
    }
  }

  /**
   * Get shares for an event
   */
  async getEventShares(
    eventId: string
  ): Promise<ServiceResult<Array<ShareToken & { audiences_count: number }>>> {
    try {
      const supabase = await this.getSupabase();

      const { data: shares, error } = await supabase
        .from('share_tokens')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch event shares', {
          eventId,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      const hydratedShares = await Promise.all(
        (shares || []).map(async (share: ShareToken) => {
          const scopeConfig = this.ensureScopeConfig(share);
          const audiencesCount = await this.countAudiences(
            supabase,
            share.id
          );
          return {
            ...share,
            scope_config: this.serializeScopeConfig(scopeConfig),
            audiences_count: audiencesCount,
          };
        })
      );

      return { success: true, data: hydratedShares };
    } catch (error) {
      logger.error('Unexpected error in getEventShares', { eventId, error });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch shares',
      };
    }
  }

  private getMissingColumnFromError(error?: {
    message?: string;
    details?: string;
    hint?: string;
  } | null): string | null {
    if (!error) return null;
    const parts = [
      typeof error === 'string' ? error : error?.message,
      typeof error === 'object' && error ? error.details : undefined,
      typeof error === 'object' && error ? (error as any).hint : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    if (!parts) return null;

    const columnMatch = parts.match(/column ['"]?([a-zA-Z0-9_.]+)['"]? does not exist/);
    if (columnMatch) {
      const columnName = columnMatch[1];
      return columnName.includes('.') ? columnName.split('.').pop() || columnName : columnName;
    }

    const cacheMatch = parts.match(
      /could not find the ['"]?([a-zA-Z0-9_.]+)['"]? column[^']*'share_tokens'/
    );
    if (cacheMatch) {
      const columnName = cacheMatch[1];
      return columnName.includes('.') ? columnName.split('.').pop() || columnName : columnName;
    }

    return null;
  }

  private formatInsertError(error: any): string {
    if (!error) {
      return 'No se pudo crear el share token';
    }

    if (typeof error === 'string') {
      return `No se pudo crear el share token: ${error}`;
    }

    const message = error?.message || error?.code || 'error desconocido';
    if (message.includes('schema cache')) {
      return `No se pudo crear el share token: faltan migraciones de columnas (${message})`;
    }
    if (message.includes('foreign key constraint')) {
      return 'No se pudo crear el share token: la carpeta seleccionada no existe o no pertenece al evento';
    }
    if (message.includes('violates unique constraint')) {
      return 'No se pudo crear el share token: ya existe un token con ese identificador';
    }

    return `No se pudo crear el share token: ${message}`;
  }

  private mapScopeToShareType(scope: ShareScope): 'event' | 'folder' | 'photos' {
    switch (scope) {
      case 'folder':
        return 'folder';
      case 'selection':
        return 'photos';
      default:
        return 'event';
    }
  }

  private serializeScopeConfig(config: ShareScopeConfig): ShareScopeConfigRow {
    return {
      scope: config.scope,
      anchor_id: config.anchorId,
      include_descendants: config.includeDescendants ?? false,
      filters: config.filters ?? {},
    };
  }

  private parseScopeConfig(
    row?: ShareScopeConfigRow | ShareScopeConfig | null
  ): ShareScopeConfig {
    if (!row || typeof row !== 'object') {
      return {
        scope: 'event',
        anchorId: '',
        includeDescendants: false,
        filters: {},
      };
    }

    const raw = row as any;
    const scope = (raw.scope ?? raw.scope_config?.scope ?? 'event') as ShareScope;
    const anchorId =
      raw.anchorId ??
      raw.anchor_id ??
      (scope === 'folder'
        ? raw.folder_id ?? ''
        : raw.event_id ?? raw.anchor ?? '');
    const includeDescendants =
      raw.includeDescendants ?? raw.include_descendants ?? false;
    const filters = raw.filters ?? {};

    return {
      scope,
      anchorId: anchorId || '',
      includeDescendants,
      filters,
    };
  }

  private ensureScopeConfig(shareToken: ShareToken): ShareScopeConfig {
    const parsed = this.parseScopeConfig(shareToken.scope_config);
    if (parsed.anchorId) {
      return parsed;
    }
    return this.getLegacyScopeConfig(shareToken);
  }

  private getLegacyScopeConfig(shareToken: ShareToken): ShareScopeConfig {
    const scope =
      shareToken.share_type === 'folder'
        ? 'folder'
        : shareToken.share_type === 'photos'
        ? 'selection'
        : 'event';
    const anchorId =
      scope === 'folder'
        ? shareToken.folder_id || ''
        : shareToken.event_id;
    const filters =
      scope === 'selection'
        ? { photoIds: shareToken.photo_ids ?? [] }
        : {};
    return {
      scope,
      anchorId,
      includeDescendants: false,
      filters,
    };
  }

  private normalizeScopeConfig(params: {
    provided?: ShareScopeConfig;
    shareType: 'event' | 'folder' | 'photos';
    eventId: string;
    folderId?: string | null;
    includeDescendants?: boolean;
    photoIds?: string[];
  }): ShareScopeConfig {
    const {
      provided,
      shareType,
      eventId,
      folderId,
      includeDescendants,
      photoIds,
    } = params;

    if (provided) {
      return {
        scope: provided.scope,
        anchorId:
          provided.anchorId ||
          (provided.scope === 'folder'
            ? folderId || ''
            : provided.scope === 'event'
            ? eventId
            : eventId),
        includeDescendants:
          provided.includeDescendants ??
          includeDescendants ??
          (provided.scope === 'event'),
        filters: {
          ...(provided.filters ?? {}),
          ...(shareType === 'photos' && photoIds ? { photoIds } : {}),
        },
      };
    }

    if (shareType === 'folder') {
      return {
        scope: 'folder',
        anchorId: folderId || '',
        includeDescendants: includeDescendants ?? false,
        filters: {},
      };
    }

    if (shareType === 'photos') {
      return {
        scope: 'selection',
        anchorId: eventId,
        includeDescendants: false,
        filters: { photoIds: photoIds ?? [] },
      };
    }

    return {
      scope: 'event',
      anchorId: eventId,
      includeDescendants: includeDescendants ?? true,
      filters: {},
    };
  }

  private async populateShareContents(
    supabase: any,
    shareTokenId: string,
    scopeConfig: ShareScopeConfig,
    eventId: string,
    fallbackPhotoIds?: string[] | null
  ): Promise<void> {
    const photoIds = await this.resolvePhotoIdsForScope(
      supabase,
      eventId,
      scopeConfig,
      fallbackPhotoIds
    );

    await supabase
      .from('share_token_contents')
      .delete()
      .eq('share_token_id', shareTokenId);

    if (!photoIds.length) {
      return;
    }

    const chunks = this.chunkArray(photoIds, 500);
    for (const chunk of chunks) {
      const { error } = await supabase
        .from('share_token_contents')
        .upsert(
          chunk.map((photoId) => ({
            share_token_id: shareTokenId,
            photo_id: photoId,
          })),
          { onConflict: 'share_token_id,photo_id' }
        );

      if (error) {
        throw new Error(
          error?.message || 'Failed to populate share_token_contents'
        );
      }
    }
  }

  private async resolvePhotoIdsForScope(
    supabase: any,
    eventId: string,
    scopeConfig: ShareScopeConfig,
    fallbackPhotoIds?: string[] | null
  ): Promise<string[]> {
    if (scopeConfig.scope === 'selection') {
      const ids = fallbackPhotoIds ?? scopeConfig.filters?.photoIds ?? [];
      return Array.from(
        new Set(
          (ids || [])
            .map((id) => (typeof id === 'string' ? id.trim() : id))
            .filter((id): id is string => Boolean(id))
        )
      );
    }

    if (scopeConfig.scope === 'folder') {
      const folderId = scopeConfig.anchorId;
      if (!folderId) {
        return [];
      }

      const folderIds = await this.gatherFolderIds(
        supabase,
        folderId,
        scopeConfig.includeDescendants
      );

      if (!folderIds.length) {
        return [];
      }

      const { data, error } = await supabase
        .from('photos')
        .select('id')
        .in('folder_id', folderIds)
        .eq('approved', true);

      if (error || !data) {
        throw new Error(
          error?.message || 'Failed to resolve photos for folder scope'
        );
      }

      return data.map((row: any) => row.id);
    }

    const { data, error } = await supabase
      .from('photos')
      .select('id')
      .eq('event_id', eventId)
      .eq('approved', true);

    if (error || !data) {
      throw new Error(
        error?.message || 'Failed to resolve photos for event scope'
      );
    }

    return data.map((row: any) => row.id);
  }

  private async gatherFolderIds(
    supabase: any,
    folderId: string,
    includeDescendants?: boolean
  ): Promise<string[]> {
    const ids = new Set<string>();
    if (folderId) {
      ids.add(folderId);
    }

    if (includeDescendants) {
      const { data, error } = await supabase.rpc('get_descendant_folders', {
        p_folder_id: folderId,
      });

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (row?.id) {
            ids.add(row.id);
          }
        }
      }
    }

    return Array.from(ids);
  }

  private chunkArray<T>(items: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) {
      return [items];
    }
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private normalizeAudiences(
    shareTokenId: string,
    audiences: ShareAudienceInput[]
  ): ResolvedShareAudience[] {
    const normalized: ResolvedShareAudience[] = [];
    const seen = new Set<string>();

    for (const audience of audiences) {
      if (!audience || !audience.type) {
        continue;
      }

      if (audience.type === 'manual') {
        const email = (audience.contactEmail || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
          continue;
        }
        const key = `manual:${email}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        normalized.push({
          share_token_id: shareTokenId,
          audience_type: 'manual',
          subject_id: null,
          contact_email: email,
          status: 'pending',
          metadata: audience.metadata ?? {},
        });
        continue;
      }

      const subjectId = (audience.subjectId || '').trim();
      if (!subjectId) {
        continue;
      }
      const key = `${audience.type}:${subjectId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      normalized.push({
        share_token_id: shareTokenId,
        audience_type: audience.type,
        subject_id: subjectId,
        contact_email: audience.contactEmail?.trim() || null,
        status: 'pending',
        metadata: audience.metadata ?? {},
      });
    }

    return normalized;
  }

  private async registerAudiences(
    supabase: any,
    shareTokenId: string,
    audiences: ShareAudienceInput[]
  ): Promise<ResolvedShareAudience[]> {
    if (!audiences || audiences.length === 0) {
      return [];
    }

    const rows = this.normalizeAudiences(shareTokenId, audiences);
    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('share_audiences')
      .insert(
        rows.map((row) => ({
          share_token_id: row.share_token_id,
          audience_type: row.audience_type,
          subject_id: row.subject_id ?? null,
          contact_email: row.contact_email ?? null,
          status: row.status ?? 'pending',
          metadata: row.metadata ?? {},
        }))
      )
      .select();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to insert share audiences');
    }

    return data;
  }

  private async getCachedPhotoIds(
    supabase: any,
    shareTokenId: string
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from('share_token_contents')
      .select('photo_id')
      .eq('share_token_id', shareTokenId);

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => row.photo_id);
  }

  private async countAudiences(
    supabase: any,
    shareTokenId: string
  ): Promise<number> {
    const { count, error } = await supabase
      .from('share_audiences')
      .select('id', { count: 'exact', head: true })
      .eq('share_token_id', shareTokenId);

    if (error || typeof count !== 'number') {
      return 0;
    }

    return count;
  }

  private async loadSharePhotos(
    supabase: any,
    shareToken: ShareToken,
    scopeConfig: ShareScopeConfig,
    overridePhotoIds: string[] = []
  ): Promise<{ photoIds: string[]; photos: any[] }> {
    let photoIds = Array.from(
      new Set(
        (overridePhotoIds || [])
          .map((id) => (typeof id === 'string' ? id.trim() : id))
          .filter((id): id is string => Boolean(id))
      )
    );

    if (!photoIds.length) {
      photoIds = await this.getCachedPhotoIds(supabase, shareToken.id);
    }

    if (!photoIds.length && shareToken.photo_ids?.length) {
      photoIds = shareToken.photo_ids;
    }

    let photos: any[] | null = null;

    if (!photoIds.length) {
      if (scopeConfig.scope === 'folder') {
        const folderId = scopeConfig.anchorId;
        if (!folderId) {
          return { photoIds: [], photos: [] };
        }
        const folderIds = await this.gatherFolderIds(
          supabase,
          folderId,
          scopeConfig.includeDescendants
        );
        if (!folderIds.length) {
          return { photoIds: [], photos: [] };
        }
        const { data, error } = await supabase
          .from('photos')
          .select(
            `
            id,
            original_filename,
            storage_path,
            preview_path,
            watermark_path,
            file_size,
            width,
            height,
            metadata
          `
          )
          .in('folder_id', folderIds)
          .eq('approved', true)
          .order('created_at', { ascending: false });
        if (error || !data) {
          throw new Error(error?.message || 'Failed to load folder photos');
        }
        photos = data;
        photoIds = data.map((row: any) => row.id);
      } else if (scopeConfig.scope === 'event') {
        const { data, error } = await supabase
          .from('photos')
          .select(
            `
            id,
            original_filename,
            storage_path,
            preview_path,
            watermark_path,
            file_size,
            width,
            height,
            metadata
          `
          )
          .eq('event_id', shareToken.event_id)
          .eq('approved', true)
          .order('created_at', { ascending: false });
        if (error || !data) {
          throw new Error(error?.message || 'Failed to load event photos');
        }
        photos = data;
        photoIds = data.map((row: any) => row.id);
      } else {
        const selectionIds =
          (scopeConfig.filters?.photoIds as string[] | undefined) ?? [];
        if (!selectionIds.length) {
          return { photoIds: [], photos: [] };
        }
        photoIds = selectionIds;
      }
    }

    if (!photos) {
      if (!photoIds.length) {
        return { photoIds: [], photos: [] };
      }
      const { data, error } = await supabase
        .from('photos')
        .select(
          `
          id,
          original_filename,
          storage_path,
          preview_path,
          watermark_path,
          file_size,
          width,
          height,
          metadata
        `
        )
        .in('id', photoIds)
        .eq('approved', true);

      if (error || !data) {
        throw new Error(error?.message || 'Failed to load photos');
      }

      const map = new Map(data.map((photo: any) => [photo.id, photo]));
      photos = photoIds
        .map((id) => map.get(id))
        .filter((photo): photo is any => Boolean(photo));
    }

    return { photoIds, photos };
  }
}

// Export singleton instance
export const shareService = new ShareService();
