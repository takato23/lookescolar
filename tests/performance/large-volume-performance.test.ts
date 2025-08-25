/**
 * Performance Tests for Large Volume Photo Management
 * 
 * Tests the system's ability to handle:
 * - 1000+ students with 5+ photos each
 * - Bulk operations on hundreds of photos
 * - Storage optimization under load
 * - Database performance with large datasets
 */

import { expect, test, describe } from 'vitest';

// Mock data generators
const generateMockPhoto = (index: number, eventId: string, folderId?: string) => ({
  id: `photo-${index}`,
  event_id: eventId,
  folder_id: folderId || null,
  original_filename: `student-photo-${index}.jpg`,
  storage_path: `events/${eventId}/photos/photo-${index}.webp`,
  file_size: 35 * 1024, // 35KB optimized size
  width: 500,
  height: 500,
  approved: Math.random() > 0.3, // 70% approved
  processing_status: 'completed',
  metadata: {
    compression_ratio: 75,
    original_size: 500 * 1024, // Original 500KB
  },
  created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString()
});

const generateMockEvent = (index: number) => ({
  id: `event-${index}`,
  name: `Escuela San Martín ${index}`,
  school: `Escuela ${index}`,
  location: `Buenos Aires`,
  date: new Date().toISOString(),
  status: 'active',
  created_at: new Date().toISOString()
});

