#!/usr/bin/env tsx
/**
 * Comprehensive Testing & Validation Script
 * LookEscolar System - Testing Admin/Client Flows
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  message?: string;
  duration?: number;
  details?: any;
}

interface TestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  duration: number;
}

class ComprehensiveValidator {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private supabase: any;
  private baseUrl = process.env.BASE_URL || 'http://localhost:3002';
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async initialize() {
    console.log('🚀 Initializing Comprehensive Validator...');
    
    this.browser = await chromium.launch({ 
      headless: false, // Set to false to see the tests running
      slowMo: 500 // Slow down for visibility
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1
    });
    
    this.page = await this.context.newPage();
    
    console.log(`📱 Browser initialized, testing against: ${this.baseUrl}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private createTestResult(test: string, status: 'pass' | 'fail' | 'warning' | 'skip', message?: string, details?: any): TestResult {
    return {
      test,
      status,
      message,
      details,
      duration: Date.now() // Will be properly calculated in actual implementation
    };
  }

  private async takeScreenshot(name: string) {
    if (this.page) {
      await this.page.screenshot({ 
        path: `./test-reports/screenshots/${name}-${Date.now()}.png`,
        fullPage: true 
      });
    }
  }

  /**
   * Test Suite 1: Admin Events Flow (/admin/events)
   */
  async testAdminEventsFlow(): Promise<TestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const suiteName = 'Admin Events Flow';
    
    console.log(`\n🧪 Testing: ${suiteName}`);
    
    try {
      // Navigate to admin events page
      await this.page!.goto(`${this.baseUrl}/admin/events`);
      await this.page!.waitForLoadState('networkidle');
      await this.takeScreenshot('admin-events-initial');

      // Test 1: Page loads without errors
      const title = await this.page!.title();
      tests.push(this.createTestResult(
        'Page loads correctly',
        title.includes('Admin') || title.includes('Eventos') ? 'pass' : 'fail',
        `Page title: ${title}`
      ));

      // Test 2: Check for filter controls
      const hasFilters = await this.page!.locator('[data-testid="event-filters"], .filter, [placeholder*="Buscar"]').count() > 0;
      tests.push(this.createTestResult(
        'Event filters are present',
        hasFilters ? 'pass' : 'warning',
        hasFilters ? 'Filter controls found' : 'No filter controls detected'
      ));

      // Test 3: Check for responsive design
      await this.page!.setViewportSize({ width: 375, height: 667 }); // Mobile
      await this.page!.waitForTimeout(1000);
      await this.takeScreenshot('admin-events-mobile');
      
      const mobileLayout = await this.page!.locator('.lg\\:hidden, .mobile, [class*="mobile"]').count() > 0;
      tests.push(this.createTestResult(
        'Mobile responsive layout',
        mobileLayout ? 'pass' : 'warning',
        'Mobile layout adaptation'
      ));

      // Reset viewport
      await this.page!.setViewportSize({ width: 1280, height: 720 });

      // Test 4: Check for action buttons
      const hasActions = await this.page!.locator('button').count() > 0;
      tests.push(this.createTestResult(
        'Action buttons available',
        hasActions ? 'pass' : 'fail',
        `Found ${await this.page!.locator('button').count()} buttons`
      ));

      // Test 5: Check for event cards or list items
      const hasEvents = await this.page!.locator('.event-card, [data-testid*="event"], .card').count() > 0;
      tests.push(this.createTestResult(
        'Events display properly',
        hasEvents ? 'pass' : 'warning',
        hasEvents ? 'Event cards/items found' : 'No events or loading state'
      ));

    } catch (error) {
      tests.push(this.createTestResult(
        'Admin Events Flow Error',
        'fail',
        `Error: ${error.message}`
      ));
    }

    return this.createTestSuite(suiteName, 'Admin events page functionality', tests, Date.now() - startTime);
  }

  /**
   * Test Suite 2: Admin Photos Flow (/admin/photos)
   */
  async testAdminPhotosFlow(): Promise<TestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const suiteName = 'Admin Photos Flow';
    
    console.log(`\n📷 Testing: ${suiteName}`);
    
    try {
      await this.page!.goto(`${this.baseUrl}/admin/photos`);
      await this.page!.waitForLoadState('networkidle');
      await this.takeScreenshot('admin-photos-initial');

      // Test 1: Page loads
      const pageLoaded = await this.page!.locator('body').isVisible();
      tests.push(this.createTestResult(
        'Photos page loads',
        pageLoaded ? 'pass' : 'fail'
      ));

      // Test 2: Advanced filters
      const hasAdvancedFilters = await this.page!.locator('[data-testid="photo-filters"], .filter, .advanced-filters').count() > 0;
      tests.push(this.createTestResult(
        'Advanced filters present',
        hasAdvancedFilters ? 'pass' : 'warning',
        'Filter system for photos'
      ));

      // Test 3: Grid/List toggle
      const hasViewToggle = await this.page!.locator('[data-testid*="view"], button[aria-label*="view"], .view-toggle').count() > 0;
      tests.push(this.createTestResult(
        'View mode toggle available',
        hasViewToggle ? 'pass' : 'warning',
        'Grid/List view switching'
      ));

      // Test 4: Bulk actions
      const hasBulkActions = await this.page!.locator('[data-testid*="bulk"], .bulk-actions, .selection').count() > 0;
      tests.push(this.createTestResult(
        'Bulk actions system',
        hasBulkActions ? 'pass' : 'warning',
        'Bulk photo operations'
      ));

      // Test 5: Mobile responsiveness
      await this.page!.setViewportSize({ width: 375, height: 667 });
      await this.page!.waitForTimeout(1000);
      await this.takeScreenshot('admin-photos-mobile');
      
      const mobileOptimized = await this.page!.locator('.mobile, .lg\\:hidden, [class*="sm:"]').count() > 0;
      tests.push(this.createTestResult(
        'Mobile photo management',
        mobileOptimized ? 'pass' : 'warning',
        'Mobile-optimized photo interface'
      ));

      await this.page!.setViewportSize({ width: 1280, height: 720 });

    } catch (error) {
      tests.push(this.createTestResult(
        'Admin Photos Flow Error',
        'fail',
        `Error: ${error.message}`
      ));
    }

    return this.createTestSuite(suiteName, 'Admin photos management functionality', tests, Date.now() - startTime);
  }

  /**
   * Test Suite 3: Event Detail Flow (/admin/events/[id])
   */
  async testEventDetailFlow(): Promise<TestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const suiteName = 'Event Detail Flow';
    
    console.log(`\n🎯 Testing: ${suiteName}`);
    
    try {
      // First get an event ID from the database or create a test event
      const { data: events } = await this.supabase
        .from('events')
        .select('id')
        .limit(1);
      
      if (!events || events.length === 0) {
        tests.push(this.createTestResult(
          'Test data availability',
          'skip',
          'No events found for testing'
        ));
        return this.createTestSuite(suiteName, 'Event detail page functionality', tests, Date.now() - startTime);
      }

      const eventId = events[0].id;
      await this.page!.goto(`${this.baseUrl}/admin/events/${eventId}`);
      await this.page!.waitForLoadState('networkidle');
      await this.takeScreenshot('event-detail-initial');

      // Test 1: Breadcrumbs
      const hasBreadcrumbs = await this.page!.locator('nav, .breadcrumb, [aria-label*="breadcrumb"]').count() > 0;
      tests.push(this.createTestResult(
        'Breadcrumbs navigation',
        hasBreadcrumbs ? 'pass' : 'warning',
        'Navigation breadcrumbs present'
      ));

      // Test 2: CSV Upload section
      const hasCSVUpload = await this.page!.locator('[data-csv-uploader], .csv-upload, input[type="file"]').count() > 0;
      tests.push(this.createTestResult(
        'CSV Upload prominent',
        hasCSVUpload ? 'pass' : 'warning',
        'Student CSV upload interface'
      ));

      // Test 3: Action buttons
      const actionButtons = await this.page!.locator('button').count();
      tests.push(this.createTestResult(
        'Action buttons available',
        actionButtons >= 3 ? 'pass' : 'warning',
        `Found ${actionButtons} action buttons`
      ));

      // Test 4: Tabs functionality
      const hasTabs = await this.page!.locator('[role="tab"], .tab, [data-testid*="tab"]').count() > 0;
      tests.push(this.createTestResult(
        'Tabbed interface',
        hasTabs ? 'pass' : 'warning',
        'Tab-based navigation'
      ));

      // Test 5: Statistics cards
      const hasStats = await this.page!.locator('.stat, .metric, .count, [data-testid*="stat"]').count() > 0;
      tests.push(this.createTestResult(
        'Statistics display',
        hasStats ? 'pass' : 'warning',
        'Event statistics visible'
      ));

    } catch (error) {
      tests.push(this.createTestResult(
        'Event Detail Flow Error',
        'fail',
        `Error: ${error.message}`
      ));
    }

    return this.createTestSuite(suiteName, 'Event detail page functionality', tests, Date.now() - startTime);
  }

  /**
   * Test Suite 4: Public Gallery Flow (/gallery/[eventId])
   */
  async testPublicGalleryFlow(): Promise<TestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const suiteName = 'Public Gallery Flow';
    
    console.log(`\n🌐 Testing: ${suiteName}`);
    
    try {
      // Get active event
      const { data: events } = await this.supabase
        .from('events')
        .select('id')
        .eq('status', 'active')
        .limit(1);
      
      if (!events || events.length === 0) {
        tests.push(this.createTestResult(
          'Test data availability',
          'skip',
          'No active events found for public testing'
        ));
        return this.createTestSuite(suiteName, 'Public gallery functionality', tests, Date.now() - startTime);
      }

      const eventId = events[0].id;
      await this.page!.goto(`${this.baseUrl}/gallery/${eventId}`);
      await this.page!.waitForLoadState('networkidle');
      await this.takeScreenshot('public-gallery-initial');

      // Test 1: Liquid glass design
      const hasLiquidGlass = await this.page!.locator('.liquid-glass, .backdrop-blur, [class*="glass"]').count() > 0;
      tests.push(this.createTestResult(
        'Liquid glass design',
        hasLiquidGlass ? 'pass' : 'warning',
        'Modern glass-effect design'
      ));

      // Test 2: SEO meta tags
      const metaDescription = await this.page!.locator('meta[name="description"]').getAttribute('content');
      tests.push(this.createTestResult(
        'SEO meta tags',
        metaDescription ? 'pass' : 'warning',
        `Meta description: ${metaDescription?.substring(0, 50)}...`
      ));

      // Test 3: Photo grid/gallery
      const hasPhotoGrid = await this.page!.locator('.photo, .image, .gallery-item, img').count() > 0;
      tests.push(this.createTestResult(
        'Photo gallery display',
        hasPhotoGrid ? 'pass' : 'warning',
        'Photos displayed in gallery'
      ));

      // Test 4: Shopping cart
      const hasCart = await this.page!.locator('.cart, .checkout, [data-testid*="cart"]').count() > 0;
      tests.push(this.createTestResult(
        'Shopping cart integration',
        hasCart ? 'pass' : 'warning',
        'Cart functionality available'
      ));

      // Test 5: Mobile responsiveness
      await this.page!.setViewportSize({ width: 375, height: 667 });
      await this.page!.waitForTimeout(1000);
      await this.takeScreenshot('public-gallery-mobile');
      
      const mobileOptimized = await this.page!.locator('.mobile, .sm\\:, .lg\\:hidden').count() > 0;
      tests.push(this.createTestResult(
        'Mobile responsive gallery',
        mobileOptimized ? 'pass' : 'warning',
        'Mobile-optimized gallery experience'
      ));

      await this.page!.setViewportSize({ width: 1280, height: 720 });

    } catch (error) {
      tests.push(this.createTestResult(
        'Public Gallery Flow Error',
        'fail',
        `Error: ${error.message}`
      ));
    }

    return this.createTestSuite(suiteName, 'Public gallery functionality', tests, Date.now() - startTime);
  }

  /**
   * Test Suite 5: Family Token Flow (/f/[token])
   */
  async testFamilyTokenFlow(): Promise<TestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const suiteName = 'Family Token Flow';
    
    console.log(`\n👨‍👩‍👧‍👦 Testing: ${suiteName}`);
    
    try {
      // Get a family token
      const { data: tokens } = await this.supabase
        .from('codes')
        .select('token')
        .not('token', 'is', null)
        .limit(1);
      
      if (!tokens || tokens.length === 0) {
        tests.push(this.createTestResult(
          'Test data availability',
          'skip',
          'No family tokens found for testing'
        ));
        return this.createTestSuite(suiteName, 'Family token access functionality', tests, Date.now() - startTime);
      }

      const token = tokens[0].token;
      await this.page!.goto(`${this.baseUrl}/f/${token}`);
      await this.page!.waitForLoadState('networkidle');
      await this.takeScreenshot('family-token-initial');

      // Test 1: Token validation
      const hasAccess = !(await this.page!.locator('.error, .not-found, .expired').count() > 0);
      tests.push(this.createTestResult(
        'Token access validation',
        hasAccess ? 'pass' : 'fail',
        'Family token grants access'
      ));

      if (hasAccess) {
        // Test 2: Family-specific photos
        const hasPhotos = await this.page!.locator('.photo, img, .gallery-item').count() > 0;
        tests.push(this.createTestResult(
          'Family photos display',
          hasPhotos ? 'pass' : 'warning',
          'Family-specific photos shown'
        ));

        // Test 3: Checkout functionality
        const hasCheckout = await this.page!.locator('.checkout, .buy, .purchase, [data-testid*="checkout"]').count() > 0;
        tests.push(this.createTestResult(
          'Checkout integration',
          hasCheckout ? 'pass' : 'warning',
          'Purchase workflow available'
        ));

        // Test 4: User experience improvements
        const hasFilters = await this.page!.locator('.filter, .search, .sort').count() > 0;
        tests.push(this.createTestResult(
          'UX improvements',
          hasFilters ? 'pass' : 'warning',
          'Basic filtering/search options'
        ));
      }

      // Test 5: Error handling
      await this.page!.goto(`${this.baseUrl}/f/invalid-token-test`);
      await this.page!.waitForLoadState('networkidle');
      await this.takeScreenshot('family-token-error');
      
      const hasErrorHandling = await this.page!.locator('.error, .not-found, .invalid').count() > 0;
      tests.push(this.createTestResult(
        'Error handling',
        hasErrorHandling ? 'pass' : 'warning',
        'Invalid token error handling'
      ));

    } catch (error) {
      tests.push(this.createTestResult(
        'Family Token Flow Error',
        'fail',
        `Error: ${error.message}`
      ));
    }

    return this.createTestSuite(suiteName, 'Family token access functionality', tests, Date.now() - startTime);
  }

  /**
   * Test Suite 6: Cross-Browser & Device Testing
   */
  async testCrossBrowserCompatibility(): Promise<TestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const suiteName = 'Cross-Browser & Device Testing';
    
    console.log(`\n🌐 Testing: ${suiteName}`);
    
    try {
      // Test different viewport sizes
      const viewports = [
        { name: 'Mobile Portrait', width: 375, height: 667 },
        { name: 'Mobile Landscape', width: 667, height: 375 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1280, height: 720 },
        { name: 'Large Desktop', width: 1920, height: 1080 }
      ];

      for (const viewport of viewports) {
        await this.page!.setViewportSize({ width: viewport.width, height: viewport.height });
        await this.page!.goto(`${this.baseUrl}/admin/events`);
        await this.page!.waitForLoadState('networkidle');
        
        const isResponsive = await this.page!.locator('body').boundingBox();
        tests.push(this.createTestResult(
          `${viewport.name} (${viewport.width}x${viewport.height})`,
          isResponsive ? 'pass' : 'fail',
          `Viewport renders correctly`
        ));
      }

      // Test keyboard navigation
      await this.page!.setViewportSize({ width: 1280, height: 720 });
      await this.page!.goto(`${this.baseUrl}/admin/events`);
      
      // Tab through focusable elements
      let focusableElements = 0;
      try {
        await this.page!.keyboard.press('Tab');
        await this.page!.waitForTimeout(100);
        focusableElements = await this.page!.locator(':focus').count();
      } catch (e) {
        // Focus navigation might not be fully implemented
      }
      
      tests.push(this.createTestResult(
        'Keyboard Navigation',
        focusableElements > 0 ? 'pass' : 'warning',
        `Tab navigation ${focusableElements > 0 ? 'works' : 'needs improvement'}`
      ));

    } catch (error) {
      tests.push(this.createTestResult(
        'Cross-Browser Testing Error',
        'fail',
        `Error: ${error.message}`
      ));
    }

    return this.createTestSuite(suiteName, 'Cross-browser and device compatibility', tests, Date.now() - startTime);
  }

  /**
   * Test Suite 7: Performance & Accessibility
   */
  async testPerformanceAndAccessibility(): Promise<TestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const suiteName = 'Performance & Accessibility';
    
    console.log(`\n⚡ Testing: ${suiteName}`);
    
    try {
      // Performance test - page load time
      const loadStartTime = Date.now();
      await this.page!.goto(`${this.baseUrl}/admin/events`, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - loadStartTime;
      
      tests.push(this.createTestResult(
        'Page Load Performance',
        loadTime < 3000 ? 'pass' : loadTime < 5000 ? 'warning' : 'fail',
        `Load time: ${loadTime}ms (target: <3000ms)`
      ));

      // Basic accessibility checks
      const hasAltTexts = await this.page!.locator('img[alt]').count();
      const totalImages = await this.page!.locator('img').count();
      const altTextCoverage = totalImages > 0 ? (hasAltTexts / totalImages) * 100 : 100;
      
      tests.push(this.createTestResult(
        'Image Alt Text Coverage',
        altTextCoverage >= 90 ? 'pass' : altTextCoverage >= 70 ? 'warning' : 'fail',
        `${altTextCoverage.toFixed(1)}% of images have alt text`
      ));

      // Form labels
      const hasFormLabels = await this.page!.locator('label, [aria-label]').count();
      const hasInputs = await this.page!.locator('input, select, textarea').count();
      
      tests.push(this.createTestResult(
        'Form Accessibility',
        hasInputs === 0 || hasFormLabels > 0 ? 'pass' : 'warning',
        `${hasFormLabels} labels for ${hasInputs} inputs`
      ));

      // Semantic HTML
      const hasSemanticElements = await this.page!.locator('nav, main, section, article, header, footer').count();
      tests.push(this.createTestResult(
        'Semantic HTML Structure',
        hasSemanticElements >= 3 ? 'pass' : 'warning',
        `${hasSemanticElements} semantic elements found`
      ));

      // Color contrast (basic check for dark text on light backgrounds)
      const hasGoodContrast = await this.page!.locator('.text-gray-900, .text-black, [class*="text-gray-8"], [class*="text-gray-9"]').count() > 0;
      tests.push(this.createTestResult(
        'Color Contrast',
        hasGoodContrast ? 'pass' : 'warning',
        'Basic contrast check (requires manual verification)'
      ));

    } catch (error) {
      tests.push(this.createTestResult(
        'Performance & Accessibility Error',
        'fail',
        `Error: ${error.message}`
      ));
    }

    return this.createTestSuite(suiteName, 'Performance and accessibility validation', tests, Date.now() - startTime);
  }

  private createTestSuite(name: string, description: string, tests: TestResult[], duration: number): TestSuite {
    const passed = tests.filter(t => t.status === 'pass').length;
    const failed = tests.filter(t => t.status === 'fail').length;
    const warnings = tests.filter(t => t.status === 'warning').length;
    const skipped = tests.filter(t => t.status === 'skip').length;

    return {
      name,
      description,
      tests,
      passed,
      failed,
      warnings,
      skipped,
      duration
    };
  }

  async runAllTests(): Promise<TestSuite[]> {
    console.log('🎯 Starting Comprehensive Testing & Validation\n');
    
    const suites: TestSuite[] = [];
    
    suites.push(await this.testAdminEventsFlow());
    suites.push(await this.testAdminPhotosFlow());
    suites.push(await this.testEventDetailFlow());
    suites.push(await this.testPublicGalleryFlow());
    suites.push(await this.testFamilyTokenFlow());
    suites.push(await this.testCrossBrowserCompatibility());
    suites.push(await this.testPerformanceAndAccessibility());

    return suites;
  }

  generateReport(suites: TestSuite[]): string {
    const totalTests = suites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = suites.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = suites.reduce((sum, suite) => sum + suite.failed, 0);
    const totalWarnings = suites.reduce((sum, suite) => sum + suite.warnings, 0);
    const totalSkipped = suites.reduce((sum, suite) => sum + suite.skipped, 0);
    const totalDuration = suites.reduce((sum, suite) => sum + suite.duration, 0);

    let report = `
# 📊 LookEscolar Comprehensive Testing Report
**Generated**: ${new Date().toLocaleString()}
**Duration**: ${(totalDuration / 1000).toFixed(2)}s
**Environment**: ${this.baseUrl}

## 🎯 Executive Summary
- **Total Tests**: ${totalTests}
- **✅ Passed**: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)
- **❌ Failed**: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)
- **⚠️ Warnings**: ${totalWarnings} (${((totalWarnings / totalTests) * 100).toFixed(1)}%)
- **⏭️ Skipped**: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)

## 📋 Test Suite Results

`;

    suites.forEach(suite => {
      const passRate = suite.tests.length > 0 ? ((suite.passed / suite.tests.length) * 100).toFixed(1) : '0.0';
      report += `
### ${suite.name}
**Description**: ${suite.description}
**Duration**: ${(suite.duration / 1000).toFixed(2)}s
**Pass Rate**: ${passRate}% (${suite.passed}/${suite.tests.length})

| Test | Status | Details |
|------|--------|---------|
`;
      
      suite.tests.forEach(test => {
        const status = test.status === 'pass' ? '✅ PASS' : 
                     test.status === 'fail' ? '❌ FAIL' : 
                     test.status === 'warning' ? '⚠️ WARN' : '⏭️ SKIP';
        report += `| ${test.test} | ${status} | ${test.message || '-'} |\n`;
      });

      report += '\n';
    });

    report += `
## 🚨 Critical Issues
${suites.flatMap(s => s.tests.filter(t => t.status === 'fail')).length === 0 ? 
  '✅ No critical issues found!' : 
  suites.flatMap(s => s.tests.filter(t => t.status === 'fail'))
    .map(t => `- **${t.test}**: ${t.message}`)
    .join('\n')}

## ⚠️ Warnings & Recommendations
${suites.flatMap(s => s.tests.filter(t => t.status === 'warning')).length === 0 ? 
  '✅ No warnings!' : 
  suites.flatMap(s => s.tests.filter(t => t.status === 'warning'))
    .map(t => `- **${t.test}**: ${t.message}`)
    .join('\n')}

## 🎉 Demo Readiness Assessment
${totalFailed === 0 ? '🟢 **DEMO READY** - All critical functionality working' : 
  totalFailed <= 2 ? '🟡 **MOSTLY READY** - Minor issues need fixing' : 
  '🔴 **NOT READY** - Critical issues must be resolved'}

## 📈 Next Steps
1. Fix any critical issues (❌ FAIL status)
2. Address warnings for improved UX
3. Consider accessibility improvements
4. Validate cross-browser compatibility manually
5. Perform final user acceptance testing

---
*Generated by LookEscolar Comprehensive Validator*
`;

    return report;
  }
}

