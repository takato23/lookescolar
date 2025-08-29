import { test, expect, Page } from '@playwright/test';

// Test helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
  await page.fill('[data-testid="password-input"]', 'test-password');
  await page.click('[data-testid="login-button"]');
  await page.waitForSelector('[data-testid="admin-dashboard"]', {
    timeout: 10000,
  });
}

async function generateShareLink(page: Page, eventId: string): Promise<string> {
  await page.goto(`/admin/events/${eventId}/library`);
  await page.waitForSelector('[data-testid="content-grid"]', {
    timeout: 10000,
  });

  // Select some photos
  await page.click('[data-testid="photo-item"]');
  await page.click('[data-testid="photo-item"]:nth-child(2)', {
    modifiers: ['ControlOrMeta'],
  });

  // Generate share link
  await page.click('[data-testid="share-button"]');
  await page.fill('[data-testid="share-password"]', 'test123');
  await page.click('[data-testid="generate-share-link"]');

  const shareLink = await page
    .locator('[data-testid="share-link-text"]')
    .textContent();
  return shareLink || '';
}

test.describe('Event Photo Library - Public Sharing Workflow', () => {
  const testEventId = 'test-event-123';
  let shareLink: string;

  test.describe('Share Link Generation (Admin)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should generate password-protected share link', async ({ page }) => {
      await test.step('Create share with password protection', async () => {
        shareLink = await generateShareLink(page, testEventId);

        // Verify share link format
        expect(shareLink).toMatch(/\/share\/[a-f0-9]{64}/);

        // Copy link for use in public tests
        await page.evaluate((link) => {
          navigator.clipboard.writeText(link);
        }, shareLink);
      });
    });

    test('should create share with download permissions', async ({ page }) => {
      await page.goto(`/admin/events/${testEventId}/library`);
      await page.waitForSelector('[data-testid="content-grid"]', {
        timeout: 10000,
      });

      await test.step('Configure download permissions', async () => {
        await page.click('[data-testid="photo-item"]');
        await page.click('[data-testid="share-button"]');

        // Enable download
        await page.check('[data-testid="allow-download"]');
        await page.check('[data-testid="allow-comments"]');

        // Set expiry
        await page.selectOption('[data-testid="expiry-select"]', '7days');

        await page.click('[data-testid="generate-share-link"]');

        // Verify share configuration
        await expect(
          page.locator('[data-testid="share-config-summary"]')
        ).toContainText('Downloads: Enabled');
        await expect(
          page.locator('[data-testid="share-config-summary"]')
        ).toContainText('Comments: Enabled');
        await expect(
          page.locator('[data-testid="share-config-summary"]')
        ).toContainText('Expires: 7 days');
      });
    });

    test('should manage existing shares', async ({ page }) => {
      await page.goto(`/admin/events/${testEventId}/shares`);

      await test.step('View share management', async () => {
        // Verify shares list
        await expect(
          page.locator('[data-testid="shares-table"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="share-row"]')
        ).toHaveCountGreaterThan(0);
      });

      await test.step('Revoke share', async () => {
        await page.click('[data-testid="share-actions"]');
        await page.click('[data-testid="revoke-share"]');
        await page.click('[data-testid="confirm-revoke"]');

        // Verify share status updated
        await expect(
          page.locator('[data-testid="share-status"]')
        ).toContainText('Revoked');
      });

      await test.step('View share analytics', async () => {
        await page.click('[data-testid="share-analytics"]');

        // Verify analytics data
        await expect(page.locator('[data-testid="share-views"]')).toBeVisible();
        await expect(
          page.locator('[data-testid="share-downloads"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="unique-visitors"]')
        ).toBeVisible();
      });
    });
  });

  test.describe('Public Share Access', () => {
    test.beforeEach(async ({ page }) => {
      // Use a predefined share link for testing
      shareLink =
        '/share/1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    });

    test('should access share with correct password', async ({ page }) => {
      await test.step('Access share page', async () => {
        await page.goto(shareLink);

        // Verify password prompt
        await expect(
          page.locator('[data-testid="share-password-form"]')
        ).toBeVisible();
        await expect(page.locator('[data-testid="share-title"]')).toBeVisible();
      });

      await test.step('Enter correct password', async () => {
        await page.fill('[data-testid="share-password-input"]', 'test123');
        await page.click('[data-testid="share-access-button"]');

        // Verify access granted
        await expect(
          page.locator('[data-testid="share-gallery"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="share-photo"]')
        ).toHaveCountGreaterThan(0);
      });
    });

    test('should reject incorrect password', async ({ page }) => {
      await page.goto(shareLink);

      await test.step('Enter wrong password', async () => {
        await page.fill(
          '[data-testid="share-password-input"]',
          'wrongpassword'
        );
        await page.click('[data-testid="share-access-button"]');

        // Verify access denied
        await expect(
          page.locator('[data-testid="password-error"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="password-error"]')
        ).toContainText('Incorrect password');
      });
    });

    test('should handle expired shares', async ({ page }) => {
      const expiredShareLink =
        '/share/expired1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      await test.step('Access expired share', async () => {
        await page.goto(expiredShareLink);

        // Verify expiry message
        await expect(
          page.locator('[data-testid="share-expired"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="share-expired"]')
        ).toContainText('This share has expired');
      });
    });

    test('should handle revoked shares', async ({ page }) => {
      const revokedShareLink =
        '/share/revoked1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      await test.step('Access revoked share', async () => {
        await page.goto(revokedShareLink);

        // Verify revocation message
        await expect(
          page.locator('[data-testid="share-revoked"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="share-revoked"]')
        ).toContainText('This share is no longer available');
      });
    });
  });

  test.describe('Public Gallery Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Access valid share first
      await page.goto(shareLink);
      await page.fill('[data-testid="share-password-input"]', 'test123');
      await page.click('[data-testid="share-access-button"]');
      await page.waitForSelector('[data-testid="share-gallery"]');
    });

    test('should browse photos in gallery', async ({ page }) => {
      await test.step('View photo grid', async () => {
        // Verify gallery layout
        await expect(
          page.locator('[data-testid="share-photo"]')
        ).toHaveCountGreaterThan(0);
        await expect(
          page.locator('[data-testid="gallery-title"]')
        ).toBeVisible();
      });

      await test.step('Open photo in lightbox', async () => {
        await page.click('[data-testid="share-photo"]');

        // Verify lightbox opens
        await expect(
          page.locator('[data-testid="photo-lightbox"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="lightbox-image"]')
        ).toBeVisible();
      });

      await test.step('Navigate between photos', async () => {
        // Test next/previous navigation
        await page.click('[data-testid="lightbox-next"]');
        await page.click('[data-testid="lightbox-prev"]');

        // Test keyboard navigation
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowLeft');

        // Close lightbox
        await page.keyboard.press('Escape');
        await expect(
          page.locator('[data-testid="photo-lightbox"]')
        ).toHaveCount(0);
      });
    });

    test('should support photo downloads when enabled', async ({ page }) => {
      await test.step('Download single photo', async () => {
        await page.click('[data-testid="share-photo"]');

        // Start download
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="download-photo"]');
        const download = await downloadPromise;

        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.(jpg|jpeg|png|gif)$/i);
      });

      await test.step('Download multiple photos', async () => {
        // Select multiple photos
        await page.click('[data-testid="share-photo"]', {
          modifiers: ['ControlOrMeta'],
        });
        await page.click('[data-testid="share-photo"]:nth-child(2)', {
          modifiers: ['ControlOrMeta'],
        });

        // Start bulk download
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="download-selected"]');
        const download = await downloadPromise;

        // Verify ZIP download
        expect(download.suggestedFilename()).toMatch(/\.zip$/i);
      });
    });

    test('should support comments when enabled', async ({ page }) => {
      await test.step('Add comment to photo', async () => {
        await page.click('[data-testid="share-photo"]');
        await page.click('[data-testid="add-comment"]');

        // Fill comment form
        await page.fill('[data-testid="comment-text"]', 'Great photo!');
        await page.fill('[data-testid="commenter-name"]', 'John Doe');
        await page.click('[data-testid="submit-comment"]');

        // Verify comment appears
        await expect(page.locator('[data-testid="comment"]')).toContainText(
          'Great photo!'
        );
        await expect(page.locator('[data-testid="comment"]')).toContainText(
          'John Doe'
        );
      });

      await test.step('View existing comments', async () => {
        await page.click('[data-testid="view-comments"]');

        // Verify comments list
        await expect(
          page.locator('[data-testid="comments-list"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="comment-count"]')
        ).toContainText('1 comment');
      });
    });

    test('should handle watermarked previews', async ({ page }) => {
      await test.step('Verify watermarked images', async () => {
        // Check that images have watermark overlay
        const photoSrc = await page
          .locator('[data-testid="share-photo"] img')
          .first()
          .getAttribute('src');
        expect(photoSrc).toContain('watermark');

        // Verify watermark is visible
        await expect(
          page.locator('[data-testid="watermark-indicator"]')
        ).toBeVisible();
      });

      await test.step('Original quality on download', async () => {
        // When downloading, should get original quality (if permitted)
        await page.click('[data-testid="share-photo"]');

        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="download-photo"]');
        const download = await downloadPromise;

        // Download should be original size (verify by file size or metadata)
        const downloadPath = await download.path();
        expect(downloadPath).toBeDefined();
      });
    });

    test('should track view analytics', async ({ page }) => {
      await test.step('Record photo views', async () => {
        // View multiple photos
        await page.click('[data-testid="share-photo"]');
        await page.keyboard.press('Escape');

        await page.click('[data-testid="share-photo"]:nth-child(2)');
        await page.keyboard.press('Escape');

        // Views should be tracked (verify via network requests or admin panel)
        const requests = [];
        page.on('request', (request) => {
          if (request.url().includes('/api/share/analytics')) {
            requests.push(request);
          }
        });

        // Refresh page to trigger analytics
        await page.reload();

        // Should have made analytics calls
        expect(requests.length).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Share Security and Rate Limiting', () => {
    test('should handle multiple failed password attempts', async ({
      page,
    }) => {
      await page.goto(shareLink);

      await test.step('Trigger rate limiting', async () => {
        // Attempt multiple wrong passwords
        for (let i = 0; i < 5; i++) {
          await page.fill('[data-testid="share-password-input"]', `wrong${i}`);
          await page.click('[data-testid="share-access-button"]');
          await page.waitForSelector('[data-testid="password-error"]');
        }

        // Should trigger rate limiting
        await expect(
          page.locator('[data-testid="rate-limit-error"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="rate-limit-error"]')
        ).toContainText('Too many attempts');
      });
    });

    test('should respect share view limits', async ({ page }) => {
      const limitedShareLink =
        '/share/limited1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      await test.step('Access share at view limit', async () => {
        await page.goto(limitedShareLink);
        await page.fill('[data-testid="share-password-input"]', 'test123');
        await page.click('[data-testid="share-access-button"]');

        // Should show view limit warning
        await expect(
          page.locator('[data-testid="view-limit-warning"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="remaining-views"]')
        ).toContainText('1 view remaining');
      });
    });

    test('should prevent unauthorized access attempts', async ({ page }) => {
      const unauthorizedLink = '/share/invalid123456789';

      await test.step('Access invalid share', async () => {
        await page.goto(unauthorizedLink);

        // Should show not found error
        await expect(
          page.locator('[data-testid="share-not-found"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="share-not-found"]')
        ).toContainText('Share not found');
      });
    });
  });

  test.describe('Mobile Share Experience', () => {
    test('should work on mobile devices', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');

      await page.goto(shareLink);
      await page.fill('[data-testid="share-password-input"]', 'test123');
      await page.click('[data-testid="share-access-button"]');

      await test.step('Mobile gallery navigation', async () => {
        // Verify mobile-optimized layout
        await expect(
          page.locator('[data-testid="mobile-gallery"]')
        ).toBeVisible();

        // Test touch interactions
        await page.tap('[data-testid="share-photo"]');

        // Test swipe navigation in lightbox
        await page.touchscreen.tap(100, 300);
        await page.touchscreen.tap(200, 300);
      });

      await test.step('Mobile download experience', async () => {
        // Test mobile download flow
        await page.tap('[data-testid="mobile-download"]');

        // Should handle mobile download limitations
        await expect(
          page.locator('[data-testid="mobile-download-info"]')
        ).toBeVisible();
      });
    });
  });
});
