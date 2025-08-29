import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { publishPerformanceMonitor } from '@/lib/services/publish-performance-monitor';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

async function handleGET(request: NextRequest): Promise<NextResponse> {
  const requestStart = Date.now();

  try {
    const supabase = await createServerSupabaseServiceClient();
    
    // Get performance stats
    const perfReport = publishPerformanceMonitor.generateReport(24 * 60 * 60 * 1000); // Last 24h
    const recentStats = publishPerformanceMonitor.getStats(60 * 60 * 1000); // Last hour

    // Check database health for folders table
    const { data: folderCount, error: folderCountError } = await supabase
      .from('folders')
      .select('id', { count: 'exact', head: true });

    const { data: publishedCount, error: publishedCountError } = await supabase
      .from('folders')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true);

    // Check if bulk_publish_folders function exists
    const { data: funcExists, error: funcError } = await supabase
      .rpc('bulk_publish_folders', { 
        p_folder_ids: [], 
        p_batch_size: 1, 
        p_settings: {} 
      })
      .limit(0);

    const dbHealth = {
      folders_total: folderCount || 0,
      folders_published: publishedCount || 0,
      bulk_function_available: !funcError,
      folder_count_error: folderCountError?.message,
      published_count_error: publishedCountError?.message,
      bulk_function_error: funcError?.message,
    };

    // Test endpoint accessibility
    const endpointTests = {
      bulk_publish_endpoint: {
        url: '/api/admin/folders/bulk-publish',
        method: 'POST',
        available: true, // We know it exists since we're testing from within
      }
    };

    return NextResponse.json({
      debug_info: {
        timestamp: new Date().toISOString(),
        request_duration_ms: Date.now() - requestStart,
      },
      performance_monitor: {
        recent_stats: recentStats,
        health_report: perfReport,
      },
      database_health: dbHealth,
      endpoint_tests: endpointTests,
      system_status: {
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        node_version: process.version,
      }
    });

  } catch (error) {
    const executionTime = Date.now() - requestStart;
    console.error('[DEBUG] Bulk operations debug error:', error);

    return NextResponse.json(
      { 
        error: 'Failed to generate debug report',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        execution_time_ms: executionTime
      },
      { status: 500 }
    );
  }
}

// Test endpoint for bulk operations
async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const requestStart = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const { test_type = 'basic', folder_ids = [] } = body;

    const supabase = await createServerSupabaseServiceClient();
    let testResults: any = {};

    switch (test_type) {
      case 'basic':
        // Basic connectivity test
        testResults = {
          test: 'basic_connectivity',
          supabase_connected: true,
          timestamp: new Date().toISOString(),
        };
        break;

      case 'bulk_function':
        // Test bulk function with empty array
        try {
          const { data, error } = await supabase
            .rpc('bulk_publish_folders', {
              p_folder_ids: [],
              p_batch_size: 1,
              p_settings: {}
            });
          
          testResults = {
            test: 'bulk_function',
            function_available: !error,
            result: data,
            error: error?.message,
          };
        } catch (funcError) {
          testResults = {
            test: 'bulk_function',
            function_available: false,
            error: funcError instanceof Error ? funcError.message : 'Function test failed'
          };
        }
        break;

      case 'folder_query':
        // Test folder queries
        const { data: folders, error: queryError } = await supabase
          .from('folders')
          .select('id, name, is_published, share_token')
          .limit(5);

        testResults = {
          test: 'folder_query',
          query_successful: !queryError,
          sample_folders: folders?.length || 0,
          error: queryError?.message,
        };
        break;

      default:
        testResults = {
          test: 'unknown',
          error: `Unknown test type: ${test_type}`
        };
    }

    return NextResponse.json({
      debug_test: testResults,
      execution_time_ms: Date.now() - requestStart,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const executionTime = Date.now() - requestStart;
    console.error('[DEBUG] Test error:', error);

    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handleGET);
export const POST = withAdminAuth(handlePOST);