// Main execution
async function main() {
  const validator = new ComprehensiveValidator();
  
  try {
    await validator.initialize();
    
    // Ensure screenshots directory exists
    const fs = await import('fs');
    const path = await import('path');
    const screenshotDir = './test-reports/screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const suites = await validator.runAllTests();
    const report = validator.generateReport(suites);
    
    // Write report
    const reportPath = `./test-reports/comprehensive-test-report-${Date.now()}.md`;
    fs.writeFileSync(reportPath, report);
    
    console.log('\n📊 COMPREHENSIVE TEST RESULTS:');
    console.log('=====================================');
    
    suites.forEach(suite => {
      const passRate = suite.tests.length > 0 ? ((suite.passed / suite.tests.length) * 100).toFixed(1) : '0.0';
      const status = suite.failed === 0 ? '✅' : suite.failed <= 2 ? '⚠️' : '❌';
      console.log(`${status} ${suite.name}: ${passRate}% (${suite.passed}/${suite.tests.length})`);
    });
    
    const totalTests = suites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = suites.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = suites.reduce((sum, suite) => sum + suite.failed, 0);
    
    console.log('=====================================');
    console.log(`📊 OVERALL: ${totalPassed}/${totalTests} passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
    console.log(`📄 Report saved: ${reportPath}`);
    
    if (totalFailed === 0) {
      console.log('🎉 DEMO READY! All critical tests passing.');
    } else {
      console.log(`⚠️ ${totalFailed} critical issues need attention before demo.`);
    }
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
}

// Run the tests
if (require.main === module) {
  main();
}

export { ComprehensiveValidator };