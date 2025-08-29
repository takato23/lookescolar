import { NextRequest, NextResponse } from 'next/server';
import { groupBetweenAnchors } from '@/lib/photos/groupBetweenAnchors';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { AuthMiddleware } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (req: NextRequest, auth) => {
    // En desarrollo, permitir sin autenticación
    if (!auth.isAdmin && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    let body: { eventId?: string; dryRun?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { eventId, dryRun = false } = body;
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    try {
      const sb = await createServerSupabaseServiceClient();
      const probe = await (sb as any).from('codes').select('id').limit(1);
      if (probe.error) {
        return NextResponse.json({
          success: true,
          grouping_disabled: true,
          reason: 'codes table missing',
          assigned: 0,
          untouched: 0,
          unassigned: 0,
          segments: [],
          anchors_unmatched: [],
        });
      }
      const summary = await groupBetweenAnchors(eventId, { dryRun });
      return NextResponse.json({ success: true, ...summary });
    } catch (e: any) {
      console.warn(
        'group endpoint noop due to error:',
        e?.message || String(e)
      );
      return NextResponse.json({
        success: true,
        grouping_disabled: true,
        reason: 'runtime error',
        assigned: 0,
        untouched: 0,
        unassigned: 0,
        segments: [],
        anchors_unmatched: [],
      });
    }
  }, 'admin')
);

export const runtime = 'nodejs';
