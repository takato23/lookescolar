/**
 * COMPREHENSIVE TEST RUNNER
 * 
 * Enhanced test runner for LookEscolar system with:
 * - Test suite orchestration
 * - Coverage reporting
 * - Performance metrics
 * - Test environment setup/teardown
 * - Parallel execution control
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  timeout: number;
  parallel?: boolean;
  requirements?: string[];
  description: string;
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

interface TestRunnerConfig {
  suites: TestSuite[];
  coverage: boolean;
  parallel: boolean;
  verbose: boolean;
  environment: 'test' | 'local' | 'ci';
  outputDir: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Critical Endpoints (TDD)',
    pattern: '__tests__/tdd-critical-endpoints.test.ts',
    timeout: 30000,
    parallel: false,
    requirements: ['database', 'admin-auth'],
    description: 'Test-driven development tests for the 5 critical endpoints'
  },
  {
    name: 'Enhanced Security',
    pattern: '__tests__/security-enhanced.test.ts',
    timeout: 30000,
    parallel: false,
    requirements: ['database', 'rate-limiting'],
    description: 'Comprehensive security testing including authentication, rate limiting, and input validation'
  },
  {
    name: 'Performance Comprehensive',
    pattern: '__tests__/performance-comprehensive.test.ts',
    timeout: 45000,
    parallel: false,
    requirements: ['database', 'admin-auth'],
    description: 'Performance testing for API response times, photo processing, and scalability'
  },
  {
    name: 'Integration Workflows',
    pattern: '__tests__/integration-workflows.test.ts',
    timeout: 60000,
    parallel: false,
    requirements: ['database', 'admin-auth', 'storage'],
    description: 'End-to-end workflow testing covering admin, family, and public user journeys'
  },
  {
    name: 'API Critical Endpoints',
    pattern: '__tests__/api-critical-endpoints.test.ts',
    timeout: 20000,
    parallel: true,
    requirements: ['database'],
    description: 'API endpoint testing for core functionality'
  },
  {
    name: 'Security Validation',
    pattern: '__tests__/security/security-comprehensive.test.ts',
    timeout: 20000,
    parallel: true,
    requirements: ['database'],
    description: 'Security validation and threat prevention'
  },
  {
    name: 'Component Tests',
    pattern: '__tests__/components/**/*.test.tsx',
    timeout: 15000,
    parallel: true,
    requirements: [],
    description: 'React component unit tests'
  },
  {
    name: 'Utility Functions',
    pattern: '__tests__/utils/**/*.test.ts',
    timeout: 10000,
    parallel: true,
    requirements: [],
    description: 'Utility function unit tests'
  }
];

const DEFAULT_CONFIG: TestRunnerConfig = {
  suites: TEST_SUITES,
  coverage: true,
  parallel: false,
  verbose: true,
  environment: 'test',
  outputDir: './test-reports'
};

class TestRunner {
  private config: TestRunnerConfig;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (!this.config.verbose && level === 'info') return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📋';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  private async checkRequirements(requirements: string[]): Promise<boolean> {
    const checks: Record<string, () => Promise<boolean>> = {
      'database': this.checkDatabase,
      'admin-auth': this.checkAdminAuth,
      'rate-limiting': this.checkRateLimiting,
      'storage': this.checkStorage
    };

    for (const req of requirements) {
      if (checks[req]) {
        const available = await checks[req]();
        if (!available) {
          this.log(`Requirement not met: ${req}`, 'warn');
          return false;
        }
      }
    }

    return true;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      const { createTestClient } = await import('./test-utils');
      const supabase = createTestClient();
      const { data, error } = await supabase.from('events').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async checkAdminAuth(): Promise<boolean> {
    return !!(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD);
  }

  private async checkRateLimiting(): Promise<boolean> {
    // Check if rate limiting environment variables are set
    return !!(process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL);
  }

  private async checkStorage(): Promise<boolean> {
    return !!(process.env.STORAGE_BUCKET || process.env.SUPABASE_URL);
  }

  private buildVitestCommand(suite: TestSuite, options: Partial<{ coverage: boolean; parallel: boolean }> = {}): string {
    const parts = ['npx vitest run'];
    
    // Add pattern
    parts.push(suite.pattern);
    
    // Add timeout
    parts.push(`--testTimeout=${suite.timeout}`);
    
    // Add coverage if requested
    if (options.coverage ?? this.config.coverage) {
      parts.push('--coverage');
    }
    
    // Add parallel execution control
    if (options.parallel ?? (suite.parallel && this.config.parallel)) {
      parts.push('--reporter=verbose');
    } else {
      parts.push('--reporter=verbose --no-parallel');
    }
    
    // Add environment variables
    const envVars = [
      'NODE_ENV=test',
      'CI=true',
      `TEST_SUITE=${suite.name.replace(/\s+/g, '_').toUpperCase()}`
    ];
    
    return `${envVars.join(' ')} ${parts.join(' ')}`;
  }

