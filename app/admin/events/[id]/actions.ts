'use server';

import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Core settings (existing)
const CoreSettingsSchema = z.object({
  general: z
    .object({
      showOnHomepage: z.boolean(),
      location: z.string().optional(),
      rootFolderId: z.string().uuid().optional(),
    })
    .strict(),
  privacy: z
    .object({
      passwordEnabled: z.boolean(),
      password: z.string().optional(),
    })
    .strict(),
  download: z
    .object({
      enabled: z.boolean(),
      sizes: z.array(z.enum(['web', 'small', 'original'])).default([]),
      pinEnabled: z.boolean(),
    })
    .strict(),
  store: z
    .object({
      enabled: z.boolean(),
      priceSheetId: z.string().optional(),
      showInStore: z.boolean(),
    })
    .strict(),
});

// Optional design block (Pixieset-like)
const DesignSchema = z
  .object({
    cover: z.object({
      style: z.enum([
        'novel',
        'vintage',
        'frame',
        'stripe',
        'divider',
        'journal',
        'classic',
        'none',
      ]),
    }),
    typography: z.object({ preset: z.enum(['sans', 'serif', 'modern', 'timeless', 'bold', 'subtle']) }),
    color: z.object({ scheme: z.enum(['light', 'gold', 'rose', 'terracotta', 'sand', 'olive', 'agave', 'sea', 'dark']) }),
    grid: z.object({
      style: z.enum(['vertical', 'horizontal']),
      thumb: z.enum(['regular', 'large']),
      spacing: z.enum(['regular', 'large']),
      nav: z.enum(['icons', 'icons_text']),
    }),
    theme: z.enum(['default', 'jardin', 'secundaria', 'bautismo']).optional(),
  })
  .strict()
  .optional();

// Full schema allows optional design
const SettingsSchema = CoreSettingsSchema.extend({ design: z.any().optional() });

export type EventSettings = z.infer<typeof CoreSettingsSchema> & { design?: z.infer<typeof DesignSchema> };

export async function updateEventSettings(eventId: string, payload: unknown) {
  const supabase = await createServerSupabaseServiceClient();

  // Fetch current settings to allow partial updates
  const { data: current, error: readErr } = await supabase
    .from('events')
    .select('settings')
    .eq('id', eventId)
    .single();
  if (readErr) throw new Error(readErr.message);

  const incoming: any = payload;
  const merged = {
    ...(current?.settings || {}),
    ...(incoming || {}),
  };

  // Validate core blocks; accept any shape for design to keep UI flexible
  const parsed = SettingsSchema.parse(merged);

  const { error } = await supabase
    .from('events')
    .update({ settings: parsed as any })
    .eq('id', eventId);
  if (error) throw new Error(error.message);
  return { success: true } as const;
}

export async function linkRootFolder(eventId: string, folderId: string) {
  const supabase = await createServerSupabaseServiceClient();
  const { data, error } = await supabase
    .from('events')
    .select('settings')
    .eq('id', eventId)
    .single();
  if (error) throw new Error(error.message);
  const settings = (data?.settings ?? {}) as any;
  settings.general = { ...(settings.general || {}), rootFolderId: folderId };
  const { error: upErr } = await supabase
    .from('events')
    .update({ settings })
    .eq('id', eventId);
  if (upErr) throw new Error(upErr.message);
  return { success: true } as const;
}

const IdSchema = z.string().uuid('eventId inválido');

export async function fetchEventMetrics(eventId: string) {
  const id = IdSchema.parse(eventId);
  const supabase = await createServerSupabaseServiceClient();

  // Students count
  const { count: subjectsCount } = await supabase
    .from('subjects')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id);

  // Orders counts (robusto con distintos estados)
  const { count: ordersTotal } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id);

  // Paid/Approved
  let ordersPaid = 0;
  try {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .in('status' as any, ['paid', 'approved', 'delivered']);
    ordersPaid = count || 0;
  } catch {
    // Fallback si .in no disponible: contar approved
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'approved');
    ordersPaid = count || 0;
  }

  // Pending
  const { count: ordersPending } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'pending');

  // Photos: folders -> assets
  let folderIds: string[] = [];
  try {
    const { data: folders } = await supabase
      .from('folders')
      .select('id')
      .eq('event_id', id);
    folderIds = (folders || []).map((f: any) => f.id);
  } catch (e: any) {
    // Esquema legacy sin event_id en folders
    folderIds = [];
  }

  let assetsTotal = 0;
  if (folderIds.length > 0) {
    const { count } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .in('folder_id', folderIds);
    assetsTotal = count || 0;
  } else {
    assetsTotal = 0; // sin carpetas asociadas
  }

  // Unassigned: depende del esquema de photo_subjects. Si no está claro, dejar null.
  let unassigned: number | null = null;
  try {
    if (folderIds.length > 0) {
      // Intento rápido: contar asignaciones por photo_id y estimar no asignadas = total - asignadas_distintas
      // Nota: PostgREST no soporta distinct count directo; en fase 2 migramos a RPC.
      const { data: sampleAssets } = await supabase
        .from('assets')
        .select('id')
        .in('folder_id', folderIds)
        .limit(1000);
      const ids = (sampleAssets || []).map((a: any) => a.id);
      if (ids.length > 0) {
        await supabase
          .from('photo_subjects' as any)
          .select('photo_id', { count: 'exact', head: true })
          .in('photo_id' as any, ids);
        // Esto no es distinct; dejamos null para no reportar dato impreciso
        unassigned = null;
      }
    }
  } catch {
    unassigned = null;
  }

  return {
    orders: { total: ordersTotal || 0, paid: ordersPaid || 0, pending: ordersPending || 0 },
    students: { total: subjectsCount || 0 },
    photos: { total: assetsTotal || 0, unassigned },
  } as const;
}
