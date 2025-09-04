/**
 * 🏷️ SLUG RESOLVER - Utility for resolving event/folder IDs from slugs or UUIDs
 */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// UUID pattern validation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve event ID from slug or UUID
 */
export async function resolveEventId(identifier: string): Promise<string | null> {
  // If it's already a UUID, return it
  if (UUID_PATTERN.test(identifier)) {
    return identifier;
  }

  // It's a slug, resolve to UUID
  try {
    const supabase = await createServerSupabaseServiceClient();
    const { data: event, error } = await supabase
      .from('events')
      .select('id')
      .eq('slug', identifier)
      .single();

    if (error || !event) {
      console.warn(`❌ Event not found for slug: ${identifier}`);
      return null;
    }

    return event.id;
  } catch (error) {
    console.error('Error resolving event slug:', error);
    return null;
  }
}

/**
 * Resolve folder ID from slug or UUID within an event
 */
export async function resolveFolderId(eventId: string, identifier: string): Promise<string | null> {
  // If it's already a UUID, return it
  if (UUID_PATTERN.test(identifier)) {
    return identifier;
  }

  // It's a slug, resolve to UUID
  try {
    const supabase = await createServerSupabaseServiceClient();
    const { data: folder, error } = await supabase
      .from('folders')
      .select('id')
      .eq('event_id', eventId)
      .eq('slug', identifier)
      .single();

    if (error || !folder) {
      console.warn(`❌ Folder not found for slug: ${identifier} in event: ${eventId}`);
      return null;
    }

    return folder.id;
  } catch (error) {
    console.error('Error resolving folder slug:', error);
    return null;
  }
}

/**
 * Generate URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Keep only alphanumeric, spaces, and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .substring(0, 50) // Limit length
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get pretty URL for event (uses slug if available, falls back to UUID)
 */
export async function getEventUrl(eventId: string, path: string = ''): Promise<string> {
  try {
    const supabase = await createServerSupabaseServiceClient();
    const { data: event } = await supabase
      .from('events')
      .select('slug')
      .eq('id', eventId)
      .single();

    const identifier = event?.slug || eventId;
    return `/admin/events/${identifier}${path}`;
  } catch (error) {
    console.error('Error getting event URL:', error);
    return `/admin/events/${eventId}${path}`;
  }
}

/**
 * Check if string is a UUID
 */
export function isUUID(str: string): boolean {
  return UUID_PATTERN.test(str);
}

/**
 * Client-side slug generator (for form previews)
 */
export function previewSlug(text: string): string {
  if (!text) return '';
  
  return generateSlug(text) || 'sin-nombre';
}