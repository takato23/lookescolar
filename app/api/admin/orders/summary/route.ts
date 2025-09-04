import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/orders/summary?event_id=...&limit=...
export const GET = withAdminAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('event_id');
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

  const supabase = await createServerSupabaseServiceClient();

  // Aggregate orders by share_token_id (unified sharing)
  // Return counts and totals, resolve tokens and event info
  const { data, error } = await supabase
    .from('unified_orders')
    .select(
      `
      share_token_id,
      event_id,
      total_price,
      status,
      created_at,
      share_tokens:share_token_id ( token, share_type, folder_id, event_id )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders summary' },
      { status: 500 }
    );
  }

  // Group in-memory
  const groups: Record<string, any> = {};
  (data || []).forEach((row: any) => {
    const key = row.share_token_id || 'unknown';
    if (!groups[key]) {
      groups[key] = {
        share_token_id: row.share_token_id,
        token: row.share_tokens?.token || null,
        share_type: row.share_tokens?.share_type || null,
        event_id: row.event_id || row.share_tokens?.event_id || null,
        orders: 0,
        total_amount: 0,
        last_order_at: row.created_at,
      };
    }
    groups[key].orders += 1;
    groups[key].total_amount += Number(row.total_price || 0);
    if (row.created_at > groups[key].last_order_at) groups[key].last_order_at = row.created_at;
  });

  const summary = Object.values(groups).sort((a: any, b: any) => (b.last_order_at || '').localeCompare(a.last_order_at || ''));

  return NextResponse.json({ success: true, summary });
});
