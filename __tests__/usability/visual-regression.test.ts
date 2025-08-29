/**
 * @fileoverview Visual Regression Testing Suite
 * Screenshot comparison testing for layout consistency and visual changes
 */

import { test, expect } from '@playwright/test';

// Screenshot configuration
const SCREENSHOT_CONFIG = {
  threshold: 0.2, // 20% difference threshold
  animations: 'disabled' as const,
  mask: [] as any[],
  fullPage: false,
};

// Viewport configurations for responsive screenshots
const VIEWPORTS = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Tablet', width: 1024, height: 768 },
  { name: 'Mobile', width: 375, height: 667 },
];

test.describe('Visual Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test.describe('Homepage Visual Tests', () => {
    VIEWPORTS.forEach((viewport) => {
      test(`Homepage - ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');

        // Wait for content to load
        await page.waitForSelector('[data-testid="main-content"]');
        await page.waitForLoadState('networkidle');

        // Take screenshot
        await expect(page).toHaveScreenshot(
          `homepage-${viewport.name.toLowerCase()}.png`,
          {
            ...SCREENSHOT_CONFIG,
            fullPage: true,
          }
        );
      });
    });

    test('Homepage - Hero section', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="hero-section"]');

      const heroSection = page.locator('[data-testid="hero-section"]');
      await expect(heroSection).toHaveScreenshot(
        'hero-section.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Homepage - Navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="main-navigation"]');

      const navigation = page.locator('[data-testid="main-navigation"]');
      await expect(navigation).toHaveScreenshot(
        'navigation.png',
        SCREENSHOT_CONFIG
      );
    });
  });

  test.describe('Admin Dashboard Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@test.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/admin');
    });

    test('Admin Dashboard - Overview', async ({ page }) => {
      await page.waitForSelector('[data-testid="dashboard-stats"]');

      // Hide dynamic content (dates, numbers that change)
      await page.addStyleTag({
        content: `
          [data-testid="current-date"],
          [data-testid="stats-number"] {
            color: transparent !important;
          }
          [data-testid="stats-number"]:after {
            content: "###";
            color: black;
          }
        `,
      });

      await expect(page).toHaveScreenshot('admin-dashboard.png', {
        ...SCREENSHOT_CONFIG,
        mask: [
          page.locator('[data-testid="current-date"]'),
          page.locator('[data-testid="stats-number"]'),
        ],
      });
    });

    test('Admin Sidebar', async ({ page }) => {
      const sidebar = page.locator('[data-testid="admin-sidebar"]');
      await expect(sidebar).toHaveScreenshot(
        'admin-sidebar.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Photo Upload Interface', async ({ page }) => {
      await page.click('[data-testid="nav-photos"]');
      await page.waitForSelector('[data-testid="upload-dropzone"]');

      const uploadInterface = page.locator('[data-testid="upload-interface"]');
      await expect(uploadInterface).toHaveScreenshot(
        'photo-upload.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Photo Grid - Empty State', async ({ page }) => {
      await page.goto('/admin/photos?filter=empty');
      await page.waitForSelector('[data-testid="empty-state"]');

      const emptyState = page.locator('[data-testid="empty-state"]');
      await expect(emptyState).toHaveScreenshot(
        'photo-grid-empty.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Photo Grid - Loaded State', async ({ page }) => {
      await page.goto('/admin/photos');
      await page.waitForSelector('[data-testid="photo-grid"]');
      await page.waitForTimeout(1000); // Wait for images to load

      const photoGrid = page.locator('[data-testid="photo-grid"]');
      await expect(photoGrid).toHaveScreenshot('photo-grid-loaded.png', {
        ...SCREENSHOT_CONFIG,
        mask: [
          page.locator('[data-testid="photo-timestamp"]'), // Hide timestamps
        ],
      });
    });

    test('Photo Tagging Interface', async ({ page }) => {
      await page.goto('/admin/tagging');
      await page.waitForSelector('[data-testid="tagging-interface"]');

      const taggingInterface = page.locator(
        '[data-testid="tagging-interface"]'
      );
      await expect(taggingInterface).toHaveScreenshot(
        'photo-tagging.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Order Management', async ({ page }) => {
      await page.goto('/admin/orders');
      await page.waitForSelector('[data-testid="orders-table"]');

      // Mask dynamic content
      await page.addStyleTag({
        content: `
          [data-testid="order-date"],
          [data-testid="order-time"] {
            color: transparent !important;
          }
          [data-testid="order-date"]:after {
            content: "2024-01-15";
            color: black;
          }
          [data-testid="order-time"]:after {
            content: "10:30";
            color: black;
          }
        `,
      });

      const ordersTable = page.locator('[data-testid="orders-table"]');
      await expect(ordersTable).toHaveScreenshot('orders-management.png', {
        ...SCREENSHOT_CONFIG,
        mask: [
          page.locator('[data-testid="order-date"]'),
          page.locator('[data-testid="order-time"]'),
        ],
      });
    });
  });

  test.describe('Public Gallery Visual Tests', () => {
    VIEWPORTS.forEach((viewport) => {
      test(`Public Gallery - ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/gallery/test-event-123');

        await page.waitForSelector('[data-testid="public-gallery"]');
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot(
          `public-gallery-${viewport.name.toLowerCase()}.png`,
          {
            ...SCREENSHOT_CONFIG,
            fullPage: true,
          }
        );
      });
    });

    test('Photo Grid Responsive Breakpoints', async ({ page }) => {
      const breakpoints = [
        { width: 320, name: 'mobile-small' },
        { width: 480, name: 'mobile-large' },
        { width: 768, name: 'tablet-portrait' },
        { width: 1024, name: 'tablet-landscape' },
        { width: 1440, name: 'desktop' },
        { width: 1920, name: 'desktop-large' },
      ];

      for (const breakpoint of breakpoints) {
        await page.setViewportSize({ width: breakpoint.width, height: 800 });
        await page.goto('/gallery/test-event-123');

        await page.waitForSelector('[data-testid="photo-grid"]');
        await page.waitForTimeout(500);

        const photoGrid = page.locator('[data-testid="photo-grid"]');
        await expect(photoGrid).toHaveScreenshot(
          `photo-grid-${breakpoint.name}.png`,
          SCREENSHOT_CONFIG
        );
      }
    });

    test('Photo Modal', async ({ page }) => {
      await page.goto('/gallery/test-event-123');
      await page.waitForSelector('[data-testid="photo-card"]');

      // Open modal
      await page.click('[data-testid="photo-card"]');
      await page.waitForSelector('[data-testid="photo-modal"]');

      const photoModal = page.locator('[data-testid="photo-modal"]');
      await expect(photoModal).toHaveScreenshot(
        'photo-modal.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Contact Form', async ({ page }) => {
      await page.goto('/gallery/test-event-123');
      await page
        .locator('[data-testid="contact-form"]')
        .scrollIntoViewIfNeeded();

      const contactForm = page.locator('[data-testid="contact-form"]');
      await expect(contactForm).toHaveScreenshot(
        'contact-form.png',
        SCREENSHOT_CONFIG
      );
    });
  });

  test.describe('Family Portal Visual Tests', () => {
    VIEWPORTS.forEach((viewport) => {
      test(`Family Portal - ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/f/family-token-12345');

        await page.waitForSelector('[data-testid="family-gallery"]');
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot(
          `family-portal-${viewport.name.toLowerCase()}.png`,
          {
            ...SCREENSHOT_CONFIG,
            fullPage: true,
          }
        );
      });
    });

    test('Family Header with Token Info', async ({ page }) => {
      await page.goto('/f/family-token-12345');
      await page.waitForSelector('[data-testid="family-header"]');

      // Mask expiration date
      await page.addStyleTag({
        content: `
          [data-testid="token-expiry"] {
            color: transparent !important;
          }
          [data-testid="token-expiry"]:after {
            content: "Válido hasta: 31 Dic 2024";
            color: inherit;
          }
        `,
      });

      const familyHeader = page.locator('[data-testid="family-header"]');
      await expect(familyHeader).toHaveScreenshot('family-header.png', {
        ...SCREENSHOT_CONFIG,
        mask: [page.locator('[data-testid="token-expiry"]')],
      });
    });

    test('Shopping Cart', async ({ page }) => {
      await page.goto('/f/family-token-12345');

      // Select some photos
      await page.click('[data-testid="family-photo"]');
      await page.click('[data-testid="family-photo"]');

      // View cart
      await page.click('[data-testid="view-cart"]');
      await page.waitForSelector('[data-testid="shopping-cart"]');

      const shoppingCart = page.locator('[data-testid="shopping-cart"]');
      await expect(shoppingCart).toHaveScreenshot(
        'shopping-cart.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Checkout Form', async ({ page }) => {
      await page.goto('/f/family-token-12345/checkout');
      await page.waitForSelector('[data-testid="checkout-form"]');

      const checkoutForm = page.locator('[data-testid="checkout-form"]');
      await expect(checkoutForm).toHaveScreenshot(
        'checkout-form.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Order Status', async ({ page }) => {
      await page.goto('/f/family-with-order-token/order-status');
      await page.waitForSelector('[data-testid="order-status"]');

      // Mask dynamic content
      await page.addStyleTag({
        content: `
          [data-testid="order-id"] {
            color: transparent !important;
          }
          [data-testid="order-id"]:after {
            content: "ORD-123456";
            color: inherit;
          }
          [data-testid="order-date"] {
            color: transparent !important;
          }
          [data-testid="order-date"]:after {
            content: "15 Dic 2024";
            color: inherit;
          }
        `,
      });

      const orderStatus = page.locator('[data-testid="order-status"]');
      await expect(orderStatus).toHaveScreenshot('order-status.png', {
        ...SCREENSHOT_CONFIG,
        mask: [
          page.locator('[data-testid="order-id"]'),
          page.locator('[data-testid="order-date"]'),
        ],
      });
    });
  });

  test.describe('Error States Visual Tests', () => {
    test('404 Error Page', async ({ page }) => {
      await page.goto('/nonexistent-page');
      await page.waitForSelector('[data-testid="error-404"]');

      await expect(page).toHaveScreenshot('error-404.png', SCREENSHOT_CONFIG);
    });

    test('Invalid Token Error', async ({ page }) => {
      await page.goto('/f/invalid-token-12345');
      await page.waitForSelector('[data-testid="invalid-token"]');

      await expect(page).toHaveScreenshot(
        'invalid-token.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Network Error State', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/**', (route) => {
        route.abort('failed');
      });

      await page.goto('/f/valid-token-12345');
      await page.waitForSelector('[data-testid="network-error"]');

      const networkError = page.locator('[data-testid="network-error"]');
      await expect(networkError).toHaveScreenshot(
        'network-error.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Loading States', async ({ page }) => {
      // Delay API responses to capture loading state
      await page.route('**/api/family/gallery/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/f/valid-token-12345');

      // Capture loading skeleton
      await page.waitForSelector('[data-testid="loading-skeleton"]');
      const loadingSkeleton = page.locator('[data-testid="loading-skeleton"]');
      await expect(loadingSkeleton).toHaveScreenshot(
        'loading-skeleton.png',
        SCREENSHOT_CONFIG
      );
    });
  });

  test.describe('Interactive States Visual Tests', () => {
    test('Photo Selection States', async ({ page }) => {
      await page.goto('/f/family-token-12345');

      // Test unselected state
      const firstPhoto = page.locator('[data-testid="family-photo"]').first();
      await expect(firstPhoto).toHaveScreenshot(
        'photo-unselected.png',
        SCREENSHOT_CONFIG
      );

      // Test selected state
      await firstPhoto.click();
      await expect(firstPhoto).toHaveScreenshot(
        'photo-selected.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Button Hover States', async ({ page }) => {
      await page.goto('/');

      const primaryButton = page.locator('[data-testid="cta-button"]');

      // Normal state
      await expect(primaryButton).toHaveScreenshot(
        'button-normal.png',
        SCREENSHOT_CONFIG
      );

      // Hover state
      await primaryButton.hover();
      await expect(primaryButton).toHaveScreenshot(
        'button-hover.png',
        SCREENSHOT_CONFIG
      );

      // Focus state
      await primaryButton.focus();
      await expect(primaryButton).toHaveScreenshot(
        'button-focus.png',
        SCREENSHOT_CONFIG
      );
    });

    test('Form Validation States', async ({ page }) => {
      await page.goto('/f/test-token/checkout');

      // Test invalid input state
      await page.fill('[data-testid="contact-email"]', 'invalid-email');
      await page.click('[data-testid="proceed-payment"]');

      const emailField = page.locator('[data-testid="contact-email"]');
      await expect(emailField).toHaveScreenshot(
        'input-error.png',
        SCREENSHOT_CONFIG
      );

      // Test valid input state
      await page.fill('[data-testid="contact-email"]', 'valid@email.com');
      await expect(emailField).toHaveScreenshot(
        'input-valid.png',
        SCREENSHOT_CONFIG
      );
    });
  });

  test.describe('Dark Mode Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Enable dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
    });

    test('Homepage Dark Mode', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="main-content"]');

      await expect(page).toHaveScreenshot('homepage-dark.png', {
        ...SCREENSHOT_CONFIG,
        fullPage: true,
      });
    });

    test('Family Portal Dark Mode', async ({ page }) => {
      await page.goto('/f/family-token-12345');
      await page.waitForSelector('[data-testid="family-gallery"]');

      await expect(page).toHaveScreenshot('family-portal-dark.png', {
        ...SCREENSHOT_CONFIG,
        fullPage: true,
      });
    });

    test('Photo Modal Dark Mode', async ({ page }) => {
      await page.goto('/gallery/test-event-123');
      await page.click('[data-testid="photo-card"]');
      await page.waitForSelector('[data-testid="photo-modal"]');

      const photoModal = page.locator('[data-testid="photo-modal"]');
      await expect(photoModal).toHaveScreenshot(
        'photo-modal-dark.png',
        SCREENSHOT_CONFIG
      );
    });
  });

  test.describe('High Contrast Mode Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      });

      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background-color: black !important;
              color: white !important;
              border-color: white !important;
            }
            button, input, select {
              background-color: white !important;
              color: black !important;
            }
          }
        `,
      });
    });

    test('High Contrast Homepage', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="main-content"]');

      await expect(page).toHaveScreenshot('homepage-high-contrast.png', {
        ...SCREENSHOT_CONFIG,
        fullPage: true,
      });
    });
  });
});
