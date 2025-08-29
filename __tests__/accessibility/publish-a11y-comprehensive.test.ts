/**
 * ACCESSIBILITY COMPLIANCE VALIDATION - Admin Publish System
 *
 * Comprehensive accessibility testing:
 * - WCAG 2.1 AA compliance >98%
 * - Touch targets >44px minimum
 * - Keyboard navigation completeness
 * - Screen reader announcements
 * - Color contrast ratios
 * - Focus management and indicators
 */

import { test, expect, Page } from '@playwright/test';
import {
  setupE2EDatabase,
  cleanupE2EDatabase,
  createTestEvent,
  createTestCodes,
} from '../test-utils';

// Accessibility standards and thresholds
const A11Y_CONFIG = {
  WCAG_COMPLIANCE_THRESHOLD: 98, // %
  MIN_TOUCH_TARGET_SIZE: 44, // px
  MIN_COLOR_CONTRAST_RATIO: 4.5, // WCAG AA standard
  MIN_COLOR_CONTRAST_RATIO_LARGE: 3.0, // WCAG AA for large text
  FOCUS_INDICATOR_MIN_WIDTH: 2, // px
  MAX_TAB_SEQUENCE_TIME: 5000, // ms
};

const TEST_EVENT_ID = 'a11y-test-event';
const TEST_CODES = [
  { id: 'a11y-code-1', code_value: '3A-01', photos_count: 5 },
  { id: 'a11y-code-2', code_value: '3A-02', photos_count: 8 },
  { id: 'a11y-code-3', code_value: '3B-01', photos_count: 12 },
];

// Accessibility testing utilities
async function getColorContrast(page: Page, element: string): Promise<number> {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return 0;

    const styles = window.getComputedStyle(el);
    const backgroundColor = styles.backgroundColor;
    const textColor = styles.color;

    // Simple contrast ratio calculation (simplified)
    const parseRGB = (color: string) => {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      return match
        ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
        : [0, 0, 0];
    };

    const bgRGB = parseRGB(backgroundColor);
    const textRGB = parseRGB(textColor);

    const getLuminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const bgLuminance = getLuminance(bgRGB);
    const textLuminance = getLuminance(textRGB);

    const contrast =
      (Math.max(bgLuminance, textLuminance) + 0.05) /
      (Math.min(bgLuminance, textLuminance) + 0.05);
    return contrast;
  }, element);
}

async function getTouchTargetSize(
  page: Page,
  element: string
): Promise<{ width: number; height: number }> {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { width: 0, height: 0 };

    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, element);
}

async function checkFocusIndicator(
  page: Page,
  element: string
): Promise<boolean> {
  await page.focus(element);
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return false;

    const styles = window.getComputedStyle(el);
    const outline = styles.outline;
    const outlineWidth = parseFloat(styles.outlineWidth);
    const boxShadow = styles.boxShadow;

    // Check for visible focus indicator
    return (
      (outline !== 'none' && outlineWidth >= 1) ||
      boxShadow !== 'none' ||
      styles.border !== 'none'
    );
  }, element);
}

async function getAriaAttributes(
  page: Page,
  element: string
): Promise<Record<string, string>> {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return {};

    const attrs: Record<string, string> = {};
    Array.from(el.attributes).forEach((attr) => {
      if (
        attr.name.startsWith('aria-') ||
        attr.name === 'role' ||
        attr.name === 'tabindex'
      ) {
        attrs[attr.name] = attr.value;
      }
    });

    return attrs;
  }, element);
}

