import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Health check endpoint for production monitoring
 * Validates database, storage, and application status
 *
 * Response format:
 * - 200: All services healthy
 * - 503: One or more services degraded/unhealthy
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const storageBucket = process.env.STORAGE_BUCKET || 'photos';

    // Initialize response structure
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: nodeEnv,
      uptime: process.uptime(),
      services: {
        database: 'unknown',
        storage: 'unknown',
        auth: 'unknown'
      },
      checks: [] as string[]
    };

    // 1. Database connectivity check
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from('tenants')
        .select('count')
        .limit(1)
        .single();

      if (error) {
        health.services.database = 'degraded';
        health.checks.push(`Database warning: ${error.message}`);
      } else {
        health.services.database = 'up';
        health.checks.push('Database connection successful');
      }
    } catch (dbError) {
      health.services.database = 'down';
      health.status = 'unhealthy';
      health.checks.push(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    // 2. Storage bucket access check
    try {
      const supabase = await createServerClient();
      const { data: buckets, error } = await supabase
        .storage
        .listBuckets();

      if (error) {
        health.services.storage = 'degraded';
        health.checks.push(`Storage warning: ${error.message}`);
      } else {
        const hasRequiredBuckets = buckets?.some(b => b.name === storageBucket);
        health.services.storage = hasRequiredBuckets ? 'up' : 'degraded';
        health.checks.push(hasRequiredBuckets
          ? 'Storage buckets accessible'
          : `Warning: Required bucket '${storageBucket}' not found`
        );
      }
    } catch (storageError) {
      health.services.storage = 'down';
      health.status = 'unhealthy';
      health.checks.push(`Storage error: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`);
    }

    // 3. Auth service check
    try {
      const supabase = await createServerClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      // Auth service is considered healthy if it responds (session can be null)
      health.services.auth = error ? 'degraded' : 'up';
      health.checks.push(error
        ? `Auth warning: ${error.message}`
        : 'Auth service operational'
      );
    } catch (authError) {
      health.services.auth = 'down';
      health.status = 'unhealthy';
      health.checks.push(`Auth error: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Determine overall status
    const serviceStatuses = Object.values(health.services);
    if (serviceStatuses.includes('down')) {
      health.status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      health.status = 'degraded';
    }

    // Return response with appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json({
      ok: health.status === 'healthy',
      status: health.status,
      timestamp: health.timestamp,
      environment: health.environment,
      uptime: Math.floor(health.uptime),
      responseTime,
      services: health.services,
      checks: health.checks,
      version: process.env.BUILD_VERSION || 'development',
      buildTimestamp: process.env.BUILD_TIMESTAMP || null
    }, { status: statusCode });

  } catch (error) {
    // Critical error - health check itself failed
    console.error('[Health Check] Critical error:', error);

    return NextResponse.json({
      ok: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }, { status: 503 });
  }
}

// Support HEAD requests for simple uptime checks
export async function HEAD() {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1)
      .single();

    return new NextResponse(null, {
      status: error ? 503 : 200,
      headers: {
        'X-Health-Status': error ? 'degraded' : 'healthy'
      }
    });
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'unhealthy'
      }
    });
  }
}
