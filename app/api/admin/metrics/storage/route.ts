/**
 * Storage Metrics API Endpoint
 * Provides storage usage information for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { StorageMonitor } from '@/lib/services/free-tier-optimizer';

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseServiceClient();
    
    // Get storage usage metrics
    const metrics = await StorageMonitor.getUsageMetrics(supabase);
    
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minute cache
      },
    });
  } catch (error) {
    console.error('Storage metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage metrics' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handler);