#!/usr/bin/env tsx

/**
 * Production Readiness Validation Script
 * 
 * Validates all critical systems and configurations before production deployment.
 * Run this script before deploying to production to ensure everything is ready.
 * 
 * Usage: npm run validate:production
 */

import { validateEnvironment, validateCriticalSecuritySettings, logEnvironmentStatus } from '../lib/utils/env-validation';
import { getProductionConfig, validateProductionConfig, logConfigurationSummary } from '../lib/config/production.config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface ValidationResult {
  category: string;
  passed: boolean;
  issues: string[];
  warnings: string[];
  critical: string[];
}

class ProductionReadinessValidator {
  private results: ValidationResult[] = [];
  private config = getProductionConfig();

  async validate(): Promise<boolean> {
    console.log('🚀 LookEscolar Production Readiness Validation\n');
    console.log('='.repeat(60));

    // Run all validation checks
    await this.validateEnvironmentVariables();
    await this.validateSupabaseConnection();
    await this.validateStorageConfiguration();
    await this.validateSecurityConfiguration();
    await this.validateRateLimitingSetup();
    await this.validateMercadoPagoConfiguration();
    await this.validateFileSystemPermissions();
    await this.validateBuildConfiguration();
    await this.validatePerformanceSettings();
    await this.validateMonitoringSetup();

    // Generate summary report
    this.generateSummaryReport();

    // Return overall status
    return this.results.every(result => result.passed);
  }

  private async validateEnvironmentVariables(): Promise<void> {
    const result = validateEnvironment();
    const securityIssues = validateCriticalSecuritySettings();
    const configIssues = validateProductionConfig(this.config);

    this.results.push({
      category: 'Environment Variables',
      passed: result.isValid && securityIssues.length === 0,
      issues: result.errors,
      warnings: result.warnings,
      critical: [...result.critical, ...securityIssues, ...configIssues],
    });

    logEnvironmentStatus(result);
    logConfigurationSummary(this.config);
  }

