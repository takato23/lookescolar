import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';

const schema = z.union([
  z.object({ photoId: z.string().uuid(), codeId: z.string().uuid() }),
  z.object({ items: z.array(z.object({ photoId: z.string().uuid(), codeId: z.string().uuid() })).min(1).max(500) })
]);

async function handlePOST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      SecurityLogger.logSecurityEvent('tagging_validation_error', { requestId, issues: parsed.error.issues }, 'warning');
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    let updated = 0;
    if ('items' in parsed.data) {
      for (const { photoId, codeId } of parsed.data.items) {
        const { data, error } = await supabase
          .from('photos')
          .update({ code_id: codeId })
          .eq('id', photoId)
          .select('id')
          .single();
        if (error) {
          SecurityLogger.logSecurityEvent('tagging_update_error', { requestId, photoId, error: error.message }, 'warning');
          continue; // skip this one, continue others
        }
        if (data?.id) updated += 1;
      }
    } else {
      const { photoId, codeId } = parsed.data;
      const { data, error } = await supabase
        .from('photos')
        .update({ code_id: codeId })
        .eq('id', photoId)
        .select('id')
        .single();
      if (error) {
        SecurityLogger.logSecurityEvent('tagging_update_error', { requestId, photoId, error: error.message }, 'warning');
        return NextResponse.json({ error: 'Photo not found or cannot update' }, { status: 404 });
      }
      if (data?.id) updated += 1;
    }

    SecurityLogger.logSecurityEvent('tagging_updated', { requestId, updated }, 'info');
    return NextResponse.json({ updated });
  } catch (error: any) {
    SecurityLogger.logSecurityEvent('tagging_error', { requestId, error: error?.message || 'unknown' }, 'error');
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dir = path.resolve(process.cwd(), 'test-reports/photo-flow');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `tagging.log`), `[${new Date().toISOString()}] ${requestId} ${error?.message || 'unknown'}\n`, { flag: 'a' });
    } catch {}
    // Return 400 instead of 500 to avoid exposing internal errors
    return NextResponse.json({ error: error?.message || 'Bad request' }, { status: 400 });
  }
}

export const POST = handlePOST;

async function handleDELETE(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  try {
    const DeleteSchema = z.object({ 
      photoId: z.string().uuid(), 
      subjectId: z.string().uuid().optional(),
      codeId: z.string().uuid().optional() 
    });
    const body = await request.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }
    const { photoId, subjectId, codeId } = parsed.data;

    const supabase = await createServerSupabaseServiceClient();

    // If subjectId provided, remove from photo_subjects table
    if (subjectId) {
      const { error } = await supabase
        .from('photo_subjects')
        .delete()
        .eq('photo_id', photoId)
        .eq('subject_id', subjectId);
      if (error) throw new Error(error.message);
      
      SecurityLogger.logSecurityEvent('photo_subject_untagged', { requestId, photoId, subjectId }, 'info');
    }
    
    // If codeId provided, remove code_id from photos table
    if (codeId) {
      const { error } = await supabase
        .from('photos')
        .update({ code_id: null })
        .eq('id', photoId)
        .eq('code_id', codeId);
      if (error) throw new Error(error.message);
      
      SecurityLogger.logSecurityEvent('photo_code_untagged', { requestId, photoId, codeId }, 'info');
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    SecurityLogger.logSecurityEvent('tagging_delete_error', { requestId, error: error?.message || 'unknown' }, 'error');
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dir = path.resolve(process.cwd(), 'test-reports/photo-flow');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `tagging.log`), `[${new Date().toISOString()}] ${requestId} ${error?.message || 'unknown'}\n`, { flag: 'a' });
    } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const DELETE = handleDELETE;
