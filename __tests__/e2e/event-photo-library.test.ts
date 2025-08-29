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

async function navigateToEventLibrary(page: Page, eventId: string) {
  await page.goto(`/admin/events/${eventId}/library`);
  await page.waitForSelector('[data-testid="event-library-main"]', {
    timeout: 10000,
  });
}

async function waitForGridToLoad(page: Page) {
  await page.waitForSelector('[data-testid="content-grid"]', {
    timeout: 10000,
  });
  // Wait for loading skeleton to disappear
  await page.waitForSelector('[data-testid="skeleton-grid"]', {
    state: 'hidden',
    timeout: 5000,
  });
}

test.describe('Event Photo Library - Core Workflows', () => {
  const testEventId = 'test-event-123';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Folder Management Workflow', () => {
    test('should create, rename, and delete folders', async ({ page }) => {
      await navigateToEventLibrary(page, testEventId);

      // Initial state - wait for library to load
      await waitForGridToLoad(page);

      // Test folder creation
      await test.step('Create new folder', async () => {
        await page.click('[data-testid="new-folder-button"]');
        await page.fill('[data-testid="folder-name-input"]', 'Test Folder');
        await page.click('[data-testid="create-folder-submit"]');

        // Verify folder appears in tree and grid
        await expect(page.locator('[data-testid="folder-tree"]')).toContainText(
          'Test Folder'
        );
        await expect(
          page.locator('[data-testid="content-grid"]')
        ).toContainText('Test Folder');
      });

      // Test folder rename
      await test.step('Rename folder', async () => {
        await page.click(
          '[data-testid="folder-item-Test Folder"] [data-testid="folder-options"]'
        );
        await page.click('[data-testid="rename-folder"]');
        await page.fill('[data-testid="folder-name-input"]', 'Renamed Folder');
        await page.click('[data-testid="rename-folder-submit"]');

        // Verify folder name updated
        await expect(page.locator('[data-testid="folder-tree"]')).toContainText(
          'Renamed Folder'
        );
        await expect(
          page.locator('[data-testid="content-grid"]')
        ).toContainText('Renamed Folder');
      });

      // Test subfolder creation
      await test.step('Create subfolder', async () => {
        await page.click('[data-testid="folder-item-Renamed Folder"]');
        await page.click('[data-testid="new-folder-button"]');
        await page.fill('[data-testid="folder-name-input"]', 'Subfolder');
        await page.click('[data-testid="create-folder-submit"]');

        // Verify subfolder appears under parent
        await expect(
          page.locator(
            '[data-testid="folder-tree"] [data-testid="folder-item-Subfolder"]'
          )
        ).toBeVisible();
      });

      // Test folder deletion
      await test.step('Delete folder', async () => {
        await page.click(
          '[data-testid="folder-item-Subfolder"] [data-testid="folder-options"]'
        );
        await page.click('[data-testid="delete-folder"]');
        await page.click('[data-testid="confirm-delete"]');

        // Verify folder removed
        await expect(
          page.locator(
            '[data-testid="folder-tree"] [data-testid="folder-item-Subfolder"]'
          )
        ).toHaveCount(0);
      });
    });

    test('should handle folder navigation and breadcrumbs', async ({
      page,
    }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Navigate into a folder
      await test.step('Navigate into folder', async () => {
        await page.dblclick('[data-testid="folder-item-Test Folder"]');

        // Verify breadcrumb shows current path
        await expect(page.locator('[data-testid="breadcrumb"]')).toContainText(
          'Test Folder'
        );

        // Verify URL updated with folder ID
        await expect(page).toHaveURL(/folderId=/);
      });

      // Navigate back using breadcrumb
      await test.step('Navigate back via breadcrumb', async () => {
        await page.click('[data-testid="breadcrumb-root"]');

        // Verify back at root level
        await expect(
          page.locator('[data-testid="breadcrumb"]')
        ).not.toContainText('Test Folder');
      });
    });
  });

  test.describe('Photo Upload and Management Workflow', () => {
    test('should upload photos with drag and drop', async ({ page }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Test drag and drop upload
      await test.step('Upload photos via drag and drop', async () => {
        // Create test file for upload
        const fileContent = Buffer.from('fake-image-content');

        // Simulate file drop
        await page.setInputFiles('[data-testid="file-upload-input"]', [
          {
            name: 'test-photo-1.jpg',
            mimeType: 'image/jpeg',
            buffer: fileContent,
          },
          {
            name: 'test-photo-2.jpg',
            mimeType: 'image/jpeg',
            buffer: fileContent,
          },
        ]);

        // Verify upload progress shows
        await expect(
          page.locator('[data-testid="upload-progress"]')
        ).toBeVisible();

        // Wait for upload to complete
        await page.waitForSelector('[data-testid="upload-complete"]', {
          timeout: 15000,
        });

        // Verify photos appear in grid
        await expect(page.locator('[data-testid="photo-item"]')).toHaveCount(2);
      });
    });

    test('should move photos between folders using drag and drop', async ({
      page,
    }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Assume photos and folders exist from previous tests
      await test.step('Drag photo to folder', async () => {
        const photo = page.locator('[data-testid="photo-item"]').first();
        const folder = page
          .locator('[data-testid="folder-item-Test Folder"]')
          .first();

        // Perform drag and drop
        await photo.dragTo(folder);

        // Verify photo moved (should disappear from current view if moving out of current folder)
        await expect(page.locator('[data-testid="photo-item"]')).toHaveCount(1);
      });

      // Verify photo is in target folder
      await test.step('Verify photo in target folder', async () => {
        await page.dblclick('[data-testid="folder-item-Test Folder"]');
        await waitForGridToLoad(page);

        // Should see the moved photo
        await expect(page.locator('[data-testid="photo-item"]')).toHaveCount(1);
      });
    });

    test('should support batch photo operations', async ({ page }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Select multiple photos
      await test.step('Select multiple photos', async () => {
        // Click first photo
        await page.click('[data-testid="photo-item"]', { button: 'left' });

        // Ctrl+click second photo to add to selection
        await page.click('[data-testid="photo-item"]:nth-child(2)', {
          modifiers: ['ControlOrMeta'],
        });

        // Verify selection count
        await expect(
          page.locator('[data-testid="selection-count"]')
        ).toContainText('2 selected');
      });

      // Batch move operation
      await test.step('Batch move selected photos', async () => {
        await page.click('[data-testid="batch-move-button"]');
        await page.click('[data-testid="target-folder-Test Folder"]');
        await page.click('[data-testid="confirm-move"]');

        // Verify photos moved
        await expect(page.locator('[data-testid="photo-item"]')).toHaveCount(0);
      });
    });
  });

  test.describe('Photo Viewing and Modal Workflow', () => {
    test('should open photos in lightbox with navigation', async ({ page }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Open photo in modal
      await test.step('Open photo in lightbox', async () => {
        await page.dblclick('[data-testid="photo-item"]');

        // Verify modal opens
        await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
        await expect(
          page.locator('[data-testid="photo-modal-image"]')
        ).toBeVisible();
      });

      // Test navigation within modal
      await test.step('Navigate between photos', async () => {
        // Test next photo
        await page.click('[data-testid="next-photo-button"]');

        // Test previous photo
        await page.click('[data-testid="prev-photo-button"]');

        // Test keyboard navigation
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowLeft');
      });

      // Test photo selection in modal
      await test.step('Select photo in modal', async () => {
        await page.click('[data-testid="select-photo-button"]');

        // Verify selection indicator
        await expect(
          page.locator('[data-testid="photo-selected-indicator"]')
        ).toBeVisible();
      });

      // Close modal
      await test.step('Close modal', async () => {
        await page.keyboard.press('Escape');

        // Verify modal closed
        await expect(page.locator('[data-testid="photo-modal"]')).toHaveCount(
          0
        );
      });
    });
  });

  test.describe('Keyboard Shortcuts Workflow', () => {
    test('should support keyboard shortcuts for efficiency', async ({
      page,
    }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Test Ctrl+A (select all)
      await test.step('Select all with Ctrl+A', async () => {
        await page.keyboard.press('Control+a');

        // All items should be selected
        const itemCount = await page
          .locator('[data-testid="grid-item"]')
          .count();
        await expect(
          page.locator('[data-testid="selection-count"]')
        ).toContainText(`${itemCount} selected`);
      });

      // Test Escape (clear selection)
      await test.step('Clear selection with Escape', async () => {
        await page.keyboard.press('Escape');

        // Selection should be cleared
        await expect(
          page.locator('[data-testid="selection-count"]')
        ).toHaveCount(0);
      });

      // Test Enter (navigate into folder)
      await test.step('Navigate with Enter', async () => {
        await page.click('[data-testid="folder-item-Test Folder"]');
        await page.keyboard.press('Enter');

        // Should navigate into folder
        await expect(page.locator('[data-testid="breadcrumb"]')).toContainText(
          'Test Folder'
        );
      });

      // Test F2 (rename)
      await test.step('Rename with F2', async () => {
        await page.click('[data-testid="folder-item-Subfolder"]');
        await page.keyboard.press('F2');

        // Rename dialog should open
        await expect(
          page.locator('[data-testid="rename-dialog"]')
        ).toBeVisible();

        // Cancel rename
        await page.keyboard.press('Escape');
      });
    });
  });

  test.describe('Share Generation Workflow', () => {
    test('should generate share links for photos and folders', async ({
      page,
    }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Select photos to share
      await test.step('Select photos for sharing', async () => {
        await page.click('[data-testid="photo-item"]', { button: 'left' });
        await page.click('[data-testid="photo-item"]:nth-child(2)', {
          modifiers: ['ControlOrMeta'],
        });
      });

      // Open share dialog
      await test.step('Open share dialog', async () => {
        await page.click('[data-testid="share-button"]');

        // Verify share dialog opens
        await expect(
          page.locator('[data-testid="share-dialog"]')
        ).toBeVisible();
      });

      // Configure share settings
      await test.step('Configure share settings', async () => {
        await page.check('[data-testid="allow-download"]');
        await page.fill('[data-testid="share-password"]', 'test123');
        await page.selectOption('[data-testid="expiry-select"]', '7days');

        // Generate share link
        await page.click('[data-testid="generate-share-link"]');

        // Verify share link generated
        await expect(page.locator('[data-testid="share-link"]')).toBeVisible();
        await expect(
          page.locator('[data-testid="share-link-text"]')
        ).toContainText('https://');
      });

      // Copy share link
      await test.step('Copy share link', async () => {
        await page.click('[data-testid="copy-share-link"]');

        // Verify copy confirmation
        await expect(
          page.locator('[data-testid="copy-success"]')
        ).toBeVisible();
      });
    });
  });

  test.describe('Performance and Virtualization', () => {
    test('should handle large numbers of photos efficiently', async ({
      page,
    }) => {
      await navigateToEventLibrary(page, testEventId);

      // Test with many photos (simulated)
      await test.step('Load large photo collection', async () => {
        // Navigate to folder with many photos (assume test data exists)
        await page.goto(
          `/admin/events/${testEventId}/library?folderId=large-folder`
        );
        await waitForGridToLoad(page);

        // Verify virtualization is working (only visible items rendered)
        const visiblePhotos = await page
          .locator('[data-testid="photo-item"]:visible')
          .count();
        const totalPhotos = await page
          .locator('[data-testid="total-count"]')
          .textContent();

        // Should have fewer visible items than total (virtualization)
        expect(visiblePhotos).toBeLessThan(parseInt(totalPhotos || '0'));
      });

      // Test smooth scrolling performance
      await test.step('Test scroll performance', async () => {
        const startTime = Date.now();

        // Scroll through large list
        await page.evaluate(() => {
          const grid = document.querySelector('[data-testid="content-grid"]');
          if (grid) {
            grid.scrollTop = 1000;
          }
        });

        // Wait for scroll to stabilize
        await page.waitForTimeout(500);

        const endTime = Date.now();
        const scrollTime = endTime - startTime;

        // Should scroll smoothly (under 1 second)
        expect(scrollTime).toBeLessThan(1000);
      });
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Simulate network failure
      await test.step('Handle network error during folder creation', async () => {
        // Intercept API call to simulate failure
        await page.route('**/admin/events/**/folders', (route) =>
          route.fulfill({ status: 500, body: 'Server Error' })
        );

        await page.click('[data-testid="new-folder-button"]');
        await page.fill('[data-testid="folder-name-input"]', 'Network Test');
        await page.click('[data-testid="create-folder-submit"]');

        // Verify error message shown
        await expect(
          page.locator('[data-testid="error-message"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="error-message"]')
        ).toContainText('Failed to create folder');
      });
    });

    test('should handle missing permissions', async ({ page }) => {
      // Test with limited permissions (simulate)
      await test.step('Handle permission denied', async () => {
        await page.route('**/admin/events/**/folders', (route) =>
          route.fulfill({ status: 403, body: 'Forbidden' })
        );

        await navigateToEventLibrary(page, testEventId);

        // Verify permission error handling
        await expect(
          page.locator('[data-testid="permission-error"]')
        ).toBeVisible();
      });
    });

    test('should handle corrupted or missing photos', async ({ page }) => {
      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Test photo that fails to load
      await test.step('Handle broken photo', async () => {
        // Intercept image requests to simulate failure
        await page.route('**/storage/photos/**', (route) =>
          route.fulfill({ status: 404, body: 'Not Found' })
        );

        // Try to open photo modal
        await page.dblclick('[data-testid="photo-item"]');

        // Verify fallback image or error state
        await expect(page.locator('[data-testid="photo-error"]')).toBeVisible();
      });
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page, isMobile }) => {
      // Skip if not mobile test
      test.skip(!isMobile, 'This test only runs on mobile');

      await navigateToEventLibrary(page, testEventId);
      await waitForGridToLoad(page);

      // Test mobile-specific interactions
      await test.step('Mobile touch interactions', async () => {
        // Test tap to select
        await page.tap('[data-testid="photo-item"]');

        // Test long press for context menu (if implemented)
        await page.locator('[data-testid="photo-item"]').tap({ timeout: 1000 });

        // Test pinch zoom in photo modal
        await page.dblclick('[data-testid="photo-item"]');
        await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
      });

      // Test mobile layout adaptations
      await test.step('Mobile layout', async () => {
        // Verify panels stack properly on mobile
        await expect(page.locator('[data-testid="folder-tree"]')).toHaveCSS(
          'position',
          'absolute'
        );

        // Test mobile navigation
        await page.click('[data-testid="mobile-menu-toggle"]');
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      });
    });
  });
});
