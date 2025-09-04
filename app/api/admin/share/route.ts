import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Shape expected by PhotoAdmin.tsx (adapter sobre el sistema actual)
const CreateShareAdapterSchema = z.object({
  eventId: z.string().uuid().optional(),
  shareType: z.enum(['folder', 'photos']).default('folder'),
  folderId: z.string().uuid().optional(),
  photoIds: z.array(z.string().uuid()).optional(),
  title: z.string().optional(),
  password: z.string().optional(),
  allowDownload: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const input = CreateShareAdapterSchema.parse(body);

    // Requiere eventId (PhotoAdmin lo deriva antes de llamar)
    if (!input.eventId) {
      return NextResponse.json(
        { error: 'eventId requerido' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Adaptamos a la RPC existente create_gallery_share
    const { data, error } = await supabase.rpc('create_gallery_share', {
      p_event_id: input.eventId,
      p_level_id: null,
      p_course_id: null,
      p_student_id: null,
      p_expires_in_days: input.expiresAt ? null : 7,
      p_max_views: null,
      p_allow_download: input.allowDownload ?? true,
      p_allow_share: true,
      p_custom_message: input.title ?? null,
      p_created_by: req.headers.get('x-user-id'),
    });

    if (error || !data) {
      console.error('[share] create_gallery_share error', error);
      return NextResponse.json(
        { error: 'No se pudo crear el enlace' },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const shareUrl = `${siteUrl}/store-unified/${data.token}`;

    // Adapter shape esperado por PhotoAdmin
    return NextResponse.json({
      success: true,
      shareToken: {
        id: data.id,
        token: data.token,
        title: input.title ?? data.custom_message ?? 'Escaparate',
        created_at: data.created_at,
      },
      links: {
        store: shareUrl,
        gallery: shareUrl,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: err.flatten() },
        { status: 400 }
      );
    }
    console.error('[share] POST unexpected', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
});

// GET /api/admin/share?eventId=...
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ shares: [] });
    }
    const supabase = await createServerSupabaseServiceClient();
    const { data, error } = await supabase
      .from('gallery_shares')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[share] list fallback (table missing or error)', error);
      return NextResponse.json({ shares: [] });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const shares = (data || []).map((row: any) => ({
      id: row.id,
      title: row.custom_message || 'Escaparate',
      share_type: 'gallery',
      created_at: row.created_at,
      expires_at: row.expires_at,
      password_hash: row.password_hash,
      links: { store: `${siteUrl}/store-unified/${row.token}` },
    }));

    return NextResponse.json({ shares });
  } catch (err) {
    console.error('[share] GET unexpected', err);
    return NextResponse.json({ shares: [] });
  }
});

// DELETE /api/admin/share?id=...
export const DELETE = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({}, { status: 204 });

    const supabase = await createServerSupabaseServiceClient();
    const { error } = await supabase
      .from('gallery_shares')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[share] DELETE error', error);
      return NextResponse.json({ error: 'No se pudo desactivar' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[share] DELETE unexpected', err);
    return NextResponse.json({ success: true });
  }
});

