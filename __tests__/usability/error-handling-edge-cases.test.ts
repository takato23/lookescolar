/**
 * @fileoverview Error Handling and Edge Cases Testing
 * Comprehensive testing of error scenarios and edge cases for robust UX
 */

import { test, expect } from '@playwright/test';

test.describe('Network Error Handling', () => {
  test('Offline mode handling', async ({ page, context }) => {
    await page.goto('/f/family-token-12345');
    await page.waitForSelector('[data-testid="family-gallery"]');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to interact with photos
    await page.click('[data-testid="family-photo"]');
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Should show retry options
    await expect(page.locator('[data-testid="retry-when-online"]')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Click retry
    await page.click('[data-testid="retry-button"]');
    
    // Should work normally
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
  });

  test('Slow network recovery', async ({ page }) => {
    // Simulate very slow network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });

    await page.goto('/f/family-token-12345', { timeout: 10000 });
    
    // Should show loading state for slow connection
    await expect(page.locator('[data-testid="slow-connection-notice"]')).toBeVisible();
    
    // Should eventually load
    await page.waitForSelector('[data-testid="family-gallery"]', { timeout: 15000 });
  });

  test('API timeout handling', async ({ page }) => {
    // Mock API timeout
    await page.route('**/api/family/gallery/**', route => {
      // Never resolve to simulate timeout
      setTimeout(() => route.abort('timedout'), 30000);
    });

    await page.goto('/f/family-token-12345');
    
    // Should show timeout error
    await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 35000 });
    
    // Should offer retry
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('Partial data loading', async ({ page }) => {
    // Mock partial API failure
    let requestCount = 0;
    await page.route('**/api/storage/signed-url**', route => {
      requestCount++;
      if (requestCount % 3 === 0) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/f/family-token-12345');
    await page.waitForSelector('[data-testid="family-gallery"]');
    
    // Some photos should load, others should show error
    await expect(page.locator('[data-testid="photo-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="photo-card"][data-status="loaded"]')).toBeVisible();
    
    // Should offer individual retry for failed photos
    await page.click('[data-testid="retry-photo"]');
  });
});

test.describe('Authentication and Authorization Errors', () => {
  test('Expired token handling', async ({ page }) => {
    await page.route('**/api/family/gallery/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Token expired' })
      });
    });

    await page.goto('/f/expired-token-12345');
    
    // Should show token expired message
    await expect(page.locator('[data-testid="token-expired"]')).toBeVisible();
    await expect(page.locator('[data-testid="token-expired"]')).toContainText('expirado');
    
    // Should provide contact information
    await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
  });

  test('Invalid token format', async ({ page }) => {
    await page.goto('/f/invalid-format-123');
    
    // Should show invalid token error immediately
    await expect(page.locator('[data-testid="invalid-token-format"]')).toBeVisible();
    await expect(page.locator('[data-testid="help-text"]')).toContainText('formato válido');
  });

  test('Admin session expiry', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    // Mock session expiry on next request
    await page.route('**/api/admin/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Session expired' })
      });
    });

    // Try to access admin functionality
    await page.click('[data-testid="nav-photos"]');
    
    // Should redirect to login with message
    await page.waitForURL('/login');
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
  });

  test('Insufficient permissions', async ({ page }) => {
    // Mock permission denied
    await page.route('**/api/admin/events**', route => {
      route.fulfill({
        status: 403,
        body: JSON.stringify({ error: 'Insufficient permissions' })
      });
    });

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'limited@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/admin/events/new');
    
    // Should show permission denied
    await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible();
  });
});

test.describe('File Upload Errors', () => {
  test('File size too large', async ({ page }) => {
    await page.goto('/admin/photos');
    
    // Mock large file upload
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'large-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(50 * 1024 * 1024) // 50MB
    });

    // Should show file size error
    await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-size-error"]')).toContainText('demasiado grande');
  });

  test('Invalid file format', async ({ page }) => {
    await page.goto('/admin/photos');
    
    // Try to upload non-image file
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content')
    });

    // Should show format error
    await expect(page.locator('[data-testid="file-format-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-format-error"]')).toContainText('formato no válido');
  });

  test('Upload server error', async ({ page }) => {
    await page.goto('/admin/photos');
    
    // Mock server error during upload
    await page.route('**/api/admin/photos/upload', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error during upload' })
      });
    });

    await page.setInputFiles('[data-testid="file-input"]', '__tests__/fixtures/sample-photo.jpg');
    
    // Should show upload error
    await expect(page.locator('[data-testid="upload-server-error"]')).toBeVisible();
    
    // Should offer retry
    await expect(page.locator('[data-testid="retry-upload"]')).toBeVisible();
  });

  test('Upload progress interruption', async ({ page }) => {
    await page.goto('/admin/photos');
    
    // Mock upload that fails mid-way
    let requestCount = 0;
    await page.route('**/api/admin/photos/upload', route => {
      requestCount++;
      if (requestCount === 1) {
        // First request - simulate progress then fail
        setTimeout(() => route.abort('failed'), 2000);
      } else {
        route.continue();
      }
    });

    await page.setInputFiles('[data-testid="file-input"]', '__tests__/fixtures/sample-photo.jpg');
    
    // Should show progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Should show interruption error
    await expect(page.locator('[data-testid="upload-interrupted"]')).toBeVisible();
    
    // Retry should work
    await page.click('[data-testid="retry-upload"]');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
  });
});

