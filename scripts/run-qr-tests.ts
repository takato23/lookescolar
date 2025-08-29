#!/usr/bin/env tsx

/**
 * @fileoverview QR Workflow Test Runner
 *
 * Executes all QR workflow tests in sequence and generates comprehensive reports.
 *
 * Usage:
 *   npm run test:qr-complete
 *   tsx scripts/run-qr-tests.ts [--verbose] [--parallel] [--skip-load]
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/utils/logger';

interface TestSuite {
  name: string;
  description: string;
  command: string;
  args: string[];
  timeout: number;
  critical: boolean;
}

interface TestResult {
  suite: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

interface TestSummary {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalDuration: number;
  overallSuccess: boolean;
  results: TestResult[];
  timestamp: string;
}

class QRTestRunner {
  private config = {
    verbose: false,
    parallel: false,
    skipLoad: false,
    outputDir: path.join(process.cwd(), 'test-reports'),
  };

  private testSuites: TestSuite[] = [
    {
      name: 'QR Integration Tests',
      description: 'Complete QR workflow integration testing',
      command: 'npm',
      args: ['run', 'test', '__tests__/integration/qr-workflow.test.ts'],
      timeout: 120000, // 2 minutes
      critical: true,
    },
    {
      name: 'QR Scanner Component Tests',
      description: 'React component testing with camera access',
      command: 'npm',
      args: ['run', 'test', '__tests__/components/QRScanner.test.tsx'],
      timeout: 90000, // 1.5 minutes
      critical: true,
    },
    {
      name: 'QR Security Tests',
      description: 'Security validation and vulnerability testing',
      command: 'npm',
      args: ['run', 'test', '__tests__/security/qr-security.test.ts'],
      timeout: 180000, // 3 minutes
      critical: true,
    },
    {
      name: 'QR Load Tests',
      description: 'Performance and load testing',
      command: 'npm',
      args: ['run', 'test', '__tests__/performance/qr-load-testing.test.ts'],
      timeout: 300000, // 5 minutes
      critical: false, // Can be skipped in CI for speed
    },
    {
      name: 'QR E2E Workflow',
      description: 'End-to-end workflow simulation',
      command: 'tsx',
      args: [
        'scripts/test-qr-flow.ts',
        '--students=10',
        '--photos=20',
        '--cleanup',
      ],
      timeout: 240000, // 4 minutes
      critical: true,
    },
  ];

  constructor(args: string[]) {
    this.parseArgs(args);

    if (this.config.skipLoad) {
      this.testSuites = this.testSuites.filter(
        (suite) => suite.name !== 'QR Load Tests'
      );
    }
  }

  private parseArgs(args: string[]): void {
    this.config.verbose = args.includes('--verbose');
    this.config.parallel = args.includes('--parallel');
    this.config.skipLoad = args.includes('--skip-load');
  }

  async run(): Promise<TestSummary> {
    const startTime = Date.now();

    this.log('🧪 Starting QR Workflow Test Suite');
    this.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });

    let results: TestResult[];

    if (this.config.parallel) {
      results = await this.runTestsParallel();
    } else {
      results = await this.runTestsSequential();
    }

    const summary: TestSummary = {
      totalSuites: this.testSuites.length,
      passedSuites: results.filter((r) => r.success).length,
      failedSuites: results.filter((r) => !r.success).length,
      totalDuration: Date.now() - startTime,
      overallSuccess: results.every(
        (r) =>
          r.success ||
          !this.testSuites.find((s) => s.name === r.suite)?.critical
      ),
      results,
      timestamp: new Date().toISOString(),
    };

    await this.generateReports(summary);
    this.printSummary(summary);

    return summary;
  }

  private async runTestsSequential(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const suite of this.testSuites) {
      this.log(`\n🔄 Running: ${suite.name}`);
      this.log(`📋 ${suite.description}`);

      const result = await this.runTestSuite(suite);
      results.push(result);

      if (result.success) {
        this.log(
          `✅ ${suite.name} completed successfully (${result.duration}ms)`
        );
      } else {
        this.log(`❌ ${suite.name} failed (${result.duration}ms)`);

        if (suite.critical) {
          this.log(
            `🚨 Critical test failed, continuing with remaining tests...`
          );
        }
      }
    }

    return results;
  }

  private async runTestsParallel(): Promise<TestResult[]> {
    this.log('\n🚀 Running tests in parallel...');

    const promises = this.testSuites.map((suite) =>
      this.runTestSuite(suite).then((result) => {
        if (result.success) {
          this.log(`✅ ${suite.name} completed (${result.duration}ms)`);
        } else {
          this.log(`❌ ${suite.name} failed (${result.duration}ms)`);
        }
        return result;
      })
    );

    return Promise.all(promises);
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';

      const childProcess = spawn(suite.command, suite.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CI: 'true',
        },
      });

      // Collect output
      process.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (this.config.verbose) {
          console.log(text.trim());
        }
      });

      process.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (this.config.verbose) {
          console.error(text.trim());
        }
      });

      // Set timeout
      const timeout = setTimeout(() => {
        process.kill('SIGKILL');
        resolve({
          suite: suite.name,
          success: false,
          duration: Date.now() - startTime,
          output,
          error: `Test suite timed out after ${suite.timeout}ms`,
        });
      }, suite.timeout);

      process.on('close', (code) => {
        clearTimeout(timeout);

        const duration = Date.now() - startTime;
        const success = code === 0;

        // Extract coverage information if available
        let coverage;
        try {
          const coverageMatch = output.match(
            /Coverage: (\d+\.?\d*)% statements.*?(\d+\.?\d*)% branches.*?(\d+\.?\d*)% functions.*?(\d+\.?\d*)% lines/
          );
          if (coverageMatch) {
            coverage = {
              statements: parseFloat(coverageMatch[1]),
              branches: parseFloat(coverageMatch[2]),
              functions: parseFloat(coverageMatch[3]),
              lines: parseFloat(coverageMatch[4]),
            };
          }
        } catch (error) {
          // Coverage parsing failed, continue without it
        }

        resolve({
          suite: suite.name,
          success,
          duration,
          output: output || errorOutput,
          error: success ? undefined : errorOutput,
          coverage,
        });
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          suite: suite.name,
          success: false,
          duration: Date.now() - startTime,
          output,
          error: error.message,
        });
      });
    });
  }

  private async generateReports(summary: TestSummary): Promise<void> {
    // JSON report
    const jsonReport = path.join(this.config.outputDir, 'qr-test-summary.json');
    await fs.writeFile(jsonReport, JSON.stringify(summary, null, 2));

    // Detailed text report
    const textReport = path.join(this.config.outputDir, 'qr-test-detailed.txt');
    const textContent = this.generateTextReport(summary);
    await fs.writeFile(textReport, textContent);

    // JUnit XML for CI/CD integration
    const junitReport = path.join(this.config.outputDir, 'qr-test-junit.xml');
    const junitContent = this.generateJUnitReport(summary);
    await fs.writeFile(junitReport, junitContent);

    // Coverage report if available
    if (summary.results.some((r) => r.coverage)) {
      const coverageReport = path.join(
        this.config.outputDir,
        'qr-coverage-summary.json'
      );
      const coverageData = {
        timestamp: summary.timestamp,
        suites: summary.results
          .filter((r) => r.coverage)
          .map((r) => ({
            suite: r.suite,
            coverage: r.coverage,
          })),
      };
      await fs.writeFile(coverageReport, JSON.stringify(coverageData, null, 2));
    }

    this.log(`\n📊 Reports generated in: ${this.config.outputDir}`);
  }

  private generateTextReport(summary: TestSummary): string {
    const lines: string[] = [];

    lines.push('QR WORKFLOW TEST SUITE - DETAILED REPORT');
    lines.push('='.repeat(50));
    lines.push(`Timestamp: ${summary.timestamp}`);
    lines.push(`Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
    lines.push(
      `Overall Success: ${summary.overallSuccess ? 'PASSED' : 'FAILED'}`
    );
    lines.push(
      `Test Suites: ${summary.passedSuites}/${summary.totalSuites} passed`
    );
    lines.push('');

    for (const result of summary.results) {
      lines.push(`Test Suite: ${result.suite}`);
      lines.push(`Status: ${result.success ? 'PASSED' : 'FAILED'}`);
      lines.push(`Duration: ${result.duration}ms`);

      if (result.coverage) {
        lines.push(
          `Coverage: ${result.coverage.statements}% statements, ${result.coverage.lines}% lines`
        );
      }

      if (result.error) {
        lines.push(`Error: ${result.error}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  private generateJUnitReport(summary: TestSummary): string {
    const testSuites = summary.results
      .map((result) => {
        const duration = (result.duration / 1000).toFixed(3);

        if (result.success) {
          return `    <testcase name="${result.suite}" classname="QRWorkflow" time="${duration}"/>`;
        } else {
          return `    <testcase name="${result.suite}" classname="QRWorkflow" time="${duration}">
      <failure message="Test suite failed">${this.escapeXml(result.error || 'Unknown error')}</failure>
    </testcase>`;
        }
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="QRWorkflowTests" tests="${summary.totalSuites}" failures="${summary.failedSuites}" time="${(summary.totalDuration / 1000).toFixed(3)}">
${testSuites}
</testsuite>`;
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private printSummary(summary: TestSummary): void {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 QR WORKFLOW TEST SUITE SUMMARY');
    console.log('='.repeat(60));

    console.log(
      `📊 Results: ${summary.passedSuites}/${summary.totalSuites} suites passed`
    );
    console.log(
      `⏱️  Duration: ${(summary.totalDuration / 1000).toFixed(2)} seconds`
    );
    console.log(
      `🎯 Status: ${summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`
    );

    console.log('\n📋 Test Suite Details:');
    for (const result of summary.results) {
      const status = result.success ? '✅' : '❌';
      const duration = `${(result.duration / 1000).toFixed(2)}s`;
      console.log(`  ${status} ${result.suite} (${duration})`);

      if (result.coverage) {
        console.log(
          `    📈 Coverage: ${result.coverage.statements}% statements, ${result.coverage.lines}% lines`
        );
      }

      if (!result.success && result.error) {
        console.log(`    ❌ Error: ${result.error.split('\n')[0]}`);
      }
    }

    if (summary.results.some((r) => r.coverage)) {
      const avgCoverage =
        summary.results
          .filter((r) => r.coverage)
          .reduce((sum, r) => sum + r.coverage!.statements, 0) /
        summary.results.filter((r) => r.coverage).length;

      console.log(`\n📈 Average Coverage: ${avgCoverage.toFixed(1)}%`);
    }

    console.log('\n📁 Reports saved to: test-reports/');
    console.log('  - qr-test-summary.json (detailed results)');
    console.log('  - qr-test-detailed.txt (human-readable)');
    console.log('  - qr-test-junit.xml (CI/CD integration)');

    if (summary.results.some((r) => r.coverage)) {
      console.log('  - qr-coverage-summary.json (coverage data)');
    }

    console.log('='.repeat(60));
  }

  private log(message: string): void {
    console.log(message);

    logger.info('QR Test Runner', {
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const runner = new QRTestRunner(args);

  try {
    const summary = await runner.run();

    // Exit with appropriate code
    process.exit(summary.overallSuccess ? 0 : 1);
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    logger.error('QR Test Runner Failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { QRTestRunner, type TestResult, type TestSummary };
