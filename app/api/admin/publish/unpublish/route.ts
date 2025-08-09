import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';

const schema = z.object({ codeId: z.string().uuid('codeId inválido') });

async function handlePOST(request: NextRequest) {
  const requestId = `unpublish_${Date.now()}`;
  try {
    const body = await request.json();
    const { codeId } = schema.parse(body);
    const supabase = await createServerSupabaseServiceClient();

    const { error } = await supabase
      .from('codes' as any)
      .update({ is_published: false, token: null })
      .eq('id', codeId);

    if (error) {
      return NextResponse.json({ error: 'No se pudo despublicar' }, { status: 500 });
    }

    SecurityLogger.logSecurityEvent('code_unpublished', { requestId, codeId }, 'info');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Service] Unpublish error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(handlePOST, 'admin')
);


