import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/absoluteUrl';
import crypto from 'crypto';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { AuthMiddleware, SecurityLogger } from '@/lib/middleware/auth.middleware';

const schema = z.object({ codeId: z.string().uuid('codeId inválido') });

function generateHexToken(bytes: number = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

async function handlePOST(request: NextRequest) {
  const requestId = `revoke_${Date.now()}`;
  try {
    const json = await request.json();
    const { codeId } = schema.parse(json);

    const supabase = await createServerSupabaseServiceClient();

    const { data: code, error: codeErr } = await supabase
      .from('codes' as any)
      .select('id')
      .eq('id', codeId)
      .single();

    if (codeErr || !code) {
      return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 });
    }

    const token = generateHexToken(16);
    const { error: updErr } = await supabase
      .from('codes' as any)
      .update({ token, is_published: true })
      .eq('id', codeId);

    if (updErr) {
      console.error('[Service] Error revocando token:', updErr);
      return NextResponse.json({ error: 'No se pudo revocar token' }, { status: 500 });
    }

    SecurityLogger.logSecurityEvent('code_token_revoked', { requestId, codeId }, 'info');

    const url = absoluteUrl(`/f/${token}`);
    return NextResponse.json({ token, url });
  } catch (error) {
    console.error('[Service] Admin revoke token error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(handlePOST, 'admin')
);


