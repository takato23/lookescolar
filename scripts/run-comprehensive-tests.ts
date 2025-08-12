#!/usr/bin/env tsx

/**
 * COMPREHENSIVE TEST EXECUTION SCRIPT
 * 
 * Production-ready test execution script for LookEscolar system
 * - Environment validation
 * - Database setup verification
 * - Staged test execution
 * - Coverage reporting
 * - Performance benchmarking
 * - CI/CD integration
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { TestRunner, TEST_SUITES } from '../__tests__/test-runner';

// Cargar envs: .env.test o fallback .env.local antes de cualquier preflight
try {
  const envTest = path.resolve(process.cwd(), '.env.test');
  const envLocal = path.resolve(process.cwd(), '.env.local');
  const chosen = fs.existsSync(envTest) ? envTest : (fs.existsSync(envLocal) ? envLocal : null);
  if (chosen) {
    const lines = fs.readFileSync(chosen, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {}

interface ExecutionConfig {
  environment: 'test' | 'local' | 'ci';
  stage: 'unit' | 'integration' | 'e2e' | 'all';
  coverage: boolean;
  parallel: boolean;
  bail: boolean;
  verbose: boolean;
  outputDir: string;
  preflightChecks: boolean;
}

const DEFAULT_CONFIG: ExecutionConfig = {
  environment: 'test',
  stage: 'all',
  coverage: true,
  parallel: false,
  bail: false,
  verbose: true,
  outputDir: './test-reports',
  preflightChecks: true
};

class ComprehensiveTestExecutor {
  private config: ExecutionConfig;
  private startTime: number = 0;
  private reportFile: string;

  constructor(config: Partial<ExecutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reportFile = path.join(this.config.outputDir, 'comprehensive-test-report.json');
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (!this.config.verbose && level === 'info') return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const icon = level === 'error' ? '🔴' : level === 'warn' ? '🟡' : '🔵';
    console.log(`[${timestamp}] ${icon} ${message}`);
  }

  private async runCommand(command: string, description: string): Promise<{ success: boolean; output: string; duration: number }> {
    this.log(`Executing: ${description}`);
    
    const startTime = Date.now();
    let success = false;
    let output = '';

    try {
      output = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 300000 // 5 minutes timeout
      });
      success = true;
      this.log(`✅ ${description} completed`);
    } catch (error: any) {
      output = error.stdout || error.message || 'Command failed';
      this.log(`❌ ${description} failed: ${error.message}`, 'error');
      
      if (this.config.bail) {
        process.exit(1);
      }
    }

    const duration = Date.now() - startTime;
    return { success, output, duration };
  }

  private async performPreflightChecks(): Promise<boolean> {
    this.log('\n🔍 Performing preflight checks...');
    let allPassed = true;

    // Check Node.js version
    const nodeVersion = process.version;
    this.log(`Node.js version: ${nodeVersion}`);
    
    if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v20') && !nodeVersion.startsWith('v22')) {
      this.log('⚠️ Node.js version should be 18+ for optimal compatibility', 'warn');
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SESSION_SECRET',
      'MP_WEBHOOK_SECRET'
    ];

    this.log('Checking required environment variables...');
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.log(`❌ Missing environment variable: ${envVar}`, 'error');
        allPassed = false;
      } else {
        this.log(`✅ ${envVar}: Set (${envVar.includes('SECRET') ? '***' : 'visible'})`);
      }
    }

    // Check optional but recommended variables
    const optionalEnvVars = [
      'TEST_ADMIN_EMAIL',
      'TEST_ADMIN_PASSWORD',
      'STORAGE_BUCKET'
    ];

    this.log('Checking optional environment variables...');
    for (const envVar of optionalEnvVars) {
      if (!process.env[envVar]) {
        this.log(`⚠️ Optional variable not set: ${envVar} (some tests may be skipped)`, 'warn');
      } else {
        this.log(`✅ ${envVar}: Set`);
      }
    }

    // Check database connectivity (sin Vitest ni CJS issues)
    this.log('Testing database connectivity...');
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env['SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL'];
      const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
      if (!supabaseUrl || !serviceKey) {
        this.log('⚠️ SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no configuradas, omitiendo DB check', 'warn');
      } else {
        const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
        const { error } = await sb.from('events').select('id').limit(1);
        if (error) {
          this.log(`❌ Database connection failed: ${error.message}`, 'error');
          allPassed = false;
        } else {
          this.log('✅ Database connection successful');
        }
      }
    } catch (error) {
      this.log(`❌ Database connection test failed: ${error}`, 'error');
      allPassed = false;
    }

    // Check TypeScript compilation
    this.log('Checking TypeScript compilation...');
    const typecheckResult = await this.runCommand('npm run typecheck', 'TypeScript type checking');
    if (!typecheckResult.success) {
      allPassed = false;
    }

    // Check linting
    this.log('Running linter...');
    const lintResult = await this.runCommand('npm run lint', 'ESLint checking');
    if (!lintResult.success) {
      this.log('⚠️ Linting issues found, but continuing with tests', 'warn');
    }

    return allPassed;
  }

  private getTestSuitesForStage(stage: string): typeof TEST_SUITES {
    const stageMapping: Record<string, string[]> = {
      'unit': ['Component Tests', 'Utility Functions'],
      'integration': ['API Critical Endpoints', 'Security Validation', 'Critical Endpoints (TDD)', 'V1 Flow'],
      'e2e': ['Integration Workflows', 'Enhanced Security', 'Performance Comprehensive'],
      'all': TEST_SUITES.map(suite => suite.name)
    };

    const suitesToRun = stageMapping[stage] || stageMapping['all'];
    const expanded = TEST_SUITES.filter(suite => suitesToRun.includes(suite.name));
    return expanded;
  }

  private async generateComprehensiveReport(testReport: any, preflightResults: any, executionTime: number) {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        stage: this.config.stage,
        execution_time_ms: executionTime,
        node_version: process.version,
        lookescolar_version: this.getVersionInfo()
      },
      preflight: preflightResults,
      test_execution: testReport,
      recommendations: this.generateRecommendations(testReport, preflightResults),
      ci_integration: {
        exit_code: testReport.summary.failed > 0 ? 1 : 0,
        should_deploy: testReport.summary.failed === 0 && testReport.summary.success_rate >= 95,
        quality_gates: {
          coverage_threshold: 70,
          coverage_achieved: testReport.coverage?.average || 0,
          success_rate_threshold: 95,
          success_rate_achieved: testReport.summary.success_rate
        }
      }
    };

    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
    
    // Generate CI-friendly output
    this.generateCIOutput(report);
    
    return report;
  }

  private getVersionInfo(): string {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      return packageJson.version || '0.1.0';
    } catch {
      return 'unknown';
    }
  }

  private generateRecommendations(testReport: any, preflightResults: any): string[] {
    const recommendations: string[] = [];

    // Preflight recommendations
    if (!preflightResults.all_passed) {
      recommendations.push('🔧 Resolve preflight check failures before deployment');
    }

    // Test coverage recommendations
    const coverage = testReport.coverage?.average || 0;
    if (coverage < 70) {
      recommendations.push(`📊 Increase test coverage to 70%+ (currently ${coverage.toFixed(1)}%)`);
    }

    // Success rate recommendations
    if (testReport.summary.success_rate < 95) {
      recommendations.push(`🎯 Improve test reliability to 95%+ (currently ${testReport.summary.success_rate}%)`);
    }

    // Performance recommendations
    if (testReport.summary.duration_ms > 300000) { // 5 minutes
      recommendations.push('⚡ Optimize test suite performance (currently taking >5 minutes)');
    }

    // Failed tests recommendations
    if (testReport.summary.failed > 0) {
      recommendations.push(`❗ Fix ${testReport.summary.failed} failing test(s) before deployment`);
    }

    // Security recommendations
    const securitySuite = testReport.suites.find((s: any) => s.name.includes('Security'));
    if (securitySuite && securitySuite.tests.failed > 0) {
      recommendations.push('🛡️ Address security test failures immediately - potential vulnerabilities detected');
    }

    // Critical endpoint recommendations
    const criticalSuite = testReport.suites.find((s: any) => s.name.includes('Critical Endpoints'));
    if (criticalSuite && criticalSuite.tests.failed > 0) {
      recommendations.push('🚨 Critical endpoint tests failing - core functionality may be broken');
    }

    return recommendations;
  }

  private generateCIOutput(report: any) {
    // Generate GitHub Actions compatible output
    if (process.env.GITHUB_ACTIONS) {
      const output = {
        exit_code: report.ci_integration.exit_code,
        should_deploy: report.ci_integration.should_deploy,
        coverage: report.test_execution.coverage?.average || 0,
        success_rate: report.test_execution.summary.success_rate,
        failed_tests: report.test_execution.summary.failed,
        recommendations: report.recommendations.join('; ')
      };

      console.log('\n::group::CI Integration Output');
      console.log(`::set-output name=exit_code::${output.exit_code}`);
      console.log(`::set-output name=should_deploy::${output.should_deploy}`);
      console.log(`::set-output name=coverage::${output.coverage.toFixed(1)}`);
      console.log(`::set-output name=success_rate::${output.success_rate}`);
      console.log(`::set-output name=failed_tests::${output.failed_tests}`);
      console.log(`::set-output name=recommendations::${output.recommendations}`);
      console.log('::endgroup::');

      if (output.failed_tests > 0) {
        console.log(`::error::${output.failed_tests} test(s) failed`);
      }
    }

    // Generate summary file for other CI systems
    const summaryFile = path.join(this.config.outputDir, 'ci-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(report.ci_integration, null, 2));
  }

  public async execute(): Promise<any> {
    this.startTime = Date.now();
    this.log('\n🚀 Starting Comprehensive Test Execution');
    this.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

    let preflightResults = { all_passed: true, details: {} };
    
    // Preflight checks
    if (this.config.preflightChecks) {
      const preflightPassed = await this.performPreflightChecks();
      preflightResults = { all_passed: preflightPassed, details: {} };
      
      if (!preflightPassed && this.config.bail) {
        this.log('❌ Preflight checks failed and bail is enabled. Stopping execution.', 'error');
        process.exit(1);
      }
    }

    // Setup test environment
    this.log('\n🔧 Setting up test environment...');
    process.env.NODE_ENV = 'test';
    process.env.CI = this.config.environment === 'ci' ? 'true' : 'false';

    // Get test suites for the specified stage
    const suitesToRun = this.getTestSuitesForStage(this.config.stage);
    this.log(`Test suites to execute: ${suitesToRun.map(s => s.name).join(', ')}`);

    // Create test runner with filtered suites
    const testRunner = new TestRunner({
      suites: suitesToRun,
      coverage: this.config.coverage,
      parallel: this.config.parallel,
      verbose: this.config.verbose,
      environment: this.config.environment as any,
      outputDir: this.config.outputDir
    });

    // Execute tests
    this.log('\n🧪 Executing test suites...');
    // Si DB preflight falló, activar SEED_FAKE_DB
    if (!preflightResults.all_passed) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env['SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL'];
        const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
        if (!supabaseUrl || !serviceKey) {
          process.env.SEED_FAKE_DB = '1';
          this.log('SEED_FAKE_DB=1 activado (faltan credenciales para DB).');
        } else {
          const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
          const { error } = await sb.from('events').select('id').limit(1);
          if (error) {
            process.env.SEED_FAKE_DB = '1';
            this.log('SEED_FAKE_DB=1 activado (DB no accesible).');
          }
        }
      } catch {
        process.env.SEED_FAKE_DB = '1';
        this.log('SEED_FAKE_DB=1 activado (error en preflight DB).');
      }
    }
    const testReport = await testRunner.runAll();

    // Si estamos en integración, dispare además el patrón general de tests de integración para no depender del runner
    if (this.config.stage === 'integration') {
      const { output } = await this.runCommand(
        'npx vitest run tests/integration/**/*.test.ts --reporter=verbose --environment=node',
        'Vitest direct: tests/integration/**/*.test.ts'
      );
      const extraLogPath = path.join(this.config.outputDir, 'integration-vitest-direct.log');
      fs.writeFileSync(extraLogPath, output);
    }

    // Generate comprehensive report
    const executionTime = Date.now() - this.startTime;
    const comprehensiveReport = await this.generateComprehensiveReport(testReport, preflightResults, executionTime);

    // Final summary
    this.log('\n📊 Test Execution Summary');
    this.log(`Total Duration: ${(executionTime / 1000).toFixed(1)}s`);
    this.log(`Tests: ${testReport.summary.passed}/${testReport.summary.total_tests} passed`);
    this.log(`Success Rate: ${testReport.summary.success_rate}%`);
    this.log(`Coverage: ${testReport.coverage?.average?.toFixed(1) || 'N/A'}%`);
    
    if (comprehensiveReport.recommendations.length > 0) {
      this.log('\n💡 Recommendations:');
      comprehensiveReport.recommendations.forEach((rec: string) => {
        this.log(`   ${rec}`);
      });
    }

    this.log(`\n📁 Reports saved to: ${this.config.outputDir}`);
    this.log(`📋 Comprehensive report: ${this.reportFile}`);

    // Set exit code
    if (testReport.summary.failed > 0) {
      this.log('\n❌ Test execution completed with failures', 'error');
      process.exitCode = 1;
    } else {
      this.log('\n✅ Test execution completed successfully');
      process.exitCode = 0;
    }

    return comprehensiveReport;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const config: Partial<ExecutionConfig> = {
    environment: (args.find(arg => arg.startsWith('--env='))?.split('=')[1] as any) || 'test',
    stage: (args.find(arg => arg.startsWith('--stage='))?.split('=')[1] as any) || 'all',
    coverage: !args.includes('--no-coverage'),
    parallel: args.includes('--parallel'),
    bail: args.includes('--bail'),
    verbose: !args.includes('--quiet'),
    preflightChecks: !args.includes('--skip-preflight'),
    outputDir: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || './test-reports'
  };

  const executor = new ComprehensiveTestExecutor(config);
  executor.execute().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { ComprehensiveTestExecutor };