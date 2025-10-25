'use server';

import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/database';

const EventIdSchema = z.string().uuid('Invalid event ID format');
const FolderIdSchema = z.string().uuid('Invalid folder ID format');

const CoreSettingsSchema = z
  .object({
    general: z
      .object({
        showOnHomepage: z.boolean().optional(),
        location: z.string().optional(),
        rootFolderId: z.string().uuid('Invalid root folder UUID').optional(),
      })
      .passthrough()
      .optional(),
    privacy: z
      .object({
        passwordEnabled: z.boolean().optional(),
        password: z.string().min(6, 'Password must be at least 6 characters').optional(),
      })
      .passthrough()
      .optional(),
    download: z
      .object({
        enabled: z.boolean().optional(),
        sizes: z.array(z.enum(['web', 'small', 'original'])).optional(),
        pinEnabled: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    store: z
      .object({
        enabled: z.boolean().optional(),
        priceSheetId: z.string().uuid('Invalid price sheet UUID').optional(),
        showInStore: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const DesignSchema = z
  .object({
    cover: z
      .object({
        style: z.enum(['novel', 'vintage', 'frame', 'stripe', 'divider', 'journal', 'classic', 'none']).optional(),
      })
      .passthrough()
      .optional(),
    typography: z
      .object({ preset: z.enum(['sans', 'serif', 'modern', 'timeless', 'bold', 'subtle']).optional() })
      .passthrough()
      .optional(),
    color: z
      .object({ scheme: z.enum(['light', 'gold', 'rose', 'terracotta', 'sand', 'olive', 'agave', 'sea', 'dark']).optional() })
      .passthrough()
      .optional(),
    grid: z
      .object({
        style: z.enum(['vertical', 'horizontal']).optional(),
        thumb: z.enum(['regular', 'large']).optional(),
        spacing: z.enum(['regular', 'large']).optional(),
        nav: z.enum(['icons', 'icons_text']).optional(),
      })
      .passthrough()
      .optional(),
    theme: z.enum(['default', 'jardin', 'secundaria', 'bautismo']).optional(),
  })
  .partial()
  .passthrough();

const SettingsSchema = CoreSettingsSchema.extend({
  design: DesignSchema.optional(),
});

export type EventSettings = z.infer<typeof SettingsSchema>;

type EventMetrics = {
  orders: { total: number; paid: number; pending: number };
  students: { total: number };
  photos: { total: number; unassigned: number | null };
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function mergeSettings(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>
): EventSettings {
  const merged: Record<string, unknown> = {
    ...current,
    ...incoming,
  };

  if ('general' in current || 'general' in incoming) {
    merged.general = {
      ...toRecord((current as Record<string, unknown>).general),
      ...toRecord((incoming as Record<string, unknown>).general),
    };
  }

  if ('privacy' in current || 'privacy' in incoming) {
    merged.privacy = {
      ...toRecord((current as Record<string, unknown>).privacy),
      ...toRecord((incoming as Record<string, unknown>).privacy),
    };
  }

  if ('download' in current || 'download' in incoming) {
    merged.download = {
      ...toRecord((current as Record<string, unknown>).download),
      ...toRecord((incoming as Record<string, unknown>).download),
    };
  }

  if ('store' in current || 'store' in incoming) {
    merged.store = {
      ...toRecord((current as Record<string, unknown>).store),
      ...toRecord((incoming as Record<string, unknown>).store),
    };
  }

  if ('design' in current || 'design' in incoming) {
    merged.design = {
      ...toRecord((current as Record<string, unknown>).design),
      ...toRecord((incoming as Record<string, unknown>).design),
    };
  }

  return SettingsSchema.parse(merged);
}

export async function updateEventSettings(eventId: string, payload: unknown): Promise<{ success: boolean }> {
  const id = EventIdSchema.parse(eventId);
  const supabase = await createServerSupabaseServiceClient();

  const { data: current, error: readError } = await supabase
    .from('events')
    .select('settings')
    .eq('id', id)
    .single<Pick<Database['public']['Tables']['events']['Row'], 'settings'>>();

  if (readError) {
    throw new Error(`Failed to fetch current settings: ${readError.message}`);
  }

  const currentSettings = toRecord(current?.settings);
  const incomingSettings = toRecord(payload);
  const validatedSettings = mergeSettings(currentSettings, incomingSettings);

  const updatePayload: Database['public']['Tables']['events']['Update'] = {
    settings: validatedSettings as unknown as Json,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase.from('events').update(updatePayload).eq('id', id);

  if (updateError) {
    throw new Error(`Failed to update settings: ${updateError.message}`);
  }

  return { success: true };
}

export async function linkRootFolder(eventId: string, folderId: string): Promise<{ success: boolean }> {
  const id = EventIdSchema.parse(eventId);
  const folderUuid = FolderIdSchema.parse(folderId);
  const supabase = await createServerSupabaseServiceClient();

  const { data, error } = await supabase
    .from('events')
    .select('settings')
    .eq('id', id)
    .single<Pick<Database['public']['Tables']['events']['Row'], 'settings'>>();

  if (error) {
    throw new Error(`Failed to fetch event: ${error.message}`);
  }

  const currentSettings = toRecord(data?.settings);
  const updatedSettings = mergeSettings(currentSettings, {
    general: {
      ...toRecord(currentSettings.general),
      rootFolderId: folderUuid,
    },
  });

  const updatePayload: Database['public']['Tables']['events']['Update'] = {
    settings: updatedSettings as unknown as Json,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase.from('events').update(updatePayload).eq('id', id);

  if (updateError) {
    throw new Error(`Failed to link folder: ${updateError.message}`);
  }

  return { success: true };
}

export async function fetchEventMetrics(eventId: string): Promise<EventMetrics> {
  const id = EventIdSchema.parse(eventId);
  const supabase = await createServerSupabaseServiceClient();

  try {
    const [subjectsResult, ordersResult] = await Promise.all([
      supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('event_id', id),
    ]);

    if (subjectsResult.error) {
      throw subjectsResult.error;
    }
    if (ordersResult.error) {
      throw ordersResult.error;
    }

    const paidStatuses = ['paid', 'approved', 'delivered'];
    const [paidResult, pendingResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', id)
        .in('status', paidStatuses),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', id)
        .eq('status', 'pending'),
    ]);

    const ordersTotal = ordersResult.count ?? 0;
    const ordersPaid = paidResult.error ? 0 : paidResult.count ?? 0;
    const ordersPending = pendingResult.error ? 0 : pendingResult.count ?? 0;
    const studentsTotal = subjectsResult.count ?? 0;

    let assetsTotal = 0;
    let unassigned: number | null = null;

    const { data: folders, error: folderError } = await supabase.from('folders').select('id').eq('event_id', id);

    if (!folderError && folders && folders.length > 0) {
      const folderIds = folders.map((folder) => String(folder.id));
      const { count: assetsCount, error: assetsError } = await supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .in('folder_id', folderIds);

      if (!assetsError && typeof assetsCount === 'number') {
        assetsTotal = assetsCount;
      }
    }

    return {
      orders: { total: ordersTotal, paid: ordersPaid, pending: ordersPending },
      students: { total: studentsTotal },
      photos: { total: assetsTotal, unassigned },
    };
  } catch (error) {
    console.error('[Events] fetchEventMetrics failed', error);
    return {
      orders: { total: 0, paid: 0, pending: 0 },
      students: { total: 0 },
      photos: { total: 0, unassigned: null },
    };
  }
}
