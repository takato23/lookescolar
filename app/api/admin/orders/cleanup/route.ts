import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    // Check environment configuration
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Orders Cleanup] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // First, check if orders table exists and we have data
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('[Orders Cleanup] Database connection error:', testError);
      return NextResponse.json(
        { error: 'Database connection failed', details: testError.message },
        { status: 500 }
      );
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Update pending orders older than 24h to cancelled with admin note
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        notes: 'Auto-cancelled: pending >24h',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'pending')
      .lte('created_at', cutoff)
      .select('id');

    if (error) {
      console.error('[Orders Cleanup] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup pending orders', details: error.message },
        { status: 500 }
      );
    }

    const cancelledCount = data?.length || 0;
    console.log(`[Orders Cleanup] Successfully cancelled ${cancelledCount} orders`);

    return NextResponse.json({ success: true, cancelled: cancelledCount });
  } catch (error) {
    console.error('[Orders Cleanup] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
