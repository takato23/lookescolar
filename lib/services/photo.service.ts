import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export interface Photo {
  id: string;
  event_id: string;
  folder_id: string | null;
  original_filename: string;
  storage_path: string;
  preview_path?: string;
  watermark_path?: string;
  file_size: number;
  width: number;
  height: number;
  approved: boolean;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  signed_url?: string;
  signed_url_expires_at?: string;
}

export interface PhotoFilters {
  eventId: string;
  folderId?: string | null;
  approved?: boolean;
  processingStatus?: string;
  searchTerm?: string;
  sortBy?: 'created_at' | 'original_filename' | 'file_size' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BatchMoveOptions {
  photoIds: string[];
  targetFolderId: string | null;
  eventId: string;
}

export interface BatchUrlOptions {
  photoIds: string[];
  expiryMinutes?: number;
  usePreview?: boolean;
}

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

class PhotoService {
  private async getSupabase() {
    return await createServerSupabaseServiceClient();
  }

  /**
   * Get photos with filtering and pagination
   */
  async getPhotos(filters: PhotoFilters): Promise<ServiceResult<Photo[]>> {
    try {
      const {
        eventId,
        folderId,
        approved,
        processingStatus,
        searchTerm,
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 50,
      } = filters;

      const supabase = await this.getSupabase();

      // Build query
      let query = supabase
        .from('photos')
        .select(
          `
          id,
          event_id,
          folder_id,
          original_filename,
          storage_path,
          preview_path,
          watermark_path,
          file_size,
          width,
          height,
          approved,
          processing_status,
          metadata,
          created_at,
          updated_at
        `
        )
        .eq('event_id', eventId);

      // Apply folder filter
      if (folderId !== undefined) {
        if (folderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', folderId);
        }
      }

      // Apply other filters
      if (approved !== undefined) {
        query = query.eq('approved', approved);
      }

      if (processingStatus) {
        query = query.eq('processing_status', processingStatus);
      }

      if (searchTerm) {
        query = query.ilike('original_filename', `%${searchTerm}%`);
      }

      // Get count for pagination
      const { count: totalCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: photos, error } = await query;

      if (error) {
        logger.error('Failed to fetch photos', {
          filters,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      // Calculate pagination info
      const total = totalCount || 0;
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      return {
        success: true,
        data: photos || [],
        count: photos?.length || 0,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
        },
      };
    } catch (error) {
      logger.error('Unexpected error in getPhotos', { filters, error });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch photos',
      };
    }
  }

  /**
   * Get a single photo by ID
   */
  async getPhotoById(photoId: string): Promise<ServiceResult<Photo>> {
    try {
      const supabase = await this.getSupabase();

      const { data: photo, error } = await supabase
        .from('photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (error) {
        logger.error('Failed to fetch photo', {
          photoId,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      return { success: true, data: photo };
    } catch (error) {
      logger.error('Unexpected error in getPhotoById', { photoId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch photo',
      };
    }
  }

  /**
   * Batch move photos to a different folder
   */
  async batchMovePhotos(
    options: BatchMoveOptions
  ): Promise<ServiceResult<Photo[]>> {
    try {
      const { photoIds, targetFolderId, eventId } = options;

      if (photoIds.length === 0) {
        return { success: false, error: 'No photos provided' };
      }

      if (photoIds.length > 100) {
        return {
          success: false,
          error: 'Cannot move more than 100 photos at once',
        };
      }

      const supabase = await this.getSupabase();

      // Validate all photos belong to the event
      const { data: photos, error: fetchError } = await supabase
        .from('photos')
        .select('id, event_id')
        .in('id', photoIds);

      if (fetchError) {
        logger.error('Failed to validate photos', {
          photoIds,
          error: fetchError.message,
        });
        return { success: false, error: 'Failed to validate photos' };
      }

      if (!photos || photos.length !== photoIds.length) {
        return { success: false, error: 'Some photos not found' };
      }

      const invalidPhotos = photos.filter(
        (photo) => photo.event_id !== eventId
      );
      if (invalidPhotos.length > 0) {
        return {
          success: false,
          error: 'Some photos do not belong to this event',
        };
      }

      // If target folder is specified, validate it exists
      if (targetFolderId) {
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id, event_id')
          .eq('id', targetFolderId)
          .single();

        if (folderError || !folder) {
          return { success: false, error: 'Target folder not found' };
        }

        if (folder.event_id !== eventId) {
          return {
            success: false,
            error: 'Target folder does not belong to this event',
          };
        }
      }

      // Update photos
      const { data: updatedPhotos, error: updateError } = await supabase
        .from('photos')
        .update({
          folder_id: targetFolderId,
          updated_at: new Date().toISOString(),
        })
        .in('id', photoIds)
        .select();

      if (updateError) {
        logger.error('Failed to move photos', {
          options,
          error: updateError.message,
        });
        return { success: false, error: 'Failed to move photos' };
      }

      logger.info('Successfully moved photos', {
        photoCount: photoIds.length,
        targetFolderId: targetFolderId || 'root',
        eventId,
      });

      return { success: true, data: updatedPhotos || [] };
    } catch (error) {
      logger.error('Unexpected error in batchMovePhotos', { options, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move photos',
      };
    }
  }

  /**
   * Generate signed URLs for multiple photos
   */
  async batchGenerateSignedUrls(
    options: BatchUrlOptions
  ): Promise<ServiceResult<Record<string, string>>> {
    try {
      const { photoIds, expiryMinutes = 60, usePreview = false } = options;

      if (photoIds.length === 0) {
        return { success: false, error: 'No photos provided' };
      }

      if (photoIds.length > 100) {
        return {
          success: false,
          error: 'Cannot generate URLs for more than 100 photos at once',
        };
      }

      const supabase = await this.getSupabase();

      // Get photo storage paths
      const { data: photos, error: fetchError } = await supabase
        .from('photos')
        .select('id, storage_path, preview_path')
        .in('id', photoIds);

      if (fetchError) {
        logger.error('Failed to fetch photos for URL generation', {
          photoIds,
          error: fetchError.message,
        });
        return { success: false, error: 'Failed to fetch photos' };
      }

      if (!photos || photos.length === 0) {
        return { success: false, error: 'No photos found' };
      }

      const urlMap: Record<string, string> = {};
      const expirySeconds = expiryMinutes * 60;

      // Generate URLs for each photo
      await Promise.all(
        photos.map(async (photo) => {
          try {
            const path =
              usePreview && photo.preview_path
                ? photo.preview_path
                : photo.storage_path;

            const { data: signedUrlData, error: urlError } =
              await supabase.storage
                .from('photos')
                .createSignedUrl(path, expirySeconds);

            if (urlError) {
              logger.warn('Failed to generate signed URL for photo', {
                photoId: photo.id,
                path,
                error: urlError.message,
              });
            } else if (signedUrlData) {
              urlMap[photo.id] = signedUrlData.signedUrl;
            }
          } catch (error) {
            logger.warn('Error generating signed URL', {
              photoId: photo.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );

      return { success: true, data: urlMap };
    } catch (error) {
      logger.error('Unexpected error in batchGenerateSignedUrls', {
        options,
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
   * Update photo approval status
   */
  async updatePhotoApproval(
    photoId: string,
    approved: boolean
  ): Promise<ServiceResult<Photo>> {
    try {
      const supabase = await this.getSupabase();

      const { data: photo, error } = await supabase
        .from('photos')
        .update({
          approved,
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update photo approval', {
          photoId,
          approved,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      return { success: true, data: photo };
    } catch (error) {
      logger.error('Unexpected error in updatePhotoApproval', {
        photoId,
        approved,
        error,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update photo approval',
      };
    }
  }

  /**
   * Delete photos (batch operation)
   */
  async deletePhotos(
    photoIds: string[],
    eventId: string
  ): Promise<ServiceResult<string[]>> {
    try {
      if (photoIds.length === 0) {
        return { success: false, error: 'No photos provided' };
      }

      if (photoIds.length > 50) {
        return {
          success: false,
          error: 'Cannot delete more than 50 photos at once',
        };
      }

      const supabase = await this.getSupabase();

      // Get photo details for cleanup
      const { data: photos, error: fetchError } = await supabase
        .from('photos')
        .select('id, event_id, storage_path, preview_path, watermark_path')
        .in('id', photoIds);

      if (fetchError) {
        logger.error('Failed to fetch photos for deletion', {
          photoIds,
          error: fetchError.message,
        });
        return { success: false, error: 'Failed to fetch photos for deletion' };
      }

      if (!photos || photos.length === 0) {
        return { success: false, error: 'No photos found' };
      }

      // Validate all photos belong to the event
      const invalidPhotos = photos.filter(
        (photo) => photo.event_id !== eventId
      );
      if (invalidPhotos.length > 0) {
        return {
          success: false,
          error: 'Some photos do not belong to this event',
        };
      }

      // Delete from database first
      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .in('id', photoIds);

      if (deleteError) {
        logger.error('Failed to delete photos from database', {
          photoIds,
          error: deleteError.message,
        });
        return { success: false, error: 'Failed to delete photos' };
      }

      // Clean up storage files (best effort)
      const storageCleanupPromises = photos.map(async (photo) => {
        const pathsToDelete = [photo.storage_path];
        if (photo.preview_path) pathsToDelete.push(photo.preview_path);
        if (photo.watermark_path) pathsToDelete.push(photo.watermark_path);

        try {
          await supabase.storage.from('photos').remove(pathsToDelete);
        } catch (error) {
          logger.warn('Failed to cleanup storage files', {
            photoId: photo.id,
            paths: pathsToDelete,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(storageCleanupPromises);

      logger.info('Successfully deleted photos', {
        photoCount: photoIds.length,
        eventId,
      });

      return { success: true, data: photoIds };
    } catch (error) {
      logger.error('Unexpected error in deletePhotos', {
        photoIds,
        eventId,
        error,
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete photos',
      };
    }
  }

  /**
   * Get photos statistics for an event or folder
   */
  async getPhotoStats(
    eventId: string,
    folderId?: string | null
  ): Promise<
    ServiceResult<{
      total: number;
      approved: number;
      pending: number;
      processing: number;
      failed: number;
      totalSize: number;
    }>
  > {
    try {
      const supabase = await this.getSupabase();

      let query = supabase
        .from('photos')
        .select('approved, processing_status, file_size')
        .eq('event_id', eventId);

      if (folderId !== undefined) {
        if (folderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', folderId);
        }
      }

      const { data: photos, error } = await query;

      if (error) {
        logger.error('Failed to fetch photo stats', {
          eventId,
          folderId,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      const stats = {
        total: photos?.length || 0,
        approved: photos?.filter((p) => p.approved).length || 0,
        pending: photos?.filter((p) => !p.approved).length || 0,
        processing:
          photos?.filter((p) => p.processing_status === 'processing').length ||
          0,
        failed:
          photos?.filter((p) => p.processing_status === 'failed').length || 0,
        totalSize: photos?.reduce((sum, p) => sum + (p.file_size || 0), 0) || 0,
      };

      return { success: true, data: stats };
    } catch (error) {
      logger.error('Unexpected error in getPhotoStats', {
        eventId,
        folderId,
        error,
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get photo stats',
      };
    }
  }
}

// Export singleton instance
export const photoService = new PhotoService();
