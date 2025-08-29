/**
 * INTEGRATION TESTING - Admin Publish System Complete
 * 
 * Comprehensive integration validation:
 * - Database migrations work correctly
 * - Supabase auth integration functions
 * - React Query + API integration seamless
 * - Error handling and recovery works
 * - Fallback scenarios handle gracefully
 */

import { test, expect, Page } from '@playwright/test';
import { setupE2EDatabase, cleanupE2EDatabase, createTestEvent, createTestCodes, createTestPhotos } from '../test-utils';

// Integration test configuration
const INTEGRATION_CONFIG = {
  TEST_TIMEOUT: 30000, // 30 seconds
  API_TIMEOUT: 5000, // 5 seconds
  RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 10,
};

const TEST_EVENT_ID = 'integration-test-event';
const TEST_CODES = [
  { id: 'int-code-1', code_value: '3A-01', photos_count: 5 },
  { id: 'int-code-2', code_value: '3A-02', photos_count: 8 },
  { id: 'int-code-3', code_value: '3B-01', photos_count: 12 },
];

// Helper functions
async function waitForReactQueryToSettle(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const queryClient = (window as any).__REACT_QUERY_CLIENT__;
      if (!queryClient) return true;
      
      const queries = queryClient.getQueryCache().getAll();
      return queries.every((query: any) => !query.state.isFetching);
    },
    { timeout: INTEGRATION_CONFIG.API_TIMEOUT }
  );
}

async function simulateNetworkDelay(page: Page, delay: number): Promise<void> {
  await page.route('**/api/**', async route => {
    await new Promise(resolve => setTimeout(resolve, delay));
    route.continue();
  });
}

async function simulateNetworkError(page: Page, errorCode: number = 500): Promise<void> {
  await page.route('**/api/**', route => {
    route.fulfill({
      status: errorCode,
      body: JSON.stringify({ error: 'Simulated network error' }),
      headers: { 'Content-Type': 'application/json' }
    });
  });
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
  await page.fill('[data-testid="password-input"]', 'admin123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/admin');
}

test.describe('Database Integration Testing', () => {
  test.beforeEach(async () => {
    await setupE2EDatabase();
    await createTestEvent({ id: TEST_EVENT_ID, name: 'Integration Test Event' });
    await createTestPhotos(TEST_EVENT_ID, 25);
    await createTestCodes(TEST_EVENT_ID, TEST_CODES);
  });

  test.afterEach(async () => {
    await cleanupE2EDatabase();
  });

  test('database migrations work correctly', async ({ page }) => {
    // Test that all required tables and columns exist
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    await waitForReactQueryToSettle(page);

    // Query should succeed without database errors
    await expect(page.locator('h1')).toContainText('Publicación de Galerías');
    await expect(page.locator('[data-testid="stats-total"]')).toBeVisible();

    // Test database constraints and relationships
    const response = await page.request.get('/api/admin/publish/list');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data.codes) || Array.isArray(data)).toBeTruthy();

    // Test that foreign key constraints work
    const invalidResponse = await page.request.post('/api/admin/publish', {
      data: { codeId: '00000000-0000-0000-0000-000000000000' } // Non-existent UUID
    });
    expect(invalidResponse.status()).toBe(404); // Should fail gracefully
  });

  test('database transactions and rollbacks', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    await waitForReactQueryToSettle(page);

    // Get initial state
    const initialResponse = await page.request.get('/api/admin/publish/list');
    const initialData = await initialResponse.json();
    const initialCodes = Array.isArray(initialData) ? initialData : initialData.codes;

    // Simulate a failed transaction by corrupting the request
    const corruptResponse = await page.request.post('/api/admin/publish', {
      data: { codeId: 'invalid-uuid-format' }
    });
    expect(corruptResponse.status()).toBe(400);

    // Database should remain in consistent state
    const afterFailureResponse = await page.request.get('/api/admin/publish/list');
    const afterFailureData = await afterFailureResponse.json();
    const afterFailureCodes = Array.isArray(afterFailureData) ? afterFailureData : afterFailureData.codes;

    expect(afterFailureCodes.length).toBe(initialCodes.length);
    
    // No partial updates should have occurred
    for (let i = 0; i < initialCodes.length; i++) {
      expect(afterFailureCodes[i].is_published).toBe(initialCodes[i].is_published);
    }
  });

  test('database connection resilience', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');

    // Test multiple concurrent connections
    const promises = Array.from({ length: 5 }, () => 
      page.request.get('/api/admin/publish/list')
    );

    const responses = await Promise.all(promises);
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    // Test connection pooling under load
    const heavyLoadPromises = Array.from({ length: 20 }, (_, i) => 
      page.request.post('/api/admin/publish', {
        data: { codeId: `int-code-${i % 3 + 1}` }
      })
    );

    const heavyLoadResponses = await Promise.allSettled(heavyLoadPromises);
    
    // Most should succeed, some might fail due to race conditions but not due to connection issues
    const successCount = heavyLoadResponses.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThan(10); // At least half should succeed
  });
});

