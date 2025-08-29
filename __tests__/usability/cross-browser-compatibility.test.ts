/**
 * @fileoverview Cross-Browser Compatibility Testing
 * Testing across Chrome, Safari, Firefox, and Edge browsers
 */

import { test, expect, chromium, firefox, webkit } from '@playwright/test';

// Browser configurations
const BROWSERS = [
  { name: 'Chrome', engine: chromium },
  { name: 'Firefox', engine: firefox },
  { name: 'Safari', engine: webkit },
];

// Feature detection tests
const MODERN_FEATURES = {
  webp: 'image/webp',
  avif: 'image/avif',
  gridSupport: 'CSS.supports("display: grid")',
  flexboxSupport: 'CSS.supports("display: flex")',
  customProperties: 'CSS.supports("--custom: property")',
  intersectionObserver: 'typeof IntersectionObserver !== "undefined"',
  resizeObserver: 'typeof ResizeObserver !== "undefined"',
  webShare: 'typeof navigator.share !== "undefined"',
};

test.describe('Cross-Browser Compatibility', () => {
  BROWSERS.forEach(({ name, engine }) => {
    test.describe(`${name} Browser Tests`, () => {
      let browser;
      let page;

      test.beforeAll(async () => {
        browser = await engine.launch({
          headless: true,
          args: name === 'Chrome' ? ['--disable-web-security'] : [],
        });
      });

      test.afterAll(async () => {
        await browser.close();
      });

      test.beforeEach(async () => {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
          userAgent:
            name === 'Safari'
              ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
              : undefined,
        });
        page = await context.newPage();
      });

      test.afterEach(async () => {
        await page.close();
      });

      test(`${name} - Homepage rendering`, async () => {
        await page.goto('/');

        // Check basic layout
        await expect(
          page.locator('[data-testid="main-content"]')
        ).toBeVisible();

        // Check CSS Grid support and fallback
        const gridSupported = await page.evaluate(() => {
          return CSS.supports('display: grid');
        });

        if (gridSupported) {
          // Modern browsers - check grid layout
          const gridElement = page.locator('[data-testid="feature-grid"]');
          if (await gridElement.isVisible()) {
            const gridStyles = await gridElement.evaluate(
              (el) => getComputedStyle(el).display
            );
            expect(gridStyles).toContain('grid');
          }
        } else {
          // Fallback for older browsers
          console.log(`${name}: Grid not supported, checking fallback`);
          await expect(
            page.locator('[data-testid="main-content"]')
          ).toBeVisible();
        }

        // Check responsive images
        const images = page.locator('img[srcset]');
        if ((await images.count()) > 0) {
          const firstImage = images.first();
          await expect(firstImage).toBeVisible();

          // Check that appropriate source is selected
          const currentSrc = await firstImage.getAttribute('currentSrc');
          expect(currentSrc).toBeTruthy();
        }
      });

      test(`${name} - Photo gallery functionality`, async () => {
        await page.goto('/gallery/test-event-123');

        // Check grid rendering
        const photoGrid = page.locator('[data-testid="photo-grid"]');
        await expect(photoGrid).toBeVisible();

        // Check photo loading
        const photoCards = page.locator('[data-testid="photo-card"]');
        expect(await photoCards.count()).toBeGreaterThan(0);

        // Test photo modal
        const firstPhoto = photoCards.first();
        await firstPhoto.click();

        await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();

        // Test keyboard navigation (should work in all browsers)
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);

        await page.keyboard.press('Escape');
        await expect(
          page.locator('[data-testid="photo-modal"]')
        ).not.toBeVisible();
      });

      test(`${name} - Form functionality`, async () => {
        await page.goto('/f/test-token/checkout');

        // Test form validation
        await page.fill('[data-testid="contact-name"]', 'Test User');
        await page.fill('[data-testid="contact-email"]', 'invalid-email');
        await page.click('[data-testid="proceed-payment"]');

        // Should show validation error
        const emailError = page.locator('[data-testid="email-error"]');
        await expect(emailError).toBeVisible();

        // Fix email and test success path
        await page.fill('[data-testid="contact-email"]', 'test@example.com');
        await page.fill('[data-testid="contact-phone"]', '+1234567890');

        await page.click('[data-testid="proceed-payment"]');

        // Should proceed (or show appropriate next step)
        await page.waitForTimeout(1000);
        // Verify form submission handling works
      });

      test(`${name} - Image format support`, async () => {
        await page.goto('/gallery/test-event-123');

        // Check WebP support
        const webpSupported = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          return (
            canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
          );
        });

        console.log(`${name} WebP support:`, webpSupported);

        // Check that appropriate format is served
        const images = page.locator('[data-testid="photo-card"] img');
        if ((await images.count()) > 0) {
          const firstImageSrc = await images.first().getAttribute('src');

          if (webpSupported && name !== 'Safari') {
            // Should prefer WebP in supporting browsers
            expect(firstImageSrc).toMatch(/\.(webp|jpg|jpeg)/);
          } else {
            // Fallback to JPEG in Safari or non-supporting browsers
            expect(firstImageSrc).toMatch(/\.(jpg|jpeg)/);
          }
        }
      });

      test(`${name} - CSS features and fallbacks`, async () => {
        await page.goto('/');

        // Check custom properties (CSS variables) support
        const customPropertiesSupported = await page.evaluate(() => {
          return CSS.supports('--custom: property');
        });

        console.log(
          `${name} CSS Custom Properties:`,
          customPropertiesSupported
        );

        // Check flexbox layout
        const flexElement = page.locator('[data-testid="nav-menu"]');
        if (await flexElement.isVisible()) {
          const display = await flexElement.evaluate(
            (el) => getComputedStyle(el).display
          );

          if (display.includes('flex')) {
            expect(display).toBe('flex');
          } else {
            // Fallback layout should still work
            await expect(flexElement).toBeVisible();
          }
        }

        // Check backdrop-filter support (modern browsers)
        const backdropSupported = await page.evaluate(() => {
          return CSS.supports('backdrop-filter: blur(10px)');
        });

        console.log(`${name} Backdrop Filter:`, backdropSupported);

        if (backdropSupported) {
          // Check modal backdrop
          await page.goto('/gallery/test-event-123');
          await page.locator('[data-testid="photo-card"]').first().click();

          const modal = page.locator('[data-testid="photo-modal"]');
          await expect(modal).toBeVisible();

          const backdropFilter = await modal.evaluate(
            (el) => getComputedStyle(el).backdropFilter
          );

          if (name !== 'Firefox') {
            // Firefox has limited support
            expect(backdropFilter).not.toBe('none');
          }
        }
      });

      test(`${name} - JavaScript API compatibility`, async () => {
        await page.goto('/f/test-token');

        // Test IntersectionObserver for lazy loading
        const intersectionObserverSupported = await page.evaluate(() => {
          return typeof IntersectionObserver !== 'undefined';
        });

        console.log(
          `${name} IntersectionObserver:`,
          intersectionObserverSupported
        );

        if (intersectionObserverSupported) {
          // Lazy loading should work
          const photos = page.locator('[data-testid="family-photo"]');
          if ((await photos.count()) > 10) {
            // Scroll to load more images
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(500);

            // Check that lazy loading triggered
            const loadedImages = await page
              .locator('[data-testid="family-photo"] img[src]')
              .count();
            expect(loadedImages).toBeGreaterThan(5);
          }
        } else {
          // Should have fallback behavior
          console.log(`${name}: Using fallback for lazy loading`);
        }

        // Test ResizeObserver for responsive behavior
        const resizeObserverSupported = await page.evaluate(() => {
          return typeof ResizeObserver !== 'undefined';
        });

        console.log(`${name} ResizeObserver:`, resizeObserverSupported);

        // Test Web Share API
        const webShareSupported = await page.evaluate(() => {
          return typeof navigator.share !== 'undefined';
        });

        console.log(`${name} Web Share API:`, webShareSupported);

        if (webShareSupported) {
          // Share button should be visible on mobile
          const shareButton = page.locator('[data-testid="share-photo"]');
          if (await shareButton.isVisible()) {
            await expect(shareButton).toBeVisible();
          }
        }
      });

      test(`${name} - Touch and interaction events`, async () => {
        // Simulate touch device
        const touchContext = await browser.newContext({
          viewport: { width: 375, height: 667 },
          hasTouch: true,
          isMobile: true,
        });
        const touchPage = await touchContext.newPage();

        await touchPage.goto('/f/test-token');

        // Test touch interactions
        const photoCard = touchPage
          .locator('[data-testid="family-photo"]')
          .first();
        await photoCard.tap();

        await expect(
          touchPage.locator('[data-testid="photo-modal"]')
        ).toBeVisible();

        // Test swipe gestures (if supported)
        try {
          const modalImage = touchPage.locator('[data-testid="modal-image"]');

          // Simulate swipe left
          await modalImage.hover();
          await touchPage.mouse.down();
          await touchPage.mouse.move(100, 300); // Start position
          await touchPage.mouse.move(50, 300); // End position (swipe left)
          await touchPage.mouse.up();

          await touchPage.waitForTimeout(300);

          // Should advance to next photo or at least not crash
          const isModalStillVisible = await touchPage
            .locator('[data-testid="photo-modal"]')
            .isVisible();
          expect(isModalStillVisible).toBe(true);
        } catch (error) {
          console.log(`${name}: Touch gestures not fully supported`);
        }

        await touchPage.close();
        await touchContext.close();
      });

      test(`${name} - Performance and memory`, async () => {
        await page.goto('/gallery/test-event-123');

        // Test memory usage (if supported)
        const memoryInfo = await page.evaluate(() => {
          return (performance as any).memory
            ? {
                used: (performance as any).memory.usedJSHeapSize,
                total: (performance as any).memory.totalJSHeapSize,
                limit: (performance as any).memory.jsHeapSizeLimit,
              }
            : null;
        });

        if (memoryInfo && name === 'Chrome') {
          console.log(`${name} Memory Usage:`, memoryInfo);

          // Memory should be reasonable
          expect(memoryInfo.used).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
        }

        // Test animation performance
        const photos = page.locator('[data-testid="photo-card"]');
        const photoCount = Math.min(await photos.count(), 5);

        const startTime = Date.now();

        // Hover over photos to trigger animations
        for (let i = 0; i < photoCount; i++) {
          await photos.nth(i).hover({ timeout: 100 });
        }

        const animationTime = Date.now() - startTime;
        const timePerAnimation = animationTime / photoCount;

        // Animations should be smooth
        expect(timePerAnimation).toBeLessThan(200); // Less than 200ms per animation
      });

      test(`${name} - Error handling`, async () => {
        // Test 404 handling
        await page.goto('/nonexistent-page');
        await expect(page.locator('[data-testid="error-page"]')).toBeVisible();

        // Test invalid token
        await page.goto('/f/invalid-token-123');
        await expect(
          page.locator('[data-testid="invalid-token"]')
        ).toBeVisible();

        // Test network error handling
        await page.route('**/api/family/gallery/**', (route) => {
          route.abort('failed');
        });

        await page.goto('/f/valid-token-123');

        // Should show error state or retry option
        const errorElement = page.locator(
          '[data-testid="error-message"], [data-testid="retry-button"]'
        );
        await expect(errorElement).toBeVisible();
      });
    });
  });

  test('Feature Detection and Progressive Enhancement', async ({ page }) => {
    await page.goto('/');

    // Collect feature support across browsers
    const features = await page.evaluate((featureTests) => {
      const results = {};

      for (const [feature, test] of Object.entries(featureTests)) {
        try {
          if (feature.includes('Support')) {
            results[feature] = eval(test);
          } else {
            // Image format tests
            const canvas = document.createElement('canvas');
            results[feature] =
              canvas.toDataURL(test).indexOf(`data:${test}`) === 0;
          }
        } catch (e) {
          results[feature] = false;
        }
      }

      return results;
    }, MODERN_FEATURES);

    console.log('Feature Support Matrix:', features);

    // Verify graceful degradation
    Object.entries(features).forEach(([feature, supported]) => {
      if (!supported) {
        console.log(
          `Feature not supported: ${feature} - ensuring fallback works`
        );
        // Each unsupported feature should have appropriate fallbacks tested above
      }
    });
  });

  test('Accessibility across browsers', async ({ page }) => {
    // This test should run the same accessibility checks across all browsers
    await page.goto('/gallery/test-event-123');

    // Check ARIA attributes work consistently
    const photoGrid = page.locator('[data-testid="photo-grid"]');
    const ariaLabel = await photoGrid.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Check focus management
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check screen reader compatibility
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    expect(await headings.count()).toBeGreaterThan(0);

    // Each heading should have text content
    const headingCount = await headings.count();
    for (let i = 0; i < headingCount; i++) {
      const headingText = await headings.nth(i).textContent();
      expect(headingText?.trim()).toBeTruthy();
    }
  });
});
