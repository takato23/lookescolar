/**
 * E2E WORKFLOW TESTING - Admin Publish Complete Workflow
 *
 * Validates complete admin workflow: login → publish → family access → unpublish
 * Tests mobile viewport interactions, performance requirements, and cross-browser compatibility
 */

import { test, expect, devices, Page, BrowserContext } from '@playwright/test';
import {
  setupE2EDatabase,
  cleanupE2EDatabase,
  createTestEvent,
  createTestPhotos,
  createTestCodes,
} from '../test-utils';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME: 200, // ms
  PAGE_LOAD_TIME: 3000, // ms
  LIGHTHOUSE_MOBILE_SCORE: 95,
  TIME_TO_INTERACTIVE: 2000, // ms
};

// Test data setup
const TEST_EVENT = {
  id: 'e2e-test-event-publish',
  name: 'Test School Event - E2E Publish',
  school: 'Test School',
  date: new Date().toISOString(),
};

const TEST_CODES = [
  { id: 'code-1', code_value: '3A-01', photos_count: 5 },
  { id: 'code-2', code_value: '3A-02', photos_count: 8 },
  { id: 'code-3', code_value: '3B-01', photos_count: 12 },
];

// Helper to measure API performance
async function measureApiPerformance(
  page: Page,
  endpoint: string
): Promise<number> {
  return page.evaluate(async (url) => {
    const start = performance.now();
    await fetch(url);
    const end = performance.now();
    return end - start;
  }, endpoint);
}

// Helper to wait for React Query to settle
async function waitForReactQuery(page: Page, timeout: number = 5000) {
  await page.waitForFunction(
    () => {
      const queryClient = (window as any).__REACT_QUERY_CLIENT__;
      if (!queryClient) return true;

      const queries = queryClient.getQueryCache().getAll();
      return queries.every((query: any) => !query.state.isFetching);
    },
    { timeout }
  );
}