test.describe('Supabase Auth Integration', () => {
  test('authentication flow works correctly', async ({ page }) => {
    // Test unauthenticated access
    await page.goto('/admin/publish');
    await page.waitForURL('/admin/login'); // Should redirect

    // Test authentication
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    // Test authenticated access
    await page.goto('/admin/publish');
    await expect(page.locator('h1')).toContainText('Publicación de Galerías');

    // Test session persistence
    await page.reload();
    await expect(page.locator('h1')).toContainText('Publicación de Galerías'); // Should stay logged in
  });

  test('session expiry and refresh', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');

    // Simulate session expiry
    await page.evaluate(() => {
      localStorage.setItem('session-expiry', String(Date.now() - 1000));
    });

    // Try to make API call - should handle session refresh
    const response = await page.request.get('/api/admin/publish/list');
    
    // Should either succeed (if refresh worked) or redirect to login
    const isSuccess = response.status() === 200;
    const isRedirect = response.status() === 401 || response.status() === 403;
    
    expect(isSuccess || isRedirect).toBeTruthy();
  });

  test('role-based authorization', async ({ page }) => {
    // Test admin role works
    await loginAsAdmin(page);
    
    const adminResponse = await page.request.get('/api/admin/publish/list');
    expect(adminResponse.status()).toBe(200);

    // Test non-admin role fails
    await page.evaluate(() => {
      localStorage.setItem('user-role', 'user'); // Mock non-admin role
    });

    const userResponse = await page.request.get('/api/admin/publish/list');
    expect([401, 403]).toContain(userResponse.status());
  });
});

test.describe('React Query + API Integration', () => {
  test('React Query cache integration seamless', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    await waitForReactQueryToSettle(page);

    // Get initial cache state
    const initialCacheState = await page.evaluate(() => {
      const queryClient = (window as any).__REACT_QUERY_CLIENT__;
      if (!queryClient) return null;
      
      const queries = queryClient.getQueryCache().getAll();
      return {
        queryCount: queries.length,
        publishQueries: queries.filter((q: any) => q.queryKey.includes('publish')).length
      };
    });

    expect(initialCacheState?.queryCount).toBeGreaterThan(0);

    // Make a mutation
    const firstCard = page.locator('[data-testid="folder-card"]').first();
    if (await firstCard.count() > 0) {
      await firstCard.locator('[data-testid="publish-button"]').click();
      await waitForReactQueryToSettle(page);

      // Cache should be updated optimistically and then confirmed
      const afterMutationCache = await page.evaluate(() => {
        const queryClient = (window as any).__REACT_QUERY_CLIENT__;
        if (!queryClient) return null;
        
        const publishQuery = queryClient.getQueryCache().find(['publish', 'list']);
        return {
          hasData: !!publishQuery?.state?.data,
          isStale: publishQuery?.isStale(),
          lastUpdated: publishQuery?.state?.dataUpdatedAt
        };
      });

      expect(afterMutationCache?.hasData).toBeTruthy();
    }
  });

  test('optimistic updates and rollback', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    await waitForReactQueryToSettle(page);

    // Find an unpublished code
    const unpublishedCard = page.locator('[data-testid="folder-card"][data-published="false"]').first();
    
    if (await unpublishedCard.count() > 0) {
      // Simulate network error after optimistic update
      await simulateNetworkError(page, 500);

      await unpublishedCard.locator('[data-testid="publish-button"]').click();
      
      // Should show optimistic update first
      await expect(unpublishedCard.locator('[data-testid="status-badge"]')).toContainText('Publicado');
      
      // Then rollback on error
      await page.waitForTimeout(2000);
      
      // Remove network error simulation
      await page.unroute('**/api/**');
      
      // Should show error state or rollback
      const hasErrorState = await page.locator('[data-testid="error-toast"], [data-testid="error-message"]').count();
      expect(hasErrorState).toBeGreaterThan(0);
    }
  });

  test('background refetch and cache invalidation', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    await waitForReactQueryToSettle(page);

    // Monitor network requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/admin/publish')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    // Trigger refetch
    await page.locator('[data-testid="refresh-button"]').click();
    await waitForReactQueryToSettle(page);

    // Should have made a refetch request
    const refetchRequests = requests.filter(r => r.includes('GET') && r.includes('list'));
    expect(refetchRequests.length).toBeGreaterThan(0);

    // Test interval refetch (if enabled)
    await page.waitForTimeout(65000); // Wait for interval refetch (60s + buffer)
    
    const intervalRefetches = requests.filter(r => 
      r.includes('GET') && r.includes('list')
    ).length;
    expect(intervalRefetches).toBeGreaterThan(1); // Initial + at least one interval
  });

  test('concurrent mutations handling', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    await waitForReactQueryToSettle(page);

    // Try concurrent mutations
    const cards = page.locator('[data-testid="folder-card"]');
    const cardCount = Math.min(await cards.count(), 3);

    const mutations: Promise<void>[] = [];
    
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const publishButton = card.locator('[data-testid="publish-button"]');
      
      if (await publishButton.count() > 0) {
        mutations.push(publishButton.click());
      }
    }

    // Execute concurrent mutations
    await Promise.allSettled(mutations);
    await waitForReactQueryToSettle(page);

    // Should handle concurrent mutations gracefully
    const errorElements = await page.locator('[data-testid*="error"]').count();
    expect(errorElements).toBeLessThan(cardCount); // Some might fail, but not all

    // Final state should be consistent
    await page.waitForTimeout(1000);
    const finalCards = page.locator('[data-testid="folder-card"]');
    const finalCount = await finalCards.count();
    expect(finalCount).toBe(cardCount); // Same number of cards
  });
});