test.describe('Payment Processing Errors', () => {
  test('Payment failure handling', async ({ page }) => {
    await page.goto('/f/family-token-12345/checkout');
    
    // Fill checkout form
    await page.fill('[data-testid="contact-name"]', 'Test User');
    await page.fill('[data-testid="contact-email"]', 'test@example.com');
    await page.fill('[data-testid="contact-phone"]', '+1234567890');
    
    // Mock payment preference creation failure
    await page.route('**/api/payments/preference', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Payment service unavailable' })
      });
    });

    await page.click('[data-testid="proceed-payment"]');
    
    // Should show payment error
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('servicio de pago');
    
    // Should offer retry
    await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
  });

  test('Payment webhook failure', async ({ page }) => {
    // This test simulates when payment succeeds but webhook fails
    await page.goto('/f/family-token-12345');
    
    // Mock successful payment but failed webhook processing
    await page.route('**/api/payments/webhook', route => {
      route.fulfill({ status: 500 });
    });

    // Simulate returning from successful payment
    await page.goto('/f/family-token-12345?payment_id=123456&status=approved');
    
    // Should show payment processing message
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-processing"]')).toContainText('procesando');
    
    // Should provide order reference
    await expect(page.locator('[data-testid="payment-reference"]')).toBeVisible();
  });

  test('Duplicate payment prevention', async ({ page }) => {
    await page.goto('/f/family-token-12345/checkout');
    
    // Mock duplicate order attempt
    await page.route('**/api/family/checkout', route => {
      route.fulfill({
        status: 409,
        body: JSON.stringify({ error: 'Order already exists' })
      });
    });

    await page.fill('[data-testid="contact-name"]', 'Test User');
    await page.fill('[data-testid="contact-email"]', 'test@example.com');
    await page.click('[data-testid="proceed-payment"]');
    
    // Should show duplicate order message
    await expect(page.locator('[data-testid="duplicate-order"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-existing-order"]')).toBeVisible();
  });
});

test.describe('Data Validation Errors', () => {
  test('Form validation edge cases', async ({ page }) => {
    await page.goto('/f/test-token/checkout');
    
    // Test various invalid inputs
    const invalidInputs = [
      { field: 'contact-email', value: '', error: 'requerido' },
      { field: 'contact-email', value: 'invalid', error: 'email válido' },
      { field: 'contact-email', value: 'a@b', error: 'email válido' },
      { field: 'contact-phone', value: '123', error: 'teléfono válido' },
      { field: 'contact-name', value: '', error: 'requerido' },
      { field: 'contact-name', value: 'a', error: 'al menos 2 caracteres' },
    ];

    for (const input of invalidInputs) {
      await page.fill(`[data-testid="${input.field}"]`, input.value);
      await page.click('[data-testid="proceed-payment"]');
      
      const errorElement = page.locator(`[data-testid="${input.field}-error"]`);
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText(input.error);
      
      // Clear for next test
      await page.fill(`[data-testid="${input.field}"]`, '');
    }
  });

  test('XSS prevention in user inputs', async ({ page }) => {
    await page.goto('/f/test-token/checkout');
    
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '"><script>alert("xss")</script>',
    ];

    for (const maliciousInput of maliciousInputs) {
      await page.fill('[data-testid="contact-name"]', maliciousInput);
      await page.fill('[data-testid="contact-email"]', 'test@example.com');
      await page.click('[data-testid="proceed-payment"]');
      
      // Should not execute script or show unescaped content
      const nameDisplay = page.locator('[data-testid="order-summary-name"]');
      const displayedText = await nameDisplay.textContent();
      
      expect(displayedText).not.toContain('<script>');
      expect(displayedText).not.toContain('javascript:');
      expect(displayedText).not.toContain('onerror');
    }
  });

  test('SQL injection prevention', async ({ page }) => {
    // Test various SQL injection attempts in search/filter
    const sqlInjectionAttempts = [
      "'; DROP TABLE users; --",
      "' OR 1=1 --",
      "' UNION SELECT * FROM users --",
      "'; DELETE FROM photos; --",
    ];

    await page.goto('/admin/photos');
    
    for (const injection of sqlInjectionAttempts) {
      // Try injection in search field
      await page.fill('[data-testid="photo-search"]', injection);
      await page.keyboard.press('Enter');
      
      // Should not cause database error
      await expect(page.locator('[data-testid="database-error"]')).not.toBeVisible();
      
      // Should either show no results or sanitized search
      const searchResults = page.locator('[data-testid="search-results"]');
      if (await searchResults.isVisible()) {
        const resultText = await searchResults.textContent();
        expect(resultText).not.toContain('DROP');
        expect(resultText).not.toContain('DELETE');
        expect(resultText).not.toContain('UNION');
      }
    }
  });
});