  private async validateSupabaseConnection(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    try {
      console.log('\n📊 Validating Supabase connection...');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Test database connection
      const { data, error } = await supabase.from('events').select('count').limit(1);
      
      if (error) {
        critical.push(`Database connection failed: ${error.message}`);
      } else {
        console.log('✅ Database connection successful');
      }

      // Test RLS policies
      const { data: rlsData, error: rlsError } = await supabase.rpc('check_rls_enabled');
      if (rlsError) {
        warnings.push('Could not verify RLS policies are enabled');
      }

      // Test storage bucket
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        issues.push(`Storage bucket validation failed: ${bucketError.message}`);
      } else {
        const photoBucket = buckets.find(b => b.name === this.config.storageBucket);
        if (!photoBucket) {
          critical.push(`Storage bucket '${this.config.storageBucket}' not found`);
        } else if (photoBucket.public) {
          critical.push(`Storage bucket '${this.config.storageBucket}' must be private`);
        } else {
          console.log('✅ Private storage bucket configured correctly');
        }
      }

    } catch (error) {
      critical.push(`Supabase validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.results.push({
      category: 'Supabase Connection',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private async validateStorageConfiguration(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    console.log('\n📁 Validating storage configuration...');

    // Validate storage settings
    if (this.config.maxFileSize > 50 * 1024 * 1024) { // 50MB
      warnings.push('Maximum file size is very large and may cause upload issues');
    }

    if (this.config.signedUrlExpiryMinutes > 120) {
      warnings.push('Signed URL expiry is longer than recommended (120 minutes)');
    }

    if (this.config.maxFilesPerRequest > 50) {
      warnings.push('Maximum files per request is very high and may cause timeouts');
    }

    // Test upload directory permissions
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, 'test.txt'), 'test');
      await fs.unlink(path.join(uploadDir, 'test.txt'));
      console.log('✅ Upload directory permissions verified');
    } catch (error) {
      issues.push('Upload directory permissions issue');
    }

    this.results.push({
      category: 'Storage Configuration',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private async validateSecurityConfiguration(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    console.log('\n🔒 Validating security configuration...');

    // Check critical security settings
    if (this.config.isProduction) {
      if (this.config.skipAuth) {
        critical.push('Authentication bypass is enabled in production');
      }

      if (!this.config.maskSensitiveLogs) {
        critical.push('Sensitive log masking is disabled in production');
      }

      if (!this.config.securityHeadersEnabled) {
        critical.push('Security headers are disabled in production');
      }

      if (!this.config.appUrl.startsWith('https://')) {
        critical.push('Application URL must use HTTPS in production');
      }

      if (this.config.tokenMinLength < 20) {
        critical.push('Token minimum length must be at least 20 characters in production');
      }
    }

    // Check session secret strength
    if (this.config.sessionSecret.length < 32) {
      critical.push('Session secret must be at least 32 characters long');
    }

    // Check for development values in production
    if (this.config.isProduction) {
      if (this.config.mercadoPago.publicKey.includes('TEST-')) {
        warnings.push('Using test Mercado Pago keys in production environment');
      }
    }

    if (critical.length === 0 && issues.length === 0) {
      console.log('✅ Security configuration validated');
    }

    this.results.push({
      category: 'Security Configuration',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private async validateRateLimitingSetup(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    console.log('\n🛡️ Validating rate limiting setup...');

    if (!this.config.rateLimitEnabled && this.config.isProduction) {
      critical.push('Rate limiting must be enabled in production');
    }

    // Test Redis connection if rate limiting is enabled
    if (this.config.rateLimitEnabled) {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!redisUrl || !redisToken) {
        if (this.config.isProduction) {
          critical.push('Redis configuration is required for rate limiting in production');
        } else {
          warnings.push('Redis not configured - rate limiting will use memory store');
        }
      } else {
        try {
          // Test Redis connection
          const response = await fetch(`${redisUrl}/ping`, {
            headers: { Authorization: `Bearer ${redisToken}` },
          });

          if (response.ok) {
            console.log('✅ Redis connection verified');
          } else {
            issues.push('Redis connection test failed');
          }
        } catch (error) {
          issues.push('Could not connect to Redis');
        }
      }
    }

    this.results.push({
      category: 'Rate Limiting Setup',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private async validateMercadoPagoConfiguration(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    console.log('\n💳 Validating Mercado Pago configuration...');

    const { mercadoPago } = this.config;

    // Check webhook secret strength
    if (mercadoPago.webhookSecret.length < 32) {
      critical.push('Mercado Pago webhook secret must be at least 32 characters long');
    }

    // Production environment checks
    if (this.config.isProduction && mercadoPago.environment === 'sandbox') {
      critical.push('Mercado Pago must use production environment in production');
    }

    // Test keys format
    if (!mercadoPago.publicKey || !mercadoPago.accessToken) {
      critical.push('Mercado Pago keys are missing');
    } else {
      const isTestKey = mercadoPago.publicKey.includes('TEST-') || mercadoPago.accessToken.includes('TEST-');
      if (this.config.isProduction && isTestKey) {
        critical.push('Using test Mercado Pago keys in production');
      }
    }

    if (critical.length === 0) {
      console.log('✅ Mercado Pago configuration validated');
    }

    this.results.push({
      category: 'Mercado Pago Configuration',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private async validateFileSystemPermissions(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    console.log('\n📂 Validating file system permissions...');

    try {
      // Check read/write permissions in key directories
      const testDirs = ['./uploads', './temp', './logs'];
      
      for (const dir of testDirs) {
        try {
          await fs.mkdir(dir, { recursive: true });
          const testFile = path.join(dir, `test-${Date.now()}.txt`);
          await fs.writeFile(testFile, 'test');
          await fs.unlink(testFile);
        } catch (error) {
          issues.push(`Cannot write to ${dir} directory`);
        }
      }

      console.log('✅ File system permissions verified');

    } catch (error) {
      issues.push('File system permission validation failed');
    }

    this.results.push({
      category: 'File System Permissions',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private async validateBuildConfiguration(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    console.log('\n🏗️ Validating build configuration...');

    try {
      // Check Next.js configuration
      const nextConfigPath = path.join(process.cwd(), 'next.config.js');
      const nextConfigExists = await fs.access(nextConfigPath).then(() => true).catch(() => false);
      
      if (!nextConfigExists) {
        warnings.push('next.config.js not found - using default configuration');
      }

      // Check TypeScript configuration
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigExists = await fs.access(tsconfigPath).then(() => true).catch(() => false);
      
      if (!tsconfigExists) {
        issues.push('tsconfig.json not found');
      }

      // Check package.json
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (!packageJson.scripts?.build) {
        critical.push('Build script not found in package.json');
      }

      if (!packageJson.scripts?.start) {
        critical.push('Start script not found in package.json');
      }

      console.log('✅ Build configuration validated');

    } catch (error) {
      critical.push('Build configuration validation failed');
    }

    this.results.push({
      category: 'Build Configuration',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private async validatePerformanceSettings(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    console.log('\n⚡ Validating performance settings...');

    // Check concurrent upload limits
    if (this.config.maxConcurrentUploads > 10) {
      warnings.push('High concurrent upload limit may cause performance issues');
    }

    // Check photo processing settings
    if (this.config.photoMaxSize > 2000) {
      warnings.push('Large photo max size may cause storage and processing issues');
    }

    // Check cache settings
    if (this.config.enableRedisCache && !process.env.UPSTASH_REDIS_REST_URL) {
      issues.push('Redis cache enabled but Redis not configured');
    }

    console.log('✅ Performance settings validated');

    this.results.push({
      category: 'Performance Settings',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private async validateMonitoringSetup(): Promise<void> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    console.log('\n📊 Validating monitoring setup...');

    // Check monitoring configuration
    if (!this.config.enableHealthChecks && this.config.isProduction) {
      warnings.push('Health checks should be enabled in production');
    }

    if (!this.config.enablePerformanceMonitoring && this.config.isProduction) {
      warnings.push('Performance monitoring should be enabled in production');
    }

    if (!this.config.enableMetrics && this.config.isProduction) {
      warnings.push('Metrics collection should be enabled in production');
    }

    // Check egress monitoring
    if (!this.config.enableEgressMonitoring && this.config.isProduction) {
      critical.push('Egress monitoring must be enabled in production to track Supabase limits');
    }

    console.log('✅ Monitoring setup validated');

    this.results.push({
      category: 'Monitoring Setup',
      passed: critical.length === 0,
      issues,
      warnings,
      critical,
    });
  }

  private generateSummaryReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 PRODUCTION READINESS SUMMARY');
    console.log('='.repeat(60));

    let totalCritical = 0;
    let totalIssues = 0;
    let totalWarnings = 0;
    let passedCategories = 0;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.category}`);
      
      if (result.critical.length > 0) {
        console.log('  🚨 CRITICAL:');
        result.critical.forEach(issue => console.log(`    - ${issue}`));
        totalCritical += result.critical.length;
      }
      
      if (result.issues.length > 0) {
        console.log('  ❌ ISSUES:');
        result.issues.forEach(issue => console.log(`    - ${issue}`));
        totalIssues += result.issues.length;
      }
      
      if (result.warnings.length > 0) {
        console.log('  ⚠️  WARNINGS:');
        result.warnings.forEach(warning => console.log(`    - ${warning}`));
        totalWarnings += result.warnings.length;
      }
      
      if (result.passed) {
        passedCategories++;
      }
      
      console.log('');
    });

    console.log('='.repeat(60));
    console.log(`📊 OVERALL STATUS: ${passedCategories}/${this.results.length} categories passed`);
    console.log(`🚨 Critical Issues: ${totalCritical}`);
    console.log(`❌ Issues: ${totalIssues}`);
    console.log(`⚠️  Warnings: ${totalWarnings}`);
    console.log('='.repeat(60));

    if (totalCritical > 0) {
      console.log('\n🚨 DEPLOYMENT BLOCKED: Critical issues must be resolved before production deployment.');
      console.log('Fix all critical issues and run validation again.\n');
    } else if (totalIssues > 0) {
      console.log('\n⚠️  DEPLOYMENT CAUTIONED: Issues should be resolved before production deployment.');
      console.log('Review and fix issues, then run validation again.\n');
    } else {
      console.log('\n🎉 PRODUCTION READY: All critical validations passed!');
      console.log('System is ready for production deployment.\n');
      
      if (totalWarnings > 0) {
        console.log(`ℹ️  Note: ${totalWarnings} warnings were found. Consider reviewing them for optimal performance.\n`);
      }
    }
  }
}

// Main execution
async function main() {
  const validator = new ProductionReadinessValidator();
  const isReady = await validator.validate();
  
  process.exit(isReady && validator['results'].every(r => r.critical.length === 0) ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  });
}

export { ProductionReadinessValidator };