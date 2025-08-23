import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';

export interface ShareToken {
  id: string;
  token: string;
  event_id: string;
  folder_id: string | null;
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
  isPasswordRequired: boolean;
  canDownload: boolean;
  canComment: boolean;
  isExpired: boolean;
  isViewLimitReached: boolean;
}

export interface CreateShareOptions {
  eventId: string;
  folderId?: string | null;
  photoIds?: string[];
  shareType: 'folder' | 'photos' | 'event';
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
  async createShare(options: CreateShareOptions): Promise<ServiceResult<{
    shareToken: ShareToken;
    shareUrl: string;
  }>> {
    try {
      const {
        eventId,
        folderId,
        photoIds,
        shareType,
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

      // Validate event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, organization_id')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return { success: false, error: 'Event not found' };
      }

      // Validate folder if specified
      if (shareType === 'folder' && folderId) {
        const { data: folder, error: folderError } = await supabase
          .from('event_folders')
          .select('id, event_id')
          .eq('id', folderId)
          .single();

        if (folderError || !folder || folder.event_id !== eventId) {
          return { success: false, error: 'Folder not found or does not belong to event' };
        }
      }

      // Validate photos if specified
      if (shareType === 'photos' && photoIds && photoIds.length > 0) {
        const { data: photos, error: photosError } = await supabase
          .from('photos')
          .select('id, event_id')
          .in('id', photoIds);

        if (photosError || !photos || photos.length !== photoIds.length) {
          return { success: false, error: 'Some photos not found' };
        }

        const invalidPhotos = photos.filter(photo => photo.event_id !== eventId);
        if (invalidPhotos.length > 0) {
          return { success: false, error: 'Some photos do not belong to this event' };
        }
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');

      // Hash password if provided
      let passwordHash: string | null = null;
      if (password) {
        passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      }

      // Create share token record
      const shareData = {
        token,
        event_id: eventId,
        folder_id: shareType === 'folder' ? folderId : null,
        photo_ids: shareType === 'photos' ? photoIds : null,
        share_type: shareType,
        title: title || null,
        description: description || null,
        password_hash: passwordHash,
        expires_at: expiresAt?.toISOString() || null,
        max_views: maxViews || null,
        view_count: 0,
        allow_download: allowDownload,
        allow_comments: allowComments,
        is_active: true,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
        },
      };

      const { data: shareToken, error: shareError } = await supabase
        .from('share_tokens')
        .insert(shareData)
        .select()
        .single();

      if (shareError) {
        logger.error('Failed to create share token', { options, error: shareError.message });
        return { success: false, error: 'Failed to create share token' };
      }

      // Generate public URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const shareUrl = `${baseUrl}/share/${token}`;

      logger.info('Successfully created share token', {
        shareTokenId: shareToken.id,
        eventId,
        shareType,
        hasPassword: !!password,
        expiresAt: expiresAt?.toISOString(),
      });

      return {
        success: true,
        data: {
          shareToken,
          shareUrl,
        },
      };
    } catch (error) {
      logger.error('Unexpected error in createShare', { options, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create share',
      };
    }
  }

  /**
   * Validate access to a share and return content
   */
  async validateAccess(options: ValidateAccessOptions): Promise<ServiceResult<ShareAccess>> {
    try {
      const { token, password, ipAddress, userAgent } = options;

      const supabase = await this.getSupabase();

      // Get share token
      const { data: shareToken, error: shareError } = await supabase
        .from('share_tokens')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (shareError || !shareToken) {
        return { success: false, error: 'Share not found or no longer active' };
      }

      // Check expiration
      const isExpired = shareToken.expires_at && new Date(shareToken.expires_at) < new Date();
      if (isExpired) {
        return { success: false, error: 'Share has expired' };
      }

      // Check view limit
      const isViewLimitReached = shareToken.max_views && shareToken.view_count >= shareToken.max_views;
      if (isViewLimitReached) {
        return { success: false, error: 'Share view limit reached' };
      }

      // Check password
      const isPasswordRequired = !!shareToken.password_hash;
      if (isPasswordRequired) {
        if (!password) {
          return {
            success: true,
            data: {
              shareToken,
              event: { id: '', name: '', organization_id: '' },
              isPasswordRequired: true,
              canDownload: false,
              canComment: false,
              isExpired: false,
              isViewLimitReached: false,
            },
          };
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        if (hashedPassword !== shareToken.password_hash) {
          return { success: false, error: 'Invalid password' };
        }
      }

      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, organization_id')
        .eq('id', shareToken.event_id)
        .single();

      if (eventError || !event) {
        return { success: false, error: 'Associated event not found' };
      }

      // Initialize result
      const result: ShareAccess = {
        shareToken,
        event,
        isPasswordRequired: false,
        canDownload: shareToken.allow_download,
        canComment: shareToken.allow_comments,
        isExpired: false,
        isViewLimitReached: false,
      };

      // Get folder details if applicable
      if (shareToken.share_type === 'folder' && shareToken.folder_id) {
        const { data: folder, error: folderError } = await supabase
          .from('event_folders')
          .select('id, name, folder_path')
          .eq('id', shareToken.folder_id)
          .single();

        if (folder && !folderError) {
          result.folder = {
            id: folder.id,
            name: folder.name,
            path: folder.folder_path,
          };
        }
      }

      // Get photos based on share type
      if (shareToken.share_type === 'photos' && shareToken.photo_ids) {
        const { data: photos, error: photosError } = await supabase
          .from('photos')
          .select(`
            id,
            original_filename,
            storage_path,
            preview_path,
            watermark_path,
            file_size,
            width,
            height,
            metadata
          `)
          .in('id', shareToken.photo_ids)
          .eq('approved', true); // Only approved photos for sharing

        if (photos && !photosError) {
          result.photos = photos;
        }
      } else if (shareToken.share_type === 'folder' && shareToken.folder_id) {
        // Get all approved photos in the folder
        const { data: photos, error: photosError } = await supabase
          .from('photos')
          .select(`
            id,
            original_filename,
            storage_path,
            preview_path,
            watermark_path,
            file_size,
            width,
            height,
            metadata
          `)
          .eq('folder_id', shareToken.folder_id)
          .eq('approved', true)
          .order('created_at', { ascending: false });

        if (photos && !photosError) {
          result.photos = photos;
        }
      } else if (shareToken.share_type === 'event') {
        // Get all approved photos in the event
        const { data: photos, error: photosError } = await supabase
          .from('photos')
          .select(`
            id,
            original_filename,
            storage_path,
            preview_path,
            watermark_path,
            file_size,
            width,
            height,
            metadata
          `)
          .eq('event_id', shareToken.event_id)
          .eq('approved', true)
          .order('created_at', { ascending: false });

        if (photos && !photosError) {
          result.photos = photos;
        }
      }

      // Increment view count (fire and forget)
      supabase
        .from('share_tokens')
        .update({
          view_count: shareToken.view_count + 1,
          metadata: {
            ...shareToken.metadata,
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
        .catch((error) => {
          logger.warn('Failed to increment view count', {
            shareTokenId: shareToken.id,
            error: error.message,
          });
        });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Unexpected error in validateAccess', { options, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate access',
      };
    }
  }

  /**
   * Generate signed URLs for photos in a share
   */
  async generateSharePhotoUrls(
    shareToken: ShareToken,
    photoIds: string[],
    useWatermark = true,
    expiryMinutes = 60
  ): Promise<ServiceResult<Record<string, string>>> {
    try {
      const supabase = await this.getSupabase();

      // Get photo storage paths
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, storage_path, preview_path, watermark_path')
        .in('id', photoIds)
        .eq('event_id', shareToken.event_id)
        .eq('approved', true);

      if (photosError || !photos) {
        return { success: false, error: 'Failed to fetch photos' };
      }

      const urlMap: Record<string, string> = {};
      const expirySeconds = expiryMinutes * 60;

      await Promise.all(
        photos.map(async (photo) => {
          try {
            // Use watermark if available and requested, otherwise use preview or main path
            let path = photo.storage_path;
            if (useWatermark && photo.watermark_path) {
              path = photo.watermark_path;
            } else if (photo.preview_path) {
              path = photo.preview_path;
            }

            const { data: signedUrlData, error: urlError } = await supabase.storage
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
          } catch (error) {
            logger.warn('Error generating signed URL for shared photo', {
              shareTokenId: shareToken.id,
              photoId: photo.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );

      return { success: true, data: urlMap };
    } catch (error) {
      logger.error('Unexpected error in generateSharePhotoUrls', { shareToken, photoIds, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate signed URLs',
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
        logger.error('Failed to deactivate share', { shareId, error: error.message });
        return { success: false, error: error.message };
      }

      return { success: true, data: shareToken };
    } catch (error) {
      logger.error('Unexpected error in deactivateShare', { shareId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate share',
      };
    }
  }

  /**
   * Get shares for an event
   */
  async getEventShares(eventId: string): Promise<ServiceResult<ShareToken[]>> {
    try {
      const supabase = await this.getSupabase();

      const { data: shares, error } = await supabase
        .from('share_tokens')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch event shares', { eventId, error: error.message });
        return { success: false, error: error.message };
      }

      return { success: true, data: shares || [] };
    } catch (error) {
      logger.error('Unexpected error in getEventShares', { eventId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch shares',
      };
    }
  }
}

// Export singleton instance
export const shareService = new ShareService();