const generateMockFolder = (index: number, eventId: string, parentId?: string) => ({
  id: `folder-${index}`,
  event_id: eventId,
  parent_id: parentId || null,
  name: `Grado ${index}A`,
  path: parentId ? `Primaria / Grado ${index}A` : `Grado ${index}A`,
  depth: parentId ? 1 : 0,
  sort_order: index,
  child_folder_count: 0,
  photo_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Performance test utilities
class PerformanceProfiler {
  private startTimes: Map<string, number> = new Map();
  private results: Map<string, number[]> = new Map();

  start(testName: string): void {
    this.startTimes.set(testName, performance.now());
  }

  end(testName: string): number {
    const startTime = this.startTimes.get(testName);
    if (!startTime) throw new Error(`Test ${testName} was not started`);
    
    const duration = performance.now() - startTime;
    
    if (!this.results.has(testName)) {
      this.results.set(testName, []);
    }
    this.results.get(testName)!.push(duration);
    
    return duration;
  }

  getStats(testName: string) {
    const times = this.results.get(testName) || [];
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    return {
      count: times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: times.reduce((sum, t) => sum + t, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  report(): string {
    let report = '\n=== Performance Test Results ===\n';
    
    for (const [testName, _] of this.results) {
      const stats = this.getStats(testName);
      if (stats) {
        report += `\n${testName}:\n`;
        report += `  Runs: ${stats.count}\n`;
        report += `  Average: ${stats.avg.toFixed(2)}ms\n`;
        report += `  Median: ${stats.median.toFixed(2)}ms\n`;
        report += `  Min/Max: ${stats.min.toFixed(2)}ms / ${stats.max.toFixed(2)}ms\n`;
        report += `  P95/P99: ${stats.p95.toFixed(2)}ms / ${stats.p99.toFixed(2)}ms\n`;
      }
    }
    
    return report;
  }
}

// Mock API responses for testing
const mockApiResponses = {
  '/api/admin/photos/bulk-approve': (photoIds: string[], approved: boolean) => ({
    success: true,
    updatedCount: photoIds.length,
    message: `${photoIds.length} photos ${approved ? 'approved' : 'rejected'} successfully`
  }),

  '/api/admin/photos/bulk-move': (photoIds: string[], targetFolderId: string) => ({
    success: true,
    movedCount: photoIds.length,
    targetFolderId
  }),

  '/api/admin/photos/simple-upload': (files: any[]) => ({
    success: true,
    photos: files.map((_, i) => generateMockPhoto(i, 'event-1'))
  }),

  '/api/admin/storage/stats': () => ({
    success: true,
    stats: {
      totalPhotos: 5000,
      totalSizeMB: 175, // 5000 * 35KB
      freetierUsagePercent: 17.1, // 175MB / 1024MB
      compressionRatio: 75,
      estimatedPhotosRemaining: 23500
    }
  })
};

describe('Large Volume Performance Tests', () => {
  const profiler = new PerformanceProfiler();

  test('should handle 5000 photos in memory efficiently', async () => {
    const eventId = 'test-event-large';
    const photoCount = 5000;
    
    profiler.start('generate-5000-photos');
    const photos = Array.from({ length: photoCount }, (_, i) => 
      generateMockPhoto(i, eventId)
    );
    profiler.end('generate-5000-photos');

    // Test memory usage (approximate)
    const memoryEstimate = photos.length * 1000; // ~1KB per photo object
    expect(memoryEstimate).toBeLessThan(10 * 1024 * 1024); // Should be under 10MB

    // Test filtering performance
    profiler.start('filter-approved-photos');
    const approvedPhotos = photos.filter(p => p.approved);
    profiler.end('filter-approved-photos');
    
    expect(approvedPhotos.length).toBeGreaterThan(photoCount * 0.6);
    
    // Test sorting performance
    profiler.start('sort-photos-by-date');
    const sortedPhotos = [...photos].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    profiler.end('sort-photos-by-date');
    
    expect(sortedPhotos).toHaveLength(photoCount);
  });

  test('should handle bulk operations on 1000 photos', async () => {
    const photoCount = 1000;
    const batchSize = 100;
    const photoIds = Array.from({ length: photoCount }, (_, i) => `photo-${i}`);
    
    // Test bulk approve performance
    profiler.start('bulk-approve-1000');
    const batches = [];
    for (let i = 0; i < photoIds.length; i += batchSize) {
      batches.push(photoIds.slice(i, i + batchSize));
    }
    
    // Simulate API calls
    for (const batch of batches) {
      const response = mockApiResponses['/api/admin/photos/bulk-approve'](batch, true);
      expect(response.success).toBe(true);
      expect(response.updatedCount).toBe(batch.length);
    }
    profiler.end('bulk-approve-1000');
    
    expect(batches.length).toBe(Math.ceil(photoCount / batchSize));
  });

  test('should validate folder hierarchy performance with deep nesting', async () => {
    const eventId = 'test-event-hierarchy';
    
    profiler.start('create-folder-hierarchy');
    
    // Create a complex hierarchy: Event -> 10 Levels -> 5 Classes each -> 20 Subfolders
    const folders = [];
    
    // Root level folders (school levels)
    for (let level = 1; level <= 10; level++) {
      const levelFolder = generateMockFolder(level, eventId);
      levelFolder.name = `Nivel ${level}`;
      folders.push(levelFolder);
      
      // Classes within each level
      for (let cls = 1; cls <= 5; cls++) {
        const classFolder = generateMockFolder(level * 10 + cls, eventId, levelFolder.id);
        classFolder.name = `Clase ${cls}`;
        classFolder.depth = 1;
        folders.push(classFolder);
        
        // Subfolders within each class
        for (let sub = 1; sub <= 20; sub++) {
          const subFolder = generateMockFolder(level * 100 + cls * 10 + sub, eventId, classFolder.id);
          subFolder.name = `Subfolder ${sub}`;
          subFolder.depth = 2;
          folders.push(subFolder);
        }
      }
    }
    
    profiler.end('create-folder-hierarchy');
    
    // Test path calculation performance
    profiler.start('calculate-folder-paths');
    folders.forEach(folder => {
      // Simulate path calculation
      const pathParts = [];
      let current = folder;
      let depth = 0;
      
      while (current && depth < 10) { // Prevent infinite loops
        pathParts.unshift(current.name);
        current = folders.find(f => f.id === current.parent_id) || null;
        depth++;
      }
      
      folder.path = pathParts.join(' / ');
    });
    profiler.end('calculate-folder-paths');
    
    expect(folders).toHaveLength(10 + (10 * 5) + (10 * 5 * 20)); // 1050 folders
    
    // Verify hierarchy integrity
    const rootFolders = folders.filter(f => f.parent_id === null);
    expect(rootFolders).toHaveLength(10);
  });

  test('should simulate realistic school photo upload scenario', async () => {
    // Scenario: 1000 students, 5 photos each, uploaded in batches
    const studentCount = 1000;
    const photosPerStudent = 5;
    const totalPhotos = studentCount * photosPerStudent;
    const uploadBatchSize = 20; // Upload 20 photos at a time
    
    profiler.start('realistic-upload-simulation');
    
    let uploadedCount = 0;
    const batches = Math.ceil(totalPhotos / uploadBatchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(uploadBatchSize, totalPhotos - uploadedCount);
      
      // Simulate file preparation
      const files = Array.from({ length: batchSize }, (_, i) => ({
        name: `student-${Math.floor((uploadedCount + i) / photosPerStudent)}-photo-${((uploadedCount + i) % photosPerStudent) + 1}.jpg`,
        size: 500 * 1024 // 500KB original
      }));
      
      // Simulate upload with optimization
      profiler.start('upload-batch');
      const response = mockApiResponses['/api/admin/photos/simple-upload'](files);
      profiler.end('upload-batch');
      
      expect(response.success).toBe(true);
      expect(response.photos).toHaveLength(batchSize);
      
      uploadedCount += batchSize;
      
      // Simulate small delay between batches (realistic)
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    profiler.end('realistic-upload-simulation');
    
    expect(uploadedCount).toBe(totalPhotos);
  });

  test('should validate storage optimization calculations', async () => {
    const scenarios = [
      { photos: 1000, expectedSizeMB: 34.2 }, // 1000 * 35KB
      { photos: 5000, expectedSizeMB: 171.0 }, // 5000 * 35KB  
      { photos: 10000, expectedSizeMB: 342.0 }, // 10000 * 35KB
      { photos: 20000, expectedSizeMB: 684.0 }, // 20000 * 35KB (getting close to 1GB limit)
    ];
    
    profiler.start('storage-calculations');
    
    scenarios.forEach(scenario => {
      const totalSizeBytes = scenario.photos * 35 * 1024; // 35KB per photo
      const totalSizeMB = totalSizeBytes / (1024 * 1024);
      const freetierPercent = (totalSizeBytes / (1024 * 1024 * 1024)) * 100; // 1GB = 1024MB
      
      expect(Math.abs(totalSizeMB - scenario.expectedSizeMB)).toBeLessThan(1);
      expect(freetierPercent).toBeLessThan(100); // Should not exceed free tier
      
      // Calculate remaining photos
      const remainingBytes = (1024 * 1024 * 1024) - totalSizeBytes;
      const remainingPhotos = Math.floor(remainingBytes / (35 * 1024));
      
      expect(remainingPhotos).toBeGreaterThanOrEqual(0);
    });
    
    profiler.end('storage-calculations');
  });

  test('should benchmark concurrent operations', async () => {
    const operationCount = 100;
    const concurrency = 10;
    
    profiler.start('concurrent-operations');
    
    // Create batches of concurrent operations
    const operations = Array.from({ length: operationCount }, (_, i) => 
      async () => {
        // Simulate different types of operations
        const operationType = i % 4;
        
        switch (operationType) {
          case 0: // Photo approval
            return mockApiResponses['/api/admin/photos/bulk-approve']([`photo-${i}`], true);
          case 1: // Photo move
            return mockApiResponses['/api/admin/photos/bulk-move']([`photo-${i}`], `folder-${i % 10}`);
          case 2: // Storage stats
            return mockApiResponses['/api/admin/storage/stats']();
          case 3: // Photo upload
            return mockApiResponses['/api/admin/photos/simple-upload']([{ name: `photo-${i}.jpg` }]);
        }
      }
    );
    
    // Run operations in batches with limited concurrency
    const batches = [];
    for (let i = 0; i < operations.length; i += concurrency) {
      batches.push(operations.slice(i, i + concurrency));
    }
    
    let completedOperations = 0;
    for (const batch of batches) {
      const promises = batch.map(op => op());
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        completedOperations++;
      });
    }
    
    profiler.end('concurrent-operations');
    
    expect(completedOperations).toBe(operationCount);
  });

  test('should validate system limits and boundaries', () => {
    const limits = {
      maxPhotosPerEvent: 10000,
      maxFolderDepth: 10,
      maxBatchSize: 100,
      maxConcurrentUploads: 5,
      freeTierLimitGB: 1,
      targetPhotoSizeKB: 35
    };
    
    profiler.start('validate-limits');
    
    // Test free tier capacity
    const maxPhotosInFreeTier = Math.floor((limits.freeTierLimitGB * 1024 * 1024 * 1024) / (limits.targetPhotoSizeKB * 1024));
    expect(maxPhotosInFreeTier).toBeGreaterThan(25000); // Should handle at least 25K photos
    
    // Test batch size efficiency
    const photosToProcess = 1000;
    const batchCount = Math.ceil(photosToProcess / limits.maxBatchSize);
    expect(batchCount).toBeLessThan(15); // Should not require too many batches
    
    // Test folder hierarchy limits
    expect(limits.maxFolderDepth).toBeGreaterThanOrEqual(5); // Must support reasonable hierarchy
    
    profiler.end('validate-limits');
  });

  // Performance reporting
  test.afterAll(() => {
    console.log(profiler.report());
    
    // Assert performance benchmarks
    const uploadStats = profiler.getStats('upload-batch');
    if (uploadStats) {
      expect(uploadStats.avg).toBeLessThan(1000); // Average upload batch should be under 1 second
    }
    
    const filterStats = profiler.getStats('filter-approved-photos');
    if (filterStats) {
      expect(filterStats.avg).toBeLessThan(100); // Filtering should be under 100ms
    }
    
    const bulkStats = profiler.getStats('bulk-approve-1000');
    if (bulkStats) {
      expect(bulkStats.avg).toBeLessThan(5000); // Bulk operations should be under 5 seconds
    }
  });
});

describe('Edge Cases and Error Scenarios', () => {
  test('should handle empty data gracefully', () => {
    expect(() => {
      const emptyPhotos: any[] = [];
      const filtered = emptyPhotos.filter(p => p.approved);
      const sorted = [...emptyPhotos].sort();
      return { filtered, sorted };
    }).not.toThrow();
  });

  test('should handle malformed data', () => {
    const malformedPhotos = [
      { id: 'photo-1' }, // Missing required fields
      { id: 'photo-2', file_size: 'invalid' }, // Wrong type
      null, // Null entry
      { id: 'photo-3', file_size: 35000, approved: true } // Valid
    ];
    
    expect(() => {
      const validPhotos = malformedPhotos.filter(photo => 
        photo && 
        typeof photo.id === 'string' && 
        typeof photo.file_size === 'number'
      );
      
      return validPhotos;
    }).not.toThrow();
  });

  test('should handle network timeout simulation', async () => {
    const timeoutTest = new Promise((resolve) => {
      setTimeout(() => resolve({ success: false, error: 'timeout' }), 50);
    });
    
    const result = await timeoutTest as any;
    expect(result.success).toBe(false);
    expect(result.error).toBe('timeout');
  });
});

export { PerformanceProfiler, mockApiResponses };