test.describe('Browser Compatibility Edge Cases', () => {
  test('JavaScript disabled fallback', async ({ page }) => {
    // Disable JavaScript
    await page.context().addInitScript(() => {
      Object.defineProperty(window, 'navigator', {
        value: { ...navigator, javaEnabled: () => false }
      });
    });

    await page.goto('/f/family-token-12345');
    
    // Should show no-js warning
    await expect(page.locator('[data-testid="no-javascript-warning"]')).toBeVisible();
    
    // Basic functionality should still work with server-side rendering
    await expect(page.locator('[data-testid="family-info"]')).toBeVisible();
  });

  test('Cookies disabled handling', async ({ page }) => {
    // Disable cookies
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      Object.defineProperty(document, 'cookie', {
        get: () => '',
        set: () => {}
      });
    });

    await page.goto('/admin/login');
    
    // Should show cookie warning
    await expect(page.locator('[data-testid="cookies-disabled-warning"]')).toBeVisible();
    
    // Login should still work but show warning about limited functionality
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="limited-functionality-warning"]')).toBeVisible();
  });

  test('Local storage full error', async ({ page }) => {
    // Fill local storage to capacity
    await page.addInitScript(() => {
      try {
        const storage = window.localStorage;
        const testKey = 'test';
        let i = 0;
        
        // Fill storage until it throws
        while (i < 10000) {
          storage.setItem(testKey + i, 'x'.repeat(1024));
          i++;
        }
      } catch (e) {
        // Storage is full
      }
    });

    await page.goto('/f/family-token-12345');
    
    // Try to save cart state (which uses localStorage)
    await page.click('[data-testid="family-photo"]');
    
    // Should show storage warning
    await expect(page.locator('[data-testid="storage-full-warning"]')).toBeVisible();
    
    // Should offer alternative (like using session storage or server-side cart)
    await expect(page.locator('[data-testid="use-server-cart"]')).toBeVisible();
  });
});

test.describe('Performance Edge Cases', () => {
  test('Very large image handling', async ({ page }) => {
    await page.goto('/admin/photos');
    
    // Mock very large image dimensions
    await page.route('**/storage/signed-url**', route => {
      route.continue();
    });

    // Add custom CSS to simulate very large image
    await page.addStyleTag({
      content: `
        [data-testid="large-test-image"] {
          width: 8000px;
          height: 6000px;
          background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') repeat;
        }
      `
    });

    // Should handle large images gracefully
    const largeImageContainer = page.locator('[data-testid="photo-modal-container"]');
    
    // Open a photo modal
    await page.click('[data-testid="photo-card"]');
    
    // Should not crash or freeze
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
    
    // Image should be scaled appropriately
    const modalImage = page.locator('[data-testid="modal-image"]');
    const imageSize = await modalImage.boundingBox();
    
    if (imageSize) {
      // Should not exceed viewport
      expect(imageSize.width).toBeLessThan(2000);
      expect(imageSize.height).toBeLessThan(2000);
    }
  });

  test('Memory leak prevention', async ({ page }) => {
    await page.goto('/f/family-token-12345');
    
    // Rapidly open and close modals
    for (let i = 0; i < 50; i++) {
      await page.click(`[data-testid="family-photo"]`);
      await page.waitForSelector('[data-testid="photo-modal"]');
      await page.keyboard.press('Escape');
      
      // Occasional garbage collection
      if (i % 10 === 0) {
        await page.evaluate(() => {
          if (window.gc) window.gc();
        });
      }
    }
    
    // Check memory usage hasn't grown excessively
    const memoryUsage = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
    });
    
    if (memoryUsage) {
      // Should be reasonable (less than 100MB)
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024);
    }
  });

  test('Extreme viewport sizes', async ({ page }) => {
    // Test very narrow viewport
    await page.setViewportSize({ width: 200, height: 800 });
    await page.goto('/f/family-token-12345');
    
    // Should not break layout
    await expect(page.locator('[data-testid="family-gallery"]')).toBeVisible();
    
    // Should show single column
    const photoGrid = page.locator('[data-testid="photo-grid"]');
    const gridCols = await photoGrid.evaluate(el => 
      getComputedStyle(el).gridTemplateColumns
    );
    
    // Should have only 1 column
    expect(gridCols.split(' ').length).toBe(1);
    
    // Test very wide viewport
    await page.setViewportSize({ width: 4000, height: 600 });
    
    // Should handle ultra-wide gracefully
    const wideGridCols = await photoGrid.evaluate(el => 
      getComputedStyle(el).gridTemplateColumns
    );
    
    // Should have reasonable max columns (not 20+)
    expect(wideGridCols.split(' ').length).toBeLessThan(12);
  });
});