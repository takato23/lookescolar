import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';

async function logErrorToFile(name: string, content: string) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dir = path.resolve(process.cwd(), 'test-reports/photo-flow');
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${name}.log`);
    await fs.writeFile(file, content + '\n', { flag: 'a' });
  } catch (_) {
    // ignore
  }
}

// Accept only codeId moving forward. Keep legacy fields optional for BC but ignore them.
const BodySchema = z.object({
  codeId: z.string().uuid(),
  // Legacy fields kept optional for backwards compatibility (ignored)
  event_id: z.string().uuid().optional(),
  targetEventId: z.string().uuid().optional(),
});

async function handlePATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const photoId = params?.id as string | undefined;
  if (!photoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let parsed: ReturnType<typeof BodySchema.safeParse>;
  try {
    const body = await request.json();
    parsed = BodySchema.safeParse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const targetCodeId = parsed.data.codeId;

  const supabase = await createServerSupabaseServiceClient();

  // Verify code exists and fetch its event_id to keep data consistent
  const { data: codeRow, error: codeErr } = await supabase
    .from('codes' as any)
    .select('id, event_id')
    .eq('id', targetCodeId)
    .single();
  if (codeErr || !codeRow) {
    return NextResponse.json({ error: 'Invalid codeId' }, { status: 400 });
  }

  const updates: Record<string, any> = { code_id: targetCodeId };
  if ((codeRow as any).event_id) {
    updates.event_id = (codeRow as any).event_id;
  }

  const { data, error } = await supabase
    .from('photos')
    .update(updates)
    .eq('id', photoId)
    .select('id')
    .single();

  if (error) {
    SecurityLogger.logSecurityEvent('photo_move_error', { requestId, photoId, error: error.message }, 'error');
    await logErrorToFile('move', `[${new Date().toISOString()}] ${requestId} photo_move_error: ${error.message}`);
    // Return 400 to avoid 500s bubbling to UI
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export const runtime = 'nodejs';

export const PATCH = withAuth(handlePATCH);


