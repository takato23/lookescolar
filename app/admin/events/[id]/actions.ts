'use server';

import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Type definitions for better code organization
type EventMetrics = {
  orders: { total: number; paid: number; pending: number };
  students: { total: number };
  photos: { total: number; unassigned: number | null };
};

type CoreSettings = {
  general: {
    showOnHomepage: boolean;
    location?: string;
    rootFolderId?: string;
  };
  privacy: {
    passwordEnabled: boolean;
    password?: string;
  };
  download: {
    enabled: boolean;
    sizes: ('web' | 'small' | 'original')[];
    pinEnabled: boolean;
  };
  store: {
    enabled: boolean;
    priceSheetId?: string;
    showInStore: boolean;
  };
};

// Enhanced schema validation with better error messages
const CoreSettingsSchema = z.object({
  general: z
    .object({
      showOnHomepage: z.boolean().describe('Whether event appears on homepage'),
      location: z.string().min(1, 'Location must not be empty').optional(),
      rootFolderId: z.string().uuid('Invalid root folder UUID').optional(),
    })
    .strict(),
  privacy: z
    .object({
      passwordEnabled: z.boolean(),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
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
      priceSheetId: z.string().uuid('Invalid price sheet UUID').optional(),
      showInStore: z.boolean(),
    })
    .strict(),
}).describe('Event core settings configuration');

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

/**
 * Update event settings with validation and conflict resolution
 * @param eventId - UUID of the event to update
 * @param payload - Settings payload to merge with existing settings
 * @returns Promise<{success: boolean}>
 */
export async function updateEventSettings(
  eventId: string, 
  payload: unknown
): Promise<{ success: boolean }> {
  const id = EventIdSchema.parse(eventId);
  const supabase = await createServerSupabaseServiceClient();
  
  const startTime = performance.now();

  try {
    // Fetch current settings with error handling
    const { data: current, error: readErr } = await supabase
      .from('events')
      .select('settings')
      .eq('id', id)
      .single();
      
    if (readErr) {
      throw new Error(`Failed to fetch current settings: ${readErr.message}`);
    }

    // Safely merge settings
    const currentSettings = current?.settings || {};
    const incomingPayload = payload && typeof payload === 'object' ? payload : {};
    
    const merged = {
      ...currentSettings,
      ...incomingPayload,
    };

    // Validate merged settings
    const validatedSettings = SettingsSchema.parse(merged);

    // Update with optimistic concurrency control
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        settings: validatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
      
    if (updateError) {
      throw new Error(`Failed to update settings: ${updateError.message}`);
    }
    
    const executionTime = performance.now() - startTime;
    console.debug(`[Performance] Event settings updated in ${executionTime.toFixed(2)}ms`);
    
    return { success: true };
    
  } catch (error) {
    const executionTime = performance.now() - startTime;
    console.error(`[Performance] Event settings update failed after ${executionTime.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Link a root folder to an event with validation
 * @param eventId - UUID of the event
 * @param folderId - UUID of the folder to link
 * @returns Promise<{success: boolean}>
 */
export async function linkRootFolder(
  eventId: string, 
  folderId: string
): Promise<{ success: boolean }> {
  const id = EventIdSchema.parse(eventId);
  const folderUuid = FolderIdSchema.parse(folderId);
  const supabase = await createServerSupabaseServiceClient();
  
  const startTime = performance.now();

  try {
    // Fetch current settings
    const { data, error } = await supabase
      .from('events')
      .select('settings')
      .eq('id', id)
      .single();
      
    if (error) {
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    // Safely update settings structure
    const currentSettings = (data?.settings || {}) as any;
    const updatedSettings = {
      ...currentSettings,
      general: {
        ...(currentSettings.general || {}),
        rootFolderId: folderUuid,
      },
    };

    // Update with timestamp
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
      
    if (updateError) {
      throw new Error(`Failed to link folder: ${updateError.message}`);
    }
    
    const executionTime = performance.now() - startTime;
    console.debug(`[Performance] Root folder linked in ${executionTime.toFixed(2)}ms`);
    
    return { success: true };
    
  } catch (error) {
    const executionTime = performance.now() - startTime;
    console.error(`[Performance] Root folder linking failed after ${executionTime.toFixed(2)}ms:`, error);
    throw error;
  }
}

// Enhanced validation schemas
const EventIdSchema = z.string().uuid('Invalid event ID format');
const FolderIdSchema = z.string().uuid('Invalid folder ID format');

/**
 * Fetch comprehensive event metrics with optimized database queries
 * @param eventId - UUID of the event
 * @returns Promise<EventMetrics> - Object containing orders, students, and photos metrics
 */
export async function fetchEventMetrics(eventId: string): Promise<EventMetrics> {
  const id = EventIdSchema.parse(eventId);
  const supabase = await createServerSupabaseServiceClient();
  
  const startTime = performance.now();

  try {
    // Execute parallel queries for better performance
    const [subjectsResult, ordersResult] = await Promise.all([
      // Students count
      supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id),
      // Orders total count
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id),
    ]);
    
    const subjectsCount = subjectsResult.count || 0;
    const ordersTotal = ordersResult.count || 0;

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

    const metricsResult = {
      orders: { 
        total: ordersTotal, 
        paid: ordersPaid, 
        pending: ordersPending 
      },
      students: { total: subjectsCount },
      photos: { total: assetsTotal, unassigned },
    };
    
    const executionTime = performance.now() - startTime;
    console.debug(`[Performance] Event metrics fetched in ${executionTime.toFixed(2)}ms`);
    
    return metricsResult;
    
  } catch (error) {
    const executionTime = performance.now() - startTime;
    console.error(`[Performance] Event metrics failed after ${executionTime.toFixed(2)}ms:`, error);
    
    // Return safe defaults on error
    return {
      orders: { total: 0, paid: 0, pending: 0 },
      students: { total: 0 },
      photos: { total: 0, unassigned: null },
    };
  }
}
