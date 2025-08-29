#!/usr/bin/env tsx

/**
 * Comprehensive validation script for the Unified Gallery System
 * Tests functionality, performance, and integration points
 */

import fs from 'fs';
import path from 'path';

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  critical?: boolean;
}

class UnifiedGalleryValidator {
  private results: ValidationResult[] = [];
  private readonly requiredFiles = [
    // Core components
    'components/admin/UnifiedGallery.tsx',
    'components/admin/BulkActionsToolbar.tsx',

    // Pages
    'app/admin/gallery/page.tsx',
    'app/admin/photos/redirect.tsx',

    // API endpoints
    'app/api/admin/gallery/route.ts',
    'app/api/admin/gallery/bulk-actions/route.ts',
    'app/api/admin/gallery/stats/route.ts',
    'app/api/admin/gallery/export/zip/route.ts',

    // Tests and monitoring
    'tests/unified-gallery.test.tsx',
    'lib/performance/unified-gallery-monitor.ts',
  ];

  constructor() {
    console.log('🚀 Starting Unified Gallery System validation...\n');
  }

  /**
   * Run all validation tests
   */
  async runValidation(): Promise<void> {
    await this.validateFileStructure();
    this.generateReport();
  }

  /**
   * Validate required files exist
   */
  private async validateFileStructure(): Promise<void> {
    console.log('📁 Validating file structure...');

    // Check required files exist
    for (const filePath of this.requiredFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      const exists = fs.existsSync(fullPath);

      this.addResult({
        category: 'File Structure',
        test: `Required file: ${filePath}`,
        passed: exists,
        message: exists ? 'File exists' : 'File missing',
        critical: true,
      });
    }

    // Validate key implementation files
    this.validateImplementationFile();
  }

  /**
   * Validate implementation files have required content
   */
  private validateImplementationFile(): void {
    const implementationFiles = [
      {
        path: 'UNIFIED_GALLERY_IMPLEMENTATION_PLAN.md',
        required: [
          'Unified Gallery',
          'hierarchy',
          'bulk operations',
          'performance',
        ],
        critical: true,
      },
      {
        path: 'components/admin/UnifiedGallery.tsx',
        required: ['UnifiedGallery', 'HierarchyPath', 'useInfinitePhotos'],
        critical: true,
      },
      {
        path: 'app/admin/gallery/page.tsx',
        required: ['UnifiedGalleryPage', 'useAllEvents'],
        critical: true,
      },
    ];

    for (const file of implementationFiles) {
      const fullPath = path.join(process.cwd(), file.path);

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        for (const requirement of file.required) {
          const hasRequirement = content
            .toLowerCase()
            .includes(requirement.toLowerCase());

          this.addResult({
            category: 'Implementation',
            test: `${file.path} contains ${requirement}`,
            passed: hasRequirement,
            message: hasRequirement
              ? `${requirement} found`
              : `${requirement} missing`,
            critical: file.critical,
          });
        }
      } else {
        this.addResult({
          category: 'Implementation',
          test: `Implementation file: ${file.path}`,
          passed: false,
          message: 'File missing',
          critical: file.critical,
        });
      }
    }
  }

  /**
   * Add validation result
   */
  private addResult(result: ValidationResult): void {
    this.results.push(result);

    const icon = result.passed ? '✅' : result.critical ? '❌' : '⚠️';
    const status = result.passed ? 'PASS' : 'FAIL';

    console.log(`  ${icon} [${status}] ${result.test}: ${result.message}`);
  }

  /**
   * Generate final validation report
   */
  private generateReport(): void {
    console.log('\n📊 Generating validation report...');

    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const criticalFailures = this.results.filter(
      (r) => !r.passed && r.critical
    ).length;

    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log('\n' + '='.repeat(50));
    console.log('🎯 UNIFIED GALLERY VALIDATION REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${passRate.toFixed(1)}%)`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Critical Failures: ${criticalFailures}`);

    // Category breakdown
    const categories = [...new Set(this.results.map((r) => r.category))];
    console.log('\nResults by Category:');
    console.log('-'.repeat(30));

    categories.forEach((category) => {
      const categoryResults = this.results.filter(
        (r) => r.category === category
      );
      const categoryPassed = categoryResults.filter((r) => r.passed).length;
      const categoryRate = (categoryPassed / categoryResults.length) * 100;

      console.log(
        `${category}: ${categoryPassed}/${categoryResults.length} (${categoryRate.toFixed(1)}%)`
      );
    });

    // Critical failures detail
    if (criticalFailures > 0) {
      console.log('\n🚨 Critical Failures:');
      console.log('-'.repeat(30));
      this.results
        .filter((r) => !r.passed && r.critical)
        .forEach((failure) => {
          console.log(`❌ ${failure.category}: ${failure.test}`);
          console.log(`   ${failure.message}`);
        });
    }

    // Overall assessment
    console.log('\n📋 Assessment:');
    console.log('-'.repeat(30));

    if (criticalFailures > 0) {
      console.log('🚨 CRITICAL ISSUES FOUND - Review failed components');
    } else if (passRate >= 90) {
      console.log('🎉 EXCELLENT - Implementation is comprehensive');
    } else if (passRate >= 80) {
      console.log('✅ GOOD - Implementation mostly complete');
    } else if (passRate >= 70) {
      console.log('⚠️  NEEDS WORK - Address missing components');
    } else {
      console.log('❌ MAJOR ISSUES - Significant components missing');
    }

    console.log('\n✨ Validation completed!\n');
  }
}

// Run validation if script is executed directly
const validator = new UnifiedGalleryValidator();
validator.runValidation().catch(console.error);

export { UnifiedGalleryValidator };
