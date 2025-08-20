#!/usr/bin/env tsx
/**
 * Manual Admin Validation Script
 * Test specific admin routes and authentication flows
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface ManualTest {
  name: string;
  url: string;
  expectedStatus: number;
  description: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
}

class ManualAdminValidator {
  private baseUrl = process.env.BASE_URL || 'http://localhost:3002';
  
  async testRoute(test: ManualTest): Promise<{ success: boolean; details: any }> {
    try {
      const response = await fetch(`${this.baseUrl}${test.url}`, {
        method: test.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...test.headers
        },
        body: test.body ? JSON.stringify(test.body) : undefined
      });

      const isSuccess = response.status === test.expectedStatus;
      const responseText = await response.text();
      
      return {
        success: isSuccess,
        details: {
          status: response.status,
          expected: test.expectedStatus,
          contentLength: responseText.length,
          contentPreview: responseText.substring(0, 200),
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {
          error: error.message,
          type: 'Network/Connection Error'
        }
      };
    }
  }

  async runManualTests() {
    console.log('🔧 Manual Admin Route Validation');
    console.log('================================\n');

    const tests: ManualTest[] = [
      {
        name: 'Home Page',
        url: '/',
        expectedStatus: 200,
        description: 'Public home page should load'
      },
      {
        name: 'Admin Events Page (No Auth)',
        url: '/admin/events',
        expectedStatus: 200, // Should redirect to auth or show login
        description: 'Admin events page accessibility'
      },
      {
        name: 'Admin Photos Page (No Auth)',
        url: '/admin/photos',
        expectedStatus: 200,
        description: 'Admin photos page accessibility'
      },
      {
        name: 'Health Check API',
        url: '/api/health',
        expectedStatus: 200,
        description: 'Basic API health endpoint'
      },
      {
        name: 'Admin Events API',
        url: '/api/admin/events',
        expectedStatus: 401, // Should require auth
        description: 'Admin events API endpoint'
      },
      {
        name: 'Public Gallery (Invalid ID)',
        url: '/gallery/invalid-id',
        expectedStatus: 200, // Should show error page
        description: 'Public gallery error handling'
      },
      {
        name: 'Family Token (Invalid)',
        url: '/f/invalid-token',
        expectedStatus: 200, // Should show error or redirect
        description: 'Family token error handling'
      }
    ];

    const results = [];

    for (const test of tests) {
      console.log(`🧪 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      console.log(`   Expected: ${test.expectedStatus}`);
      
      const result = await this.testRoute(test);
      results.push({ test, result });
      
      if (result.success) {
        console.log(`   ✅ PASS - Status: ${result.details.status}`);
      } else {
        console.log(`   ❌ FAIL - Status: ${result.details.status || 'ERROR'}`);
        if (result.details.error) {
          console.log(`   Error: ${result.details.error}`);
        }
      }
      
      console.log(`   Content: ${result.details.contentLength || 0} chars`);
      if (result.details.contentPreview) {
        console.log(`   Preview: ${result.details.contentPreview.replace(/\n/g, ' ')}...`);
      }
      console.log('');
    }

    // Summary
    const passed = results.filter(r => r.result.success).length;
    const failed = results.filter(r => !r.result.success).length;
    
    console.log('📊 Summary');
    console.log('===========');
    console.log(`✅ Passed: ${passed}/${tests.length}`);
    console.log(`❌ Failed: ${failed}/${tests.length}`);
    console.log(`📊 Success Rate: ${((passed/tests.length)*100).toFixed(1)}%`);

    // Detailed failures
    if (failed > 0) {
      console.log('\n🚨 Failed Tests:');
      results
        .filter(r => !r.result.success)
        .forEach(({ test, result }) => {
          console.log(`- ${test.name}: Expected ${test.expectedStatus}, got ${result.details.status || 'ERROR'}`);
          if (result.details.error) {
            console.log(`  Error: ${result.details.error}`);
          }
        });
    }

    return {
      total: tests.length,
      passed,
      failed,
      results
    };
  }
}

// Check database connectivity
async function checkDatabaseConnection() {
  console.log('🗄️ Checking Database Connection');
  console.log('===============================\n');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Test basic query
    const { data, error } = await supabase
      .from('events')
      .select('id, school, date, status')
      .limit(5);

    if (error) {
      console.log('❌ Database Error:', error.message);
      return false;
    }

    console.log(`✅ Database Connected - Found ${data?.length || 0} events`);
    if (data && data.length > 0) {
      console.log('📋 Sample Events:');
      data.forEach((event, idx) => {
        console.log(`  ${idx + 1}. ${event.school} (${new Date(event.date).toDateString()}) - ${event.status || 'no status'}`);
      });
    }
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ Database Connection Failed:', error.message);
    return false;
  }
}

async function checkAuthentication() {
  console.log('🔐 Checking Authentication Setup');
  console.log('================================\n');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'SESSION_SECRET'
  ];

  let allPresent = true;

  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: Present (${value.substring(0, 20)}...)`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allPresent = false;
    }
  });

  const optional = ['DEV_ACCESS_TOKEN', 'ALLOW_DEV_BYPASS', 'ADMIN_EMAILS'];
  optional.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`ℹ️ ${varName}: ${value}`);
    }
  });

  console.log('');
  return allPresent;
}

async function main() {
  console.log('🚀 LookEscolar Manual Admin Validation');
  console.log('======================================\n');

  // Check environment and database
  const authOk = await checkAuthentication();
  const dbOk = await checkDatabaseConnection();

  if (!authOk) {
    console.log('⚠️ Authentication setup incomplete - some tests may fail\n');
  }

  if (!dbOk) {
    console.log('⚠️ Database connection failed - data-dependent tests will fail\n');
  }

  // Run manual tests
  const validator = new ManualAdminValidator();
  const results = await validator.runManualTests();

  console.log('\n🎯 Assessment');
  console.log('=============');
  
  if (results.passed === results.total) {
    console.log('🟢 All manual tests passed - routes are accessible');
  } else if (results.failed <= 2) {
    console.log('🟡 Most tests passed - minor issues detected');
  } else {
    console.log('🔴 Multiple failures - significant issues detected');
  }

  console.log('\n📋 Recommendations');
  console.log('==================');
  
  if (!authOk) {
    console.log('1. Fix environment variable configuration');
  }
  if (!dbOk) {
    console.log('2. Verify database connection and credentials');
  }
  
  console.log('3. Check Next.js development server logs for detailed errors');
  console.log('4. Verify authentication middleware configuration');
  console.log('5. Test admin routes with proper authentication headers');

  return results;
}

if (require.main === module) {
  main().catch(console.error);
}

export { ManualAdminValidator };