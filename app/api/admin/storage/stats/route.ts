import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Constants for free tier calculations
const FREE_TIER_LIMIT_GB = 1;
const FREE_TIER_LIMIT_BYTES = FREE_TIER_LIMIT_GB * 1024 * 1024 * 1024;
const TARGET_SIZE_KB = 35;
const ESTIMATED_MAX_PHOTOS = Math.floor(
  FREE_TIER_LIMIT_BYTES / (TARGET_SIZE_KB * 1024)
);

interface StorageStats {
  totalPhotos: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  averageSizeKB: number;
  optimizedPhotos: number;
  compressionRatio: number;
  freetierUsagePercent: number;
  estimatedPhotosRemaining: number;
  monthlyUploadTrend: number;
  lastUpdated: string;
}

interface MonthlyStats {
  month: string;
  photosUploaded: number;
  sizeUploadedMB: number;
  averageOptimization: number;
}

interface ProjectionData {
  currentTrend: number;
  projectedMonthlyPhotos: number;
  projectedMonthlySizeMB: number;
  monthsUntilFull: number;
  recommendedActions: string[];
}

// GET /api/admin/storage/stats
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest) => {
    const requestId = crypto.randomUUID();

    try {
      const url = new URL(req.url);
      const eventId = url.searchParams.get('eventId');
      const includeMonthlyStats =
        url.searchParams.get('includeMonthly') !== 'false';
      const includeProjections =
        url.searchParams.get('includeProjections') !== 'false';

      logger.info('Storage stats request', {
        requestId,
        eventId: eventId || 'global',
        includeMonthlyStats,
        includeProjections,
      });

      // Build base query
      let photosQuery = supabase
        .from('photos')
        .select('id, file_size, created_at, processing_status, metadata');

      // Filter by event if specified
      if (eventId) {
        photosQuery = photosQuery.eq('event_id', eventId);
      }

      // Get all photos data
      const { data: photos, error: photosError } = await photosQuery;

      if (photosError) {
        logger.error('Failed to fetch photos for storage stats', {
          requestId,
          eventId,
          error: photosError.message,
        });

        return NextResponse.json(
          { success: false, error: 'Failed to fetch photo data' },
          { status: 500 }
        );
      }

      if (!photos || photos.length === 0) {
        // Return empty stats if no photos
        const emptyStats: StorageStats = {
          totalPhotos: 0,
          totalSizeBytes: 0,
          totalSizeMB: 0,
          averageSizeKB: 0,
          optimizedPhotos: 0,
          compressionRatio: 0,
          freetierUsagePercent: 0,
          estimatedPhotosRemaining: ESTIMATED_MAX_PHOTOS,
          monthlyUploadTrend: 0,
          lastUpdated: new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          stats: emptyStats,
          monthlyStats: [],
          projection: null,
        });
      }

      // Calculate main statistics
      const totalPhotos = photos.length;
      const totalSizeBytes = photos.reduce(
        (sum, photo) => sum + (photo.file_size || 0),
        0
      );
      const totalSizeMB = totalSizeBytes / (1024 * 1024);
      const averageSizeKB =
        totalPhotos > 0 ? totalSizeBytes / totalPhotos / 1024 : 0;

      // Count optimized photos (those processed with FreeTierOptimizer)
      const optimizedPhotos = photos.filter(
        (photo) =>
          photo.processing_status === 'completed' &&
          (photo.file_size || 0) <= TARGET_SIZE_KB * 1024 * 1.2 // Allow 20% tolerance
      ).length;

      // Estimate compression ratio based on typical unoptimized vs optimized sizes
      const typicalOriginalKB = 500; // Typical camera photo size
      const actualAverageKB = averageSizeKB;
      const compressionRatio = Math.max(
        0,
        Math.min(
          100,
          ((typicalOriginalKB - actualAverageKB) / typicalOriginalKB) * 100
        )
      );

      // Calculate free tier usage
      const freetierUsagePercent =
        (totalSizeBytes / FREE_TIER_LIMIT_BYTES) * 100;
      const estimatedPhotosRemaining = Math.max(
        0,
        Math.floor(
          (FREE_TIER_LIMIT_BYTES - totalSizeBytes) / (TARGET_SIZE_KB * 1024)
        )
      );

      const stats: StorageStats = {
        totalPhotos,
        totalSizeBytes,
        totalSizeMB,
        averageSizeKB,
        optimizedPhotos,
        compressionRatio,
        freetierUsagePercent,
        estimatedPhotosRemaining,
        monthlyUploadTrend: 0, // Will be calculated below
        lastUpdated: new Date().toISOString(),
      };

      let monthlyStats: MonthlyStats[] = [];
      let projection: ProjectionData | null = null;

      // Calculate monthly statistics if requested
      if (includeMonthlyStats) {
        const monthlyData = new Map<
          string,
          {
            count: number;
            totalSize: number;
            optimizedCount: number;
          }
        >();

        photos.forEach((photo) => {
          const date = new Date(photo.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, {
              count: 0,
              totalSize: 0,
              optimizedCount: 0,
            });
          }

          const monthData = monthlyData.get(monthKey)!;
          monthData.count++;
          monthData.totalSize += photo.file_size || 0;

          if (
            photo.processing_status === 'completed' &&
            (photo.file_size || 0) <= TARGET_SIZE_KB * 1024 * 1.2
          ) {
            monthData.optimizedCount++;
          }
        });

        // Convert to array and sort
        monthlyStats = Array.from(monthlyData.entries())
          .map(([month, data]) => ({
            month: new Date(`${month}-01`).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
            }),
            photosUploaded: data.count,
            sizeUploadedMB: data.totalSize / (1024 * 1024),
            averageOptimization:
              data.count > 0 ? (data.optimizedCount / data.count) * 100 : 0,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Calculate monthly trend (last 3 months average)
        if (monthlyStats.length >= 2) {
          const recentMonths = monthlyStats.slice(-3);
          stats.monthlyUploadTrend =
            recentMonths.reduce((sum, month) => sum + month.photosUploaded, 0) /
            recentMonths.length;
        }
      }

      // Calculate projections if requested
      if (includeProjections && monthlyStats.length >= 2) {
        const recentMonths = monthlyStats.slice(-3);
        const avgMonthlyPhotos =
          recentMonths.reduce((sum, m) => sum + m.photosUploaded, 0) /
          recentMonths.length;
        const avgMonthlySizeMB =
          recentMonths.reduce((sum, m) => sum + m.sizeUploadedMB, 0) /
          recentMonths.length;

        const remainingSpaceBytes = FREE_TIER_LIMIT_BYTES - totalSizeBytes;
        const monthsUntilFull =
          avgMonthlySizeMB > 0
            ? remainingSpaceBytes / (1024 * 1024) / avgMonthlySizeMB
            : Infinity;

        const recommendedActions: string[] = [];

        if (freetierUsagePercent > 80) {
          recommendedActions.push(
            'Considerar limpiar fotos antiguas o eventos finalizados'
          );
          recommendedActions.push('Revisar configuración de optimización');
        }

        if (avgMonthlyPhotos > 1000) {
          recommendedActions.push(
            'Alto volumen detectado - monitorear uso mensual'
          );
        }

        if (compressionRatio < 60) {
          recommendedActions.push(
            'Optimización por debajo del objetivo - verificar FreeTierOptimizer'
          );
        }

        if (monthsUntilFull < 6 && monthsUntilFull > 0) {
          recommendedActions.push(
            'Planificar migración a plan pagado en los próximos meses'
          );
        }

        projection = {
          currentTrend: avgMonthlyPhotos,
          projectedMonthlyPhotos: Math.round(avgMonthlyPhotos),
          projectedMonthlySizeMB: avgMonthlySizeMB,
          monthsUntilFull: Math.min(monthsUntilFull, 999), // Cap at 999 months
          recommendedActions,
        };
      }

      logger.info('Successfully calculated storage stats', {
        requestId,
        eventId: eventId || 'global',
        totalPhotos,
        totalSizeMB: Math.round(totalSizeMB * 100) / 100,
        freetierUsagePercent: Math.round(freetierUsagePercent * 100) / 100,
      });

      return NextResponse.json({
        success: true,
        stats,
        monthlyStats: includeMonthlyStats ? monthlyStats : undefined,
        projection: includeProjections ? projection : undefined,
        metadata: {
          eventId: eventId || null,
          calculatedAt: new Date().toISOString(),
          freeTierLimitGB: FREE_TIER_LIMIT_GB,
          targetSizeKB: TARGET_SIZE_KB,
          estimatedMaxPhotos: ESTIMATED_MAX_PHOTOS,
        },
      });
    } catch (error) {
      logger.error('Unexpected error in storage stats endpoint', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);
