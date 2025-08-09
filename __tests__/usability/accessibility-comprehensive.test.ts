/**
 * @fileoverview Comprehensive Accessibility Testing Suite
 * WCAG 2.1 AAA compliance testing for all components and user flows
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

// Color contrast ratios for WCAG AAA compliance (7:1)
const WCAG_AAA_RATIO = 7;
const WCAG_AA_RATIO = 4.5;

test.describe('Accessibility Testing Suite - WCAG 2.1 AAA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
  });

  test('Homepage accessibility compliance', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Admin dashboard accessibility', async ({ page }) => {
    // Navigate to admin login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await page.waitForURL('/admin');
    await checkA11y(page);
  });

  test('Photo gallery accessibility', async ({ page }) => {
    await page.goto('/gallery/test-event-123');
    
    // Check axe compliance
    await checkA11y(page, null, {
      rules: {
        'color-contrast-enhanced': { enabled: true },
        'focus-order-semantics': { enabled: true },
        'keyboard': { enabled: true },
      }
    });
  });

  test('Family portal accessibility', async ({ page }) => {
    await page.goto('/f/test-family-token-12345');
    await checkA11y(page);
  });

  test.describe('Keyboard Navigation Testing', () => {
    test('Complete keyboard navigation flow', async ({ page }) => {
      await page.goto('/gallery/test-event-123');
      
      // Test Tab navigation through all interactive elements
      const focusableElements = await page.$$eval('*', (elements) => 
        elements.filter(el => 
          el.tabIndex >= 0 || 
          ['button', 'input', 'select', 'textarea', 'a'].includes(el.tagName.toLowerCase())
        ).length
      );
      
      expect(focusableElements).toBeGreaterThan(0);
      
      // Test Escape key closes modals
      await page.click('[data-testid="photo-card-1"]');
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="photo-modal"]')).not.toBeVisible();
      
      // Test Enter/Space activate buttons
      await page.focus('[data-testid="photo-card-1"]');
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
    });

    test('Focus management in modals', async ({ page }) => {
      await page.goto('/gallery/test-event-123');
      await page.click('[data-testid="photo-card-1"]');
      
      // Focus should be trapped in modal
      const modalCloseButton = page.locator('[data-testid="modal-close"]');
      await expect(modalCloseButton).toBeFocused();
      
      // Tab cycling within modal
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
    });

    test('Skip to main content link', async ({ page }) => {
      await page.goto('/admin');
      
      // First Tab should focus skip link
      await page.keyboard.press('Tab');
      const skipLink = page.locator('[data-testid="skip-to-main"]');
      await expect(skipLink).toBeFocused();
      
      // Enter should skip to main content
      await page.keyboard.press('Enter');
      const mainContent = page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeFocused();
    });
  });

  test.describe('Screen Reader Testing', () => {
    test('ARIA labels and roles validation', async ({ page }) => {
      await page.goto('/admin/photos');
      
      // Check for proper ARIA labels
      const uploadButton = page.locator('[data-testid="photo-uploader"]');
      await expect(uploadButton).toHaveAttribute('aria-label');
      
      const photoGrid = page.locator('[data-testid="photo-grid"]');
      await expect(photoGrid).toHaveAttribute('role', 'grid');
      
      // Check progress indicators have aria-live
      const progressBar = page.locator('[data-testid="upload-progress"]');
      await expect(progressBar).toHaveAttribute('aria-live', 'polite');
    });

    test('Dynamic content announcements', async ({ page }) => {
      await page.goto('/admin/photos');
      
      // Upload should announce progress
      await page.setInputFiles('[data-testid="file-input"]', '__tests__/fixtures/sample-photo.jpg');
      
      const statusRegion = page.locator('[aria-live="polite"]');
      await expect(statusRegion).toContainText('Subiendo');
      
      // Success should be announced
      await page.waitForSelector('[data-testid="upload-success"]');
      await expect(statusRegion).toContainText('completado');
    });

    test('Form validation announcements', async ({ page }) => {
      await page.goto('/f/test-token/checkout');
      
      // Submit empty form should announce errors
      await page.click('[data-testid="submit-order"]');
      
      const errorRegion = page.locator('[role="alert"]');
      await expect(errorRegion).toBeVisible();
      await expect(errorRegion).toContainText('requerido');
    });
  });

  test.describe('Color Contrast Testing', () => {
    test('WCAG AAA color contrast validation', async ({ page }) => {
      await page.goto('/');
      
      // Check main text contrast
      const textElements = await page.$$eval('p, span, div', (elements) => 
        elements.map(el => {
          const styles = getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            text: el.textContent?.trim() || ''
          };
        }).filter(el => el.text.length > 0)
      );
      
      // Use axe-core to check color contrast
      const violations = await getViolations(page, {
        rules: {
          'color-contrast-enhanced': { enabled: true }
        }
      });
      
      expect(violations).toHaveLength(0);
    });

    test('High contrast mode compatibility', async ({ page }) => {
      // Simulate Windows high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background-color: black !important;
              color: white !important;
            }
          }
        `
      });
      
      await page.goto('/');
      await checkA11y(page);
    });
  });

  test.describe('Motion and Animation Testing', () => {
    test('Reduced motion preferences respected', async ({ page }) => {
      // Simulate prefers-reduced-motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/gallery/test-event-123');
      
      // Animations should be disabled
      const photoCard = page.locator('[data-testid="photo-card-1"]');
      const transform = await photoCard.evaluate(el => 
        getComputedStyle(el).getPropertyValue('transform')
      );
      
      // Hover should not trigger scale transform
      await photoCard.hover();
      const transformAfterHover = await photoCard.evaluate(el => 
        getComputedStyle(el).getPropertyValue('transform')
      );
      
      expect(transform).toBe(transformAfterHover);
    });

    test('Essential animations preserved', async ({ page }) => {
      await page.goto('/f/test-token');
      
      // Loading indicators should still animate (essential for UX)
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      await expect(loadingSpinner).toHaveClass(/animate-spin/);
    });
  });

  test.describe('Touch Target Testing', () => {
    test('Minimum touch target sizes (44px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/f/test-token');
      
      const buttons = await page.$$eval('button, a, [role="button"]', (elements) => 
        elements.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            tagName: el.tagName,
            id: el.id || el.textContent?.slice(0, 20)
          };
        })
      );
      
      buttons.forEach(button => {
        expect(button.width).toBeGreaterThanOrEqual(44);
        expect(button.height).toBeGreaterThanOrEqual(44);
      });
    });

    test('Touch target spacing', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin/photos');
      
      // Adjacent interactive elements should have 8px spacing
      const adjacentButtons = page.locator('[data-testid="photo-actions"] button');
      const count = await adjacentButtons.count();
      
      if (count > 1) {
        for (let i = 0; i < count - 1; i++) {
          const button1 = adjacentButtons.nth(i);
          const button2 = adjacentButtons.nth(i + 1);
          
          const rect1 = await button1.boundingBox();
          const rect2 = await button2.boundingBox();
          
          if (rect1 && rect2) {
            const spacing = Math.abs(rect2.x - (rect1.x + rect1.width));
            expect(spacing).toBeGreaterThanOrEqual(8);
          }
        }
      }
    });
  });

  test.describe('Language and Localization Testing', () => {
    test('Language attribute set correctly', async ({ page }) => {
      await page.goto('/');
      
      const htmlLang = await page.$eval('html', el => el.lang);
      expect(htmlLang).toBe('es'); // Spanish for this app
    });

    test('Text direction support', async ({ page }) => {
      await page.goto('/');
      
      const htmlDir = await page.$eval('html', el => el.dir);
      expect(['ltr', 'rtl']).toContain(htmlDir || 'ltr');
    });
  });

  test.describe('Error Handling Accessibility', () => {
    test('Error messages accessible', async ({ page }) => {
      await page.goto('/f/invalid-token-123');
      
      // Error should be announced
      const errorMessage = page.locator('[role="alert"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    });

    test('Form errors properly associated', async ({ page }) => {
      await page.goto('/f/test-token/checkout');
      
      // Submit invalid form
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="submit-order"]');
      
      // Error should be associated with input
      const emailInput = page.locator('[data-testid="email-input"]');
      const errorId = await emailInput.getAttribute('aria-describedby');
      
      expect(errorId).toBeTruthy();
      
      const errorElement = page.locator(`#${errorId}`);
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText('email');
    });
  });
});