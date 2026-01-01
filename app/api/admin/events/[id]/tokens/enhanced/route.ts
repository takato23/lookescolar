import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { RouteContext } from '@/types/next-route';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';
import { z } from 'zod';
import crypto from 'crypto';

/**
 * Endpoint legado: "enhanced tokens".
 *
 * El esquema actual de LookEscolar usa principalmente:
 * - `folders.share_token` (links cortos para tiendas publicadas)
 * - `share_tokens` (tokens largos 64 chars)
 *
 * Este handler implementa una versión compatible para que la Centralita pueda:
 * - listar links publicados
 * - rotarlos (regenerar `folders.share_token`)
 */

const RotationSchema = z
  .object({
    rotation_reason: z.string().optional(),
    notify_families: z.boolean().optional(),
    force_rotation: z.boolean().optional(),
    days_before_expiry: z.number().optional(),
  })
  .passthrough();

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const requestId = generateRequestId();

    if (!isValidUUID(eventId)) {
      return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, date, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, path, share_token, is_published, photo_count, updated_at')
      .eq('event_id', eventId)
      .order('updated_at', { ascending: false });

    if (foldersError) {
      return NextResponse.json(
        { error: 'Error obteniendo carpetas publicadas' },
        { status: 500 }
      );
    }

    const published = (folders ?? []).filter((f) => f.is_published);

    SecurityLogger.logSecurityEvent(
      'folder_share_tokens_listed',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        totalFolders: folders?.length ?? 0,
        publishedFolders: published.length,
      },
      'info'
    );

    return NextResponse.json({
      success: true,
      event,
      folders: (folders ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        is_published: f.is_published,
        share_token: f.share_token,
        photo_count: f.photo_count,
        updated_at: f.updated_at,
      })),
      stats: {
        total: folders?.length ?? 0,
        published: published.length,
      },
    });
  } catch (error) {
    console.error('Enhanced tokens (folders) GET error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const requestId = generateRequestId();

    if (!isValidUUID(eventId)) {
      return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = RotationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Rotate only published folders with an existing share_token
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, share_token, is_published')
      .eq('event_id', eventId)
      .eq('is_published', true)
      .not('share_token', 'is', null);

    if (foldersError) {
      console.error(`[${requestId}] Error fetching folders to rotate`, foldersError);
      return NextResponse.json(
        { error: 'Error obteniendo carpetas para rotación' },
        { status: 500 }
      );
    }

    let rotated = 0;
    const rotatedFolders: Array<{ id: string; name: string; share_token: string }> = [];

    for (const folder of folders ?? []) {
      // Generate unique 16-char hex token (8 bytes)
      let attempts = 0;
      while (attempts < 5) {
        attempts += 1;
        const nextToken = crypto.randomBytes(8).toString('hex');

        const { error: updateError } = await supabase
          .from('folders')
          .update({ share_token: nextToken, updated_at: new Date().toISOString() } as any)
          .eq('id', folder.id);

        if (!updateError) {
          rotated += 1;
          rotatedFolders.push({ id: folder.id, name: folder.name, share_token: nextToken });
          break;
        }

        // Unique violation -> retry
        if ((updateError as any)?.code === '23505') {
          continue;
        }

        console.error(`[${requestId}] Rotation update failed`, updateError);
        return NextResponse.json(
          { error: 'Error rotando enlaces' },
          { status: 500 }
        );
      }
    }

    SecurityLogger.logSecurityEvent(
      'folder_share_tokens_rotated',
      {
        requestId,
        eventId: `${eventId.substring(0, 8)}***`,
        rotated,
        reason: parsed.data.rotation_reason,
      },
      'info'
    );

    return NextResponse.json({
      success: true,
      tokens_rotated: rotated,
      folders_rotated: rotatedFolders,
    });
  } catch (error) {
    console.error('Enhanced tokens (folders) PUT error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
