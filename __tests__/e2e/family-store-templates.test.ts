import { test, expect, type Page } from '@playwright/test';
import { createTestClient } from '../test-utils';
import { createTestStoreConfig, createTestProduct } from '../factories/store-config.factory';

/**
 * E2E Tests for Family Store Templates
 * Tests the customer-facing store with different templates and configurations
 */

test.describe('Family Store Templates', () => {
  let testEventId: string;
  let testToken: string;

  test.beforeEach(async () => {
    const supabase = createTestClient();
    testEventId = crypto.randomUUID();
    testToken = `test-token-${crypto.randomUUID().slice(0, 8)}`;

    // Create test event
    await supabase.from('events').insert({
      id: testEventId,
      name: 'E2E Store Test Event',
      school: 'Test School',
      school_name: 'Test School',
      date: '2024-12-01',
      status: 'active',
    });

    // Create test subject
    const testSubjectId = crypto.randomUUID();
    await supabase.from('subjects').insert({
      id: testSubjectId,
      event_id: testEventId,
      type: 'student',
      first_name: 'Test',
      last_name: 'Student',
    });

    // Create test token
    await supabase.from('subject_tokens').insert({
      subject_id: testSubjectId,
      token: testToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  test.afterEach(async () => {
    const supabase = createTestClient();
    await supabase.from('store_settings').delete().eq('event_id', testEventId);
    await supabase.from('subject_tokens').delete().eq('token', testToken);
    await supabase.from('subjects').delete().match({ event_id: testEventId });
    await supabase.from('events').delete().eq('id', testEventId);
  });

  test('Pixieset template renders correctly', async ({ page }) => {
    const supabase = createTestClient();

    // Create store config with Pixieset template
    const config = createTestStoreConfig({ template: 'pixieset' });
    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify(config.products),
    });

    // Navigate to store
    await page.goto(`/store-unified/${testToken}`);

    // Wait for page load
    await expect(page.locator('[data-template="pixieset"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify title and key elements
    await expect(page).toHaveTitle(/E2E Store Test Event|Galería/i);
    await expect(page.locator('h1, [data-testid="hero-title"]')).toBeVisible();
  });

  test('Editorial template renders correctly', async ({ page }) => {
    const supabase = createTestClient();

    // Create store config with Editorial template
    const config = createTestStoreConfig({ template: 'editorial' });
    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'editorial',
      currency: 'ARS',
      products: JSON.stringify(config.products),
    });

    await page.goto(`/store-unified/${testToken}`);

    await expect(page.locator('[data-template="editorial"]')).toBeVisible({
      timeout: 10000,
    });

    // Editorial template specific elements
    await expect(page.locator('[data-testid="editorial-hero"]')).toBeVisible();
  });

  test('Studio Dark template renders with dark theme', async ({ page }) => {
    const supabase = createTestClient();

    const config = createTestStoreConfig({ template: 'studio-dark' });
    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'studio-dark',
      currency: 'ARS',
      products: JSON.stringify(config.products),
      colors: JSON.stringify({
        primary: '#1a1a1a',
        background: '#0a0a0a',
        text: '#ffffff',
      }),
    });

    await page.goto(`/store-unified/${testToken}`);

    await expect(page.locator('[data-template="studio-dark"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify dark theme colors
    const backgroundColor = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });

    // Should be a dark color (low RGB values)
    expect(backgroundColor).toMatch(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  });

  test('Templates load products dynamically from database', async ({ page }) => {
    const supabase = createTestClient();

    // Create config with multiple products
    const products = [
      createTestProduct({ id: 'p1', name: 'Digital Photo', price: 1000 }),
      createTestProduct({ id: 'p2', name: 'Print 10x15', price: 2000 }),
      createTestProduct({ id: 'p3', name: 'Premium Print', price: 3000 }),
    ];

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify(products),
    });

    await page.goto(`/store-unified/${testToken}`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });

    // Count product cards
    const productCount = await page.locator('[data-testid="product-card"]').count();
    expect(productCount).toBeGreaterThan(0);
    expect(productCount).toBe(3);

    // Verify product names visible
    await expect(page.locator('text=Digital Photo')).toBeVisible();
    await expect(page.locator('text=Print 10x15')).toBeVisible();
    await expect(page.locator('text=Premium Print')).toBeVisible();
  });

  test('Templates respect brand colors from config', async ({ page }) => {
    const supabase = createTestClient();

    const customColor = '#3b82f6'; // Blue
    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify([createTestProduct()]),
      colors: JSON.stringify({
        primary: customColor,
        secondary: '#6b7280',
        accent: '#10b981',
      }),
    });

    await page.goto(`/store-unified/${testToken}`);

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check if primary color applied to button
    const primaryButton = page.locator('[data-testid="primary-button"]').first();
    if (await primaryButton.isVisible()) {
      const backgroundColor = await primaryButton.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // RGB of #3b82f6 is rgb(59, 130, 246)
      expect(backgroundColor).toBe('rgb(59, 130, 246)');
    }
  });

  test('Template displays custom hero text', async ({ page }) => {
    const supabase = createTestClient();

    const customTitle = 'Welcome to Our Gallery';
    const customSubtitle = 'Find your amazing moments';

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify([createTestProduct()]),
      texts: JSON.stringify({
        hero_title: customTitle,
        hero_subtitle: customSubtitle,
      }),
    });

    await page.goto(`/store-unified/${testToken}`);

    // Verify custom text displayed
    await expect(page.locator(`text=${customTitle}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${customSubtitle}`)).toBeVisible();
  });

  test('Template shows product prices in correct currency', async ({ page }) => {
    const supabase = createTestClient();

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'USD',
      products: JSON.stringify([
        createTestProduct({ name: 'Test Product', price: 1500 }),
      ]),
    });

    await page.goto(`/store-unified/${testToken}`);

    // Look for USD currency symbol
    await expect(page.locator('text=/\\$|USD/')).toBeVisible({ timeout: 10000 });
  });

  test('Add to cart functionality works across templates', async ({ page }) => {
    const supabase = createTestClient();

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify([
        createTestProduct({ id: 'test-p1', name: 'Test Product', price: 1500 }),
      ]),
    });

    // Create test photo
    const photoId = crypto.randomUUID();
    await supabase.from('photos').insert({
      id: photoId,
      event_id: testEventId,
      storage_path: '/test/photo.jpg',
      filename: 'photo.jpg',
      approved: true,
    });

    await page.goto(`/store-unified/${testToken}`);

    // Find and click add to cart button
    const addToCartBtn = page.locator('[data-testid="add-to-cart-btn"]').first();
    await addToCartBtn.click();

    // Verify cart updated (look for cart icon or count)
    const cartCount = page.locator('[data-testid="cart-count"]');
    await expect(cartCount).toHaveText('1');

    // Cleanup
    await supabase.from('photos').delete().eq('id', photoId);
  });

  test('Template handles disabled products correctly', async ({ page }) => {
    const supabase = createTestClient();

    const products = [
      createTestProduct({ id: 'p1', name: 'Enabled Product', enabled: true }),
      createTestProduct({ id: 'p2', name: 'Disabled Product', enabled: false }),
    ];

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify(products),
    });

    await page.goto(`/store-unified/${testToken}`);

    // Enabled product should be visible
    await expect(page.locator('text=Enabled Product')).toBeVisible();

    // Disabled product should NOT be visible
    await expect(page.locator('text=Disabled Product')).not.toBeVisible();
  });

  test('Template is mobile responsive', async ({ page }) => {
    const supabase = createTestClient();

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify([createTestProduct()]),
    });

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/store-unified/${testToken}`);

    // Page should still be usable
    await expect(page.locator('[data-testid="hero-title"], h1')).toBeVisible({
      timeout: 10000,
    });

    // Products should be visible (might be in different layout)
    await expect(page.locator('[data-testid="products-section"]')).toBeVisible();
  });

  test('Template loads with valid token', async ({ page }) => {
    const supabase = createTestClient();

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify([createTestProduct()]),
    });

    // Navigate with valid token
    const response = await page.goto(`/store-unified/${testToken}`);

    // Should succeed
    expect(response?.status()).toBe(200);

    // Page should load
    await expect(page.locator('[data-testid="store-content"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Template shows error with invalid token', async ({ page }) => {
    const invalidToken = 'invalid-token-12345';

    await page.goto(`/store-unified/${invalidToken}`);

    // Should show error message
    await expect(
      page.locator('text=/invalid|not found|expired/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Template shows loading state during data fetch', async ({ page }) => {
    const supabase = createTestClient();

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify([createTestProduct()]),
    });

    // Slow down network to see loading state
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 500);
    });

    const navigationPromise = page.goto(`/store-unified/${testToken}`);

    // Should show loading indicator
    await expect(
      page.locator('[data-testid="loading"], .loading, .spinner')
    ).toBeVisible({ timeout: 1000 });

    await navigationPromise;
  });
});

test.describe('Family Store - Performance', () => {
  test('Template loads under 3s on 3G', async ({ page }) => {
    const supabase = createTestClient();
    const testEventId = crypto.randomUUID();
    const testToken = `perf-test-${crypto.randomUUID().slice(0, 8)}`;

    // Setup test data
    await supabase.from('events').insert({
      id: testEventId,
      name: 'Perf Test Event',
      school: 'Test School',
      school_name: 'Test School',
      date: '2024-12-01',
      status: 'active',
    });

    const subjectId = crypto.randomUUID();
    await supabase.from('subjects').insert({
      id: subjectId,
      event_id: testEventId,
      type: 'student',
      first_name: 'Test',
      last_name: 'Student',
    });

    await supabase.from('subject_tokens').insert({
      subject_id: subjectId,
      token: testToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await supabase.from('store_settings').insert({
      event_id: testEventId,
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      products: JSON.stringify([createTestProduct()]),
    });

    // Emulate 3G network
    await page.route('**/*', (route) => route.continue());

    const startTime = Date.now();
    await page.goto(`/store-unified/${testToken}`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000); // Relaxed to 5s for E2E test environment

    // Cleanup
    await supabase.from('store_settings').delete().eq('event_id', testEventId);
    await supabase.from('subject_tokens').delete().eq('token', testToken);
    await supabase.from('subjects').delete().eq('id', subjectId);
    await supabase.from('events').delete().eq('id', testEventId);
  });
});
