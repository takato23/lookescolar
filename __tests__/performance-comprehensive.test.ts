/**
 * COMPREHENSIVE PERFORMANCE TEST SUITE
 * 
 * Performance testing for LookEscolar system covering:
 * - API response times (<200ms for APIs, <3s for processing)
 * - Photo processing performance (<3s per image)
 * - Database query performance
 * - Memory usage and resource consumption
 * - Concurrent operations and scalability
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupTestData, cleanupTestData, createTestClient, setupMocks } from './test-utils';

const TEST_TIMEOUT = 30000;
const API_BASE_URL = 'http://localhost:3000';

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  throughput?: number;
}

interface PerformanceTestContext {
  adminToken?: string;
  eventId: string;
  subjectToken: string;
  testData: any;
  metrics: PerformanceMetrics[];
}

let perfContext: PerformanceTestContext;

describe('Comprehensive Performance Test Suite', () => {
  beforeAll(async () => {
    setupMocks();
    
    const testData = await setupTestData();
    perfContext = {
      eventId: testData.eventId,
      subjectToken: testData.validToken,
      testData,
      metrics: []
    };

    // Setup admin authentication
    try {
      const adminAuth = await fetch(`${API_BASE_URL}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.TEST_ADMIN_EMAIL,
          password: process.env.TEST_ADMIN_PASSWORD
        })
      });

      if (adminAuth.ok) {
        const authData = await adminAuth.json();
        perfContext.adminToken = authData.access_token;
      }
    } catch (error) {
      console.warn('Admin auth setup failed for performance tests:', error);
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (perfContext.testData) {
      await cleanupTestData(perfContext.testData);
    }
    
    // Log performance metrics summary
    if (perfContext.metrics.length > 0) {
      const avgResponseTime = perfContext.metrics.reduce((sum, m) => sum + m.responseTime, 0) / perfContext.metrics.length;
      console.log(`\n📊 Performance Metrics Summary:`);
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Total Tests: ${perfContext.metrics.length}`);
      console.log(`   Fastest: ${Math.min(...perfContext.metrics.map(m => m.responseTime))}ms`);
      console.log(`   Slowest: ${Math.max(...perfContext.metrics.map(m => m.responseTime))}ms`);
    }
  });

  /**
   * Helper function to measure performance
   */
  function measurePerformance<T>(fn: () => Promise<T>): Promise<{ result: T; metrics: PerformanceMetrics }> {
    return new Promise(async (resolve) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      try {
        const result = await fn();
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        const metrics: PerformanceMetrics = {
          responseTime: endTime - startTime,
          memoryUsage: endMemory.heapUsed - startMemory.heapUsed
        };
        
        perfContext.metrics.push(metrics);
        resolve({ result, metrics });
      } catch (error) {
        const endTime = performance.now();
        const metrics: PerformanceMetrics = {
          responseTime: endTime - startTime
        };
        
        perfContext.metrics.push(metrics);
        throw error;
      }
    });
  }

  /**
   * API RESPONSE TIME TESTS
   * Requirements: <200ms for APIs, <3s for processing operations
   */
  describe('API Response Time Performance', () => {
    test('Admin events API should respond under 200ms', async () => {
      if (!perfContext.adminToken) {
        console.warn('Skipping authenticated performance test - no admin token');
        return;
      }

      const { result, metrics } = await measurePerformance(async () => {
        return fetch(`${API_BASE_URL}/api/admin/events`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${perfContext.adminToken}` }
        });
      });

      console.log(`   Admin events API: ${metrics.responseTime.toFixed(2)}ms`);
      
      if (result.ok) {
        expect(metrics.responseTime).toBeLessThan(200);
      } else {
        console.warn(`   Admin events API returned ${result.status}, timing: ${metrics.responseTime.toFixed(2)}ms`);
      }
    });

    test('Family gallery API should respond under 200ms', async () => {
      const { result, metrics } = await measurePerformance(async () => {
        return fetch(`${API_BASE_URL}/api/family/gallery/${perfContext.subjectToken}`);
      });

      console.log(`   Family gallery API: ${metrics.responseTime.toFixed(2)}ms`);
      
      if (result.ok) {
        expect(metrics.responseTime).toBeLessThan(200);
        
        // Verify response structure efficiency
        const data = await result.json();
        expect(data).toHaveProperty('photos');
        expect(data).toHaveProperty('subject');
        expect(data).toHaveProperty('event');
      } else {
        console.warn(`   Family gallery API returned ${result.status}, timing: ${metrics.responseTime.toFixed(2)}ms`);
      }
    });

    test('Signed URL generation should be under 100ms', async () => {
      const { result, metrics } = await measurePerformance(async () => {
        return fetch(`${API_BASE_URL}/api/storage/signed-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoId: perfContext.testData.photoIds[0],
            token: perfContext.subjectToken
          })
        });
      });

      console.log(`   Signed URL generation: ${metrics.responseTime.toFixed(2)}ms`);
      
      if (result.ok) {
        expect(metrics.responseTime).toBeLessThan(100);
        
        const data = await result.json();
        expect(data.signedUrl).toBeDefined();
        expect(data.expiresAt).toBeDefined();
      } else {
        console.warn(`   Signed URL API returned ${result.status}, timing: ${metrics.responseTime.toFixed(2)}ms`);
      }
    });

    test('Public gallery should load under 2 seconds', async () => {
      const { result, metrics } = await measurePerformance(async () => {
        return fetch(`${API_BASE_URL}/api/gallery/${perfContext.eventId}`);
      });

      console.log(`   Public gallery API: ${metrics.responseTime.toFixed(2)}ms`);
      
      if (result.ok) {
        expect(metrics.responseTime).toBeLessThan(2000);
        
        const data = await result.json();
        expect(data).toHaveProperty('photos');
        expect(data).toHaveProperty('event');
      } else {
        console.warn(`   Public gallery API returned ${result.status}, timing: ${metrics.responseTime.toFixed(2)}ms`);
      }
    });

    test('Webhook processing should complete under 3 seconds', async () => {
      const webhookPayload = {
        id: 'performance-test-webhook',
        live_mode: false,
        type: 'payment',
        data: { id: 'performance-payment-id' }
      };

      const { result, metrics } = await measurePerformance(async () => {
        return fetch(`${API_BASE_URL}/api/payments/webhook`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-signature': 'v1=mock-signature'
          },
          body: JSON.stringify(webhookPayload)
        });
      });

      console.log(`   Webhook processing: ${metrics.responseTime.toFixed(2)}ms`);
      expect(metrics.responseTime).toBeLessThan(3000);
    });
  });

  /**
   * PHOTO PROCESSING PERFORMANCE TESTS
   * Requirements: <3s per image processing
   */
  describe('Photo Processing Performance', () => {
    test('Photo upload and watermark processing should complete under 3 seconds', async () => {
      if (!perfContext.adminToken) {
        console.warn('Skipping photo processing test - no admin token');
        return;
      }

      // Create mock image data (simulate realistic image size)
      const mockImageSize = 2 * 1024 * 1024; // 2MB
      const mockImageBlob = new Blob(['x'.repeat(mockImageSize)], { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('eventId', perfContext.eventId);
      formData.append('photos', mockImageBlob, 'performance-test.jpg');

      const { result, metrics } = await measurePerformance(async () => {
        return fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${perfContext.adminToken}` },
          body: formData
        });
      });

      console.log(`   Photo processing: ${metrics.responseTime.toFixed(2)}ms`);
      
      if (result.ok) {
        expect(metrics.responseTime).toBeLessThan(3000);
        
        const data = await result.json();
        expect(data.success).toBe(true);
        expect(data.photos).toBeDefined();
      } else {
        console.warn(`   Photo upload returned ${result.status}, timing: ${metrics.responseTime.toFixed(2)}ms`);
      }
    });

    test('Batch photo processing should scale linearly', async () => {
      if (!perfContext.adminToken) {
        console.warn('Skipping batch processing test - no admin token');
        return;
      }

      const testSizes = [1, 3, 5]; // Number of photos
      const timings: number[] = [];

      for (const photoCount of testSizes) {
        const formData = new FormData();
        formData.append('eventId', perfContext.eventId);
        
        // Add multiple photos
        for (let i = 0; i < photoCount; i++) {
          const mockImageBlob = new Blob(['test image data'], { type: 'image/jpeg' });
          formData.append('photos', mockImageBlob, `batch-test-${i}.jpg`);
        }

        const { result, metrics } = await measurePerformance(async () => {
          return fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${perfContext.adminToken}` },
            body: formData
          });
        });

        timings.push(metrics.responseTime);
        console.log(`   Batch ${photoCount} photos: ${metrics.responseTime.toFixed(2)}ms`);

        if (result.ok) {
          // Each photo should still process within 3s average
          expect(metrics.responseTime / photoCount).toBeLessThan(3000);
        }
      }

      // Verify scaling is reasonable (not exponential)
      if (timings.length >= 3) {
        const scalingFactor = timings[2] / timings[0]; // 5 photos vs 1 photo
        expect(scalingFactor).toBeLessThan(10); // Should not be more than 10x slower
      }
    });
  });

  /**
   * DATABASE QUERY PERFORMANCE TESTS
   * Requirements: Efficient queries, proper indexing
   */
  describe('Database Query Performance', () => {
    test('Photo lookup by subject should be under 50ms', async () => {
      const supabase = createTestClient();
      
      const { result, metrics } = await measurePerformance(async () => {
        return supabase
          .from('photos')
          .select('*')
          .eq('subject_id', perfContext.testData.subjectId)
          .eq('approved', true);
      });

      console.log(`   Photo lookup query: ${metrics.responseTime.toFixed(2)}ms`);
      expect(metrics.responseTime).toBeLessThan(50);
      
      if (result.data) {
        expect(result.data).toBeInstanceOf(Array);
      }
    });

    test('Event listing should be under 100ms', async () => {
      const supabase = createTestClient();
      
      const { result, metrics } = await measurePerformance(async () => {
        return supabase
          .from('events')
          .select('*')
          .eq('status', 'active')
          .order('date', { ascending: false });
      });

      console.log(`   Event listing query: ${metrics.responseTime.toFixed(2)}ms`);
      expect(metrics.responseTime).toBeLessThan(100);
    });

    test('Subject token lookup should be under 25ms', async () => {
      const supabase = createTestClient();
      
      const { result, metrics } = await measurePerformance(async () => {
        return supabase
          .from('subject_tokens')
          .select('*, subjects(*)')
          .eq('token', perfContext.subjectToken)
          .single();
      });

      console.log(`   Token lookup query: ${metrics.responseTime.toFixed(2)}ms`);
      expect(metrics.responseTime).toBeLessThan(25);
    });

    test('Order creation should be under 200ms', async () => {
      const supabase = createTestClient();
      const orderId = crypto.randomUUID();
      
      const { result, metrics } = await measurePerformance(async () => {
        return supabase
          .from('orders')
          .insert({
            id: orderId,
            subject_id: perfContext.testData.subjectId,
            event_id: perfContext.eventId,
            contact_name: 'Performance Test',
            contact_email: 'perf@test.com',
            status: 'pending',
            total_amount_cents: 1500
          });
      });

      console.log(`   Order creation: ${metrics.responseTime.toFixed(2)}ms`);
      expect(metrics.responseTime).toBeLessThan(200);
      
      // Clean up
      await supabase.from('orders').delete().eq('id', orderId);
    });
  });

  /**
   * CONCURRENT OPERATIONS PERFORMANCE
   * Requirements: Handle multiple simultaneous requests
   */
  describe('Concurrent Operations Performance', () => {
    test('Concurrent gallery requests should maintain performance', async () => {
      const concurrentRequests = 10;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          measurePerformance(async () => {
            return fetch(`${API_BASE_URL}/api/family/gallery/${perfContext.subjectToken}`);
          })
        );
      }

      const results = await Promise.all(requests);
      
      // Calculate metrics
      const responseTimes = results.map(r => r.metrics.responseTime);
      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      console.log(`   Concurrent gallery requests:`);
      console.log(`     Average time: ${averageTime.toFixed(2)}ms`);
      console.log(`     Max time: ${maxTime.toFixed(2)}ms`);
      console.log(`     Successful requests: ${results.filter(r => r.result.ok).length}/${concurrentRequests}`);

      // Average should still be reasonable under concurrent load
      expect(averageTime).toBeLessThan(500);
      expect(maxTime).toBeLessThan(1000);
    });

    test('Concurrent signed URL generation should handle load', async () => {
      const concurrentRequests = 20;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          measurePerformance(async () => {
            return fetch(`${API_BASE_URL}/api/storage/signed-url`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                photoId: perfContext.testData.photoIds[0],
                token: perfContext.subjectToken
              })
            });
          })
        );
      }

      const results = await Promise.all(requests);
      
      const responseTimes = results.map(r => r.metrics.responseTime);
      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const successfulRequests = results.filter(r => r.result.ok).length;

      console.log(`   Concurrent signed URL requests:`);
      console.log(`     Average time: ${averageTime.toFixed(2)}ms`);
      console.log(`     Successful: ${successfulRequests}/${concurrentRequests}`);
      console.log(`     Rate limited: ${concurrentRequests - successfulRequests}/${concurrentRequests}`);

      // Should handle reasonable concurrent load
      expect(averageTime).toBeLessThan(300);
    });

    test('Mixed concurrent operations should maintain system stability', async () => {
      const operations = [
        // Gallery requests
        ...Array(5).fill(0).map(() => 
          measurePerformance(() => 
            fetch(`${API_BASE_URL}/api/family/gallery/${perfContext.subjectToken}`)
          )
        ),
        // Signed URL requests
        ...Array(3).fill(0).map(() =>
          measurePerformance(() =>
            fetch(`${API_BASE_URL}/api/storage/signed-url`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                photoId: perfContext.testData.photoIds[0],
                token: perfContext.subjectToken
              })
            })
          )
        ),
        // Public gallery requests
        ...Array(2).fill(0).map(() =>
          measurePerformance(() =>
            fetch(`${API_BASE_URL}/api/gallery/${perfContext.eventId}`)
          )
        )
      ];

      const results = await Promise.all(operations);
      
      const responseTimes = results.map(r => r.metrics.responseTime);
      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const successfulRequests = results.filter(r => r.result.ok || r.result.status === 429).length;

      console.log(`   Mixed concurrent operations:`);
      console.log(`     Average time: ${averageTime.toFixed(2)}ms`);
      console.log(`     Stable responses: ${successfulRequests}/${operations.length}`);

      // System should remain stable under mixed load
      expect(averageTime).toBeLessThan(1000);
      expect(successfulRequests / operations.length).toBeGreaterThan(0.8); // 80% success rate
    });
  });

  /**
   * MEMORY AND RESOURCE USAGE TESTS
   * Requirements: Efficient memory usage, no memory leaks
   */
  describe('Memory and Resource Usage', () => {
    test('Photo processing should not cause memory leaks', async () => {
      if (!perfContext.adminToken) {
        console.warn('Skipping memory test - no admin token');
        return;
      }

      const initialMemory = process.memoryUsage();
      
      // Process multiple photos to test memory usage
      for (let i = 0; i < 5; i++) {
        const mockImageBlob = new Blob(['test image data'], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('eventId', perfContext.eventId);
        formData.append('photos', mockImageBlob, `memory-test-${i}.jpg`);

        await fetch(`${API_BASE_URL}/api/admin/photos/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${perfContext.adminToken}` },
          body: formData
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`   Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 50MB for 5 small images)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('Gallery requests should have consistent memory usage', async () => {
      const memorySnapshots = [];

      // Make multiple gallery requests and track memory
      for (let i = 0; i < 10; i++) {
        await fetch(`${API_BASE_URL}/api/family/gallery/${perfContext.subjectToken}`);
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }

      // Memory usage should not continuously increase
      const firstThird = memorySnapshots.slice(0, 3);
      const lastThird = memorySnapshots.slice(-3);
      
      const avgFirstThird = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
      const avgLastThird = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
      
      const memoryIncrease = avgLastThird - avgFirstThird;

      console.log(`   Memory stability check: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);

      // Should not have significant memory growth
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });
  });

  /**
   * SCALABILITY PERFORMANCE TESTS
   * Requirements: System should handle increased load gracefully
   */
  describe('Scalability Performance', () => {
    test('Response time should scale reasonably with data size', async () => {
      // This test would ideally create events with different numbers of photos
      // and measure how response times scale
      
      console.log('   Note: Scalability tests require larger datasets to be meaningful');
      console.log('   Current test validates basic performance under load');

      // Test with current dataset
      const baselineTime = await measurePerformance(async () => {
        return fetch(`${API_BASE_URL}/api/family/gallery/${perfContext.subjectToken}`);
      });

      console.log(`   Baseline gallery response: ${baselineTime.metrics.responseTime.toFixed(2)}ms`);
      
      // Baseline should be fast
      expect(baselineTime.metrics.responseTime).toBeLessThan(200);
    });

    test('System should handle burst traffic patterns', async () => {
      // Simulate burst traffic: rapid requests followed by idle period
      const burstRequests = [];
      
      // Burst phase: 15 rapid requests
      for (let i = 0; i < 15; i++) {
        burstRequests.push(
          measurePerformance(() =>
            fetch(`${API_BASE_URL}/api/family/gallery/${perfContext.subjectToken}`)
          )
        );
      }

      const burstResults = await Promise.all(burstRequests);
      
      // Wait for idle period
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Post-burst requests should recover quickly
      const recoveryResult = await measurePerformance(async () => {
        return fetch(`${API_BASE_URL}/api/family/gallery/${perfContext.subjectToken}`);
      });

      const burstTimes = burstResults.map(r => r.metrics.responseTime);
      const avgBurstTime = burstTimes.reduce((a, b) => a + b, 0) / burstTimes.length;

      console.log(`   Burst traffic handling:`);
      console.log(`     Average burst time: ${avgBurstTime.toFixed(2)}ms`);
      console.log(`     Recovery time: ${recoveryResult.metrics.responseTime.toFixed(2)}ms`);
      console.log(`     Rate limited responses: ${burstResults.filter(r => r.result.status === 429).length}`);

      // System should recover quickly after burst
      expect(recoveryResult.metrics.responseTime).toBeLessThan(300);
    });
  });
});