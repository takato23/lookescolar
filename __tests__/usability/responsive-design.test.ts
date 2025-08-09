/**
 * @fileoverview Responsive Design Testing Suite
 * Multi-device testing for desktop, tablet, and mobile viewports
 */

import { test, expect } from '@playwright/test';

// Standard viewport sizes for testing
const VIEWPORTS = {
  mobile: [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 14', width: 393, height: 852 },
    { name: 'Galaxy S23', width: 360, height: 780 },
    { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  ],
  tablet: [
    { name: 'iPad', width: 1024, height: 768 },
    { name: 'iPad Pro', width: 1366, height: 1024 },
    { name: 'Surface Pro', width: 1368, height: 912 },
  ],
  desktop: [
    { name: 'Laptop', width: 1440, height: 900 },
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Large Desktop', width: 2560, height: 1440 },
    { name: 'Ultrawide', width: 3440, height: 1440 },
  ],
};

test.describe('Responsive Design Testing', () => {
  test.describe('Mobile Responsiveness', () => {
    VIEWPORTS.mobile.forEach(viewport => {
      test(`${viewport.name} (${viewport.width}x${viewport.height}) - Photo Gallery`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/gallery/test-event-123');

        // Check mobile header is visible
        const mobileHeader = page.locator('[data-testid="mobile-header"]');
        await expect(mobileHeader).toBeVisible();

        // Check desktop header is hidden
        const desktopHeader = page.locator('[data-testid="desktop-header"]');
        await expect(desktopHeader).not.toBeVisible();

        // Check grid adapts to 2 columns on mobile
        const photoGrid = page.locator('[data-testid="photo-grid"]');
        const gridCols = await photoGrid.evaluate(el => 
          getComputedStyle(el).getPropertyValue('grid-template-columns')
        );
        
        // Should have 2 columns on mobile
        expect(gridCols.split(' ').length).toBe(2);

        // Check photos are properly sized
        const photoCard = page.locator('[data-testid="photo-card"]').first();
        const cardRect = await photoCard.boundingBox();
        
        if (cardRect) {
          expect(cardRect.width).toBeGreaterThan(150); // Minimum readable size
          expect(cardRect.width).toBeLessThan(viewport.width / 2 - 20); // Fits in grid
        }
      });

      test(`${viewport.name} - Navigation Menu`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/admin');

        // Mobile menu button should be visible
        const menuButton = page.locator('[data-testid="mobile-menu-button"]');
        await expect(menuButton).toBeVisible();

        // Click to open menu
        await menuButton.click();

        // Sidebar should slide in
        const sidebar = page.locator('[data-testid="mobile-sidebar"]');
        await expect(sidebar).toBeVisible();
        
        // Menu should overlay content
        const overlay = page.locator('[data-testid="sidebar-backdrop"]');
        await expect(overlay).toBeVisible();

        // Close menu
        await overlay.click();
        await expect(sidebar).not.toBeVisible();
      });

      test(`${viewport.name} - Touch Interactions`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/f/test-token');

        // Test swipe gestures on photo modal
        const photoCard = page.locator('[data-testid="photo-card"]').first();
        await photoCard.click();

        const modal = page.locator('[data-testid="photo-modal"]');
        await expect(modal).toBeVisible();

        // Test touch navigation
        const modalImage = page.locator('[data-testid="modal-image"]');
        
        // Swipe left to next image
        await modalImage.dragTo(modalImage, { 
          sourcePosition: { x: viewport.width - 50, y: viewport.height / 2 },
          targetPosition: { x: 50, y: viewport.height / 2 }
        });

        // Should advance to next photo
        await expect(page.locator('[data-testid="photo-counter"]')).toContainText('2 de');
      });
    });
  });

  test.describe('Tablet Responsiveness', () => {
    VIEWPORTS.tablet.forEach(viewport => {
      test(`${viewport.name} (${viewport.width}x${viewport.height}) - Layout`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/admin/photos');

        // Check tablet layout (3-4 columns)
        const photoGrid = page.locator('[data-testid="photo-grid"]');
        const gridCols = await photoGrid.evaluate(el => 
          getComputedStyle(el).getPropertyValue('grid-template-columns')
        );
        
        const colCount = gridCols.split(' ').length;
        expect(colCount).toBeGreaterThanOrEqual(3);
        expect(colCount).toBeLessThanOrEqual(4);

        // Sidebar should be available but collapsible
        const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
        if (await sidebarToggle.isVisible()) {
          await sidebarToggle.click();
          
          const sidebar = page.locator('[data-testid="admin-sidebar"]');
          await expect(sidebar).toBeVisible();
        }
      });

      test(`${viewport.name} - Photo Upload Interface`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/admin/photos');

        // Upload area should be appropriately sized
        const uploadArea = page.locator('[data-testid="upload-dropzone"]');
        const uploadRect = await uploadArea.boundingBox();
        
        if (uploadRect) {
          expect(uploadRect.width).toBeGreaterThan(400);
          expect(uploadRect.height).toBeGreaterThan(200);
        }

        // Progress indicators should be visible
        await page.setInputFiles('[data-testid="file-input"]', '__tests__/fixtures/sample-photo.jpg');
        
        const progressBar = page.locator('[data-testid="upload-progress"]');
        await expect(progressBar).toBeVisible();
      });
    });
  });

  test.describe('Desktop Responsiveness', () => {
    VIEWPORTS.desktop.forEach(viewport => {
      test(`${viewport.name} (${viewport.width}x${viewport.height}) - Pro Gallery`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/admin/photos');

        // Desktop should show full sidebar
        const sidebar = page.locator('[data-testid="admin-sidebar"]');
        await expect(sidebar).toBeVisible();

        // Grid should adapt to larger screens
        const photoGrid = page.locator('[data-testid="photo-grid"]');
        const gridCols = await photoGrid.evaluate(el => 
          getComputedStyle(el).getPropertyValue('grid-template-columns')
        );
        
        const colCount = gridCols.split(' ').length;
        
        if (viewport.width >= 2560) {
          expect(colCount).toBeGreaterThanOrEqual(6); // Ultrawide should have 6+ columns
        } else if (viewport.width >= 1920) {
          expect(colCount).toBeGreaterThanOrEqual(5); // Desktop should have 5+ columns
        } else {
          expect(colCount).toBeGreaterThanOrEqual(4); // Laptop should have 4+ columns
        }

        // Command palette should be accessible
        await page.keyboard.press('Meta+k');
        const commandPalette = page.locator('[data-testid="command-palette"]');
        await expect(commandPalette).toBeVisible();
      });

      test(`${viewport.name} - Bulk Operations`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/admin/photos');

        // Bulk select should work efficiently
        const firstPhoto = page.locator('[data-testid="photo-card"]').first();
        await firstPhoto.click();
        
        // Ctrl+A to select all
        await page.keyboard.press('Meta+a');
        
        const selectionCount = page.locator('[data-testid="selection-count"]');
        await expect(selectionCount).toContainText('seleccionada');

        // Bulk actions toolbar should appear
        const bulkActions = page.locator('[data-testid="bulk-actions"]');
        await expect(bulkActions).toBeVisible();
      });
    });
  });

  test.describe('Content Overflow and Wrapping', () => {
    test('Long content handles overflow properly', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 }); // Very narrow
      await page.goto('/f/test-token');

      // Event title should wrap or truncate
      const eventTitle = page.locator('[data-testid="event-title"]');
      const titleRect = await eventTitle.boundingBox();
      
      if (titleRect) {
        expect(titleRect.width).toBeLessThan(320); // Should not exceed viewport
      }

      // Photo descriptions should not overflow
      const photoCard = page.locator('[data-testid="photo-card"]').first();
      const cardRect = await photoCard.boundingBox();
      
      if (cardRect) {
        expect(cardRect.width).toBeLessThan(160); // Half viewport with margin
      }
    });

    test('Navigation items wrap properly', async ({ page }) => {
      await page.setViewportSize({ width: 480, height: 800 });
      await page.goto('/admin');

      // Navigation should be accessible without horizontal scroll
      const navigation = page.locator('[data-testid="admin-navigation"]');
      const hasHorizontalScroll = await navigation.evaluate(el => 
        el.scrollWidth > el.clientWidth
      );
      
      expect(hasHorizontalScroll).toBe(false);
    });
  });

  test.describe('Orientation Changes', () => {
    test('Portrait to landscape adaptation', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto('/f/test-token');

      const portraitGridCols = await page.locator('[data-testid="photo-grid"]').evaluate(el => 
        getComputedStyle(el).getPropertyValue('grid-template-columns')
      );

      // Switch to landscape
      await page.setViewportSize({ width: 852, height: 393 });
      await page.waitForTimeout(100); // Allow layout to settle

      const landscapeGridCols = await page.locator('[data-testid="photo-grid"]').evaluate(el => 
        getComputedStyle(el).getPropertyValue('grid-template-columns')
      );

      // Should have more columns in landscape
      expect(landscapeGridCols.split(' ').length).toBeGreaterThan(
        portraitGridCols.split(' ').length
      );
    });

    test('Tablet orientation handling', async ({ page }) => {
      // iPad in portrait
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/admin/photos');

      let sidebar = page.locator('[data-testid="admin-sidebar"]');
      const portraitSidebarVisible = await sidebar.isVisible();

      // iPad in landscape
      await page.setViewportSize({ width: 1024, height: 768 });

      const landscapeSidebarVisible = await sidebar.isVisible();
      
      // Sidebar behavior should be consistent or improve in landscape
      expect(landscapeSidebarVisible).toBe(true);
    });
  });

  test.describe('Zoom and Scale Testing', () => {
    test('200% browser zoom compatibility', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Simulate 200% zoom by halving viewport
      await page.setViewportSize({ width: 960, height: 540 });
      await page.goto('/gallery/test-event-123');

      // Content should still be readable and functional
      const photoGrid = page.locator('[data-testid="photo-grid"]');
      await expect(photoGrid).toBeVisible();

      // Text should not be cut off
      const eventTitle = page.locator('[data-testid="event-title"]');
      await expect(eventTitle).toBeVisible();
      
      const titleRect = await eventTitle.boundingBox();
      if (titleRect) {
        expect(titleRect.width).toBeLessThan(960); // Should fit in zoomed viewport
      }
    });

    test('Mobile pinch zoom simulation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/f/test-token');

      // Open photo modal
      const photoCard = page.locator('[data-testid="photo-card"]').first();
      await photoCard.click();

      const modal = page.locator('[data-testid="photo-modal"]');
      await expect(modal).toBeVisible();

      // Image should be zoomable in modal
      const modalImage = page.locator('[data-testid="modal-image"]');
      await expect(modalImage).toHaveCSS('max-width', '100%');
      await expect(modalImage).toHaveCSS('height', 'auto');
    });
  });

  test.describe('Dynamic Content Responsiveness', () => {
    test('Grid adjusts to content count', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
      // Test with few photos
      await page.goto('/gallery/test-event-few-photos');
      
      const fewPhotosGrid = page.locator('[data-testid="photo-grid"]');
      const fewPhotosRect = await fewPhotosGrid.boundingBox();
      
      // Test with many photos
      await page.goto('/gallery/test-event-many-photos');
      
      const manyPhotosGrid = page.locator('[data-testid="photo-grid"]');
      const manyPhotosRect = await manyPhotosGrid.boundingBox();
      
      // Grid should maintain consistent column widths
      if (fewPhotosRect && manyPhotosRect) {
        expect(Math.abs(fewPhotosRect.width - manyPhotosRect.width)).toBeLessThan(50);
      }
    });

    test('Loading states responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/f/test-token', { waitUntil: 'networkidle' });

      // Loading skeleton should match final layout
      const loadingSkeleton = page.locator('[data-testid="loading-skeleton"]');
      
      if (await loadingSkeleton.isVisible()) {
        const skeletonRect = await loadingSkeleton.boundingBox();
        
        // Wait for actual content
        await page.waitForSelector('[data-testid="photo-grid"]');
        
        const gridRect = await page.locator('[data-testid="photo-grid"]').boundingBox();
        
        // Skeleton should roughly match content dimensions
        if (skeletonRect && gridRect) {
          expect(Math.abs(skeletonRect.width - gridRect.width)).toBeLessThan(20);
        }
      }
    });
  });

  test.describe('Performance on Different Viewports', () => {
    test('Mobile performance optimization', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate and measure performance
      const startTime = Date.now();
      await page.goto('/gallery/test-event-123');
      await page.waitForSelector('[data-testid="photo-grid"]');
      const loadTime = Date.now() - startTime;
      
      // Should load quickly on mobile
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
      
      // Check for lazy loading
      const offScreenPhotos = page.locator('[data-testid="photo-card"]').nth(10);
      const isLazyLoaded = await offScreenPhotos.evaluate(el => 
        el.querySelector('img')?.loading === 'lazy'
      );
      
      expect(isLazyLoaded).toBe(true);
    });

    test('Desktop performance with large grids', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      
      const startTime = Date.now();
      await page.goto('/admin/photos');
      await page.waitForSelector('[data-testid="photo-grid"]');
      const loadTime = Date.now() - startTime;
      
      // Desktop should handle large grids efficiently
      expect(loadTime).toBeLessThan(2000); // 2 seconds max
      
      // Virtual scrolling should be active for large sets
      const gridContainer = page.locator('[data-testid="photo-grid-container"]');
      const hasVirtualScroll = await gridContainer.evaluate(el => 
        el.style.height !== '' || el.getAttribute('data-virtual-scroll') === 'true'
      );
      
      // For large photo sets, virtual scrolling should be enabled
      const photoCount = await page.locator('[data-testid="photo-card"]').count();
      if (photoCount > 50) {
        expect(hasVirtualScroll).toBe(true);
      }
    });
  });
});