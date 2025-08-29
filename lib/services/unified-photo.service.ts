import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export interface UnifiedPhoto {
  id: string;
  filename: string;
  original_path: string;
  preview_path: string | null;
  watermark_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  created_at: string | null;
  updated_at: string | null;
  approved: boolean;
  status: string | null;
  // Metadata for compatibility
  storage_path: string;
  original_filename: string;
  photo_type: string | null;
}

/**
 * Unified Photo Service
 * 
 * Provides a single interface to query photos from both old (photos table) 
 * and new (folders/assets) systems. Prioritizes the new system when available.
 */
export class UnifiedPhotoService {
  private supabase: any;

  constructor(supabase?: any) {
    this.supabase = supabase;
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerSupabaseServiceClient();
    }
    return this.supabase;
  }

  /**
   * Get photo count for an event using the unified system
   * 
   * UPDATED: Now uses the assets table via folders for the new system
   */
  async getEventPhotoCount(eventId: string, folderId?: string | null): Promise<number> {
    const supabase = await this.getSupabase();
    
    if (folderId) {
      // Count assets in specific folder
      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('folder_id', folderId)
        .eq('status', 'ready');
      return count || 0;
    } else {
      // Default behavior: get all assets for all folders in this event
      const { data: folders } = await supabase
        .from('folders')
        .select('id')
        .eq('event_id', eventId);

      if (!folders || folders.length === 0) {
        return 0;
      }

      const folderIds = folders.map(f => f.id);
      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .in('folder_id', folderIds)
        .eq('status', 'ready');
      
      return count || 0;
    }
  }

  /**
   * Get untagged photos count (updated to use assets system)
   */
  async getUntaggedPhotoCount(eventId: string): Promise<number> {
    const supabase = await this.getSupabase();
    
    // Get all folders for this event
    const { data: folders } = await supabase
      .from('folders')
      .select('id')
      .eq('event_id', eventId);

    if (!folders || folders.length === 0) {
      return 0;
    }

    const folderIds = folders.map(f => f.id);
    
    // Count assets without subject_id in their metadata
    const { count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .in('folder_id', folderIds)
      .eq('status', 'ready')
      .or('metadata->subject_id.is.null,metadata.is.null');

    return count || 0;
  }

  /**
   * Get photos for an event with optional filters
   */
  async getEventPhotos(
    eventId: string, 
    options: {
      limit?: number;
      offset?: number;
      includeUnapproved?: boolean;
      studentId?: string;
      courseId?: string;
    } = {}
  ): Promise<UnifiedPhoto[]> {
    const supabase = await this.getSupabase();
    const { limit = 50, offset = 0, includeUnapproved = false, studentId, courseId } = options;

    // Try new system first
    const { data: folders } = await supabase
      .from('folders')
      .select('id')
      .eq('event_id', eventId);

    if (folders && folders.length > 0) {
      const folderIds = folders.map((f: any) => f.id);
      
      let query = supabase
        .from('assets')
        .select(`
          id,
          filename,
          original_path,
          preview_path,
          checksum,
          file_size,
          mime_type,
          created_at,
          status
        `)
        .in('folder_id', folderIds)
        .order('created_at', { ascending: false });

      if (!includeUnapproved) {
        query = query.neq('status', 'rejected');
      }

      const { data: assets } = await query.range(offset, offset + limit - 1);

      if (assets) {
        return assets.map((asset: any) => ({
          id: asset.id,
          filename: asset.filename,
          original_path: asset.original_path,
          preview_path: asset.preview_path,
          watermark_path: null, // Assets don't have watermarks yet
          file_size: asset.file_size,
          mime_type: asset.mime_type,
          width: null,
          height: null,
          created_at: asset.created_at,
          updated_at: null,
          approved: asset.status !== 'rejected',
          status: asset.status,
          // Compatibility fields
          storage_path: asset.original_path,
          original_filename: asset.filename,
          photo_type: null,
        }));
      }
    }

    // No folders found for this event
    return [];
  }

  /**
   * Get system statistics (assets-based system only)
   */
  async getSystemStats(eventId: string) {
    const supabase = await this.getSupabase();

    // Get folders for this event
    const { data: folders } = await supabase
      .from('folders')
      .select('id')
      .eq('event_id', eventId);

    let assetsCount = 0;
    if (folders && folders.length > 0) {
      const folderIds = folders.map((f: any) => f.id);
      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .in('folder_id', folderIds);
      assetsCount = count || 0;
    }

    return {
      assetsCount,
      totalFolders: folders?.length || 0,
    };
  }
}

// Export singleton instance
export const unifiedPhotoService = new UnifiedPhotoService();