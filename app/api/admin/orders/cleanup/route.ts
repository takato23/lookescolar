import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Update pending orders older than 24h to cancelled with admin note
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        admin_notes: 'Auto-cancelled: pending >24h',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('status', 'pending')
      .lte('created_at', cutoff)
      .select('id');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to cleanup pending orders', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, cancelled: data?.length || 0 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
