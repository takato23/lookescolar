import { NextRequest, NextResponse } from 'next/server';
import { detectAnchorsRun } from '@/lib/photos/batchAnchors';
import { AuthMiddleware } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (req: NextRequest, auth) => {
    // En desarrollo, permitir sin autenticación
    if (!auth.isAdmin && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    let body: {
      eventId?: string;
      onlyMissing?: boolean;
      maxConcurrency?: number;
    } = {};
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
      const sb = await createServerSupabaseServiceClient();
      const probe = await (sb as any).from('codes').select('id').limit(1);
      if (probe.error) {
        return NextResponse.json({
          success: true,
          qr_detection_disabled: true,
          reason: 'codes table missing',
          detected: [],
          unmatched: [],
          errors: [],
          updatedExif: 0,
        });
      }
      const summary = await detectAnchorsRun({
        eventId,
        onlyMissing,
        maxConcurrency,
      });
      return NextResponse.json({ success: true, ...summary });
    } catch (e: any) {
      console.warn('anchor-detect noop due to error:', e?.message || String(e));
      return NextResponse.json({
        success: true,
        qr_detection_disabled: true,
        reason: 'runtime error',
        detected: [],
        unmatched: [],
        errors: [],
        updatedExif: 0,
      });
    }
  }, 'admin')
);

export const runtime = 'nodejs';