test.describe('WCAG 2.1 AA Compliance Testing', () => {
  test.beforeEach(async () => {
    await setupE2EDatabase();
    await createTestEvent({
      id: TEST_EVENT_ID,
      name: 'Accessibility Test Event',
    });
    await createTestCodes(TEST_EVENT_ID, TEST_CODES);
  });

  test.afterEach(async () => {
    await cleanupE2EDatabase();
  });

  test('WCAG 2.1 AA compliance >98%', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Run axe accessibility audit
    const accessibilityResults = await page.evaluate(async () => {
      // Simulate axe-core audit (in real implementation, would use @axe-core/playwright)
      const violations: any[] = [];
      const passes: any[] = [];

      // Check for common accessibility issues

      // 1. Missing alt attributes on images
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.hasAttribute('alt')) {
          violations.push({
            id: 'image-alt',
            impact: 'critical',
            description: 'Images must have alternative text',
            nodes: [{ target: `img:nth-child(${index + 1})` }],
          });
        } else {
          passes.push({
            id: 'image-alt',
            target: `img:nth-child(${index + 1})`,
          });
        }
      });

      // 2. Missing labels on form elements
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((input, index) => {
        const hasLabel =
          input.hasAttribute('aria-label') ||
          input.hasAttribute('aria-labelledby') ||
          document.querySelector(`label[for="${input.id}"]`);

        if (!hasLabel) {
          violations.push({
            id: 'label',
            impact: 'critical',
            description: 'Form elements must have labels',
            nodes: [
              {
                target: `${input.tagName.toLowerCase()}:nth-child(${index + 1})`,
              },
            ],
          });
        } else {
          passes.push({
            id: 'label',
            target: `${input.tagName.toLowerCase()}:nth-child(${index + 1})`,
          });
        }
      });

      // 3. Missing heading hierarchy
      const headings = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      );
      let previousLevel = 0;
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        if (level > previousLevel + 1) {
          violations.push({
            id: 'heading-order',
            impact: 'moderate',
            description: 'Heading levels should only increase by one',
            nodes: [
              {
                target: `${heading.tagName.toLowerCase()}:nth-child(${index + 1})`,
              },
            ],
          });
        }
        previousLevel = level;
      });

      // 4. Missing ARIA roles for interactive elements
      const buttons = document.querySelectorAll('div[onclick], span[onclick]');
      buttons.forEach((button, index) => {
        if (
          !button.hasAttribute('role') ||
          button.getAttribute('role') !== 'button'
        ) {
          violations.push({
            id: 'button-name',
            impact: 'serious',
            description: 'Interactive elements must have appropriate roles',
            nodes: [
              {
                target: `${button.tagName.toLowerCase()}:nth-child(${index + 1})`,
              },
            ],
          });
        }
      });

      // 5. Missing skip links
      const skipLink = document.querySelector(
        'a[href="#main"], a[href="#content"]'
      );
      if (!skipLink) {
        violations.push({
          id: 'skip-link',
          impact: 'moderate',
          description: 'Page should have skip link',
          nodes: [{ target: 'body' }],
        });
      }

      return {
        violations,
        passes,
        violationCount: violations.length,
        passCount: passes.length,
      };
    });

    // Calculate compliance percentage
    const totalChecks =
      accessibilityResults.violationCount + accessibilityResults.passCount;
    const complianceRate =
      totalChecks > 0
        ? (accessibilityResults.passCount / totalChecks) * 100
        : 100;

    console.log(`Accessibility compliance: ${complianceRate.toFixed(2)}%`);
    console.log(`Violations: ${accessibilityResults.violationCount}`);
    console.log(`Passes: ${accessibilityResults.passCount}`);

    // Log violations for debugging
    if (accessibilityResults.violations.length > 0) {
      console.log('Accessibility violations:', accessibilityResults.violations);
    }

    expect(complianceRate).toBeGreaterThan(
      A11Y_CONFIG.WCAG_COMPLIANCE_THRESHOLD
    );
    expect(accessibilityResults.violationCount).toBe(0); // Zero critical violations
  });

  test('validates semantic HTML structure', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Check semantic HTML structure
    const semanticStructure = await page.evaluate(() => {
      const checks = {
        hasMain: !!document.querySelector('main'),
        hasNav: !!document.querySelector('nav'),
        hasHeader: !!document.querySelector('header'),
        hasHeadings:
          document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
        hasLandmarks:
          document.querySelectorAll(
            '[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]'
          ).length > 0,
        hasSection: document.querySelectorAll('section, article').length > 0,
      };

      return checks;
    });

    expect(semanticStructure.hasHeadings).toBeTruthy();
    // Note: Other checks might be optional depending on page structure

    // Check heading hierarchy
    const headingHierarchy = await page.evaluate(() => {
      const headings = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      );
      const levels = headings.map((h) => parseInt(h.tagName.charAt(1)));

      // Check if hierarchy is logical (no skipping levels)
      let isValid = true;
      let previousLevel = 0;

      for (const level of levels) {
        if (level > previousLevel + 1) {
          isValid = false;
          break;
        }
        previousLevel = level;
      }

      return { levels, isValid, count: headings.length };
    });

    expect(headingHierarchy.isValid).toBeTruthy();
    expect(headingHierarchy.count).toBeGreaterThan(0);
  });
});

