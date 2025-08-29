#!/usr/bin/env tsx

/**
 * @fileoverview Comprehensive Usability Testing Runner
 * Orchestrates all usability testing with reporting and analysis
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 2,
  browsers: ['chromium', 'webkit', 'firefox'],
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 1024, height: 768 },
    { name: 'desktop', width: 1440, height: 900 },
  ],
  categories: [
    {
      name: 'accessibility',
      file: 'accessibility-comprehensive.test.ts',
      weight: 30,
    },
    { name: 'responsive', file: 'responsive-design.test.ts', weight: 20 },
    { name: 'workflows', file: 'user-journey-workflows.test.ts', weight: 25 },
    { name: 'performance', file: 'performance-web-vitals.test.ts', weight: 15 },
    {
      name: 'browsers',
      file: 'cross-browser-compatibility.test.ts',
      weight: 5,
    },
    { name: 'visual', file: 'visual-regression.test.ts', weight: 3 },
    { name: 'errors', file: 'error-handling-edge-cases.test.ts', weight: 2 },
  ],
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint
  FID: 100, // First Input Delay
  CLS: 0.1, // Cumulative Layout Shift
  FCP: 1800, // First Contentful Paint
  TTI: 3800, // Time to Interactive
  TBT: 200, // Total Blocking Time
};

// Quality targets
const QUALITY_TARGETS = {
  accessibility: 95, // WCAG compliance %
  performance: 90, // Performance score
  visual: 98, // Visual regression accuracy
  crossBrowser: 95, // Cross-browser compatibility
  errorHandling: 90, // Error recovery success rate
  workflows: 95, // User workflow success rate
};

interface TestResult {
  category: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  score: number;
  details: any[];
}

interface TestReport {
  timestamp: string;
  environment: string;
  overallScore: number;
  categories: TestResult[];
  performance: any;
  accessibility: any;
  recommendations: string[];
  criticalIssues: string[];
}

class UsabilityTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private reportDir: string;

  constructor() {
    this.reportDir = join(process.cwd(), 'test-reports', 'usability');
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private log(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✅',
      warn: '⚠️',
      error: '❌',
    };

    console.log(`${prefix[level]} [${timestamp}] ${message}`);
  }

  private async runTestCategory(category: any): Promise<TestResult> {
    this.log(`Running ${category.name} tests...`);

    const startTime = Date.now();
    const result: TestResult = {
      category: category.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      score: 0,
      details: [],
    };

    try {
      // Run Playwright tests for this category
      const testCommand = `npx playwright test __tests__/usability/${category.file} --reporter=json`;
      const output = execSync(testCommand, {
        encoding: 'utf-8',
        timeout: TEST_CONFIG.timeout * 10, // Allow more time for full suites
      });

      // Parse Playwright JSON output
      const testResults = JSON.parse(output);

      result.passed = testResults.stats?.expected || 0;
      result.failed = testResults.stats?.unexpected || 0;
      result.skipped = testResults.stats?.skipped || 0;
      result.duration = Date.now() - startTime;

      // Calculate score based on success rate and category weight
      const totalTests = result.passed + result.failed;
      const successRate =
        totalTests > 0 ? (result.passed / totalTests) * 100 : 0;
      result.score = Math.round(successRate);

      result.details = testResults.suites || [];

      this.log(
        `${category.name} completed: ${result.passed}✅ ${result.failed}❌ ${result.skipped}⏭️ (Score: ${result.score}%)`
      );
    } catch (error: any) {
      this.log(`${category.name} tests failed: ${error.message}`, 'error');
      result.failed = 1;
      result.score = 0;
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  private async runAccessibilityTests(): Promise<TestResult> {
    this.log('Running comprehensive accessibility tests...');

    try {
      // Run axe-core accessibility tests
      const axeCommand = `npx playwright test __tests__/usability/accessibility-comprehensive.test.ts --reporter=json`;
      const axeOutput = execSync(axeCommand, { encoding: 'utf-8' });
      const axeResults = JSON.parse(axeOutput);

      // Calculate accessibility score
      const violations = this.extractAccessibilityViolations(axeResults);
      const wcagCompliance = Math.max(0, 100 - violations.length * 2); // Penalty per violation

      return {
        category: 'accessibility',
        passed: axeResults.stats?.expected || 0,
        failed: axeResults.stats?.unexpected || 0,
        skipped: axeResults.stats?.skipped || 0,
        duration: 0,
        score: Math.round(wcagCompliance),
        details: violations,
      };
    } catch (error: any) {
      this.log(`Accessibility tests failed: ${error.message}`, 'error');
      return {
        category: 'accessibility',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        score: 0,
        details: [error.message],
      };
    }
  }

  private async runPerformanceTests(): Promise<TestResult> {
    this.log('Running performance and Core Web Vitals tests...');

    try {
      // Run Lighthouse performance audit
      const lighthouseCommand = `npx lighthouse http://localhost:3000 --output=json --output-path=${this.reportDir}/lighthouse.json --chrome-flags="--headless"`;
      execSync(lighthouseCommand);

      const lighthouseReport = JSON.parse(
        readFileSync(join(this.reportDir, 'lighthouse.json'), 'utf-8')
      );

      // Extract Core Web Vitals
      const lcp =
        lighthouseReport.audits['largest-contentful-paint']?.displayValue;
      const fid = lighthouseReport.audits['max-potential-fid']?.displayValue;
      const cls =
        lighthouseReport.audits['cumulative-layout-shift']?.displayValue;

      const performanceScore =
        lighthouseReport.categories.performance.score * 100;

      return {
        category: 'performance',
        passed: performanceScore >= 90 ? 1 : 0,
        failed: performanceScore < 90 ? 1 : 0,
        skipped: 0,
        duration: 0,
        score: Math.round(performanceScore),
        details: {
          lcp,
          fid,
          cls,
          performanceScore,
          recommendations: lighthouseReport.audits,
        },
      };
    } catch (error: any) {
      this.log(`Performance tests failed: ${error.message}`, 'error');
      return {
        category: 'performance',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        score: 0,
        details: [error.message],
      };
    }
  }

  private async runVisualRegressionTests(): Promise<TestResult> {
    this.log('Running visual regression tests...');

    try {
      const visualCommand = `npx playwright test __tests__/usability/visual-regression.test.ts --reporter=json`;
      const visualOutput = execSync(visualCommand, { encoding: 'utf-8' });
      const visualResults = JSON.parse(visualOutput);

      // Analyze visual differences
      const totalScreenshots = visualResults.stats?.expected || 0;
      const failedScreenshots = visualResults.stats?.unexpected || 0;

      const visualAccuracy =
        totalScreenshots > 0
          ? ((totalScreenshots - failedScreenshots) / totalScreenshots) * 100
          : 100;

      return {
        category: 'visual',
        passed: totalScreenshots - failedScreenshots,
        failed: failedScreenshots,
        skipped: visualResults.stats?.skipped || 0,
        duration: 0,
        score: Math.round(visualAccuracy),
        details: visualResults.suites || [],
      };
    } catch (error: any) {
      this.log(`Visual regression tests failed: ${error.message}`, 'error');
      return {
        category: 'visual',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        score: 0,
        details: [error.message],
      };
    }
  }

  private extractAccessibilityViolations(axeResults: any): any[] {
    const violations: any[] = [];

    // Extract violations from axe results
    if (axeResults.suites) {
      for (const suite of axeResults.suites) {
        for (const test of suite.specs || []) {
          if (test.tests) {
            for (const testCase of test.tests) {
              if (testCase.results) {
                for (const result of testCase.results) {
                  if (result.status === 'failed' && result.error?.message) {
                    violations.push({
                      test: test.title,
                      error: result.error.message,
                      severity: this.categorizeSeverity(result.error.message),
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return violations;
  }

  private categorizeSeverity(
    errorMessage: string
  ): 'critical' | 'serious' | 'moderate' | 'minor' {
    if (
      errorMessage.includes('color-contrast') ||
      errorMessage.includes('keyboard')
    ) {
      return 'critical';
    }
    if (errorMessage.includes('aria-') || errorMessage.includes('role')) {
      return 'serious';
    }
    if (errorMessage.includes('alt') || errorMessage.includes('label')) {
      return 'moderate';
    }
    return 'minor';
  }

  private calculateOverallScore(results: TestResult[]): number {
    let weightedScore = 0;
    let totalWeight = 0;

    for (const result of results) {
      const category = TEST_CONFIG.categories.find(
        (c) => c.name === result.category
      );
      const weight = category?.weight || 1;

      weightedScore += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];

    for (const result of results) {
      if (
        result.score <
        QUALITY_TARGETS[result.category as keyof typeof QUALITY_TARGETS]
      ) {
        switch (result.category) {
          case 'accessibility':
            recommendations.push(
              `Mejore la accesibilidad: Score ${result.score}% vs objetivo ${QUALITY_TARGETS.accessibility}%`
            );
            break;
          case 'performance':
            recommendations.push(
              `Optimice el rendimiento: Score ${result.score}% vs objetivo ${QUALITY_TARGETS.performance}%`
            );
            break;
          case 'visual':
            recommendations.push(
              `Corrija inconsistencias visuales: ${result.failed} capturas fallaron`
            );
            break;
          case 'responsive':
            recommendations.push(
              `Mejore el diseño responsivo en ${result.failed} viewports`
            );
            break;
          case 'workflows':
            recommendations.push(
              `Optimice flujos de usuario: ${result.failed} workflows fallaron`
            );
            break;
        }
      }
    }

    return recommendations;
  }

  private identifyCriticalIssues(results: TestResult[]): string[] {
    const critical: string[] = [];

    for (const result of results) {
      if (result.score < 70) {
        // Critical threshold
        critical.push(
          `CRÍTICO: ${result.category} score ${result.score}% - Requiere atención inmediata`
        );
      }

      if (result.category === 'accessibility' && result.score < 90) {
        critical.push(
          'CRÍTICO: Problemas de accesibilidad pueden afectar usuarios con discapacidades'
        );
      }

      if (result.category === 'performance' && result.score < 80) {
        critical.push(
          'CRÍTICO: Performance baja afecta experiencia de usuario y SEO'
        );
      }
    }

    return critical;
  }

  private generateHTMLReport(report: TestReport): void {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LookEscolar - Reporte de Usabilidad</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .score-circle { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: white; }
        .score-excellent { background: #10B981; }
        .score-good { background: #3B82F6; }
        .score-warning { background: #F59E0B; }
        .score-critical { background: #EF4444; }
        .categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
        .category-card { padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6; background: #F8FAFC; }
        .category-score { font-size: 24px; font-weight: bold; color: #1F2937; }
        .category-details { margin-top: 10px; font-size: 14px; color: #6B7280; }
        .recommendations, .critical { margin: 30px 0; padding: 20px; border-radius: 8px; }
        .recommendations { background: #EFF6FF; border-left: 4px solid #3B82F6; }
        .critical { background: #FEF2F2; border-left: 4px solid #EF4444; }
        .recommendations h3, .critical h3 { margin-top: 0; }
        .timestamp { text-align: center; color: #6B7280; margin-top: 40px; }
        .status-passed { color: #10B981; }
        .status-failed { color: #EF4444; }
        .status-skipped { color: #F59E0B; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 LookEscolar - Reporte de Usabilidad</h1>
            <div class="score-circle ${this.getScoreClass(report.overallScore)}">
                ${report.overallScore}%
            </div>
            <p>Puntuación General de Usabilidad</p>
        </div>

        <div class="categories">
            ${report.categories
              .map(
                (cat) => `
                <div class="category-card">
                    <h3>${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</h3>
                    <div class="category-score ${this.getScoreClass(cat.score)}">${cat.score}%</div>
                    <div class="category-details">
                        <span class="status-passed">✅ ${cat.passed} passed</span> •
                        <span class="status-failed">❌ ${cat.failed} failed</span> •
                        <span class="status-skipped">⏭️ ${cat.skipped} skipped</span>
                        <br>Duración: ${Math.round(cat.duration / 1000)}s
                    </div>
                </div>
            `
              )
              .join('')}
        </div>

        ${
          report.recommendations.length > 0
            ? `
            <div class="recommendations">
                <h3>📋 Recomendaciones</h3>
                <ul>
                    ${report.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `
            : ''
        }

        ${
          report.criticalIssues.length > 0
            ? `
            <div class="critical">
                <h3>🚨 Problemas Críticos</h3>
                <ul>
                    ${report.criticalIssues.map((issue) => `<li>${issue}</li>`).join('')}
                </ul>
            </div>
        `
            : ''
        }

        <div class="timestamp">
            Generado: ${report.timestamp}<br>
            Ambiente: ${report.environment}
        </div>
    </div>
</body>
</html>`;

    writeFileSync(join(this.reportDir, 'usability-report.html'), html);
    this.log(
      `HTML report generated: ${join(this.reportDir, 'usability-report.html')}`
    );
  }

  private getScoreClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 75) return 'score-good';
    if (score >= 60) return 'score-warning';
    return 'score-critical';
  }

  async runAllTests(): Promise<void> {
    this.startTime = Date.now();
    this.log('🚀 Starting comprehensive usability testing...');

    // Check if development server is running
    try {
      execSync('curl -f http://localhost:3000', { stdio: 'ignore' });
    } catch {
      this.log('⚠️ Development server not detected at localhost:3000');
      this.log('Please start the server with: npm run dev');
      process.exit(1);
    }

    // Run specialized tests
    const accessibilityResult = await this.runAccessibilityTests();
    const performanceResult = await this.runPerformanceTests();
    const visualResult = await this.runVisualRegressionTests();

    this.results.push(accessibilityResult, performanceResult, visualResult);

    // Run standard test categories
    for (const category of TEST_CONFIG.categories.filter(
      (c) => !['accessibility', 'performance', 'visual'].includes(c.name)
    )) {
      const result = await this.runTestCategory(category);
      this.results.push(result);
    }

    // Generate comprehensive report
    const overallScore = this.calculateOverallScore(this.results);
    const recommendations = this.generateRecommendations(this.results);
    const criticalIssues = this.identifyCriticalIssues(this.results);

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      overallScore,
      categories: this.results,
      performance:
        this.results.find((r) => r.category === 'performance')?.details || {},
      accessibility:
        this.results.find((r) => r.category === 'accessibility')?.details || {},
      recommendations,
      criticalIssues,
    };

    // Save JSON report
    writeFileSync(
      join(this.reportDir, 'usability-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate HTML report
    this.generateHTMLReport(report);

    // Summary
    const totalDuration = Date.now() - this.startTime;
    this.log('📊 Testing completed!');
    this.log(`Overall Score: ${overallScore}%`);
    this.log(`Total Duration: ${Math.round(totalDuration / 1000)}s`);
    this.log(`Report saved: ${this.reportDir}/usability-report.html`);

    if (criticalIssues.length > 0) {
      this.log('🚨 Critical issues detected:', 'error');
      criticalIssues.forEach((issue) => this.log(`  - ${issue}`, 'error'));
    }

    if (overallScore < 75) {
      this.log('⚠️ Overall score below 75% - Review recommendations', 'warn');
      process.exit(1);
    } else {
      this.log('✅ Usability testing passed with excellent score!');
    }
  }
}

// Main execution
if (require.main === module) {
  const runner = new UsabilityTestRunner();
  runner.runAllTests().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default UsabilityTestRunner;
