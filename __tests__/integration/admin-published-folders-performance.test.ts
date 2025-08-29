import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { folderPublishService } from '@/lib/services/folder-publish.service';
import { PerformanceMonitor } from '@/lib/utils/performance';

describe('Admin Published Folders Performance Tests', () => {
  let supabase: ReturnType<typeof createServerSupabaseServiceClient>;
  let testEventId: string;
  let testFolderIds: string[] = [];
  let monitor: PerformanceMonitor;

  beforeAll(async () => {
    supabase = createServerSupabaseServiceClient();
    monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics(); // Clear previous metrics

    // Create test event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Performance Test Event',
        date: '2024-01-01',
        description: 'Test event for performance testing',
      })
      .select('id')
      .single();

    if (eventError) throw eventError;
    testEventId = eventData.id;

    // Create test folders with various depths and photo counts
    const foldersToCreate = [
      { name: 'Root Folder 1', depth: 0, photo_count: 25 },
      { name: 'Root Folder 2', depth: 0, photo_count: 30 },
      { name: 'Child Folder 1', depth: 1, photo_count: 15 },
      { name: 'Child Folder 2', depth: 1, photo_count: 20 },
      { name: 'Grandchild Folder', depth: 2, photo_count: 10 },
    ];

    for (const folderData of foldersToCreate) {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: folderData.name,
          event_id: testEventId,
          depth: folderData.depth,
          photo_count: folderData.photo_count,
          is_published: true,
          share_token: `test_token_${Math.random().toString(36).substr(2, 9)}`,
          published_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;
      testFolderIds.push(data.id);
    }

    // Create some assets for testing count accuracy
    const assetsToCreate = [];
    for (let i = 0; i < testFolderIds.length; i++) {
      const folderId = testFolderIds[i];
      const assetCount = foldersToCreate[i].photo_count;

      for (let j = 0; j < assetCount; j++) {
        assetsToCreate.push({
          folder_id: folderId,
          filename: `test-photo-${i}-${j}.jpg`,
          original_path: `/test/photo-${i}-${j}.jpg`,
          file_size: 1024 * 1024, // 1MB
          checksum: `checksum_${i}_${j}`,
          mime_type: 'image/jpeg',
          status: 'ready',
        });
      }
    }

    // Insert assets in batches
    const batchSize = 20;
    for (let i = 0; i < assetsToCreate.length; i += batchSize) {
      const batch = assetsToCreate.slice(i, i + batchSize);
      const { error } = await supabase.from('assets').insert(batch);
      if (error) throw error;
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testEventId) {
      // Delete assets first (foreign key constraint)
      await supabase.from('assets').delete().in('folder_id', testFolderIds);

      // Delete folders
      await supabase.from('folders').delete().in('id', testFolderIds);

      // Delete event
      await supabase.from('events').delete().eq('id', testEventId);
    }
  });

  describe('Performance Benchmarks', () => {
    it('should fetch published folders in under 200ms for basic query', async () => {
      const params = {
        event_id: testEventId,
        page: 1,
        limit: 50,
        include_unpublished: false,
      };

      const startTime = performance.now();
      const result = await folderPublishService.getPublishedFolders(params);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.folders).toHaveLength(5);
      expect(duration).toBeLessThan(200); // Target: <200ms

      console.log(`[PERF TEST] Basic query took ${duration.toFixed(2)}ms`);
    });

    it('should handle pagination efficiently', async () => {
      const params = {
        event_id: testEventId,
        page: 1,
        limit: 3,
        include_unpublished: false,
      };

      const startTime = performance.now();
      const result = await folderPublishService.getPublishedFolders(params);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.folders).toHaveLength(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(duration).toBeLessThan(150); // Should be even faster with fewer results

      console.log(`[PERF TEST] Paginated query took ${duration.toFixed(2)}ms`);
    });

    it('should handle search queries efficiently', async () => {
      const params = {
        event_id: testEventId,
        search: 'Root',
        page: 1,
        limit: 50,
        include_unpublished: false,
      };

      const startTime = performance.now();
      const result = await folderPublishService.getPublishedFolders(params);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.folders).toHaveLength(2); // Should find 2 root folders
      expect(result.folders.every((f) => f.name.includes('Root'))).toBe(true);
      expect(duration).toBeLessThan(250); // Search might be slightly slower

      console.log(`[PERF TEST] Search query took ${duration.toFixed(2)}ms`);
    });

    it('should maintain accurate photo counts', async () => {
      const params = {
        event_id: testEventId,
        page: 1,
        limit: 50,
        include_unpublished: false,
      };

      const result = await folderPublishService.getPublishedFolders(params);

      expect(result.success).toBe(true);

      // Verify photo counts match what we created
      const expectedCounts = [25, 30, 15, 20, 10];
      const actualCounts = result.folders
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => f.photo_count);

      expect(actualCounts).toEqual(expectedCounts.sort());
    });

    it('should generate correct URLs for published folders', async () => {
      const params = {
        event_id: testEventId,
        page: 1,
        limit: 50,
        include_unpublished: false,
      };

      const result = await folderPublishService.getPublishedFolders(params);

      expect(result.success).toBe(true);

      result.folders.forEach((folder) => {
        expect(folder.share_token).toBeDefined();
        expect(folder.family_url).toBeDefined();
        expect(folder.qr_url).toBeDefined();
        expect(folder.family_url).toMatch(/^\/f\/test_token_/);
        expect(folder.qr_url).toMatch(/^\/api\/qr\?token=test_token_/);
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should record performance metrics', async () => {
      // Clear metrics before test
      monitor.clearMetrics();

      const params = {
        event_id: testEventId,
        page: 1,
        limit: 10,
        include_unpublished: false,
      };

      await folderPublishService.getPublishedFolders(params);

      const stats = monitor.getDbStats('getPublishedFolders');

      expect(stats.totalQueries).toBeGreaterThan(0);
      expect(stats.avgResponseTime).toBeGreaterThan(0);
      expect(stats.avgResponseTime).toBeLessThan(500); // Should be well under 500ms
      expect(stats.errorRate).toBe(0); // No errors expected
    });

    it('should provide performance summary', async () => {
      const summary = monitor.getPerformanceSummary();

      expect(summary).toHaveProperty('currentStats');
      expect(summary).toHaveProperty('recentOperations');
      expect(summary).toHaveProperty('alerts');

      expect(summary.currentStats.avgResponseTime).toBeGreaterThan(0);
      expect(summary.recentOperations.length).toBeGreaterThan(0);

      // Check for performance alerts
      if (summary.alerts.length > 0) {
        console.warn('[PERF] Performance alerts:', summary.alerts);
      }
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const params = {
        event_id: testEventId,
        page: 1,
        limit: 10,
        include_unpublished: false,
      };

      const concurrentRequests = 5;
      const startTime = performance.now();

      // Execute concurrent requests
      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => folderPublishService.getPublishedFolders(params));

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentRequests;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.folders.length).toBeGreaterThan(0);
      });

      // Average duration should still be reasonable
      expect(avgDuration).toBeLessThan(300); // 300ms average for concurrent requests

      console.log(
        `[PERF TEST] ${concurrentRequests} concurrent requests: avg ${avgDuration.toFixed(2)}ms`
      );
    });

    it('should scale with larger result sets', async () => {
      // Test with maximum page size
      const params = {
        event_id: testEventId,
        page: 1,
        limit: 100, // Maximum allowed
        include_unpublished: false,
      };

      const startTime = performance.now();
      const result = await folderPublishService.getPublishedFolders(params);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.folders).toHaveLength(5); // We only have 5 folders
      expect(duration).toBeLessThan(300); // Should handle large limits efficiently

      console.log(
        `[PERF TEST] Large page size (100) took ${duration.toFixed(2)}ms`
      );
    });
  });

  describe('N+1 Query Elimination Verification', () => {
    it('should execute minimal database queries', async () => {
      // Clear metrics to get clean counts
      monitor.clearMetrics();

      const params = {
        event_id: testEventId,
        page: 1,
        limit: 50,
        include_unpublished: false,
      };

      await folderPublishService.getPublishedFolders(params);

      const stats = monitor.getDbStats('getPublishedFolders');

      // Should be exactly 1 query operation recorded (count + data in parallel)
      expect(stats.totalQueries).toBe(1);

      console.log(`[PERF TEST] Query count: ${stats.totalQueries} (target: 1)`);
    });

    it('should maintain consistent performance regardless of folder count', async () => {
      const durations: number[] = [];

      // Test with different page sizes to verify O(1) performance
      const testCases = [
        { limit: 1, expectedResults: 1 },
        { limit: 3, expectedResults: 3 },
        { limit: 5, expectedResults: 5 },
      ];

      for (const testCase of testCases) {
        const params = {
          event_id: testEventId,
          page: 1,
          limit: testCase.limit,
          include_unpublished: false,
        };

        const startTime = performance.now();
        const result = await folderPublishService.getPublishedFolders(params);
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(result.success).toBe(true);
        expect(result.folders).toHaveLength(testCase.expectedResults);

        durations.push(duration);
      }

      // Performance should be relatively consistent (no exponential growth)
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      const ratio = maxDuration / minDuration;

      expect(ratio).toBeLessThan(3); // Max variation should be < 3x

      console.log(
        '[PERF TEST] Duration consistency:',
        durations.map((d) => `${d.toFixed(2)}ms`).join(', ')
      );
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle invalid event_id efficiently', async () => {
      const params = {
        event_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        page: 1,
        limit: 10,
        include_unpublished: false,
      };

      const startTime = performance.now();
      const result = await folderPublishService.getPublishedFolders(params);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.folders).toHaveLength(0); // No results for invalid event
      expect(duration).toBeLessThan(100); // Should be very fast for no results
    });
  });
});