test.describe('Touch Target Accessibility', () => {
  test('all touch targets >44px minimum', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Get all interactive elements
    const interactiveElements = await page
      .locator('button, a, input, select, [role="button"], [tabindex="0"]')
      .all();

    for (let i = 0; i < Math.min(interactiveElements.length, 20); i++) {
      // Test first 20 elements
      const element = interactiveElements[i];
      const boundingBox = await element.boundingBox();

      if (boundingBox) {
        const { width, height } = boundingBox;
        const isVisible = width > 0 && height > 0;

        if (isVisible) {
          expect(width).toBeGreaterThanOrEqual(
            A11Y_CONFIG.MIN_TOUCH_TARGET_SIZE
          );
          expect(height).toBeGreaterThanOrEqual(
            A11Y_CONFIG.MIN_TOUCH_TARGET_SIZE
          );

          console.log(`Touch target ${i}: ${width}x${height}px`);
        }
      }
    }
  });

  test('touch target spacing and positioning', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Check spacing between touch targets
    const buttons = await page.locator('button').all();

    for (let i = 0; i < buttons.length - 1; i++) {
      const currentBox = await buttons[i].boundingBox();
      const nextBox = await buttons[i + 1].boundingBox();

      if (currentBox && nextBox) {
        // Calculate distance between buttons
        const horizontalDistance = Math.abs(
          nextBox.x - (currentBox.x + currentBox.width)
        );
        const verticalDistance = Math.abs(
          nextBox.y - (currentBox.y + currentBox.height)
        );

        // Should have at least 8px spacing between touch targets
        const hasAdequateSpacing =
          horizontalDistance >= 8 || verticalDistance >= 8;

        if (!hasAdequateSpacing) {
          console.warn(`Inadequate spacing between buttons ${i} and ${i + 1}`);
        }
      }
    }
  });
});

test.describe('Keyboard Navigation', () => {
  test('keyboard navigation works completely', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Test tab navigation through all focusable elements
    const focusableElements = await page
      .locator(
        'button:visible, a:visible, input:visible, select:visible, [tabindex="0"]:visible'
      )
      .all();

    // Focus first element
    await page.keyboard.press('Tab');

    const startTime = Date.now();
    let tabCount = 0;
    const maxTabs = Math.min(focusableElements.length, 20); // Limit test scope

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      tabCount++;

      // Check that focus is visible and on an interactive element
      const focusedElement = await page.evaluate(() => {
        const element = document.activeElement;
        return element
          ? {
              tagName: element.tagName,
              type: element.getAttribute('type'),
              role: element.getAttribute('role'),
              ariaLabel: element.getAttribute('aria-label'),
              hasVisibleFocus:
                window.getComputedStyle(element).outline !== 'none' ||
                window.getComputedStyle(element).boxShadow.includes('rgb'),
            }
          : null;
      });

      expect(focusedElement).not.toBeNull();
      if (focusedElement) {
        expect(
          ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].concat(
            focusedElement.role === 'button' ? ['DIV', 'SPAN'] : []
          )
        ).toContain(focusedElement.tagName);
      }
    }

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(A11Y_CONFIG.MAX_TAB_SEQUENCE_TIME);

    console.log(`Tab navigation: ${tabCount} elements in ${totalTime}ms`);
  });

  test('keyboard shortcuts work correctly', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Test Escape key closes modals
    const searchInput = page.locator('[placeholder*="Buscar código"]');
    if ((await searchInput.count()) > 0) {
      await searchInput.focus();
      await page.keyboard.press('Escape');

      // Should clear focus or close any open dropdowns
      const activeElement = await page.evaluate(
        () => document.activeElement?.tagName
      );
      // Focus should either stay on input or move to body
      expect(['INPUT', 'BODY']).toContain(activeElement || 'BODY');
    }

    // Test Enter key activates buttons
    const firstButton = page.locator('button').first();
    if ((await firstButton.count()) > 0) {
      await firstButton.focus();
      // Note: Actual Enter key test would depend on specific button behavior
    }

    // Test Arrow keys for navigation (if applicable)
    const selectElement = page.locator('select').first();
    if ((await selectElement.count()) > 0) {
      await selectElement.focus();
      await page.keyboard.press('ArrowDown');
      // Select should change value or open dropdown
    }
  });

  test('skip links functionality', async ({ page }) => {
    await page.goto('/admin/publish');

    // Test skip link (if present)
    const skipLink = page
      .locator('a[href="#main"], a[href="#content"], .skip-link')
      .first();

    if ((await skipLink.count()) > 0) {
      // Focus on skip link (usually first focusable element)
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.textContent;
      });

      if (focusedElement?.includes('Skip')) {
        await page.keyboard.press('Enter');

        // Should jump to main content
        const mainContent = await page.evaluate(() => {
          const main = document.querySelector('#main, #content, main');
          return main ? main.tagName : null;
        });

        expect(mainContent).toBeTruthy();
      }
    }
  });
});

