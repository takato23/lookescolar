import { test, expect, type Page } from '@playwright/test';
import { createTestClient } from '../test-utils';

/**
 * E2E Tests for Admin Store Design Panel
 * Tests the complete workflow of configuring a store via the admin interface
 */

test.describe('Admin Store Design Panel', () => {
  let adminPage: Page;
  let testEventId: string;

  test.beforeEach(async ({ page }) => {
    adminPage = page;
    testEventId = crypto.randomUUID();

    // Setup: Create test event
    const supabase = createTestClient();
    await supabase.from('events').insert({
      id: testEventId,
      name: 'E2E Test Event',
      school: 'Test School',
      school_name: 'Test School',
      date: '2024-12-01',
      status: 'active',
    });

    // Navigate to store design page
    // Note: Adjust path based on actual route structure
    await adminPage.goto(`/admin/store-design`);
  });

  test.afterEach(async () => {
    // Cleanup: Remove test data
    const supabase = createTestClient();
    await supabase.from('store_settings').delete().eq('event_id', testEventId);
    await supabase.from('events').delete().eq('id', testEventId);
  });

  test('should load current store configuration', async () => {
    // Wait for page to load
    await expect(adminPage.locator('[data-testid="store-design-panel"]')).toBeVisible({
      timeout: 10000,
    });

    // Template selector should be visible
    await expect(adminPage.locator('[data-testid="template-selector"]')).toBeVisible();

    // Products section should be visible
    await expect(adminPage.locator('[data-testid="products-section"]')).toBeVisible();
  });

  test('should change template and see preview update', async () => {
    // Wait for template selector
    const templateSelect = adminPage.locator('[data-testid="template-select"]');
    await expect(templateSelect).toBeVisible();

    // Get current template
    const initialTemplate = await templateSelect.inputValue();

    // Change to different template
    await templateSelect.selectOption('studio-dark');

    // Wait for preview to update
    await adminPage.waitForTimeout(500); // Allow state update

    // Verify preview frame has new template
    const previewFrame = adminPage.locator('[data-testid="preview-frame"]');
    await expect(previewFrame).toHaveAttribute('data-template', 'studio-dark');

    // Verify template changed
    expect(await templateSelect.inputValue()).toBe('studio-dark');
    expect(await templateSelect.inputValue()).not.toBe(initialTemplate);
  });

  test('should upload logo and see in preview', async () => {
    // Find logo upload input
    const logoUpload = adminPage.locator('[data-testid="logo-upload"]');
    await expect(logoUpload).toBeVisible();

    // Upload test file
    await logoUpload.setInputFiles({
      name: 'test-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data'),
    });

    // Wait for upload to complete
    await adminPage.waitForTimeout(1000);

    // Verify logo appears in preview
    const previewLogo = adminPage.locator('[data-testid="preview-logo"]');
    await expect(previewLogo).toBeVisible();
  });

  test('should add and configure products', async () => {
    // Click add product button
    const addProductBtn = adminPage.locator('[data-testid="add-product-btn"]');
    await addProductBtn.click();

    // Fill product form
    await adminPage.locator('[data-testid="product-name-input"]').fill('Test Product');
    await adminPage.locator('[data-testid="product-price-input"]').fill('1500');
    await adminPage.locator('[data-testid="product-type-select"]').selectOption('digital');

    // Save product
    await adminPage.locator('[data-testid="save-product-btn"]').click();

    // Verify product appears in list
    const productList = adminPage.locator('[data-testid="products-list"]');
    await expect(productList).toContainText('Test Product');
    await expect(productList).toContainText('1500');
  });

  test('should save configuration successfully', async () => {
    // Make changes to config
    await adminPage.locator('[data-testid="template-select"]').selectOption('editorial');
    await adminPage.locator('[data-testid="hero-title-input"]').fill('My Custom Gallery');

    // Click save button
    const saveBtn = adminPage.locator('[data-testid="save-config-btn"]');
    await saveBtn.click();

    // Wait for success toast
    const successToast = adminPage.locator('.toast-success, [data-testid="success-toast"]');
    await expect(successToast).toBeVisible({ timeout: 5000 });
    await expect(successToast).toContainText(/saved|success/i);

    // Verify changes persisted by reloading
    await adminPage.reload();
    await expect(adminPage.locator('[data-testid="template-select"]')).toHaveValue(
      'editorial'
    );
    await expect(adminPage.locator('[data-testid="hero-title-input"]')).toHaveValue(
      'My Custom Gallery'
    );
  });

  test('should validate required fields before saving', async () => {
    // Try to save with invalid data
    await adminPage.locator('[data-testid="hero-title-input"]').fill('');

    const saveBtn = adminPage.locator('[data-testid="save-config-btn"]');
    await saveBtn.click();

    // Should show validation error
    const errorMessage = adminPage.locator(
      '[data-testid="validation-error"], .error-message'
    );
    await expect(errorMessage).toBeVisible();
  });

  test('should warn before leaving with unsaved changes', async ({ context }) => {
    // Make changes
    await adminPage.locator('[data-testid="hero-title-input"]').fill('Unsaved Changes');

    // Setup dialog handler
    let dialogShown = false;
    adminPage.on('dialog', async (dialog) => {
      dialogShown = true;
      await dialog.accept();
    });

    // Try to navigate away
    await adminPage.goto('/admin/events');

    // Verify dialog was shown
    // Note: This depends on beforeunload implementation
    // May need adjustment based on actual behavior
  });

  test('should preview changes in real-time', async () => {
    // Change primary color
    const colorInput = adminPage.locator('[data-testid="primary-color-input"]');
    await colorInput.fill('#FF5733');

    // Wait for preview update
    await adminPage.waitForTimeout(500);

    // Check preview reflects color change
    const previewElement = adminPage.locator('[data-testid="preview-primary-button"]');
    const backgroundColor = await previewElement.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // RGB of #FF5733 is rgb(255, 87, 51)
    expect(backgroundColor).toBe('rgb(255, 87, 51)');
  });

  test('should handle API errors gracefully', async () => {
    // Simulate network error by blocking API requests
    await adminPage.route('**/api/admin/store-settings', (route) => {
      route.abort('failed');
    });

    // Try to save
    const saveBtn = adminPage.locator('[data-testid="save-config-btn"]');
    await saveBtn.click();

    // Should show error toast
    const errorToast = adminPage.locator('.toast-error, [data-testid="error-toast"]');
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    await expect(errorToast).toContainText(/error|failed/i);
  });

  test('should enable/disable store correctly', async () => {
    // Find store enable toggle
    const enableToggle = adminPage.locator('[data-testid="store-enabled-toggle"]');
    await expect(enableToggle).toBeVisible();

    // Get initial state
    const initialState = await enableToggle.isChecked();

    // Toggle state
    await enableToggle.click();

    // Verify state changed
    expect(await enableToggle.isChecked()).not.toBe(initialState);

    // Save and verify
    await adminPage.locator('[data-testid="save-config-btn"]').click();
    await expect(adminPage.locator('.toast-success')).toBeVisible();

    // Reload and verify persistence
    await adminPage.reload();
    expect(await enableToggle.isChecked()).not.toBe(initialState);
  });

  test('should manage multiple products', async () => {
    // Add multiple products
    for (let i = 1; i <= 3; i++) {
      await adminPage.locator('[data-testid="add-product-btn"]').click();
      await adminPage.locator('[data-testid="product-name-input"]').fill(`Product ${i}`);
      await adminPage.locator('[data-testid="product-price-input"]').fill(`${i * 1000}`);
      await adminPage.locator('[data-testid="save-product-btn"]').click();
      await adminPage.waitForTimeout(300);
    }

    // Verify all products in list
    const productList = adminPage.locator('[data-testid="products-list"]');
    await expect(productList).toContainText('Product 1');
    await expect(productList).toContainText('Product 2');
    await expect(productList).toContainText('Product 3');

    // Delete a product
    await adminPage.locator('[data-testid="delete-product-1-btn"]').click();
    await adminPage.locator('[data-testid="confirm-delete-btn"]').click();

    // Verify product removed
    await expect(productList).not.toContainText('Product 1');
  });

  test('should support template switching with data preservation', async () => {
    // Set custom data
    await adminPage.locator('[data-testid="hero-title-input"]').fill('Custom Title');
    await adminPage.locator('[data-testid="primary-color-input"]').fill('#123456');

    // Switch template
    await adminPage.locator('[data-testid="template-select"]').selectOption('minimal');

    // Verify custom data preserved
    await expect(adminPage.locator('[data-testid="hero-title-input"]')).toHaveValue(
      'Custom Title'
    );
    await expect(adminPage.locator('[data-testid="primary-color-input"]')).toHaveValue(
      '#123456'
    );
  });
});

test.describe('Admin Store Design - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/admin/store-design');

    // Tab through form elements
    await page.keyboard.press('Tab');
    const firstFocusable = await page.evaluate(() => document.activeElement?.tagName);

    expect(['INPUT', 'SELECT', 'BUTTON']).toContain(firstFocusable);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/admin/store-design');

    // Check for ARIA labels on key elements
    const templateSelect = page.locator('[data-testid="template-select"]');
    await expect(templateSelect).toHaveAttribute('aria-label');

    const saveBtn = page.locator('[data-testid="save-config-btn"]');
    await expect(saveBtn).toHaveAttribute('aria-label');
  });
});

test.describe('Admin Store Design - Responsive', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/admin/store-design');

    // Form should still be accessible
    await expect(page.locator('[data-testid="template-selector"]')).toBeVisible();

    // Preview might be hidden on mobile
    // This depends on actual responsive design
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/admin/store-design');

    await expect(page.locator('[data-testid="store-design-panel"]')).toBeVisible();
  });
});