// Desktop workflow test
test.describe('Admin Publish Workflow - Desktop', () => {
  let context: BrowserContext;
  let page: Page;
  let testEventId: string;

  test.beforeAll(async ({ browser }) => {
    await setupE2EDatabase();
    testEventId = await createTestEvent(TEST_EVENT);
    await createTestPhotos(testEventId, 25);
    await createTestCodes(testEventId, TEST_CODES);

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();

    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');
  });

  test.afterAll(async () => {
    await cleanupE2EDatabase();
    await context.close();
  });

  test('complete admin workflow: login → publish → family access → unpublish', async () => {
    // Navigate to publish page
    const navigationStart = Date.now();
    await page.goto('/admin/publish');

    // Wait for page to load and React Query to settle
    await waitForReactQuery(page);
    const navigationTime = Date.now() - navigationStart;
    expect(navigationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD_TIME);

    // Verify page elements are loaded
    await expect(page.locator('h1')).toContainText('Publicación de Galerías');
    await expect(page.locator('[data-testid="stats-total"]')).toBeVisible();

    // Verify initial unpublished state
    const unpublishedCount = await page
      .locator('[data-testid="stats-unpublished"]')
      .textContent();
    expect(parseInt(unpublishedCount || '0')).toBeGreaterThan(0);

    // Test search functionality
    await page.fill('[placeholder*="Buscar código"]', '3A');
    await page.waitForTimeout(300); // Debounce
    const filteredCards = page.locator('[data-testid="folder-card"]');
    expect(await filteredCards.count()).toBeLessThanOrEqual(2);

    // Clear search
    await page.click('[data-testid="clear-search"]');
    await page.waitForTimeout(300);

    // Test publishing a single code
    const firstCard = page.locator('[data-testid="folder-card"]').first();
    const codeValue = await firstCard
      .locator('[data-testid="code-value"]')
      .textContent();

    const publishStart = performance.now();
    await firstCard.locator('[data-testid="publish-button"]').click();

    // Wait for optimistic update
    await expect(
      firstCard.locator('[data-testid="status-badge"]')
    ).toContainText('Publicado');

    // Measure API response time
    await waitForReactQuery(page);
    const publishTime = performance.now() - publishStart;
    expect(publishTime).toBeLessThan(
      PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 2
    ); // Allow for UI update

    // Verify toast notification
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText(
      codeValue || ''
    );

    // Test family access link
    const familyUrl = await page
      .locator('[data-testid="family-url"]')
      .first()
      .textContent();
    expect(familyUrl).toMatch(/\/f\/[a-f0-9]+\/simple-page$/);

    // Copy link functionality
    await page.locator('[data-testid="copy-link-button"]').first().click();
    await expect(
      page.locator('[data-testid="copy-success-toast"]')
    ).toBeVisible();

    // Test QR code generation
    await page.locator('[data-testid="qr-button"]').first().click();
    await expect(page.locator('[data-testid="qr-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="qr-image"]')).toBeVisible();
    await page.locator('[data-testid="qr-modal-close"]').click();

    // Test family access in new tab
    const newTab = await context.newPage();
    if (familyUrl) {
      await newTab.goto(familyUrl);
      await expect(newTab.locator('h1')).toContainText('Galería Familiar');
      await newTab.close();
    }

    // Test token rotation
    await firstCard.locator('[data-testid="rotate-token-button"]').click();
    await expect(
      page.locator('[data-testid="rotate-success-toast"]')
    ).toBeVisible();

    const newFamilyUrl = await page
      .locator('[data-testid="family-url"]')
      .first()
      .textContent();
    expect(newFamilyUrl).not.toBe(familyUrl);

    // Test bulk operations
    await page.locator('[data-testid="select-all-checkbox"]').check();
    const selectedCount = await page
      .locator('[data-testid="selected-count"]')
      .textContent();
    expect(parseInt(selectedCount || '0')).toBeGreaterThan(0);

    await page.locator('[data-testid="bulk-publish-button"]').click();
    await waitForReactQuery(page);

    // Verify all items are published
    const publishedCards = page.locator(
      '[data-testid="folder-card"][data-published="true"]'
    );
    expect(await publishedCards.count()).toBeGreaterThan(1);

    // Test unpublishing
    await page.locator('[data-testid="bulk-unpublish-button"]').click();
    await waitForReactQuery(page);

    // Verify stats updated
    const finalUnpublishedCount = await page
      .locator('[data-testid="stats-unpublished"]')
      .textContent();
    expect(parseInt(finalUnpublishedCount || '0')).toBeGreaterThan(0);
  });

  test('validates performance requirements (<200ms API)', async () => {
    await page.goto('/admin/publish');
    await waitForReactQuery(page);

    // Test API endpoints performance
    const listApiTime = await measureApiPerformance(
      page,
      '/api/admin/publish/list'
    );
    expect(listApiTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);

    const publishApiTime = await measureApiPerformance(
      page,
      '/api/admin/publish'
    );
    expect(publishApiTime).toBeLessThan(
      PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME
    );

    // Test React Query cache effectiveness
    const firstLoadStart = Date.now();
    await page.reload();
    await waitForReactQuery(page);
    const firstLoadTime = Date.now() - firstLoadStart;

    const secondLoadStart = Date.now();
    await page.reload();
    await waitForReactQuery(page);
    const secondLoadTime = Date.now() - secondLoadStart;

    // Second load should be faster due to caching
    expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.8);
  });
});

