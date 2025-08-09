/**
 * @fileoverview Performance and Core Web Vitals Testing
 * Real-world performance testing with image galleries and user interactions
 */

import { test, expect } from '@playwright/test';

// Performance thresholds based on Core Web Vitals
const PERFORMANCE_THRESHOLDS = {
  LCP: 2500,      // Largest Contentful Paint - should be ≤ 2.5s
  FID: 100,       // First Input Delay - should be ≤ 100ms
  CLS: 0.1,       // Cumulative Layout Shift - should be ≤ 0.1
  FCP: 1800,      // First Contentful Paint - should be ≤ 1.8s
  TTI: 3800,      // Time to Interactive - should be ≤ 3.8s
  TBT: 200,       // Total Blocking Time - should be ≤ 200ms
};

// Performance testing configuration
const PERFORMANCE_CONFIG = {
  slowNetwork: {
    offline: false,
    downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5Mbps
    uploadThroughput: 750 * 1024 / 8,           // 750Kbps
    latency: 40,
  },
  fastNetwork: {
    offline: false,
    downloadThroughput: 10 * 1024 * 1024 / 8,  // 10Mbps
    uploadThroughput: 10 * 1024 * 1024 / 8,    // 10Mbps
    latency: 10,
  }
};

test.describe('Core Web Vitals Testing', () => {
  test('Homepage Core Web Vitals', async ({ page }) => {
    // Start performance monitoring
    await page.coverage.startCSSCoverage();
    await page.coverage.startJSCoverage();

    const startTime = Date.now();
    
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for main content to be visible
    await page.waitForSelector('[data-testid="main-content"]');
    
    const navigationTime = Date.now() - startTime;
    
    // Get Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            }
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime;
            }
            if (entry.name === 'cumulative-layout-shift') {
              vitals.CLS = entry.value;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['largest-contentful-paint', 'paint', 'layout-shift'] });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve({}), 5000);
      });
    });

    // Verify navigation performance
    expect(navigationTime).toBeLessThan(3000);
    
    // Check Core Web Vitals (if available)
    if (vitals.LCP) {
      expect(vitals.LCP).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);
    }
    if (vitals.FCP) {
      expect(vitals.FCP).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP);
    }
    if (vitals.CLS !== undefined) {
      expect(vitals.CLS).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS);
    }

    // Stop coverage and analyze
    const jsCoverage = await page.coverage.stopJSCoverage();
    const cssCoverage = await page.coverage.stopCSSCoverage();
    
    // Calculate unused bytes
    const jsUnusedBytes = jsCoverage.reduce((total, entry) => {
      const unusedBytes = entry.ranges
        .filter(range => !range.count)
        .reduce((sum, range) => sum + (range.end - range.start), 0);
      return total + unusedBytes;
    }, 0);

    // JS bundle should be reasonably efficient (< 50% unused)
    const totalJsBytes = jsCoverage.reduce((total, entry) => total + entry.text.length, 0);
    const jsUtilization = (totalJsBytes - jsUnusedBytes) / totalJsBytes;
    expect(jsUtilization).toBeGreaterThan(0.5);
  });

  test('Photo Gallery Performance - Large Dataset', async ({ page }) => {
    // Test with many photos
    await page.goto('/gallery/large-event-500-photos');
    
    const startTime = Date.now();
    
    // Wait for initial photos to load
    await page.waitForSelector('[data-testid="photo-grid"]');
    await page.waitForFunction(() => {
      const photos = document.querySelectorAll('[data-testid="photo-card"] img');
      return photos.length > 0 && Array.from(photos).some(img => img.complete);
    });
    
    const initialLoadTime = Date.now() - startTime;
    
    // Initial load should be fast (virtual scrolling/lazy loading)
    expect(initialLoadTime).toBeLessThan(2000);
    
    // Check that not all images are loaded immediately (lazy loading)
    const totalPhotos = await page.locator('[data-testid="photo-card"]').count();
    const loadedImages = await page.locator('[data-testid="photo-card"] img[src]').count();
    
    // Should load only visible + some preload
    expect(loadedImages).toBeLessThan(totalPhotos);
    expect(loadedImages).toBeGreaterThan(10); // But some should be loaded
    
    // Test scroll performance
    const scrollStartTime = Date.now();
    await page.mouse.wheel(0, 1000);
    
    // Wait for new images to load
    await page.waitForTimeout(500);
    
    const scrollTime = Date.now() - scrollStartTime;
    expect(scrollTime).toBeLessThan(1000); // Scroll should be responsive
  });

  test('Admin Dashboard Performance', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    const loginStartTime = Date.now();
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');
    
    const loginTime = Date.now() - loginStartTime;
    expect(loginTime).toBeLessThan(2000);
    
    // Navigate to photos section with many photos
    const photosNavTime = Date.now();
    await page.click('[data-testid="nav-photos"]');
    await page.waitForSelector('[data-testid="photo-grid"]');
    
    const photosLoadTime = Date.now() - photosNavTime;
    expect(photosLoadTime).toBeLessThan(1500);
    
    // Test bulk selection performance
    const bulkSelectTime = Date.now();
    await page.keyboard.press('Meta+a');
    await page.waitForSelector('[data-testid="bulk-actions"]');
    
    const selectionTime = Date.now() - bulkSelectTime;
    expect(selectionTime).toBeLessThan(500); // Bulk selection should be instant
  });

  test('Mobile Performance Testing', async ({ page }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Simulate slow 3G
    await page.context().route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Add 50ms delay
      await route.continue();
    });

    const mobileStartTime = Date.now();
    await page.goto('/f/family-token-12345');
    
    // Wait for content
    await page.waitForSelector('[data-testid="family-gallery"]');
    
    const mobileLoadTime = Date.now() - mobileStartTime;
    
    // Mobile should still load reasonably fast even on slow connection
    expect(mobileLoadTime).toBeLessThan(5000);
    
    // Test touch interaction performance
    const touchStartTime = Date.now();
    await page.locator('[data-testid="family-photo"]').first().tap();
    await page.waitForSelector('[data-testid="photo-modal"]');
    
    const touchResponseTime = Date.now() - touchStartTime;
    expect(touchResponseTime).toBeLessThan(300); // Touch should be responsive
  });
});

