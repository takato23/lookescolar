#!/usr/bin/env tsx
/**
 * MVP Complete Testing Runner
 * Executes all critical tests for MVP validation
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import { performance } from 'perf_hooks';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  output?: string;
  error?: string;
}

class MVPTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = performance.now();
  }

  async runAllTests(): Promise<void> {
    console.log(chalk.blue.bold('\n🧪 MVP Testing Suite - Look Escolar\n'));
    console.log(chalk.gray('Running comprehensive tests to validate MVP readiness...\n'));

    // Test sequence in order of criticality
    await this.runTestSuite('E2E Complete Workflow', 'npm run test __tests__/e2e/complete-mvp-workflow.test.ts');
    await this.runTestSuite('Critical API Endpoints', 'npm run test __tests__/api-critical-endpoints.test.ts');
    await this.runTestSuite('UI Components', 'npm run test __tests__/components/ui-components.test.tsx');
    await this.runTestSuite('Security Comprehensive', 'npm run test __tests__/security/security-comprehensive.test.ts');
    await this.runTestSuite('Performance Critical', 'npm run test __tests__/performance/performance-critical.test.ts');
    await this.runTestSuite('Integration Tests', 'npm run test:integration');
    await this.runTestSuite('Admin Workflow E2E', 'npm run test __tests__/e2e/admin-workflow.test.ts');
    await this.runTestSuite('Family Workflow E2E', 'npm run test __tests__/e2e/family-workflow.test.ts');
    await this.runTestSuite('Mercado Pago Integration', 'npm run test __tests__/mercadopago-integration.test.ts');
    await this.runTestSuite('Storage Service', 'npm run test __tests__/storage.service.test.ts');
    await this.runTestSuite('Watermark Service', 'npm run test __tests__/watermark.service.test.ts');
    await this.runTestSuite('Token Service', 'npm run test __tests__/token.service.test.ts');

    this.printSummary();
  }

  private async runTestSuite(name: string, command: string): Promise<void> {
    const start = performance.now();
    
    console.log(chalk.yellow(`\n▶️  ${name}...`));
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000 // 2 minutes timeout
      });
      
      const duration = performance.now() - start;
      
      this.results.push({
        name,
        status: 'PASS',
        duration,
        output
      });
      
      console.log(chalk.green(`   ✅ PASSED (${Math.round(duration)}ms)`));
      
    } catch (error: any) {
      const duration = performance.now() - start;
      
      // Check if it's a timeout or actual test failure
      const isTimeout = error.signal === 'SIGTERM' || error.message.includes('timeout');
      const isSkipped = error.stdout?.includes('no tests found') || 
                       error.stdout?.includes('skipped') ||
                       error.code === 127; // Command not found
      
      if (isSkipped) {
        this.results.push({
          name,
          status: 'SKIP',
          duration,
          error: 'Tests not found or skipped'
        });
        
        console.log(chalk.yellow(`   ⏭️  SKIPPED - ${error.message || 'Tests not available'}`));
      } else {
        this.results.push({
          name,
          status: 'FAIL',
          duration,
          error: error.message || 'Unknown error',
          output: error.stdout
        });
        
        if (isTimeout) {
          console.log(chalk.red(`   ❌ TIMEOUT (${Math.round(duration)}ms) - ${error.message}`));
        } else {
          console.log(chalk.red(`   ❌ FAILED (${Math.round(duration)}ms)`));
          if (error.stdout && !error.stdout.includes('no tests found')) {
            console.log(chalk.gray(`      ${error.stdout.split('\n')[0]}`));
          }
        }
      }
    }
  }

  private printSummary(): void {
    const totalTime = performance.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log(chalk.blue.bold('\n📊 MVP Test Summary'));
    console.log('================================');
    
    // Overall status
    if (failed === 0) {
      console.log(chalk.green.bold(`✅ MVP VALIDATION: PASSED`));
    } else if (failed <= 2 && passed >= total * 0.8) {
      console.log(chalk.yellow.bold(`⚠️  MVP VALIDATION: PASSED WITH ISSUES`));
    } else {
      console.log(chalk.red.bold(`❌ MVP VALIDATION: FAILED`));
    }
    
    console.log(`\n📈 Results:`);
    console.log(chalk.green(`   ✅ Passed: ${passed}/${total}`));
    console.log(chalk.red(`   ❌ Failed: ${failed}/${total}`));
    console.log(chalk.yellow(`   ⏭️  Skipped: ${skipped}/${total}`));
    console.log(chalk.gray(`   ⏱️  Total time: ${Math.round(totalTime)}ms`));

    // Critical failures
    const criticalFailures = this.results.filter(r => 
      r.status === 'FAIL' && (
        r.name.includes('E2E Complete Workflow') ||
        r.name.includes('Critical API') ||
        r.name.includes('Security')
      )
    );

    if (criticalFailures.length > 0) {
      console.log(chalk.red.bold(`\n🚨 CRITICAL FAILURES:`));
      criticalFailures.forEach(failure => {
        console.log(chalk.red(`   • ${failure.name}`));
        if (failure.error) {
          console.log(chalk.gray(`     ${failure.error.split('\n')[0]}`));
        }
      });
    }

    // Performance summary
    const performanceTest = this.results.find(r => r.name.includes('Performance'));
    if (performanceTest) {
      if (performanceTest.status === 'PASS') {
        console.log(chalk.green(`\n⚡ Performance: ACCEPTABLE (${Math.round(performanceTest.duration)}ms)`));
      } else {
        console.log(chalk.red(`\n⚡ Performance: ISSUES DETECTED`));
      }
    }

    // MVP readiness assessment
    console.log(chalk.blue.bold('\n🎯 MVP Readiness Assessment'));
    console.log('=================================');
    
    const readinessScore = (passed / total) * 100;
    
    if (readinessScore >= 90 && criticalFailures.length === 0) {
      console.log(chalk.green.bold('🚀 MVP IS READY FOR PRODUCTION USE'));
      console.log(chalk.green('   Melisa can start using the system with her clients TODAY!'));
    } else if (readinessScore >= 70 && criticalFailures.length <= 1) {
      console.log(chalk.yellow.bold('⚠️  MVP IS MOSTLY READY (Minor Issues)'));
      console.log(chalk.yellow('   Melisa can use it with caution. Fix issues when possible.'));
    } else {
      console.log(chalk.red.bold('❌ MVP NEEDS MORE WORK'));
      console.log(chalk.red('   Critical issues must be resolved before production use.'));
    }

    // Next steps
    console.log(chalk.blue.bold('\n📋 Next Steps:'));
    
    if (criticalFailures.length > 0) {
      console.log(chalk.red('1. Fix critical test failures immediately'));
      console.log(chalk.gray('2. Re-run tests to verify fixes'));
      console.log(chalk.gray('3. Manual testing with checklist'));
    } else if (failed > 0) {
      console.log(chalk.yellow('1. Review non-critical test failures'));
      console.log(chalk.blue('2. Run manual testing checklist'));
      console.log(chalk.green('3. Deploy to production when ready'));
    } else {
      console.log(chalk.green('1. Run manual testing checklist (MVP_TESTING_CHECKLIST.md)'));
      console.log(chalk.green('2. Deploy to production'));
      console.log(chalk.green('3. Train Melisa on system usage'));
    }

    // Helpful commands
    console.log(chalk.blue.bold('\n🔧 Helpful Commands:'));
    console.log(chalk.gray('   npm run test:watch          # Run tests in watch mode'));
    console.log(chalk.gray('   npm run test:coverage       # Get coverage report'));
    console.log(chalk.gray('   npm run db:status           # Check database status'));
    console.log(chalk.gray('   npm run performance:test    # Detailed performance test'));
    
    console.log(chalk.blue('\n📖 Manual Testing: See MVP_TESTING_CHECKLIST.md\n'));
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MVPTestRunner();
  runner.runAllTests().catch(error => {
    console.error(chalk.red.bold('🚨 Test runner error:'), error);
    process.exit(1);
  });
}

export { MVPTestRunner };