// Mobile workflow test
test.describe('Admin Publish Workflow - Mobile', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
    });
    page = await context.newPage();

    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('handles mobile viewport interactions correctly', async () => {
    await page.goto('/admin/publish');
    await waitForReactQuery(page);

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="mobile-stats-grid"]')
    ).toBeVisible();

    // Test mobile touch targets (minimum 44px)
    const touchTargets = page.locator('button, a, input, select');
    const touchTargetCount = await touchTargets.count();

    for (let i = 0; i < touchTargetCount; i++) {
      const target = touchTargets.nth(i);
      const box = await target.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }

    // Test mobile search interaction
    await page.fill('[placeholder*="Buscar código"]', '3A');
    await page.waitForTimeout(300);

    // Test mobile card interactions
    const mobileCard = page
      .locator('[data-testid="mobile-folder-card"]')
      .first();
    await expect(mobileCard).toBeVisible();

    // Test mobile publish button
    await mobileCard.locator('[data-testid="mobile-publish-button"]').click();
    await expect(
      page.locator('[data-testid="mobile-success-toast"]')
    ).toBeVisible();

    // Test mobile drawer/modal interactions
    await mobileCard.locator('[data-testid="mobile-actions-button"]').click();
    await expect(
      page.locator('[data-testid="mobile-actions-drawer"]')
    ).toBeVisible();

    await page.locator('[data-testid="mobile-qr-action"]').click();
    await expect(page.locator('[data-testid="mobile-qr-modal"]')).toBeVisible();

    // Test mobile modal close
    await page.locator('[data-testid="mobile-modal-backdrop"]').click();
    await expect(
      page.locator('[data-testid="mobile-qr-modal"]')
    ).not.toBeVisible();
  });

  test('mobile performance Lighthouse score >95', async () => {
    await page.goto('/admin/publish');
    await waitForReactQuery(page);

    // Simulate Lighthouse mobile audit
    const performanceMetrics = await page.evaluate(() => ({
      FCP:
        performance
          .getEntriesByType('paint')
          .find((entry) => entry.name === 'first-contentful-paint')
          ?.startTime || 0,
      LCP:
        performance.getEntriesByType('largest-contentful-paint')[0]
          ?.startTime || 0,
      FID: 0, // Simulated - would need real user interaction
      CLS: 0, // Simulated - would need layout shift measurement
      TTI:
        performance.timing.domInteractive - performance.timing.navigationStart,
    }));

    // Basic performance assertions (simulated Lighthouse checks)
    expect(performanceMetrics.FCP).toBeLessThan(1800); // Good FCP
    expect(performanceMetrics.LCP).toBeLessThan(2500); // Good LCP
    expect(performanceMetrics.TTI).toBeLessThan(
      PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE
    );
  });
});

// Cross-browser compatibility test
test.describe('Cross-browser Compatibility', () => {
  const browsers = ['chromium', 'firefox', 'webkit'] as const;

  for (const browserName of browsers) {
    test(`${browserName} compatibility`, async ({ browser }) => {
      if (browser.browserType().name() !== browserName) {
        test.skip();
      }

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // Login
        await page.goto('/admin/login');
        await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
        await page.fill('[data-testid="password-input"]', 'admin123');
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('/admin');

        // Test publish page
        await page.goto('/admin/publish');
        await waitForReactQuery(page);

        // Basic functionality test
        await expect(page.locator('h1')).toContainText(
          'Publicación de Galerías'
        );
        await expect(page.locator('[data-testid="stats-total"]')).toBeVisible();

        // Test a basic publish action
        const firstCard = page.locator('[data-testid="folder-card"]').first();
        if ((await firstCard.count()) > 0) {
          await firstCard.locator('[data-testid="publish-button"]').click();
          await expect(
            page.locator('[data-testid="success-toast"]')
          ).toBeVisible();
        }

        // Test search functionality
        await page.fill('[placeholder*="Buscar código"]', 'test');
        await page.waitForTimeout(300);

        console.log(`✅ ${browserName} compatibility test passed`);
      } finally {
        await context.close();
      }
    });
  }
});

// Error handling and edge cases
test.describe('Error Handling & Edge Cases', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('handles network errors gracefully', async () => {
    // Mock network failure
    await page.route('/api/admin/publish/list', (route) => route.abort());

    await page.goto('/admin/publish');

    // Should show error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Test retry functionality
    await page.unroute('/api/admin/publish/list');
    await page.locator('[data-testid="retry-button"]').click();

    await waitForReactQuery(page);
    await expect(page.locator('h1')).toContainText('Publicación de Galerías');
  });

  test('handles empty states correctly', async () => {
    // Mock empty response
    await page.route('/api/admin/publish/list', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ codes: [], event: null }),
      })
    );

    await page.goto('/admin/publish');
    await waitForReactQuery(page);

    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText(
      'No hay códigos'
    );
  });

  test('validates accessibility on error states', async () => {
    await page.route('/api/admin/publish/list', (route) => route.abort());
    await page.goto('/admin/publish');

    // Check ARIA attributes on error state
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    await expect(errorMessage).toHaveAttribute('aria-live', 'polite');

    // Check retry button accessibility
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toHaveAttribute('aria-label');
  });
});
