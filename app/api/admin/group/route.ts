import { NextRequest, NextResponse } from 'next/server';
import { groupBetweenAnchors } from '@/lib/photos/groupBetweenAnchors';
import { AuthMiddleware } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (req: NextRequest, auth) => {
    // En desarrollo, permitir sin autenticación
    if (!auth.isAdmin && process.env.NODE_ENV !== 'development') {
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
      console.error('Error in group endpoint:', e);
      return NextResponse.json({ 
        error: e?.message || 'Error grouping photos',
        details: process.env.NODE_ENV === 'development' ? String(e) : undefined
      }, { status: 500 });
    }
  }, 'admin')
);

export const runtime = 'nodejs';










