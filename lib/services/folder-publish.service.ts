import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { ServerPerformanceMonitor } from '@/lib/utils/performance.server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Validation schema
export const FolderQuerySchema = z.object({
  event_id: z.string().uuid().optional(),
  include_unpublished: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type FolderQuery = z.infer<typeof FolderQuerySchema>;

// Response types
export interface PublishedFolder {
  id: string;
  name: string;
  parent_id: string | null;
  event_id: string;
  depth: number;
  photo_count: number;
  is_published: boolean;
  share_token: string | null;
  published_at: string | null;
  family_url: string | null;
  qr_url: string | null;
  settings: Record<string, any>;
  event_name: string;
  event_date: string | null;
}

export interface FoldersResponse {
  success: boolean;
  folders: PublishedFolder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    total_folders: number;
    published_folders: number;
    unpublished_folders: number;
    current_page_folders: number;
  };
}

/**
 * Optimized service to fetch published folders with single query
 * Eliminates N+1 queries by using JOINs and aggregation
 */
export class FolderPublishService {
  private supabasePromise: Promise<SupabaseClient<Database>>;
  private baseUrl: string;
  private monitor: ServerPerformanceMonitor;

  constructor(supabase?: SupabaseClient<Database>) {
    this.supabasePromise = supabase
      ? Promise.resolve(supabase)
      : createServerSupabaseServiceClient();
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    this.monitor = ServerPerformanceMonitor.getInstance();
  }

  private async getSupabase(): Promise<SupabaseClient<Database>> {
    return await this.supabasePromise;
  }

  /**
   * Get published folders with optimized single query
   * Uses PostgreSQL aggregation to avoid N+1 queries
   */
  async getPublishedFolders(params: FolderQuery): Promise<FoldersResponse> {
    return this.monitor
      .timeQuery(
        'getPublishedFolders',
        async () => {
          const supabase = await this.getSupabase();

          // Build optimized query with JOIN and COUNT aggregation
          let baseQuery = supabase.from('folders').select(`
            id,
            name,
            parent_id,
            event_id,
            depth,
            sort_order,
            share_token,
            is_published,
            published_at,
            publish_settings,
            photo_count,
            events!inner(
              name,
              date
            )
          `);

          // Apply filters
          baseQuery = this.applyFilters(baseQuery, params);

          // Get total count with same filters (separate query for performance)
          let countQuery = supabase
            .from('folders')
            .select('id', { count: 'exact', head: true });

          countQuery = this.applyFilters(countQuery, params);

          // Execute queries in parallel
          const [countResult, dataResult] = await Promise.all([
            countQuery,
            baseQuery
              .order('depth', { ascending: true })
              .order('sort_order', { ascending: true })
              .range(
                (params.page - 1) * params.limit,
                params.page * params.limit - 1
              ),
          ]);

          const { count: totalCount, error: countError } = countResult;
          const { data: foldersData, error: foldersError } = dataResult;

          if (countError) {
            console.error('[ERROR] Count query failed:', countError);
            throw countError;
          }

          if (foldersError) {
            console.error('[ERROR] Folders query failed:', foldersError);
            throw foldersError;
          }

          // Transform data with URLs
          const folders = (foldersData || []).map((folder) =>
            this.transformFolder(folder)
          );

          // Calculate pagination metadata
          const totalPages = Math.ceil((totalCount || 0) / params.limit);
          const publishedFolders = folders.filter((f) => f.is_published).length;

          return {
            success: true,
            folders,
            pagination: {
              page: params.page,
              limit: params.limit,
              total: totalCount || 0,
              totalPages,
              hasNextPage: params.page < totalPages,
              hasPrevPage: params.page > 1,
            },
            summary: {
              total_folders: totalCount || 0,
              published_folders: publishedFolders,
              unpublished_folders: (totalCount || 0) - publishedFolders,
              current_page_folders: folders.length,
            },
          };
        },
        {
          page: params.page,
          limit: params.limit,
          filters: {
            event_id: params.event_id,
            search: params.search,
            date_from: params.date_from,
            date_to: params.date_to,
          },
        }
      )
      .then(({ result }) => result);
  }

  /**
   * Apply filters to query builder (reusable for both count and data queries)
   */
  private applyFilters(query: any, params: FolderQuery) {
    // Event filter
    if (params.event_id) {
      query = query.eq('event_id', params.event_id);
    }

    // Search filter (folder names)
    if (params.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    // Date filters (on events table)
    if (params.date_from) {
      query = query.gte('events.date', params.date_from);
    }

    if (params.date_to) {
      query = query.lte('events.date', params.date_to);
    }

    // Published filter
    if (!params.include_unpublished) {
      query = query.eq('is_published', true);
    }

    return query;
  }

  /**
   * Transform database record to API response format
   */
  private transformFolder(folder: any): PublishedFolder {
    const familyUrl = folder.share_token ? `/f/${folder.share_token}` : null;

    const qrUrl = folder.share_token
      ? `/access?token=${encodeURIComponent(folder.share_token)}`
      : null;

    return {
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      event_id: folder.event_id,
      depth: folder.depth,
      photo_count: folder.photo_count || 0, // Use cached count from folders table
      is_published: folder.is_published || false,
      share_token: folder.share_token,
      published_at: folder.published_at,
      family_url: familyUrl,
      qr_url: qrUrl,
      settings: folder.publish_settings || {},
      event_name: folder.events?.name || 'Unknown Event',
      event_date: folder.events?.date || null,
    };
  }

  /**
   * Get single folder with stats (optimized)
   */
  async getFolderById(id: string): Promise<PublishedFolder | null> {
    console.time(`[PERF] getFolderById:${id}`);

    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('folders')
        .select(
          `
          *,
          events(name, date)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      const result = this.transformFolder(data);

      console.timeEnd(`[PERF] getFolderById:${id}`);
      return result;
    } catch (error) {
      console.timeEnd(`[PERF] getFolderById:${id}`);
      console.error(`[ERROR] getFolderById failed for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Batch operation to get multiple folders efficiently
   */
  async getFoldersByIds(ids: string[]): Promise<PublishedFolder[]> {
    if (ids.length === 0) return [];

    console.time(`[PERF] getFoldersByIds:${ids.length}`);

    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('folders')
        .select(
          `
          *,
          events(name, date)
        `
        )
        .in('id', ids);

      if (error) {
        throw error;
      }

      const folders = (data || []).map((folder) =>
        this.transformFolder(folder)
      );

      console.timeEnd(`[PERF] getFoldersByIds:${ids.length}`);
      return folders;
    } catch (error) {
      console.timeEnd(`[PERF] getFoldersByIds:${ids.length}`);
      console.error(`[ERROR] getFoldersByIds failed:`, error);
      throw error;
    }
  }

  /**
   * Get performance stats for monitoring
   */
  async getPerformanceStats(): Promise<{
    total_folders: number;
    published_folders: number;
    avg_photos_per_folder: number;
    recent_publications: number;
  }> {
    console.time('[PERF] getPerformanceStats');

    try {
      const supabase = await this.getSupabase();

      // Single query with aggregations
      const { data, error } = await supabase.rpc('get_folder_stats', {});

      if (error) {
        // Fallback to manual queries if RPC doesn't exist
        const [totalResult, publishedResult, avgResult, recentResult] =
          await Promise.all([
            supabase
              .from('folders')
              .select('id', { count: 'exact', head: true }),
            supabase
              .from('folders')
              .select('id', { count: 'exact', head: true })
              .eq('is_published', true),
            supabase.from('folders').select('photo_count'),
            supabase
              .from('folders')
              .select('id', { count: 'exact', head: true })
              .eq('is_published', true)
              .gte(
                'published_at',
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
              ),
          ]);

        const totalPhotos =
          avgResult.data?.reduce((sum, f) => sum + (f.photo_count || 0), 0) ||
          0;
        const totalFolders = totalResult.count || 0;

        const stats = {
          total_folders: totalFolders,
          published_folders: publishedResult.count || 0,
          avg_photos_per_folder:
            totalFolders > 0 ? Math.round(totalPhotos / totalFolders) : 0,
          recent_publications: recentResult.count || 0,
        };

        console.timeEnd('[PERF] getPerformanceStats');
        return stats;
      }

      console.timeEnd('[PERF] getPerformanceStats');
      return data;
    } catch (error) {
      console.timeEnd('[PERF] getPerformanceStats');
      console.error('[ERROR] getPerformanceStats failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const folderPublishService = new FolderPublishService();
