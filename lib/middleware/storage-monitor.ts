/**
 * Storage Monitor Middleware
 *
 * Monitors Supabase storage usage and automatically applies optimizations
 * Ensures the application stays within the 1GB free tier limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface StorageStats {
  totalUsed: number;
  totalAvailable: number;
  usagePercentage: number;
  filesCount: number;
  lastCleanup: string | null;
}

interface OptimizationRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  description: string;
  estimatedSavings?: number;
}

export class StorageMonitor {
  private static readonly STORAGE_LIMITS = {
    SUPABASE_FREE_TIER: 1024 * 1024 * 1024, // 1GB
    WARNING_THRESHOLD: 0.75, // 75%
    CRITICAL_THRESHOLD: 0.9, // 90%
    CLEANUP_THRESHOLD: 0.85, // 85%
  };

  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static lastCheck: number = 0;
  private static cachedStats: StorageStats | null = null;

  /**
   * Get current storage statistics
   */
  static async getStorageStats(forceRefresh = false): Promise<StorageStats> {
    const now = Date.now();

    // Return cached stats if still valid
    if (
      !forceRefresh &&
      this.cachedStats &&
      now - this.lastCheck < this.CACHE_DURATION
    ) {
      return this.cachedStats;
    }

    try {
      const supabase = await createServerSupabaseServiceClient();

      // Get all files in storage buckets
      const buckets = ['photos', 'assets', 'optimized-photos'];
      let totalUsed = 0;
      let filesCount = 0;

      for (const bucket of buckets) {
        try {
          const { data: files, error } = await supabase.storage
            .from(bucket)
            .list('', {
              limit: 1000,
              sortBy: { column: 'created_at', order: 'desc' },
            });

          if (!error && files) {
            for (const file of files) {
              if (file.metadata?.size) {
                totalUsed += file.metadata.size;
                filesCount++;
              }
            }
          }
        } catch (bucketError) {
          console.warn(
            `Failed to get stats for bucket ${bucket}:`,
            bucketError
          );
        }
      }

      // Get last cleanup timestamp
      const { data: cleanupRecord } = await supabase
        .from('system_logs')
        .select('created_at')
        .eq('action', 'storage_cleanup')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const stats: StorageStats = {
        totalUsed,
        totalAvailable: this.STORAGE_LIMITS.SUPABASE_FREE_TIER,
        usagePercentage:
          (totalUsed / this.STORAGE_LIMITS.SUPABASE_FREE_TIER) * 100,
        filesCount,
        lastCleanup: cleanupRecord?.created_at || null,
      };

      // Cache the results
      this.cachedStats = stats;
      this.lastCheck = now;

      // Log storage usage if significant
      if (stats.usagePercentage > 50) {
        console.log('[Storage Monitor] Current usage:', {
          used: `${(stats.totalUsed / 1024 / 1024).toFixed(2)} MB`,
          percentage: `${stats.usagePercentage.toFixed(1)}%`,
          files: stats.filesCount,
        });
      }

      return stats;
    } catch (error) {
      console.error('[Storage Monitor] Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Get optimization recommendations based on current usage
   */
  static async getOptimizationRecommendations(): Promise<
    OptimizationRecommendation[]
  > {
    const stats = await this.getStorageStats();
    const recommendations: OptimizationRecommendation[] = [];

    if (stats.usagePercentage > this.STORAGE_LIMITS.CRITICAL_THRESHOLD * 100) {
      recommendations.push({
        priority: 'critical',
        action: 'immediate_cleanup',
        description:
          'Storage usage is critically high. Immediate cleanup required.',
        estimatedSavings: stats.totalUsed * 0.3, // Estimate 30% savings
      });

      recommendations.push({
        priority: 'critical',
        action: 'enable_external_storage',
        description: 'Enable external storage for new large files immediately.',
      });
    } else if (
      stats.usagePercentage >
      this.STORAGE_LIMITS.WARNING_THRESHOLD * 100
    ) {
      recommendations.push({
        priority: 'high',
        action: 'optimize_existing_images',
        description: 'Optimize existing images to WebP format.',
        estimatedSavings: stats.totalUsed * 0.4, // Estimate 40% savings
      });

      recommendations.push({
        priority: 'medium',
        action: 'setup_external_storage',
        description: 'Prepare external storage for large files.',
      });
    } else if (stats.usagePercentage > 50) {
      recommendations.push({
        priority: 'medium',
        action: 'regular_optimization',
        description: 'Implement regular image optimization.',
        estimatedSavings: stats.totalUsed * 0.2, // Estimate 20% savings
      });
    } else {
      recommendations.push({
        priority: 'low',
        action: 'monitoring',
        description: 'Continue monitoring storage usage.',
      });
    }

    return recommendations;
  }

  /**
   * Automatic cleanup of old and unused files
   */
  static async performAutomaticCleanup(): Promise<{
    filesDeleted: number;
    spaceFreed: number;
    recommendations: OptimizationRecommendation[];
  }> {
    const stats = await this.getStorageStats(true);

    // Only perform cleanup if above cleanup threshold
    if (stats.usagePercentage < this.STORAGE_LIMITS.CLEANUP_THRESHOLD * 100) {
      return {
        filesDeleted: 0,
        spaceFreed: 0,
        recommendations: await this.getOptimizationRecommendations(),
      };
    }

    const supabase = await createServerSupabaseServiceClient();
    let filesDeleted = 0;
    let spaceFreed = 0;

    try {
      // Clean up old temporary files (older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: oldTempFiles } = await supabase.storage
        .from('photos')
        .list('temp/', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'asc' },
        });

      if (oldTempFiles) {
        for (const file of oldTempFiles) {
          if (new Date(file.created_at) < sevenDaysAgo) {
            const { error } = await supabase.storage
              .from('photos')
              .remove([`temp/${file.name}`]);

            if (!error) {
              filesDeleted++;
              spaceFreed += file.metadata?.size || 0;
            }
          }
        }
      }

      // Clean up duplicate optimized versions
      const { data: optimizedFiles } = await supabase.storage
        .from('optimized-photos')
        .list('', { limit: 200 });

      if (optimizedFiles) {
        const fileMap = new Map<string, any[]>();

        // Group files by base name
        optimizedFiles.forEach((file) => {
          const baseName = file.name.replace(/^(thumb_|prev_|wm_)/, '');
          if (!fileMap.has(baseName)) {
            fileMap.set(baseName, []);
          }
          fileMap.get(baseName)!.push(file);
        });

        // Remove excess versions (keep only the most recent 2 of each type)
        for (const [baseName, files] of fileMap) {
          const thumbFiles = files
            .filter((f) => f.name.startsWith('thumb_'))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );
          const previewFiles = files
            .filter((f) => f.name.startsWith('prev_'))
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );

          // Delete old thumbnail versions (keep latest 2)
          const oldThumbs = thumbFiles.slice(2);
          for (const oldFile of oldThumbs) {
            const { error } = await supabase.storage
              .from('optimized-photos')
              .remove([oldFile.name]);

            if (!error) {
              filesDeleted++;
              spaceFreed += oldFile.metadata?.size || 0;
            }
          }

          // Delete old preview versions (keep latest 2)
          const oldPreviews = previewFiles.slice(2);
          for (const oldFile of oldPreviews) {
            const { error } = await supabase.storage
              .from('optimized-photos')
              .remove([oldFile.name]);

            if (!error) {
              filesDeleted++;
              spaceFreed += oldFile.metadata?.size || 0;
            }
          }
        }
      }

      // Log cleanup activity
      await supabase.from('system_logs').insert({
        action: 'storage_cleanup',
        details: {
          files_deleted: filesDeleted,
          space_freed: spaceFreed,
          usage_before: stats.usagePercentage,
        },
        created_at: new Date().toISOString(),
      });

      console.log('[Storage Monitor] Cleanup completed:', {
        filesDeleted,
        spaceFreed: `${(spaceFreed / 1024 / 1024).toFixed(2)} MB`,
      });
    } catch (error) {
      console.error('[Storage Monitor] Cleanup failed:', error);
    }

    return {
      filesDeleted,
      spaceFreed,
      recommendations: await this.getOptimizationRecommendations(),
    };
  }

  /**
   * Middleware to check storage before file uploads
   */
  static async checkStorageBeforeUpload(
    request: NextRequest,
    fileSize: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const stats = await this.getStorageStats();
      const projectedUsage =
        (stats.totalUsed + fileSize) / stats.totalAvailable;

      // Block uploads if they would exceed critical threshold
      if (projectedUsage > this.STORAGE_LIMITS.CRITICAL_THRESHOLD) {
        return {
          allowed: false,
          reason:
            'Storage limit reached. Please contact administrator for cleanup.',
        };
      }

      // Trigger automatic cleanup if approaching warning threshold
      if (projectedUsage > this.STORAGE_LIMITS.WARNING_THRESHOLD) {
        // Run cleanup in background
        this.performAutomaticCleanup().catch((error) =>
          console.error('[Storage Monitor] Background cleanup failed:', error)
        );
      }

      return { allowed: true };
    } catch (error) {
      console.error('[Storage Monitor] Error checking storage:', error);
      // Allow upload if check fails (fail open)
      return { allowed: true };
    }
  }

  /**
   * Get storage usage report for admin dashboard
   */
  static async getUsageReport(): Promise<{
    stats: StorageStats;
    recommendations: OptimizationRecommendation[];
    recentCleanups: any[];
    projections: {
      daysUntilFull: number;
      recommendedActions: string[];
    };
  }> {
    const stats = await this.getStorageStats(true);
    const recommendations = await this.getOptimizationRecommendations();

    const supabase = await createServerSupabaseServiceClient();

    // Get recent cleanup history
    const { data: recentCleanups } = await supabase
      .from('system_logs')
      .select('*')
      .eq('action', 'storage_cleanup')
      .order('created_at', { ascending: false })
      .limit(5);

    // Calculate projections based on recent usage trends
    const daysUntilFull =
      stats.usagePercentage < 90
        ? Math.floor((100 - stats.usagePercentage) / 2) // Rough estimate: 2% growth per day
        : 0;

    const recommendedActions = recommendations
      .filter((r) => r.priority === 'high' || r.priority === 'critical')
      .map((r) => r.description);

    return {
      stats,
      recommendations,
      recentCleanups: recentCleanups || [],
      projections: {
        daysUntilFull,
        recommendedActions,
      },
    };
  }
}
