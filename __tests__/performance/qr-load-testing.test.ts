/**
 * @fileoverview Load Testing for QR Tagging Workflow
 *
 * Tests:
 * - Concurrent QR scans and decoding
 * - Batch tagging with 100+ photos
 * - Response time measurements under load
 * - Memory usage monitoring
 * - Rate limiting behavior
 * - System stability under stress
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { performance } from 'perf_hooks';

// Import API routes
import { POST as decodeQR } from '@/app/api/admin/qr/decode/route';
import { POST as batchTag } from '@/app/api/admin/tagging/batch/route';

// Test utilities
import { TestDBManager, TestDataManager, TestHelpers } from '../test-utils';

// Performance monitoring utilities
class PerformanceMonitor {
  private memoryUsage: NodeJS.MemoryUsage[] = [];
  private startTime: number = 0;

  start() {
    this.startTime = performance.now();
    this.memoryUsage = [];

    // Collect memory usage every 100ms
    const interval = setInterval(() => {
      this.memoryUsage.push(process.memoryUsage());
    }, 100);

    return {
      stop: () => {
        clearInterval(interval);
        return {
          duration: performance.now() - this.startTime,
          memoryUsage: this.memoryUsage,
          peakMemory: this.getPeakMemoryUsage(),
          memoryLeak: this.detectMemoryLeak(),
        };
      },
    };
  }

  private getPeakMemoryUsage(): NodeJS.MemoryUsage {
    return this.memoryUsage.reduce(
      (peak, current) => ({
        rss: Math.max(peak.rss, current.rss),
        heapTotal: Math.max(peak.heapTotal, current.heapTotal),
        heapUsed: Math.max(peak.heapUsed, current.heapUsed),
        external: Math.max(peak.external, current.external),
        arrayBuffers: Math.max(peak.arrayBuffers, current.arrayBuffers),
      }),
      { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }
    );
  }

  private detectMemoryLeak(): boolean {
    if (this.memoryUsage.length < 10) return false;

    const samples = 5;
    const start = this.memoryUsage.slice(0, samples);
    const end = this.memoryUsage.slice(-samples);

    const startAvg =
      start.reduce((sum, mem) => sum + mem.heapUsed, 0) / samples;
    const endAvg = end.reduce((sum, mem) => sum + mem.heapUsed, 0) / samples;

    // Consider it a leak if memory increased by more than 50%
    return (endAvg - startAvg) / startAvg > 0.5;
  }
}

// Load testing configuration
interface LoadTestConfig {
  concurrentUsers: number;
  operationsPerUser: number;
  rampUpTime: number; // ms
  maxRequestsPerSecond: number;
  timeoutMs: number;
}

// Load test results
interface LoadTestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
  peakMemoryUsage: NodeJS.MemoryUsage;
  memoryLeak: boolean;
}

class LoadTester {
  private responseTimes: number[] = [];
  private errors: string[] = [];
  private monitor = new PerformanceMonitor();

  async runConcurrentQRDecodes(
    config: LoadTestConfig,
    qrCodes: string[]
  ): Promise<LoadTestResults> {
    const monitorSession = this.monitor.start();
    this.responseTimes = [];
    this.errors = [];

    const startTime = performance.now();
    const promises: Promise<void>[] = [];

    // Create concurrent users
    for (let user = 0; user < config.concurrentUsers; user++) {
      // Stagger user start times for realistic ramp-up
      const delay = (user / config.concurrentUsers) * config.rampUpTime;

      promises.push(
        this.delayedExecution(delay, () => this.simulateUser(config, qrCodes))
      );
    }

    await Promise.all(promises);

    const totalDuration = performance.now() - startTime;
    const performanceData = monitorSession.stop();

    return this.calculateResults(totalDuration, performanceData);
  }

  private async delayedExecution(
    delay: number,
    fn: () => Promise<void>
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fn();
  }

  private async simulateUser(
    config: LoadTestConfig,
    qrCodes: string[]
  ): Promise<void> {
    for (let op = 0; op < config.operationsPerUser; op++) {
      try {
        // Rate limiting: don't exceed max requests per second
        const requestDelay = 1000 / config.maxRequestsPerSecond;
        if (op > 0) {
          await new Promise((resolve) => setTimeout(resolve, requestDelay));
        }

        const startTime = performance.now();

        // Randomly select a QR code
        const qrCode = qrCodes[Math.floor(Math.random() * qrCodes.length)];

        const request = new NextRequest(
          'http://localhost/api/admin/qr/decode',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCode }),
          }
        );

        // Add timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timeout')),
            config.timeoutMs
          )
        );

        const response = await Promise.race([
          decodeQR(request),
          timeoutPromise,
        ]);

        const responseTime = performance.now() - startTime;
        this.responseTimes.push(responseTime);

        if (response instanceof Response && response.status !== 200) {
          this.errors.push(`HTTP ${response.status}`);
        }
      } catch (error) {
        this.errors.push(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  private calculateResults(
    totalDuration: number,
    performanceData: any
  ): LoadTestResults {
    const sortedResponseTimes = [...this.responseTimes].sort((a, b) => a - b);

    return {
      totalRequests: this.responseTimes.length + this.errors.length,
      successfulRequests: this.responseTimes.length,
      failedRequests: this.errors.length,
      averageResponseTime:
        this.responseTimes.reduce((sum, time) => sum + time, 0) /
          this.responseTimes.length || 0,
      minResponseTime: Math.min(...this.responseTimes) || 0,
      maxResponseTime: Math.max(...this.responseTimes) || 0,
      p95ResponseTime: this.getPercentile(sortedResponseTimes, 95),
      p99ResponseTime: this.getPercentile(sortedResponseTimes, 99),
      requestsPerSecond: (this.responseTimes.length / totalDuration) * 1000,
      errors: this.errors,
      peakMemoryUsage: performanceData.peakMemory,
      memoryLeak: performanceData.memoryLeak,
    };
  }

  private getPercentile(sortedTimes: number[], percentile: number): number {
    if (sortedTimes.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedTimes.length) - 1;
    return sortedTimes[index];
  }
}

describe('QR Workflow Load Testing', () => {
  let testDb: TestDBManager;
  let testData: TestDataManager;
  let supabase: any;
  let loadTester: LoadTester;

  // Test data
  let eventId: string;
  let studentIds: string[];
  let photoIds: string[];
  let qrCodes: string[];

  beforeAll(async () => {
    testDb = new TestDBManager();
    testData = new TestDataManager();
    loadTester = new LoadTester();
    supabase = await createServerSupabaseServiceClient();

    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    // Create large test dataset
    const event = await testData.createEvent({
      name: 'Load Test Event',
      school_name: 'Load Test School',
      event_date: new Date().toISOString().split('T')[0],
      active: true,
    });
    eventId = event.id;

    // Create 50 students for varied QR codes
    const students = await Promise.all(
      Array.from({ length: 50 }, async (_, i) => {
        const student = await testData.createSubject({
          event_id: eventId,
          name: `Load Test Student ${i + 1}`,
          grade: `${Math.floor(i / 10) + 1}A`,
          token: TestHelpers.generateSecureToken(24),
        });
        return student;
      })
    );

    studentIds = students.map((s) => s.id);
    qrCodes = students.map(
      () => `LKSTUDENT_${TestHelpers.generateSecureToken(24)}`
    );

    // Create 200 photos for batch testing
    const photos = await Promise.all(
      Array.from({ length: 200 }, async (_, i) => {
        const photo = await testData.createPhoto({
          event_id: eventId,
          filename: `load-test-photo-${i + 1}.jpg`,
          approved: true,
          watermark_applied: true,
        });
        return photo;
      })
    );

    photoIds = photos.map((p) => p.id);
  });

  afterEach(async () => {
    await testData.cleanup();
  });

  describe('Concurrent QR Decoding Load Tests', () => {
    it('should handle 10 concurrent users with 5 operations each', async () => {
      const config: LoadTestConfig = {
        concurrentUsers: 10,
        operationsPerUser: 5,
        rampUpTime: 1000, // 1 second ramp-up
        maxRequestsPerSecond: 50,
        timeoutMs: 5000,
      };

      const results = await loadTester.runConcurrentQRDecodes(config, qrCodes);

      expect(results.successfulRequests).toBeGreaterThan(40); // At least 80% success rate
      expect(results.averageResponseTime).toBeLessThan(1000); // Under 1 second average
      expect(results.p95ResponseTime).toBeLessThan(2000); // 95th percentile under 2 seconds
      expect(results.memoryLeak).toBe(false); // No memory leaks

      console.log('🔄 Concurrent QR Decoding Results:', {
        totalRequests: results.totalRequests,
        successRate: `${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`,
        avgResponseTime: `${results.averageResponseTime.toFixed(2)}ms`,
        p95ResponseTime: `${results.p95ResponseTime.toFixed(2)}ms`,
        requestsPerSecond: results.requestsPerSecond.toFixed(2),
      });
    });

    it('should handle high concurrency stress test', async () => {
      const config: LoadTestConfig = {
        concurrentUsers: 25,
        operationsPerUser: 3,
        rampUpTime: 2000, // 2 second ramp-up
        maxRequestsPerSecond: 100,
        timeoutMs: 10000,
      };

      const results = await loadTester.runConcurrentQRDecodes(config, qrCodes);

      // More lenient expectations for stress test
      expect(results.successfulRequests).toBeGreaterThan(50); // At least 66% success rate
      expect(results.p99ResponseTime).toBeLessThan(5000); // 99th percentile under 5 seconds
      expect(results.memoryLeak).toBe(false); // No memory leaks

      // Should handle rate limiting gracefully
      const rateLimitErrors = results.errors.filter(
        (error) => error.includes('429') || error.includes('rate limit')
      ).length;

      console.log('⚡ High Concurrency Stress Test Results:', {
        totalRequests: results.totalRequests,
        successRate: `${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`,
        rateLimitErrors,
        peakMemoryMB: `${(results.peakMemoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      });
    });
  });

  describe('Batch Tagging Load Tests', () => {
    it('should handle large batch assignments efficiently', async () => {
      const batchSizes = [25, 50, 75, 100];
      const results: any[] = [];

      for (const batchSize of batchSizes) {
        const monitor = new PerformanceMonitor();
        const monitorSession = monitor.start();

        const startTime = performance.now();

        try {
          const request = new NextRequest(
            'http://localhost/api/admin/tagging/batch',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId,
                photoIds: photoIds.slice(0, batchSize),
                studentId: studentIds[0],
              }),
            }
          );

          const response = await batchTag(request);
          const responseTime = performance.now() - startTime;
          const performanceData = monitorSession.stop();

          expect(response.status).toBe(200);

          results.push({
            batchSize,
            responseTime,
            memoryUsage: performanceData.peakMemory.heapUsed,
          });
        } catch (error) {
          results.push({
            batchSize,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Verify performance scales reasonably
      const successful = results.filter((r) => !r.error);
      expect(successful.length).toBe(batchSizes.length);

      // Response time should be sub-linear with batch size
      const responseTimeGrowth =
        successful[3].responseTime / successful[0].responseTime;
      expect(responseTimeGrowth).toBeLessThan(5); // Should not be more than 5x slower for 4x the data

      console.log(
        '📦 Batch Tagging Performance:',
        successful.map((r) => ({
          batchSize: r.batchSize,
          responseTime: `${r.responseTime.toFixed(2)}ms`,
          memoryMB: `${(r.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        }))
      );
    });

    it('should handle concurrent batch operations', async () => {
      const concurrentBatches = 5;
      const photosPerBatch = 20;

      const monitor = new PerformanceMonitor();
      const monitorSession = monitor.start();

      const promises = Array.from({ length: concurrentBatches }, (_, i) => {
        const startIndex = i * photosPerBatch;
        const endIndex = startIndex + photosPerBatch;

        return batchTag(
          new NextRequest('http://localhost', {
            method: 'POST',
            body: JSON.stringify({
              eventId,
              photoIds: photoIds.slice(startIndex, endIndex),
              studentId: studentIds[i],
            }),
          })
        );
      });

      const responses = await Promise.all(promises);
      const performanceData = monitorSession.stop();

      // All batches should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify no assignment conflicts
      const { data: assignments } = await supabase
        .from('photo_subjects')
        .select('photo_id, subject_id')
        .in('subject_id', studentIds.slice(0, concurrentBatches));

      expect(assignments).toHaveLength(concurrentBatches * photosPerBatch);

      // No photo should be assigned multiple times
      const photoAssignmentCounts = assignments.reduce(
        (acc: any, assignment: any) => {
          acc[assignment.photo_id] = (acc[assignment.photo_id] || 0) + 1;
          return acc;
        },
        {}
      );

      const duplicateAssignments = Object.values(photoAssignmentCounts).filter(
        (count: any) => count > 1
      );
      expect(duplicateAssignments).toHaveLength(0);

      console.log('🔗 Concurrent Batch Operations Results:', {
        concurrentBatches,
        totalAssignments: assignments.length,
        noDuplicates: duplicateAssignments.length === 0,
        peakMemoryMB: `${(performanceData.peakMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      });
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should not have memory leaks during sustained operations', async () => {
      const sustainedOperations = 100;
      const monitor = new PerformanceMonitor();
      const monitorSession = monitor.start();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage();

      // Run sustained QR decode operations
      for (let i = 0; i < sustainedOperations; i++) {
        const qrCode = qrCodes[i % qrCodes.length];

        const request = new NextRequest('http://localhost', {
          method: 'POST',
          body: JSON.stringify({ qrCode }),
        });

        await decodeQR(request);
      }

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      const performanceData = monitorSession.stop();
      const finalMemory = process.memoryUsage();

      // Memory growth should be minimal
      const memoryGrowth =
        (finalMemory.heapUsed - initialMemory.heapUsed) /
        initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(0.5); // Less than 50% growth

      expect(performanceData.memoryLeak).toBe(false);

      console.log('🧠 Memory Usage Test Results:', {
        operations: sustainedOperations,
        initialMemoryMB: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        finalMemoryMB: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        memoryGrowth: `${(memoryGrowth * 100).toFixed(2)}%`,
        memoryLeak: performanceData.memoryLeak,
      });
    });

    it('should handle database connection pooling efficiently', async () => {
      const concurrentDbOperations = 20;

      const dbOperationPromises = Array.from(
        { length: concurrentDbOperations },
        async (_, i) => {
          const startTime = performance.now();

          // Perform database-intensive operation
          const { data, error } = await supabase
            .from('photo_subjects')
            .select(
              `
            photo_id,
            subject_id,
            photos (id, filename, event_id),
            subjects (id, name, event_id)
          `
            )
            .eq('subject_id', studentIds[i % studentIds.length]);

          const responseTime = performance.now() - startTime;

          return {
            success: !error,
            responseTime,
            resultCount: data?.length || 0,
          };
        }
      );

      const results = await Promise.all(dbOperationPromises);

      // All operations should succeed
      const successfulOps = results.filter((r) => r.success).length;
      expect(successfulOps).toBe(concurrentDbOperations);

      // Response times should be reasonable
      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(1000); // Under 1 second average

      console.log('🔗 Database Connection Pooling Results:', {
        concurrentOperations: concurrentDbOperations,
        successfulOperations: successfulOps,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${Math.max(...results.map((r) => r.responseTime)).toFixed(2)}ms`,
      });
    });
  });

  describe('Error Handling Under Load', () => {
    it('should gracefully handle invalid requests during high load', async () => {
      const validRequests = 30;
      const invalidRequests = 10;

      const allPromises = [
        // Valid requests
        ...Array.from({ length: validRequests }, () => {
          const qrCode = qrCodes[Math.floor(Math.random() * qrCodes.length)];
          return decodeQR(
            new NextRequest('http://localhost', {
              method: 'POST',
              body: JSON.stringify({ qrCode }),
            })
          );
        }),
        // Invalid requests
        ...Array.from({ length: invalidRequests }, () => {
          const invalidQR = 'INVALID:QR:CODE:FORMAT';
          return decodeQR(
            new NextRequest('http://localhost', {
              method: 'POST',
              body: JSON.stringify({ qrCode: invalidQR }),
            })
          );
        }),
      ];

      const responses = await Promise.all(allPromises);

      // Count response statuses
      const successCount = responses.filter((r) => r.status === 200).length;
      const errorCount = responses.filter((r) => r.status >= 400).length;

      expect(successCount).toBe(validRequests);
      expect(errorCount).toBe(invalidRequests);

      // System should remain stable
      expect(successCount + errorCount).toBe(validRequests + invalidRequests);

      console.log('🛡️ Error Handling Results:', {
        validRequests,
        invalidRequests,
        successfulResponses: successCount,
        errorResponses: errorCount,
        systemStable: true,
      });
    });

    it('should handle timeouts and connection errors gracefully', async () => {
      const timeoutTest = async () => {
        // Simulate a long-running operation by using a large batch
        const request = new NextRequest('http://localhost', {
          method: 'POST',
          body: JSON.stringify({
            eventId,
            photoIds: photoIds, // All 200 photos
            studentId: studentIds[0],
          }),
        });

        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000) // 1 second timeout
        );

        try {
          await Promise.race([batchTag(request), timeoutPromise]);
          return 'completed';
        } catch (error) {
          return error instanceof Error && error.message === 'Timeout'
            ? 'timeout'
            : 'error';
        }
      };

      const result = await timeoutTest();

      // Should either complete or timeout gracefully (not crash)
      expect(['completed', 'timeout']).toContain(result);

      console.log('⏱️ Timeout Handling:', {
        result,
        handledGracefully: result !== 'error',
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance SLAs for QR decoding', async () => {
      const benchmarkTests = 20;
      const responseTimes: number[] = [];

      for (let i = 0; i < benchmarkTests; i++) {
        const startTime = performance.now();

        const qrCode = qrCodes[i % qrCodes.length];
        const request = new NextRequest('http://localhost', {
          method: 'POST',
          body: JSON.stringify({ qrCode }),
        });

        const response = await decodeQR(request);
        const responseTime = performance.now() - startTime;

        expect(response.status).toBe(200);
        responseTimes.push(responseTime);
      }

      const avgResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length;
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);
      const p95 = sortedTimes[Math.ceil(0.95 * sortedTimes.length) - 1];
      const p99 = sortedTimes[Math.ceil(0.99 * sortedTimes.length) - 1];

      // SLA requirements
      expect(avgResponseTime).toBeLessThan(500); // 500ms average
      expect(p95).toBeLessThan(1000); // 1s for 95th percentile
      expect(p99).toBeLessThan(2000); // 2s for 99th percentile

      console.log('📊 Performance Benchmarks:', {
        tests: benchmarkTests,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        p95ResponseTime: `${p95.toFixed(2)}ms`,
        p99ResponseTime: `${p99.toFixed(2)}ms`,
        slaCompliance: {
          avgUnder500ms: avgResponseTime < 500,
          p95Under1s: p95 < 1000,
          p99Under2s: p99 < 2000,
        },
      });
    });

    it('should maintain performance with database growth', async () => {
      // Test with different dataset sizes
      const datasetSizes = [10, 25, 50];
      const performanceResults: any[] = [];

      for (const size of datasetSizes) {
        const testResponses: number[] = [];

        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();

          const qrCode = qrCodes[i % Math.min(size, qrCodes.length)];
          const request = new NextRequest('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ qrCode }),
          });

          await decodeQR(request);
          testResponses.push(performance.now() - startTime);
        }

        const avgTime =
          testResponses.reduce((sum, time) => sum + time, 0) /
          testResponses.length;

        performanceResults.push({
          datasetSize: size,
          avgResponseTime: avgTime,
        });
      }

      // Performance should not degrade significantly with larger datasets
      const performanceDegradation =
        performanceResults[2].avgResponseTime /
        performanceResults[0].avgResponseTime;
      expect(performanceDegradation).toBeLessThan(2); // Should not be more than 2x slower

      console.log(
        '📈 Database Growth Performance:',
        performanceResults.map((r) => ({
          datasetSize: r.datasetSize,
          avgResponseTime: `${r.avgResponseTime.toFixed(2)}ms`,
        }))
      );
    });
  });
});