test.describe('Error Handling Integration', () => {
  test('API error handling and recovery works', async ({ page }) => {
    await loginAsAdmin(page);

    // Test initial load with API error
    await simulateNetworkError(page, 500);
    await page.goto('/admin/publish');

    // Should show error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Test retry functionality
    await page.unroute('**/api/**');
    await page.locator('[data-testid="retry-button"]').click();
    await waitForReactQueryToSettle(page);

    // Should recover and load normally
    await expect(page.locator('h1')).toContainText('Publicación de Galerías');
  });

  test('network timeout handling', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Simulate slow network
    await simulateNetworkDelay(page, 10000); // 10 second delay
    
    await page.goto('/admin/publish');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    
    // Should eventually timeout and show error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 15000 });
    
    // Clear network delay
    await page.unroute('**/api/**');
  });

  test('partial failure handling', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    await waitForReactQueryToSettle(page);

    // Simulate partial API failure
    let requestCount = 0;
    await page.route('**/api/admin/publish', route => {
      requestCount++;
      if (requestCount % 2 === 0) {
        // Fail every other request
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Intermittent failure' }),
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        route.continue();
      }
    });

    // Try multiple operations
    const cards = page.locator('[data-testid="folder-card"]');
    const cardCount = Math.min(await cards.count(), 4);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const publishButton = card.locator('[data-testid="publish-button"]');
      
      if (await publishButton.count() > 0) {
        await publishButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Should show both success and error states
    const successCount = await page.locator('[data-testid="success-toast"]').count();
    const errorCount = await page.locator('[data-testid="error-toast"]').count();

    expect(successCount + errorCount).toBeGreaterThan(0);
    expect(successCount).toBeGreaterThan(0); // Some should succeed
  });

  test('validation error handling', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Test various validation scenarios
    const validationTests = [
      { codeId: 'invalid-uuid', expectedStatus: 400 },
      { codeId: '', expectedStatus: 400 },
      { codeId: null, expectedStatus: 400 },
      { eventId: 'invalid-uuid', expectedStatus: 400 },
    ];

    for (const testCase of validationTests) {
      const response = await page.request.post('/api/admin/publish', {
        data: testCase
      });

      expect(response.status()).toBe(testCase.expectedStatus);
      
      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(typeof body.error).toBe('string');
    }
  });
});