  private parseTestOutput(output: string): { passed: number; failed: number; skipped: number } {
    const lines = output.split('\n');
    
    // Look for vitest summary line
    const summaryLine = lines.find(line => line.includes('Tests ') || line.includes('Test Files'));
    
    if (summaryLine) {
      const passedMatch = summaryLine.match(/(\d+)\s+passed/);
      const failedMatch = summaryLine.match(/(\d+)\s+failed/);
      const skippedMatch = summaryLine.match(/(\d+)\s+skipped/);
      
      return {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0
      };
    }
    
    return { passed: 0, failed: 0, skipped: 0 };
  }

  private extractCoverage(output: string): number | undefined {
    const lines = output.split('\n');
    const coverageLine = lines.find(line => line.includes('All files') && line.includes('%'));
    
    if (coverageLine) {
      const match = coverageLine.match(/(\d+\.?\d*)\s*%/);
      return match ? parseFloat(match[1]) : undefined;
    }
    
    return undefined;
  }

  private async runSuite(suite: TestSuite): Promise<TestResult> {
    this.log(`\n🧪 Running: ${suite.name}`);
    this.log(`   Description: ${suite.description}`);
    this.log(`   Pattern: ${suite.pattern}`);
    this.log(`   Timeout: ${suite.timeout}ms`);
    
    // Check requirements
    if (suite.requirements && suite.requirements.length > 0) {
      this.log(`   Checking requirements: ${suite.requirements.join(', ')}`);
      const requirementsMet = await this.checkRequirements(suite.requirements);
      
      if (!requirementsMet) {
        this.log(`   ⚠️ Requirements not met, skipping suite`, 'warn');
        return {
          suite: suite.name,
          passed: 0,
          failed: 0,
          skipped: 1,
          duration: 0
        };
      }
    }

    const startTime = Date.now();
    let output = '';
    let exitCode = 0;

    try {
      const command = this.buildVitestCommand(suite);
      this.log(`   Command: ${command}`);
      
      output = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: suite.timeout + 5000, // Add buffer to vitest timeout
      });
      
    } catch (error: any) {
      exitCode = error.status || 1;
      output = error.stdout || error.message || '';
      
      if (error.signal === 'SIGTERM') {
        this.log(`   ⏱️ Test suite timed out after ${suite.timeout}ms`, 'warn');
      }
    }

    const duration = Date.now() - startTime;
    const testCounts = this.parseTestOutput(output);
    const coverage = this.extractCoverage(output);

    const result: TestResult = {
      suite: suite.name,
      ...testCounts,
      duration,
      coverage
    };

    // Log results
    const status = exitCode === 0 ? '✅' : '❌';
    this.log(`   ${status} Completed in ${duration}ms`);
    this.log(`   Results: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`);
    
    if (coverage !== undefined) {
      this.log(`   Coverage: ${coverage.toFixed(1)}%`);
    }

    // Save detailed output
    const outputFile = path.join(this.config.outputDir, `${suite.name.replace(/\s+/g, '-').toLowerCase()}.log`);
    fs.writeFileSync(outputFile, output);

    return result;
  }

  private generateReport() {
    const totalResults = this.results.reduce(
      (acc, result) => ({
        passed: acc.passed + result.passed,
        failed: acc.failed + result.failed,
        skipped: acc.skipped + result.skipped,
        duration: acc.duration + result.duration
      }),
      { passed: 0, failed: 0, skipped: 0, duration: 0 }
    );

    const totalTests = totalResults.passed + totalResults.failed + totalResults.skipped;
    const successRate = totalTests > 0 ? (totalResults.passed / totalTests * 100) : 0;
    const overallDuration = Date.now() - this.startTime;

    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      configuration: {
        coverage: this.config.coverage,
        parallel: this.config.parallel,
        suites_run: this.results.length
      },
      summary: {
        total_tests: totalTests,
        passed: totalResults.passed,
        failed: totalResults.failed,
        skipped: totalResults.skipped,
        success_rate: parseFloat(successRate.toFixed(1)),
        duration_ms: overallDuration
      },
      suites: this.results.map(result => ({
        name: result.suite,
        status: result.failed === 0 ? 'PASSED' : 'FAILED',
        tests: {
          passed: result.passed,
          failed: result.failed,
          skipped: result.skipped,
          total: result.passed + result.failed + result.skipped
        },
        duration_ms: result.duration,
        coverage_percent: result.coverage
      })),
      coverage: {
        average: this.results
          .filter(r => r.coverage !== undefined)
          .reduce((sum, r) => sum + (r.coverage || 0), 0) / 
          this.results.filter(r => r.coverage !== undefined).length || 0
      }
    };

    // Write JSON report
    const reportFile = path.join(this.config.outputDir, 'test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Write human-readable summary
    const summaryFile = path.join(this.config.outputDir, 'test-summary.md');
    const summaryContent = this.generateMarkdownSummary(report);
    fs.writeFileSync(summaryFile, summaryContent);

    return report;
  }

  private generateMarkdownSummary(report: any): string {
    const { summary, suites, coverage } = report;
    
    return `# LookEscolar Test Report

## Summary
- **Total Tests**: ${summary.total_tests}
- **Passed**: ${summary.passed} ✅
- **Failed**: ${summary.failed} ${summary.failed > 0 ? '❌' : ''}
- **Skipped**: ${summary.skipped} ⚠️
- **Success Rate**: ${summary.success_rate}%
- **Duration**: ${(summary.duration_ms / 1000).toFixed(1)}s
- **Average Coverage**: ${coverage.average.toFixed(1)}%

## Test Suites

${suites.map((suite: any) => `
### ${suite.name} ${suite.status === 'PASSED' ? '✅' : '❌'}

- **Status**: ${suite.status}
- **Tests**: ${suite.tests.passed}/${suite.tests.total} passed
- **Duration**: ${(suite.duration_ms / 1000).toFixed(1)}s
- **Coverage**: ${suite.coverage_percent ? suite.coverage_percent.toFixed(1) + '%' : 'N/A'}

${suite.tests.failed > 0 ? `⚠️ ${suite.tests.failed} test(s) failed` : ''}
${suite.tests.skipped > 0 ? `⚠️ ${suite.tests.skipped} test(s) skipped` : ''}
`).join('')}

## Recommendations

${summary.failed > 0 ? '- ❗ Address failing tests before deployment' : ''}
${coverage.average < 70 ? '- 📊 Increase test coverage (target: 70%+)' : ''}
${summary.success_rate < 95 ? '- 🎯 Improve test reliability (target: 95%+ success rate)' : ''}
${summary.duration_ms > 300000 ? '- ⚡ Optimize test performance (current: ' + (summary.duration_ms / 1000).toFixed(1) + 's)' : ''}

---
*Generated on ${new Date(report.timestamp).toLocaleString()}*
`;
  }

  public async runAll(): Promise<any> {
    this.log('\n🚀 Starting LookEscolar Test Suite');
    this.log(`Environment: ${this.config.environment}`);
    this.log(`Coverage: ${this.config.coverage ? 'Enabled' : 'Disabled'}`);
    this.log(`Parallel: ${this.config.parallel ? 'Enabled' : 'Disabled'}`);
    this.log(`Output Directory: ${this.config.outputDir}`);

    this.startTime = Date.now();
    this.results = [];

    // Environment setup
    this.log('\n🔧 Environment Setup');
    process.env.NODE_ENV = 'test';
    process.env.CI = 'true';

    // Run test suites
    for (const suite of this.config.suites) {
      const result = await this.runSuite(suite);
      this.results.push(result);
    }

    // Generate reports
    this.log('\n📊 Generating Reports');
    const report = this.generateReport();

    // Final summary
    this.log('\n🏁 Test Run Complete');
    this.log(`Total Duration: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
    this.log(`Success Rate: ${report.summary.success_rate}%`);
    this.log(`Reports saved to: ${this.config.outputDir}`);

    if (report.summary.failed > 0) {
      this.log(`❌ ${report.summary.failed} tests failed`, 'error');
      process.exitCode = 1;
    } else {
      this.log('✅ All tests passed!');
    }

    return report;
  }

  public async runSuiteByName(suiteName: string): Promise<TestResult | null> {
    const suite = this.config.suites.find(s => 
      s.name.toLowerCase().includes(suiteName.toLowerCase())
    );

    if (!suite) {
      this.log(`Suite not found: ${suiteName}`, 'error');
      return null;
    }

    this.startTime = Date.now();
    const result = await this.runSuite(suite);
    this.results = [result];

    this.generateReport();
    return result;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const suiteName = args.find(arg => !arg.startsWith('--'));
  
  const config: Partial<TestRunnerConfig> = {
    coverage: !args.includes('--no-coverage'),
    parallel: args.includes('--parallel'),
    verbose: !args.includes('--quiet'),
    environment: (args.find(arg => arg.startsWith('--env='))?.split('=')[1] as any) || 'test'
  };

  const runner = new TestRunner(config);

  if (suiteName) {
    runner.runSuiteByName(suiteName);
  } else {
    runner.runAll();
  }
}

export { TestRunner, TEST_SUITES };
export type { TestSuite, TestResult, TestRunnerConfig };