test.describe('Resource Loading Performance', () => {
  test('Image Loading Optimization', async ({ page }) => {
    await page.goto('/gallery/test-event-123');

    // Monitor network requests
    const imageRequests = [];
    
    page.on('request', (request) => {
      if (request.resourceType() === 'image') {
        imageRequests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    // Wait for initial load
    await page.waitForSelector('[data-testid="photo-grid"]');
    await page.waitForTimeout(1000);

    // Should not load too many images initially
    expect(imageRequests.length).toBeLessThan(20);

    // Test progressive loading on scroll
    const initialRequests = imageRequests.length;
    
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(500);
    
    // Should load more images after scroll
    expect(imageRequests.length).toBeGreaterThan(initialRequests);
    
    // Test that images are properly sized
    const firstImage = page.locator('[data-testid="photo-card"] img').first();
    const imageSize = await firstImage.evaluate(img => ({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: img.offsetWidth,
      displayHeight: img.offsetHeight
    }));

    // Images should not be significantly larger than display size
    const sizeRatio = (imageSize.naturalWidth * imageSize.naturalHeight) / 
                     (imageSize.displayWidth * imageSize.displayHeight);
    expect(sizeRatio).toBeLessThan(4); // Not more than 4x the display area
  });

  test('Font Loading Performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Check that fonts don't cause layout shift
    await page.waitForSelector('h1');
    
    const fontLoadTime = Date.now() - startTime;
    expect(fontLoadTime).toBeLessThan(2000);

    // Check for font display swap
    const fontFaces = await page.evaluate(() => {
      return Array.from(document.fonts.values()).map(font => ({
        family: font.family,
        status: font.status,
        display: font.display
      }));
    });

    // Fonts should use swap display for better performance
    fontFaces.forEach(font => {
      if (font.family.includes('custom') || font.family.includes('Inter')) {
        expect(['swap', 'fallback', 'optional']).toContain(font.display || 'auto');
      }
    });
  });

  test('Bundle Size Performance', async ({ page }) => {
    // Track all resources loaded
    const resources = [];
    
    page.on('response', async (response) => {
      if (response.request().resourceType() === 'script' || 
          response.request().resourceType() === 'stylesheet') {
        
        const headers = response.headers();
        const contentLength = headers['content-length'];
        
        resources.push({
          url: response.url(),
          type: response.request().resourceType(),
          size: contentLength ? parseInt(contentLength) : 0,
          compressed: headers['content-encoding'] === 'gzip' || 
                     headers['content-encoding'] === 'br'
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check JavaScript bundle sizes
    const jsResources = resources.filter(r => r.type === 'script');
    const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);
    
    // Initial JS bundle should be reasonable
    expect(totalJsSize).toBeLessThan(500 * 1024); // 500KB max initial JS

    // Check that resources are compressed
    const compressedJs = jsResources.filter(r => r.compressed);
    expect(compressedJs.length).toBeGreaterThan(0);

    // CSS should also be optimized
    const cssResources = resources.filter(r => r.type === 'stylesheet');
    const totalCssSize = cssResources.reduce((sum, r) => sum + r.size, 0);
    
    expect(totalCssSize).toBeLessThan(100 * 1024); // 100KB max CSS
  });
});

test.describe('Memory and CPU Performance', () => {
  test('Memory usage during photo browsing', async ({ page }) => {
    await page.goto('/f/family-token-12345');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null;
    });

    if (initialMemory) {
      // Browse through many photos
      for (let i = 0; i < 50; i++) {
        const photo = page.locator('[data-testid="family-photo"]').nth(i % 10);
        await photo.click();
        await page.waitForSelector('[data-testid="photo-modal"]');
        await page.keyboard.press('Escape');
        
        // Occasional garbage collection trigger
        if (i % 10 === 0) {
          await page.evaluate(() => {
            if (window.gc) window.gc();
          });
        }
      }

      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null;
      });

      // Memory should not grow excessively
      const memoryGrowth = finalMemory.used - initialMemory.used;
      const growthPercentage = memoryGrowth / initialMemory.used;
      
      expect(growthPercentage).toBeLessThan(2); // Less than 200% growth
      expect(finalMemory.used).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    }
  });

  test('CPU performance during animations', async ({ page }) => {
    await page.goto('/gallery/test-event-123');

    // Test hover animations performance
    const photos = page.locator('[data-testid="photo-card"]');
    const photoCount = Math.min(await photos.count(), 20);

    const animationStartTime = Date.now();

    // Hover over multiple photos quickly
    for (let i = 0; i < photoCount; i++) {
      await photos.nth(i).hover();
      await page.waitForTimeout(50); // Brief pause
    }

    const animationTime = Date.now() - animationStartTime;

    // Animations should not cause significant delays
    const timePerAnimation = animationTime / photoCount;
    expect(timePerAnimation).toBeLessThan(100); // Less than 100ms per hover

    // Check that animations are smooth (no frame drops)
    const frameData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const frames = [];
        let lastTime = performance.now();
        
        function measureFrame() {
          const now = performance.now();
          const delta = now - lastTime;
          frames.push(delta);
          lastTime = now;
          
          if (frames.length < 60) { // Measure 60 frames
            requestAnimationFrame(measureFrame);
          } else {
            resolve(frames);
          }
        }
        
        requestAnimationFrame(measureFrame);
      });
    });

    // Check for frame drops (frames > 20ms indicate < 50fps)
    const droppedFrames = frameData.filter(delta => delta > 20);
    const dropRate = droppedFrames.length / frameData.length;
    
    expect(dropRate).toBeLessThan(0.1); // Less than 10% frame drops
  });
});

