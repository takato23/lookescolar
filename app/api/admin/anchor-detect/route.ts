import { NextRequest, NextResponse } from 'next/server';
import { detectAnchorsRun } from '@/lib/photos/batchAnchors';
import { AuthMiddleware } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (req: NextRequest, auth) => {
    // En desarrollo, permitir sin autenticación
    if (!auth.isAdmin && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    let body: { eventId?: string; onlyMissing?: boolean; maxConcurrency?: number } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { eventId, onlyMissing = true, maxConcurrency = 4 } = body;
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    try {
      const summary = await detectAnchorsRun({ eventId, onlyMissing, maxConcurrency });
      return NextResponse.json(summary);
    } catch (e: any) {
      console.error('Error in anchor-detect:', e);
      return NextResponse.json({ 
        error: e?.message || 'Error detecting anchors',
        details: process.env.NODE_ENV === 'development' ? String(e) : undefined
      }, { status: 500 });
    }
  }, 'admin')
);

export const runtime = 'nodejs';



