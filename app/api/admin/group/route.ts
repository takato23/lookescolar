import { NextRequest, NextResponse } from 'next/server';
import { groupBetweenAnchors } from '@/lib/photos/groupBetweenAnchors';
import { AuthMiddleware } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (req: NextRequest, auth) => {
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
      const summary = await groupBetweenAnchors(eventId, { dryRun });
      return NextResponse.json(summary);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
    }
  }, 'admin')
);

export const runtime = 'nodejs';


