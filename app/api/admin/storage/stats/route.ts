import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { verifyAuthAdmin } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

interface StorageStats {
  totalPhotos: number;
  totalSizeMB: number;
  optimizedSizeMB: number;
  originalSizeMB: number;
  savingsMB: number;
  savingsPercentage: number;
  freeTierUsagePercentage: number;
  bucketUsage: {
    previews: number;
    originals: number;
    watermarks: number;
  };
  compressionStats: {
    level0: number;
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  dailyUploads: Array<{
    date: string;
    count: number;
    sizeMB: number;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const user = await verifyAuthAdmin();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';
    
    // Calculate date range
    const now = new Date();
    let daysAgo = 30;
    switch (range) {
      case '7d':
        daysAgo = 7;
        break;
      case '30d':
        daysAgo = 30;
        break;
      case '90d':
        daysAgo = 90;
        break;
    }
    
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);
    
    // Get total photo count and sizes
    const { data: photoStats, error: photoStatsError } = await supabase
      .from('photos')
      .select(`
        count(),
        total_size:sum(file_size),
        avg_metadata:avg(metadata)
      `)
      .gte('created_at', startDate.toISOString());
      
    if (photoStatsError) {
      throw new Error(`Failed to fetch photo stats: ${photoStatsError.message}`);
    }
    
    const totalPhotos = photoStats[0]?.count || 0;
    const totalSizeBytes = photoStats[0]?.total_size || 0;
    const totalSizeMB = Math.round(totalSizeBytes / (1024 * 1024));
    
    // Calculate original sizes from metadata
    let originalSizeMB = 0;
    if (photoStats[0]?.avg_metadata) {
      try {
        const avgMetadata = photoStats[0].avg_metadata;
        const avgOriginalSize = avgMetadata.original_size || 0;
        originalSizeMB = Math.round((avgOriginalSize * totalPhotos) / (1024 * 1024));
      } catch (e) {
        // Fallback if metadata parsing fails
        originalSizeMB = totalSizeMB * 4; // Estimate 4x compression ratio
      }
    } else {
      originalSizeMB = totalSizeMB * 4; // Estimate 4x compression ratio
    }
    
    const savingsMB = originalSizeMB - totalSizeMB;
    const savingsPercentage = originalSizeMB > 0 ? Math.round((savingsMB / originalSizeMB) * 100) : 0;
    const freeTierUsagePercentage = Math.min(100, Math.round((totalSizeMB / 1024) * 100)); // 1GB limit
    
    // Get compression level distribution
    const { data: compressionStats, error: compressionError } = await supabase
      .from('photos')
      .select('metadata')
      .gte('created_at', startDate.toISOString())
      .limit(10000); // Limit for performance
      
    if (compressionError) {
      throw new Error(`Failed to fetch compression stats: ${compressionError.message}`);
    }
    
    // Count compression levels
    const compressionCounts = {
      level0: 0,
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0,
      level5: 0
    };
    
    compressionStats.forEach(photo => {
      if (photo.metadata?.compression_level !== undefined) {
        const level = Math.min(5, Math.max(0, Math.floor(photo.metadata.compression_level)));
        compressionCounts[`level${level}` as keyof typeof compressionCounts]++;
      } else {
        compressionCounts.level3++; // Default if not specified
      }
    });
    
    // Get daily upload stats
    const { data: dailyStats, error: dailyError } = await supabase
      .from('photos')
      .select('created_at, file_size')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });
      
    if (dailyError) {
      throw new Error(`Failed to fetch daily stats: ${dailyError.message}`);
    }
    
    // Group by date
    const dailyUploads: Record<string, { count: number; sizeBytes: number }> = {};
    
    dailyStats.forEach(photo => {
      const date = new Date(photo.created_at).toISOString().split('T')[0];
      if (!dailyUploads[date]) {
        dailyUploads[date] = { count: 0, sizeBytes: 0 };
      }
      dailyUploads[date].count++;
      dailyUploads[date].sizeBytes += photo.file_size || 0;
    });
    
    // Convert to array format
    const dailyUploadsArray = Object.entries(dailyUploads).map(([date, stats]) => ({
      date,
      count: stats.count,
      sizeMB: Math.round(stats.sizeBytes / (1024 * 1024))
    }));
    
    // Fill in missing dates
    const filledDailyUploads = [];
    for (let i = 0; i < daysAgo; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existing = dailyUploadsArray.find(d => d.date === dateStr);
      if (existing) {
        filledDailyUploads.push(existing);
      } else {
        filledDailyUploads.push({
          date: dateStr,
          count: 0,
          sizeMB: 0
        });
      }
    }
    
    const stats: StorageStats = {
      totalPhotos,
      totalSizeMB,
      optimizedSizeMB: totalSizeMB,
      originalSizeMB,
      savingsMB,
      savingsPercentage,
      freeTierUsagePercentage,
      bucketUsage: {
        previews: totalSizeMB,
        originals: 0, // No originals stored per free tier optimization
        watermarks: 0 // Watermarks are same as previews now
      },
      compressionStats,
      dailyUploads: filledDailyUploads
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage statistics' },
      { status: 500 }
    );
  }
}