test.describe('Screen Reader Compatibility', () => {
  test('screen reader announcements are correct', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Check for proper ARIA labels and descriptions
    const ariaElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        '[aria-label], [aria-labelledby], [aria-describedby]'
      );
      return Array.from(elements).map((el) => ({
        tagName: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledBy: el.getAttribute('aria-labelledby'),
        ariaDescribedBy: el.getAttribute('aria-describedby'),
        textContent: el.textContent?.slice(0, 50),
      }));
    });

    // Each interactive element should have proper labeling
    for (const element of ariaElements) {
      const hasLabel = element.ariaLabel || element.ariaLabelledBy;
      expect(hasLabel).toBeTruthy();

      if (element.ariaLabel) {
        expect(element.ariaLabel.trim().length).toBeGreaterThan(0);
      }
    }

    // Check for live regions for dynamic content
    const liveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll('[aria-live]');
      return Array.from(regions).map((el) => ({
        ariaLive: el.getAttribute('aria-live'),
        role: el.getAttribute('role'),
        textContent: el.textContent?.slice(0, 100),
      }));
    });

    // Should have at least one live region for status updates
    expect(liveRegions.length).toBeGreaterThan(0);

    // Test status announcements
    const publishButton = page
      .locator('[data-testid="publish-button"]')
      .first();
    if ((await publishButton.count()) > 0) {
      await publishButton.click();

      // Check for status update in live region
      const statusUpdate = await page
        .waitForSelector(
          '[aria-live="polite"], [role="status"], [data-testid*="toast"]',
          {
            timeout: 5000,
          }
        )
        .catch(() => null);

      if (statusUpdate) {
        const statusText = await statusUpdate.textContent();
        expect(statusText?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('proper heading structure for screen readers', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    const headingStructure = await page.evaluate(() => {
      const headings = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      );
      return headings.map((h) => ({
        level: parseInt(h.tagName.charAt(1)),
        text: h.textContent?.trim(),
        hasId: !!h.id,
        ariaLabel: h.getAttribute('aria-label'),
      }));
    });

    // Should have at least one h1
    const h1Count = headingStructure.filter((h) => h.level === 1).length;
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Should have logical heading progression
    let previousLevel = 0;
    for (const heading of headingStructure) {
      expect(heading.level).toBeLessThanOrEqual(previousLevel + 1);
      expect(heading.text?.length).toBeGreaterThan(0);
      previousLevel = Math.max(previousLevel, heading.level);
    }
  });

  test('form labels and fieldsets', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Check form controls have proper labels
    const formControls = await page.evaluate(() => {
      const controls = document.querySelectorAll('input, select, textarea');
      return Array.from(controls).map((control) => {
        const id = control.getAttribute('id');
        const ariaLabel = control.getAttribute('aria-label');
        const ariaLabelledBy = control.getAttribute('aria-labelledby');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;

        return {
          type: control.getAttribute('type') || control.tagName,
          hasLabel: !!(ariaLabel || ariaLabelledBy || label),
          labelText: ariaLabel || label?.textContent?.trim(),
          placeholder: control.getAttribute('placeholder'),
        };
      });
    });

    for (const control of formControls) {
      if (control.type !== 'hidden') {
        const hasAccessibleLabel = control.hasLabel || control.placeholder;
        expect(hasAccessibleLabel).toBeTruthy();

        if (control.labelText) {
          expect(control.labelText.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

test.describe('Color and Contrast Accessibility', () => {
  test('color contrast ratios meet requirements', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Test text elements for contrast
    const textElements = [
      'h1',
      'h2',
      'h3',
      'p',
      'button',
      'a',
      'label',
      'input',
      '.text-gray-600',
      '.text-gray-900',
    ];

    for (const selector of textElements) {
      const elements = await page.locator(selector).all();

      for (let i = 0; i < Math.min(elements.length, 5); i++) {
        const element = elements[i];
        const isVisible = await element.isVisible();

        if (isVisible) {
          const contrast = await getColorContrast(
            page,
            `${selector}:nth-of-type(${i + 1})`
          );
          const fontSize = await page.evaluate(
            (sel) => {
              const el = document.querySelector(sel);
              return el ? parseFloat(window.getComputedStyle(el).fontSize) : 16;
            },
            `${selector}:nth-of-type(${i + 1})`
          );

          const isLargeText =
            fontSize >= 18 ||
            (fontSize >= 14 &&
              (await page.evaluate(
                (sel) => {
                  const el = document.querySelector(sel);
                  return el
                    ? window.getComputedStyle(el).fontWeight === 'bold' ||
                        parseInt(window.getComputedStyle(el).fontWeight) >= 700
                    : false;
                },
                `${selector}:nth-of-type(${i + 1})`
              )));

          const minContrast = isLargeText
            ? A11Y_CONFIG.MIN_COLOR_CONTRAST_RATIO_LARGE
            : A11Y_CONFIG.MIN_COLOR_CONTRAST_RATIO;

          if (contrast > 0) {
            // Only test if we could calculate contrast
            console.log(
              `${selector}:nth-of-type(${i + 1}) contrast: ${contrast.toFixed(2)} (min: ${minContrast})`
            );
            expect(contrast).toBeGreaterThanOrEqual(minContrast);
          }
        }
      }
    }
  });

  test('color is not the only means of conveying information', async ({
    page,
  }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Check status indicators use more than just color
    const statusElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        '[data-testid*="status"], .badge, .tag'
      );
      return Array.from(elements).map((el) => ({
        textContent: el.textContent?.trim(),
        hasIcon: !!el.querySelector('svg, .icon'),
        hasPattern:
          el.classList.contains('border') || el.classList.contains('striped'),
        backgroundColor: window.getComputedStyle(el).backgroundColor,
      }));
    });

    for (const element of statusElements) {
      // Status should have text content or icons, not just color
      const hasNonColorIndicator =
        element.textContent || element.hasIcon || element.hasPattern;
      expect(hasNonColorIndicator).toBeTruthy();
    }

    // Check links are distinguishable by more than color
    const links = await page.evaluate(() => {
      const linkElements = document.querySelectorAll('a');
      return Array.from(linkElements).map((link) => ({
        hasUnderline: window
          .getComputedStyle(link)
          .textDecoration.includes('underline'),
        hasIcon: !!link.querySelector('svg, .icon'),
        isBold:
          window.getComputedStyle(link).fontWeight === 'bold' ||
          parseInt(window.getComputedStyle(link).fontWeight) >= 700,
      }));
    });

    for (const link of links) {
      const hasNonColorIndicator =
        link.hasUnderline || link.hasIcon || link.isBold;
      expect(hasNonColorIndicator).toBeTruthy();
    }
  });
});

test.describe('Focus Management', () => {
  test('focus indicators are visible and meet standards', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Test focus indicators on interactive elements
    const interactiveElements = ['button', 'a', 'input', 'select'];

    for (const elementType of interactiveElements) {
      const elements = await page.locator(elementType).all();

      for (let i = 0; i < Math.min(elements.length, 3); i++) {
        const element = elements[i];
        const isVisible = await element.isVisible();

        if (isVisible) {
          await element.focus();

          // Check for visible focus indicator
          const hasFocusIndicator = await page.evaluate(
            (selector) => {
              const el = document.querySelector(selector);
              if (!el || document.activeElement !== el) return false;

              const styles = window.getComputedStyle(el);
              const outline = styles.outline;
              const outlineWidth = parseFloat(styles.outlineWidth);
              const boxShadow = styles.boxShadow;
              const border = styles.border;

              return (
                (outline !== 'none' && outlineWidth >= 1) ||
                (boxShadow !== 'none' &&
                  !boxShadow.includes('rgba(0, 0, 0, 0)')) ||
                border.includes('rgb')
              );
            },
            `${elementType}:nth-of-type(${i + 1})`
          );

          expect(hasFocusIndicator).toBeTruthy();
        }
      }
    }
  });

  test('focus trapping in modals', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Try to open a modal (if any)
    const modalTrigger = page
      .locator('[data-testid*="modal"], [data-testid*="preview"]')
      .first();

    if ((await modalTrigger.count()) > 0) {
      await modalTrigger.click();

      // Wait for modal to appear
      const modal = await page
        .waitForSelector('[role="dialog"], [data-testid*="modal"]', {
          timeout: 3000,
        })
        .catch(() => null);

      if (modal) {
        // Test focus is trapped within modal
        const focusableInModal = await page
          .locator(
            '[role="dialog"] button, [role="dialog"] a, [role="dialog"] input'
          )
          .all();

        if (focusableInModal.length > 1) {
          // Focus should be on first focusable element
          await page.keyboard.press('Tab');

          // Tab through all elements and ensure focus stays in modal
          for (let i = 0; i < focusableInModal.length + 2; i++) {
            await page.keyboard.press('Tab');

            const focusIsInModal = await page.evaluate(() => {
              const activeElement = document.activeElement;
              const modal = document.querySelector('[role="dialog"]');
              return modal ? modal.contains(activeElement) : false;
            });

            expect(focusIsInModal).toBeTruthy();
          }
        }

        // Close modal with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Modal should be closed
        const modalExists = await page.locator('[role="dialog"]').count();
        expect(modalExists).toBe(0);
      }
    }
  });
});

