/**
 * 🌐 FRIENDLY URLS - Sistema de URLs amigables sin base de datos
 * 
 * Genera URLs amigables basándose en los nombres de eventos existentes
 * y permite navegación tanto por UUID como por nombre-año
 */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type EventRow = Pick<
  Database['public']['Tables']['events']['Row'],
  'id' | 'name' | 'date'
>;

// UUID pattern validation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Generate URL-friendly slug from text
 */
export function generateFriendlySlug(text: string): string {
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
 * Generate friendly URL identifier for event
 */
export function generateEventIdentifier(event: { name: string; date?: string }): string {
  let slug = generateFriendlySlug(event.name);
  if (!slug) slug = 'evento';
  
  // Add year if available
  if (event.date) {
    const year = new Date(event.date).getFullYear();
    slug = `${slug}-${year}`;
  }
  
  return slug;
}

/**
 * Resolve event identifier to UUID (works with both UUIDs and friendly names)
 */
export async function resolveFriendlyEventId(identifier: string): Promise<string | null> {
  // If it's already a UUID, return it
  if (UUID_PATTERN.test(identifier)) {
    return identifier;
  }

  // It's a friendly identifier, resolve to UUID
  try {
    const supabase = await createServerSupabaseServiceClient();
    
    // Extract year from identifier if present
    const yearMatch = identifier.match(/-(\d{4})$/);
    let searchName = identifier;
    let year: number | null = null;

    if (yearMatch) {
      year = Number.parseInt(yearMatch[1], 10);
      searchName = identifier.replace(/-\d{4}$/, '');
    }

    const normalizedSearchName = searchName.trim();
    const searchVariants = Array.from(
      new Set(
        [
          normalizedSearchName,
          normalizedSearchName.replace(/-/g, ' '),
          normalizedSearchName.replace(/escuela-/g, ''),
          normalizedSearchName.replace(/-escuela/g, ''),
        ]
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );

    let query = supabase
      .from('events')
      .select('id, name, date')
      .limit(50);

    if (year !== null) {
      const from = `${year}-01-01`;
      const to = `${year + 1}-01-01`;
      query = query.gte('date', from).lt('date', to);
    }

    if (searchVariants.length > 0) {
      const orClause = searchVariants
        .map((value) => {
          const pattern = value.replace(/[-\s]+/g, '%');
          return `name.ilike.%${pattern}%`;
        })
        .join(',');

      if (orClause.length > 0) {
        query = query.or(orClause);
      }
    }

    const { data: events, error } = await query.returns<EventRow[]>();

    if (error || !events || events.length === 0) {
      console.warn(`❌ No events found for identifier: ${identifier}`);
      return null;
    }

    // Find the best match
    for (const event of events) {
      const eventIdentifier = generateEventIdentifier({
        name: event.name,
        date: event.date ?? undefined,
      });
      
      if (eventIdentifier === identifier) {
        return event.id;
      }
      
      // Also check if the name matches closely
      const eventSlug = generateFriendlySlug(event.name);
      if (searchName === eventSlug) {
        // If year specified, check it matches
        if (year) {
          const eventYear = event.date ? new Date(event.date).getFullYear() : null;
          if (eventYear === year) {
            return event.id;
          }
        } else {
          return event.id;
        }
      }
    }

    // Fallback: try partial matches
    for (const event of events) {
      const eventSlug = generateFriendlySlug(event.name);
      if (eventSlug.includes(searchName) || searchName.includes(eventSlug)) {
        return event.id;
      }
    }

    console.warn(`❌ No matching event found for: ${identifier}`);
    return null;
  } catch (error) {
    console.error('Error resolving friendly event ID:', error);
    return null;
  }
}

/**
 * Get friendly URL for an event
 */
export async function getFriendlyEventUrl(eventId: string, path: string = ''): Promise<string> {
  try {
    const supabase = await createServerSupabaseServiceClient();
    type EventSummary = Pick<EventRow, 'name' | 'date'>;

    const { data: event } = await supabase
      .from('events')
      .select('name, date')
      .eq('id', eventId)
      .returns<EventSummary>()
      .single();

    if (event) {
      const identifier = generateEventIdentifier({
        name: event.name,
        date: event.date ?? undefined,
      });
      return `/admin/events/${identifier}${path}`;
    }
  } catch (error) {
    console.error('Error getting friendly event URL:', error);
  }
  
  // Fallback to UUID
  return `/admin/events/${eventId}${path}`;
}

/**
 * Check if string is a UUID
 */
export function isUUID(str: string): boolean {
  return UUID_PATTERN.test(str);
}

/**
 * Client-side friendly identifier generator (for form previews)
 */
export function previewFriendlyIdentifier(name: string, date?: string): string {
  if (!name) return '';
  
  const event = { name, date };
  return generateEventIdentifier(event) || 'sin-nombre';
}

/**
 * Extract readable name from friendly identifier
 */
export function extractNameFromIdentifier(identifier: string): string {
  if (isUUID(identifier)) {
    return identifier.slice(0, 8) + '...'; // Show first 8 chars of UUID
  }
  
  // Remove year and convert back to readable format
  return identifier
    .replace(/-\d{4}$/, '') // Remove year
    .replace(/-/g, ' ') // Replace hyphens with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Title case
}
