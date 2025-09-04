#!/usr/bin/env node

/**
 * 🐛 DEBUG API - Probar la resolución de URLs amigables en la API
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// UUID pattern validation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateFriendlySlug(text: string): string {
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

function generateEventIdentifier(event: { name: string; date?: string }): string {
  let slug = generateFriendlySlug(event.name);
  if (!slug) slug = 'evento';
  
  // Add year if available
  if (event.date) {
    const year = new Date(event.date).getFullYear();
    slug = `${slug}-${year}`;
  }
  
  return slug;
}

async function resolveFriendlyEventIdDebug(identifier: string) {
  console.log('🐛 DEBUG: resolveFriendlyEventId called with:', identifier);
  
  // If it's already a UUID, return it
  if (UUID_PATTERN.test(identifier)) {
    console.log('✅ Is UUID, returning:', identifier);
    return identifier;
  }

  console.log('🔍 Not UUID, resolving as friendly identifier...');

  try {
    // Extract year from identifier if present
    const yearMatch = identifier.match(/-(\d{4})$/);
    let searchName = identifier;
    let year: number | null = null;
    
    if (yearMatch) {
      year = parseInt(yearMatch[1]);
      searchName = identifier.replace(/-\d{4}$/, '');
      console.log(`📅 Extracted year: ${year}, searchName: ${searchName}`);
    }

    // Build query
    console.log('🔍 Searching all events...');
    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, date');

    if (error || !events || events.length === 0) {
      console.error('❌ Error or no events found:', error);
      return null;
    }

    console.log(`📋 Found ${events.length} events total`);

    // Find the best match
    for (const event of events) {
      const eventIdentifier = generateEventIdentifier({ name: event.name, date: event.date });
      console.log(`🎯 Event: "${event.name}" → identifier: "${eventIdentifier}"`);
      
      if (eventIdentifier === identifier) {
        console.log(`✅ EXACT MATCH found: ${event.id}`);
        return event.id;
      }
      
      // Also check if the name matches closely
      const eventSlug = generateFriendlySlug(event.name);
      console.log(`   → slug: "${eventSlug}"`);
      
      if (searchName === eventSlug) {
        console.log(`🎯 Slug matches! Checking year...`);
        // If year specified, check it matches
        if (year) {
          const eventYear = event.date ? new Date(event.date).getFullYear() : null;
          console.log(`   → event year: ${eventYear}, looking for: ${year}`);
          if (eventYear === year) {
            console.log(`✅ YEAR MATCH found: ${event.id}`);
            return event.id;
          }
        } else {
          console.log(`✅ SLUG MATCH found (no year): ${event.id}`);
          return event.id;
        }
      }
    }

    console.warn(`❌ No matching event found for: ${identifier}`);
    return null;
  } catch (error) {
    console.error('❌ Error in resolveFriendlyEventId:', error);
    return null;
  }
}

async function debugAPI() {
  console.log('🐛 DEBUGGING API RESOLUTION');
  console.log('='.repeat(40));

  const testId = 'escuela-margarita-negra-2025';
  const result = await resolveFriendlyEventIdDebug(testId);
  
  console.log('\n🎯 RESULT:', result);
}

debugAPI().catch(console.error);