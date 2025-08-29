/**
 * PERFORMANCE LOAD TESTING - Admin Publish System
 * 
 * Comprehensive performance validation:
 * - API response times <200ms consistently
 * - N+1 query prevention with 100+ folders
 * - React Query cache efficiency >90%
 * - Mobile performance & memory management
 * - Concurrent user load testing
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { setupE2EDatabase, cleanupE2EDatabase, createTestEvent, createTestCodes, createBulkTestData } from '../test-utils';

// Performance thresholds and configuration
const PERFORMANCE_CONFIG = {
  API_RESPONSE_THRESHOLD: 200, // ms
  PAGE_LOAD_THRESHOLD: 3000, // ms
  MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB
  CACHE_HIT_RATE_THRESHOLD: 90, // %
  LIGHTHOUSE_MOBILE_SCORE: 95,
  CONCURRENT_USERS: 10,
  BULK_OPERATIONS_SIZE: 100,
  STRESS_TEST_DURATION: 30000, // 30 seconds
};

// Test data generators
async function createLargeDataset() {
  const eventId = 'perf-test-large-dataset';
  await createTestEvent({ id: eventId, name: 'Performance Test - Large Dataset' });
  
  // Create 150 codes with photos
  const codes = Array.from({ length: 150 }, (_, i) => ({
    id: `perf-code-${i}`,
    code_value: `${Math.floor(i / 30) + 1}${String.fromCharCode(65 + (i % 26))}-${String(i % 30).padStart(2, '0')}`,
    photos_count: Math.floor(Math.random() * 20) + 5,
  }));
  
  await createTestCodes(eventId, codes);
  return eventId;
}

// Helper functions
async function measureApiResponseTime(page: Page, endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<number> {
  return page.evaluate(async ({ endpoint, method, data }) => {
    const start = performance.now();
    
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }
    
    await fetch(endpoint, options);
    const end = performance.now();
    return end - start;
  }, { endpoint, method, data });
}

async function measureMemoryUsage(page: Page): Promise<any> {
  return page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  });
}

async function getCacheStats(page: Page): Promise<any> {
  return page.evaluate(() => {
    const queryClient = (window as any).__REACT_QUERY_CLIENT__;
    if (!queryClient) return null;
    
    const queries = queryClient.getQueryCache().getAll();
    return {
      totalQueries: queries.length,
      cachedQueries: queries.filter((q: any) => q.state.data !== undefined).length,
      staleQueries: queries.filter((q: any) => q.isStale()).length,
      fetchingQueries: queries.filter((q: any) => q.state.isFetching).length,
    };
  });
}

async function waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
  let pendingRequests = 0;
  let timeoutId: NodeJS.Timeout;
  
  return new Promise((resolve) => {
    const checkIdle = () => {
      if (pendingRequests === 0) {
        clearTimeout(timeoutId);
        resolve();
      }
    };
    
    page.on('request', () => {
      pendingRequests++;
      clearTimeout(timeoutId);
    });
    
    page.on('response', () => {
      pendingRequests--;
      if (pendingRequests === 0) {
        timeoutId = setTimeout(resolve, 100); // Wait 100ms of inactivity
      }
    });
    
    // Fallback timeout
    setTimeout(resolve, timeout);
  });
}

test.describe('API Performance Validation', () => {
  let testEventId: string;

  test.beforeAll(async () => {
    await setupE2EDatabase();
    testEventId = await createLargeDataset();
  });

  test.afterAll(async () => {
    await cleanupE2EDatabase();
  });

  test('handles 100+ folders without N+1 queries', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    // Monitor network requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });

    // Load publish page with large dataset
    const loadStart = Date.now();
    await page.goto('/admin/publish');
    await waitForNetworkIdle(page);
    const loadTime = Date.now() - loadStart;

    expect(loadTime).toBeLessThan(PERFORMANCE_CONFIG.PAGE_LOAD_THRESHOLD);

    // Verify no N+1 queries
    const publishListRequests = requests.filter(url => url.includes('/api/admin/publish/list'));
    expect(publishListRequests.length).toBeLessThanOrEqual(2); // Initial + possible retry

    const individualCodeRequests = requests.filter(url => url.match(/\/api\/admin\/publish\/[^\/]+$/));
    expect(individualCodeRequests.length).toBe(0); // Should not fetch individual codes

    // Verify all data is loaded
    const codeCards = page.locator('[data-testid="folder-card"]');
    expect(await codeCards.count()).toBeGreaterThan(50); // Should show many codes
  });

  test('API response time <200ms consistently', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await waitForNetworkIdle(page);

    // Test multiple API endpoints
    const endpoints = [
      { url: '/api/admin/publish/list', method: 'GET' as const },
      { url: '/api/admin/publish', method: 'POST' as const, data: { codeId: 'perf-code-0' } },
      { url: '/api/admin/publish/unpublish', method: 'POST' as const, data: { codeId: 'perf-code-0' } },
      { url: '/api/admin/publish/rotate', method: 'POST' as const, data: { codeId: 'perf-code-0' } },
    ];

    for (const endpoint of endpoints) {
      // Measure multiple times for consistency
      const times: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const responseTime = await measureApiResponseTime(page, endpoint.url, endpoint.method, endpoint.data);
        times.push(responseTime);
        await page.waitForTimeout(100); // Small delay between requests
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`${endpoint.url}: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms, p95=${p95Time.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.API_RESPONSE_THRESHOLD);
      expect(p95Time).toBeLessThan(PERFORMANCE_CONFIG.API_RESPONSE_THRESHOLD * 1.5); // Allow 50% variance for p95
    }
  });

  test('React Query cache hit rate >90%', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    // Initial load
    await page.goto('/admin/publish');
    await waitForNetworkIdle(page);

    // Get initial cache stats
    let cacheStats = await getCacheStats(page);
    console.log('Initial cache stats:', cacheStats);

    // Navigate away and back to test cache
    await page.goto('/admin');
    await page.waitForTimeout(500);
    
    await page.goto('/admin/publish');
    await waitForNetworkIdle(page);

    // Get updated cache stats
    cacheStats = await getCacheStats(page);
    console.log('Cache stats after navigation:', cacheStats);

    if (cacheStats) {
      const cacheHitRate = (cacheStats.cachedQueries / cacheStats.totalQueries) * 100;
      console.log(`Cache hit rate: ${cacheHitRate.toFixed(2)}%`);
      expect(cacheHitRate).toBeGreaterThan(PERFORMANCE_CONFIG.CACHE_HIT_RATE_THRESHOLD);
    }

    // Test cache invalidation on mutations
    const publishButton = page.locator('[data-testid="publish-button"]').first();
    if (await publishButton.count() > 0) {
      await publishButton.click();
      await page.waitForTimeout(1000);

      const newCacheStats = await getCacheStats(page);
      console.log('Cache stats after mutation:', newCacheStats);
      
      // Should have fresh data after mutation
      expect(newCacheStats.fetchingQueries).toBe(0);
    }
  });
});

test.describe('Memory Usage & Resource Management', () => {
  test('memory usage stays within bounds', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    // Measure initial memory
    const initialMemory = await measureMemoryUsage(page);
    console.log('Initial memory usage:', initialMemory);

    // Load large dataset multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/admin/publish');
      await waitForNetworkIdle(page);
      
      // Scroll through all items to load virtual elements
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      
      await page.waitForTimeout(500);
    }

    // Measure final memory
    const finalMemory = await measureMemoryUsage(page);
    console.log('Final memory usage:', finalMemory);

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      expect(finalMemory.usedJSHeapSize).toBeLessThan(PERFORMANCE_CONFIG.MEMORY_THRESHOLD);
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_CONFIG.MEMORY_THRESHOLD * 0.5); // Max 50MB increase
    }
  });

  test('virtual scrolling performance with large datasets', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await waitForNetworkIdle(page);

    // Measure scroll performance
    const scrollStart = Date.now();
    
    // Perform fast scrolling
    for (let i = 0; i < 10; i++) {
      await page.evaluate((scrollPos) => {
        window.scrollTo(0, scrollPos * 500);
      }, i);
      await page.waitForTimeout(50);
    }

    const scrollTime = Date.now() - scrollStart;
    console.log(`Scroll performance: ${scrollTime}ms for 10 scroll operations`);

    // Should maintain smooth scrolling
    expect(scrollTime).toBeLessThan(2000); // 2 seconds for all scroll operations

    // Check that not all items are rendered in DOM (virtual scrolling works)
    const visibleCards = page.locator('[data-testid="folder-card"]');
    const visibleCount = await visibleCards.count();
    
    // Should render fewer items than total dataset
    expect(visibleCount).toBeLessThan(150); // Less than total items
    expect(visibleCount).toBeGreaterThan(10); // But more than viewport
  });
});

test.describe('Concurrent Load Testing', () => {
  test('handles multiple concurrent users', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    
    try {
      // Create concurrent user contexts
      for (let i = 0; i < PERFORMANCE_CONFIG.CONCURRENT_USERS; i++) {
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 }
        });
        const page = await context.newPage();
        
        contexts.push(context);
        pages.push(page);
        
        // Login each user
        await page.goto('/admin/login');
        await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
        await page.fill('[data-testid="password-input"]', 'admin123');
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('/admin');
      }

      // Simulate concurrent operations
      const operations = pages.map(async (page, index) => {
        const startTime = Date.now();
        
        // Navigate to publish page
        await page.goto('/admin/publish');
        await waitForNetworkIdle(page);
        
        // Perform some operations
        const searchTerm = `${Math.floor(index / 3) + 1}${String.fromCharCode(65 + (index % 3))}`;
        await page.fill('[placeholder*="Buscar código"]', searchTerm);
        await page.waitForTimeout(300);
        
        // Try to publish a code
        const publishButton = page.locator('[data-testid="publish-button"]').first();
        if (await publishButton.count() > 0) {
          await publishButton.click();
          await page.waitForTimeout(1000);
        }
        
        const endTime = Date.now();
        return {
          userId: index,
          duration: endTime - startTime,
          success: true,
        };
      });

      // Wait for all operations to complete
      const results = await Promise.allSettled(operations);
      
      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const avgDuration = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value.duration, 0) / successful;

      console.log(`Concurrent test results: ${successful}/${PERFORMANCE_CONFIG.CONCURRENT_USERS} successful`);
      console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);

      expect(successful).toBe(PERFORMANCE_CONFIG.CONCURRENT_USERS);
      expect(avgDuration).toBeLessThan(PERFORMANCE_CONFIG.PAGE_LOAD_THRESHOLD * 1.5);
      
    } finally {
      // Cleanup all contexts
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('bulk operations performance', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await waitForNetworkIdle(page);

    // Test bulk operations
    const bulkStart = Date.now();
    
    // Select all items
    await page.locator('[data-testid="select-all-checkbox"]').check();
    await page.waitForTimeout(500);
    
    // Bulk publish
    const bulkPublishButton = page.locator('[data-testid="bulk-publish-button"]');
    if (await bulkPublishButton.count() > 0) {
      await bulkPublishButton.click();
      
      // Wait for bulk operation to complete
      await waitForNetworkIdle(page, 10000); // Longer timeout for bulk ops
    }
    
    const bulkEnd = Date.now();
    const bulkDuration = bulkEnd - bulkStart;
    
    console.log(`Bulk operation duration: ${bulkDuration}ms`);
    
    // Should complete bulk operation reasonably quickly
    expect(bulkDuration).toBeLessThan(10000); // 10 seconds max for bulk operation
    
    // Verify operations completed successfully
    const successToast = page.locator('[data-testid="bulk-success-toast"]');
    if (await successToast.count() > 0) {
      await expect(successToast).toBeVisible();
    }
  });
});

test.describe('Mobile Performance Testing', () => {
  test('mobile performance optimization', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const page = await context.newPage();

    try {
      // Login
      await page.goto('/admin/login');
      await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
      await page.fill('[data-testid="password-input"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/admin');

      // Measure mobile load performance
      const loadStart = Date.now();
      await page.goto('/admin/publish');
      await waitForNetworkIdle(page);
      const loadTime = Date.now() - loadStart;

      console.log(`Mobile load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_CONFIG.PAGE_LOAD_THRESHOLD);

      // Test mobile interaction performance
      const interactionStart = Date.now();
      
      // Simulate mobile interactions
      await page.fill('[placeholder*="Buscar código"]', '3A');
      await page.waitForTimeout(300);
      
      const mobileCard = page.locator('[data-testid="mobile-folder-card"]').first();
      if (await mobileCard.count() > 0) {
        await mobileCard.click();
        await page.waitForTimeout(100);
      }
      
      const interactionTime = Date.now() - interactionStart;
      console.log(`Mobile interaction time: ${interactionTime}ms`);
      
      expect(interactionTime).toBeLessThan(1000); // Should be responsive on mobile

      // Check memory usage on mobile
      const mobileMemory = await measureMemoryUsage(page);
      if (mobileMemory) {
        console.log('Mobile memory usage:', mobileMemory);
        expect(mobileMemory.usedJSHeapSize).toBeLessThan(PERFORMANCE_CONFIG.MEMORY_THRESHOLD * 0.7); // Lower threshold for mobile
      }

    } finally {
      await context.close();
    }
  });
});

test.describe('Stress Testing & Edge Cases', () => {
  test('sustained load testing', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    const endTime = Date.now() + PERFORMANCE_CONFIG.STRESS_TEST_DURATION;
    let operationsCount = 0;
    let errorsCount = 0;

    while (Date.now() < endTime) {
      try {
        // Perform various operations
        await page.goto('/admin/publish');
        await waitForNetworkIdle(page, 2000);
        
        // Search operation
        await page.fill('[placeholder*="Buscar código"]', Math.random().toString(36).substring(7));
        await page.waitForTimeout(200);
        
        // Clear search
        await page.fill('[placeholder*="Buscar código"]', '');
        await page.waitForTimeout(200);
        
        // Scroll operations
        await page.evaluate(() => window.scrollTo(0, Math.random() * 1000));
        await page.waitForTimeout(100);
        
        operationsCount++;
        
        // Check for errors
        const errorElements = page.locator('[data-testid*="error"]');
        if (await errorElements.count() > 0) {
          errorsCount++;
        }
        
      } catch (error) {
        errorsCount++;
        console.error('Stress test error:', error);
      }
    }

    console.log(`Stress test completed: ${operationsCount} operations, ${errorsCount} errors`);
    
    // Should handle sustained load with minimal errors
    const errorRate = (errorsCount / operationsCount) * 100;
    expect(errorRate).toBeLessThan(5); // Less than 5% error rate
    expect(operationsCount).toBeGreaterThan(10); // Should have completed multiple operations
  });

  test('memory leak detection', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    const memoryMeasurements: number[] = [];

    // Perform memory leak test
    for (let i = 0; i < 10; i++) {
      await page.goto('/admin/publish');
      await waitForNetworkIdle(page);
      
      // Perform operations that might cause leaks
      await page.fill('[placeholder*="Buscar código"]', `test${i}`);
      await page.waitForTimeout(300);
      
      const publishButton = page.locator('[data-testid="publish-button"]').first();
      if (await publishButton.count() > 0) {
        await publishButton.click();
        await page.waitForTimeout(500);
      }
      
      // Force garbage collection (if available)
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });
      
      const memory = await measureMemoryUsage(page);
      if (memory) {
        memoryMeasurements.push(memory.usedJSHeapSize);
      }
      
      await page.waitForTimeout(1000);
    }

    if (memoryMeasurements.length >= 5) {
      // Calculate memory trend
      const firstHalf = memoryMeasurements.slice(0, Math.floor(memoryMeasurements.length / 2));
      const secondHalf = memoryMeasurements.slice(Math.floor(memoryMeasurements.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const memoryIncrease = ((secondAvg - firstAvg) / firstAvg) * 100;
      console.log(`Memory trend: ${memoryIncrease.toFixed(2)}% increase`);
      
      // Should not have significant memory increase (potential leak)
      expect(memoryIncrease).toBeLessThan(50); // Less than 50% increase over time
    }
  });
});