test.describe('Network Performance', () => {
  test('Performance on slow connections', async ({ page }) => {
    // Simulate slow 3G connection
    await page.context().setExtraHTTPHeaders({
      'User-Agent': 'Mobile'
    });

    // Apply network throttling
    await page.context().route('**/*', async (route) => {
      // Add delay based on resource type
      const resourceType = route.request().resourceType();
      let delay = 0;

      if (resourceType === 'image') delay = 200;
      else if (resourceType === 'script') delay = 100;
      else if (resourceType === 'stylesheet') delay = 50;

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      await route.continue();
    });

    const slowStartTime = Date.now();
    await page.goto('/f/family-token-12345');
    
    // Wait for critical content
    await page.waitForSelector('[data-testid="family-header"]');
    
    const slowLoadTime = Date.now() - slowStartTime;
    
    // Should still be usable on slow connections
    expect(slowLoadTime).toBeLessThan(8000); // 8 seconds max on slow 3G

    // Check that critical content loads first
    const headerVisible = await page.locator('[data-testid="family-header"]').isVisible();
    expect(headerVisible).toBe(true);

    // Images might still be loading, but layout should be stable
    const layoutStable = await page.evaluate(() => {
      return document.readyState === 'complete' || 
             document.querySelector('[data-testid="loading-skeleton"]') === null;
    });

    expect(layoutStable).toBe(true);
  });

  test('Offline functionality', async ({ page }) => {
    await page.goto('/f/family-token-12345');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="family-gallery"]');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to navigate
    await page.click('[data-testid="family-photo"]').first();
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should automatically retry
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
  });
});