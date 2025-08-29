import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { withAuth } from '@/lib/middleware/auth.middleware';

// GET /api/admin/events/search?q=..&limit=50&offset=0&status=active|inactive|all
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') || '').trim();
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
      const status = url.searchParams.get('status');

      const supabase = await createServerSupabaseServiceClient();

      let query = supabase
        .from('events')
        .select('id, name, date, created_at, status')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (q.length >= 2) {
        query = query.ilike('name', `%${q}%`);
      }

      if (status === 'active') query = query.eq('status', 'active');
      if (status === 'inactive') query = query.eq('status', 'inactive');

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ success: true, events: [], error: error.message }, { status: 200 });
      }

      const events = (data || []).map((e) => ({
        id: e.id,
        name: (e as any).name || 'Sin nombre',
        date: (e as any).date || (e as any).created_at,
        status: (e as any).status || 'active',
      }));

      return NextResponse.json({ success: true, events, nextOffset: offset + events.length, hasMore: events.length === limit });
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  })
);



