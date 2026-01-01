import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Gallery Statistics API
 *
 * Provides comprehensive statistics for the unified photo system:
 * - Total counts (events, photos, students)
 * - Recent activity metrics
 * - Performance insights
 * - Storage usage (future)
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createClient();

    // Check admin authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get current date boundaries for "today" and "this week"
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date(
      today.setDate(today.getDate() - 7)
    ).toISOString();

    // Execute all stats queries in parallel for better performance
    const [
      totalEventsResult,
      activeEventsResult,
      totalPhotosResult,
      approvedPhotosResult,
      totalStudentsResult,
      photosUploadedTodayResult,
      photosApprovedTodayResult,
      newEventsThisWeekResult,
    ] = await Promise.all([
      // Total events
      supabase.from('events').select('id', { count: 'exact', head: true }),

      // Active events (assuming active means recent or has status = 'active')
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .or('status.eq.active,created_at.gte.' + weekStart),

      // Total photos
      supabase.from('photos').select('id', { count: 'exact', head: true }),

      // Approved photos
      supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('approved', true),

      // Total students
      supabase.from('students').select('id', { count: 'exact', head: true }),

      // Photos uploaded today
      supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),

      // Photos approved today
      supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('approved', true)
        .gte('updated_at', todayStart),

      // New events this week
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekStart),
    ]);

    // Check for any query errors
    const errors = [
      totalEventsResult.error,
      activeEventsResult.error,
      totalPhotosResult.error,
      approvedPhotosResult.error,
      totalStudentsResult.error,
      photosUploadedTodayResult.error,
      photosApprovedTodayResult.error,
      newEventsThisWeekResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('Gallery stats query errors:', errors);
      // Continue with partial data rather than failing completely
    }

    // Additional detailed queries for more insights
    const [recentPhotosResult, topEventsResult, storageStatsResult] =
      await Promise.all([
        // Recent photos with event info
        supabase
          .from('photos')
          .select(
            `
          id,
          original_filename,
          created_at,
          file_size,
          events (name)
        `
          )
          .order('created_at', { ascending: false })
          .limit(10),

        // Events with most photos
        supabase
          .from('events')
          .select(
            `
          id,
          name,
          school,
          created_at,
          photos (count)
        `
          )
          .order('created_at', { ascending: false })
          .limit(5),

        // Storage usage estimation (sum of file sizes)
        supabase
          .from('photos')
          .select('file_size')
          .not('file_size', 'is', null),
      ]);

    // Calculate storage usage
    let totalStorageBytes = 0;
    if (storageStatsResult.data) {
      totalStorageBytes = storageStatsResult.data.reduce((sum, photo) => {
        return sum + (photo.file_size || 0);
      }, 0);
    }

    const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024);

    // Build response with all statistics
    const stats = {
      total_events: totalEventsResult.count || 0,
      active_events: activeEventsResult.count || 0,
      total_photos: totalPhotosResult.count || 0,
      approved_photos: approvedPhotosResult.count || 0,
      total_students: totalStudentsResult.count || 0,

      recent_activity: {
        photos_uploaded_today: photosUploadedTodayResult.count || 0,
        photos_approved_today: photosApprovedTodayResult.count || 0,
        new_events_this_week: newEventsThisWeekResult.count || 0,
      },

      storage: {
        total_bytes: totalStorageBytes,
        total_gb: Math.round(totalStorageGB * 100) / 100, // Round to 2 decimal places
        average_file_size_kb: totalPhotosResult.count
          ? Math.round(totalStorageBytes / totalPhotosResult.count / 1024)
          : 0,
      },

      recent_photos:
        recentPhotosResult.data?.map((photo) => ({
          id: photo.id,
          filename: photo.original_filename,
          created_at: photo.created_at,
          file_size_kb: photo.file_size
            ? Math.round(photo.file_size / 1024)
            : 0,
          event_name: photo.events?.name || 'No event',
        })) || [],

      top_events:
        topEventsResult.data?.map((event) => ({
          id: event.id,
          name: event.name,
          school: event.school,
          created_at: event.created_at,
          photo_count: Array.isArray(event.photos) ? event.photos.length : 0,
        })) || [],

      performance: {
        approval_rate: totalPhotosResult.count
          ? Math.round(
              (approvedPhotosResult.count / totalPhotosResult.count) * 100
            )
          : 0,
        avg_photos_per_event: totalEventsResult.count
          ? Math.round(totalPhotosResult.count / totalEventsResult.count)
          : 0,
        photos_per_student: totalStudentsResult.count
          ? Math.round(totalPhotosResult.count / totalStudentsResult.count)
          : 0,
      },
    };

    return NextResponse.json({
      success: true,
      stats,
      generated_at: new Date().toISOString(),
      query_performance: {
        parallel_queries: 11,
        cache_strategy: 'none', // Could implement Redis caching here
      },
    });
  } catch (error) {
    console.error('Gallery stats API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch gallery statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Performance Optimizations:
 *
 * 1. Parallel Queries: All independent stats queries run simultaneously
 * 2. Count-only queries: Use { count: 'exact', head: true } for count-only operations
 * 3. Selective data: Only fetch necessary fields for detailed queries
 * 4. Error resilience: Continue with partial data if some queries fail
 * 5. Computed metrics: Calculate ratios and averages server-side
 *
 * Future Enhancements:
 * - Redis caching for 5-minute TTL on stats
 * - Real-time updates via WebSocket for live stats
 * - Materialized views for complex aggregations
 * - Time-series data for trend analysis
 * - Storage optimization recommendations
 */