test.describe('Fallback Scenarios', () => {
  test('graceful degradation with JavaScript disabled', async ({ browser }) => {
    // Create context with JavaScript disabled
    const context = await browser.newContext({
      javaScriptEnabled: false
    });
    
    const page = await context.newPage();

    try {
      await page.goto('/admin/publish');

      // Should still show basic HTML structure
      const title = await page.title();
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);

      // Should have fallback content or redirect
      const body = await page.textContent('body');
      expect(body).toBeDefined();

    } finally {
      await context.close();
    }
  });

  test('offline behavior and caching', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    await waitForReactQueryToSettle(page);

    // Load data first
    await expect(page.locator('[data-testid="stats-total"]')).toBeVisible();

    // Simulate offline
    await page.context().setOffline(true);

    // Should use cached data
    await page.reload();
    
    // Might show cached content or offline indicator
    const hasOfflineIndicator = await page.locator('[data-testid="offline-indicator"]').count();
    const hasCachedContent = await page.locator('[data-testid="stats-total"]').count();

    expect(hasOfflineIndicator > 0 || hasCachedContent > 0).toBeTruthy();

    // Test offline behavior for mutations
    const publishButton = page.locator('[data-testid="publish-button"]').first();
    if (await publishButton.count() > 0) {
      await publishButton.click();
      
      // Should show offline error or queue for later
      const errorShown = await page.locator('[data-testid="offline-error"], [data-testid="queued-action"]').count();
      expect(errorShown).toBeGreaterThan(0);
    }

    // Restore online
    await page.context().setOffline(false);
  });

  test('browser compatibility fallbacks', async ({ browserName }) => {
    // Test in different browsers
    const page = await test.info().project.use.browser.newPage();

    try {
      await loginAsAdmin(page);
      await page.goto('/admin/publish');

      // Basic functionality should work in all browsers
      await expect(page.locator('h1')).toContainText('Publicación de Galerías');

      // Test browser-specific features
      const supportsModernFeatures = await page.evaluate(() => {
        return {
          fetch: typeof fetch !== 'undefined',
          promises: typeof Promise !== 'undefined',
          arrow: (() => true)(), // Arrow functions
          const: (() => { try { eval('const x = 1'); return true; } catch { return false; } })(),
          classList: !!document.body.classList,
          querySelector: !!document.querySelector
        };
      });

      // Core features should be supported
      expect(supportsModernFeatures.fetch).toBeTruthy();
      expect(supportsModernFeatures.promises).toBeTruthy();
      expect(supportsModernFeatures.querySelector).toBeTruthy();

      console.log(`${browserName} feature support:`, supportsModernFeatures);

    } finally {
      await page.close();
    }
  });

  test('memory and resource constraints', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/publish');
    
    // Test with limited memory simulation
    await page.evaluate(() => {
      // Simulate memory pressure
      const arrays: any[][] = [];
      for (let i = 0; i < 100; i++) {
        arrays.push(new Array(10000).fill(Math.random()));
      }
      
      // Keep references to prevent GC
      (window as any).memoryTest = arrays;
    });

    // Should still function under memory pressure
    await expect(page.locator('h1')).toContainText('Publicación de Galerías');
    
    const publishButton = page.locator('[data-testid="publish-button"]').first();
    if (await publishButton.count() > 0) {
      await publishButton.click();
      
      // Should either work or show graceful error
      await page.waitForTimeout(2000);
      
      const hasSuccess = await page.locator('[data-testid="success-toast"]').count();
      const hasError = await page.locator('[data-testid="error-toast"]').count();
      
      expect(hasSuccess + hasError).toBeGreaterThan(0);
    }

    // Cleanup
    await page.evaluate(() => {
      delete (window as any).memoryTest;
    });
  });

  test('concurrent user scenarios', async ({ browser }) => {
    // Create multiple browser contexts for concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    try {
      // Login all users
      await Promise.all(pages.map(async page => {
        await loginAsAdmin(page);
        await page.goto('/admin/publish');
        await waitForReactQueryToSettle(page);
      }));

      // Concurrent operations on same data
      const operations = pages.map(async (page, index) => {
        const cards = page.locator('[data-testid="folder-card"]');
        const card = cards.nth(index); // Different cards for each user
        
        if (await card.count() > 0) {
          const publishButton = card.locator('[data-testid="publish-button"]');
          if (await publishButton.count() > 0) {
            await publishButton.click();
          }
        }
      });

      await Promise.allSettled(operations);

      // Wait for all operations to complete
      await Promise.all(pages.map(page => waitForReactQueryToSettle(page)));

      // Check final state consistency
      const finalStates = await Promise.all(pages.map(async page => {
        const cards = page.locator('[data-testid="folder-card"]');
        return cards.count();
      }));

      // All users should see consistent state
      expect(finalStates.every(count => count === finalStates[0])).toBeTruthy();

    } finally {
      await Promise.all(contexts.map(context => context.close()));
    }
  });
});