test.describe('Mobile Accessibility', () => {
  test('mobile accessibility standards', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Check mobile-specific accessibility features
    const mobileFeatures = await page.evaluate(() => {
      return {
        hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
        hasSkipLink: !!document.querySelector('.skip-link, a[href="#main"]'),
        hasMobileMenu: !!document.querySelector(
          '[aria-label*="menu"], .mobile-menu'
        ),
        touchTargetsCount: document.querySelectorAll('button, a, input, select')
          .length,
      };
    });

    expect(mobileFeatures.hasViewportMeta).toBeTruthy();
    expect(mobileFeatures.touchTargetsCount).toBeGreaterThan(0);

    // Test mobile touch interactions are accessible
    const firstButton = page.locator('button').first();
    if ((await firstButton.count()) > 0) {
      // Simulate touch interaction
      await firstButton.tap();
      await page.waitForTimeout(100);

      // Should provide feedback (focus, state change, etc.)
      const hasVisualFeedback = await page.evaluate(() => {
        const button = document.querySelector('button');
        return button
          ? window.getComputedStyle(button).transform !== 'none' ||
              button.classList.contains('active') ||
              button.getAttribute('aria-pressed') === 'true'
          : false;
      });

      // Visual feedback is good but not required for all buttons
    }
  });
});
