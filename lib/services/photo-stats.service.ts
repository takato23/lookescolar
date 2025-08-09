import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';

export interface PhotoStats {
  total: number;
  approved: number;
  pending: number;
  tagged: number;
  untagged: number;
}

interface PhotoStatsCache {
  data: PhotoStats;
  eventId: string | null;
  timestamp: number;
}

// Simple in-memory cache with 2-minute TTL
const statsCache = new Map<string, PhotoStatsCache>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Get photo statistics using optimized database aggregation
 * Uses database functions for efficient counting instead of fetching all records
 */
export async function getPhotoStatsByEvent(
  eventId?: string | null,
  useCache: boolean = true
): Promise<PhotoStats> {
  const cacheKey = `stats_${eventId || 'all'}`;

  // Check cache first
  if (useCache) {
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const supabase = await createServerSupabaseServiceClient();

    // Use RPC function for optimized aggregation
    const { data, error } = eventId
      ? await supabase.rpc('get_photo_stats_by_event', { event_id: eventId })
      : await supabase.rpc('get_photo_stats_all');

    if (error) {
      // Fallback to regular query if RPC function doesn't exist
      return await getPhotoStatsFallback(eventId);
    }

    const stats: PhotoStats = {
      total: data?.[0]?.total || 0,
      approved: data?.[0]?.approved || 0,
      pending: data?.[0]?.pending || 0,
      tagged: data?.[0]?.tagged || 0,
      untagged: data?.[0]?.untagged || 0,
    };

    // Cache the result
    statsCache.set(cacheKey, {
      data: stats,
      eventId,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (Math.random() < 0.1) {
      // 10% chance
      cleanupCache();
    }

    return stats;
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'photo_stats_error',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId,
      },
      'error'
    );

    // Return empty stats on error
    return {
      total: 0,
      approved: 0,
      pending: 0,
      tagged: 0,
      untagged: 0,
    };
  }
}

/**
 * Fallback method using regular queries if RPC functions are not available
 * Still more efficient than fetching all records and filtering in JavaScript
 */
async function getPhotoStatsFallback(
  eventId?: string | null
): Promise<PhotoStats> {
  const supabase = await createServerSupabaseServiceClient();

  // Build base query
  const baseQuery = supabase
    .from('photos')
    .select('*', { count: 'exact', head: true });

  // Apply event filter if provided
  const query = eventId ? baseQuery.eq('event_id', eventId) : baseQuery;

  // Get total count
  const { count: total } = await query;

  if (!total || total === 0) {
    return {
      total: 0,
      approved: 0,
      pending: 0,
      tagged: 0,
      untagged: 0,
    };
  }

  // Run parallel queries for specific counts
  const [approvedResult, taggedResult] = await Promise.all([
    // Count approved
    eventId
      ? supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('approved', true)
      : supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('approved', true),

    // Count tagged (where subject_id is not null)
    eventId
      ? supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .not('subject_id', 'is', null)
      : supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .not('subject_id', 'is', null),
  ]);

  const approved = approvedResult.count || 0;
  const tagged = taggedResult.count || 0;

  const stats: PhotoStats = {
    total,
    approved,
    pending: total - approved,
    tagged,
    untagged: total - tagged,
  };

  // Cache the result
  const cacheKey = `stats_${eventId || 'all'}`;
  statsCache.set(cacheKey, {
    data: stats,
    eventId,
    timestamp: Date.now(),
  });

  return stats;
}

/**
 * Invalidate cached stats for a specific event or all events
 */
export function invalidateStatsCache(eventId?: string | null): void {
  if (eventId) {
    statsCache.delete(`stats_${eventId}`);
  } else {
    // Clear all cache entries
    statsCache.clear();
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, value] of statsCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      statsCache.delete(key);
    }
  }
}

/**
 * Create the required database functions for optimized stats
 * Run this migration to add the functions to your database
 */
export const photoStatsMigration = `
-- Function to get photo stats for a specific event
CREATE OR REPLACE FUNCTION get_photo_stats_by_event(event_id UUID)
RETURNS TABLE(
  total BIGINT,
  approved BIGINT,
  pending BIGINT,
  tagged BIGINT,
  untagged BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE approved = true) as approved,
    COUNT(*) FILTER (WHERE approved = false) as pending,
    COUNT(*) FILTER (WHERE subject_id IS NOT NULL) as tagged,
    COUNT(*) FILTER (WHERE subject_id IS NULL) as untagged
  FROM photos 
  WHERE photos.event_id = get_photo_stats_by_event.event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get photo stats for all photos
CREATE OR REPLACE FUNCTION get_photo_stats_all()
RETURNS TABLE(
  total BIGINT,
  approved BIGINT,
  pending BIGINT,
  tagged BIGINT,
  untagged BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE approved = true) as approved,
    COUNT(*) FILTER (WHERE approved = false) as pending,
    COUNT(*) FILTER (WHERE subject_id IS NOT NULL) as tagged,
    COUNT(*) FILTER (WHERE subject_id IS NULL) as untagged
  FROM photos;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photos_event_approved ON photos(event_id, approved);
CREATE INDEX IF NOT EXISTS idx_photos_event_subject ON photos(event_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_photos_approved ON photos(approved);
CREATE INDEX IF NOT EXISTS idx_photos_subject ON photos(subject_id);
`;
