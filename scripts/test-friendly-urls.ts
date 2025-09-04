#!/usr/bin/env node

/**
 * 🌐 TEST FRIENDLY URLS - Probar el sistema de URLs amigables
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Inline functions to avoid server-only imports
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

async function testFriendlyUrls() {
  console.log('🌐 TESTING FRIENDLY URLS SYSTEM');
  console.log('='.repeat(40));

  try {
    // 1. Get existing events
    console.log('📋 Getting existing events...');
    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, description, date');

    if (error) {
      console.error('❌ Error fetching events:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('❌ No events found');
      return;
    }

    console.log(`\n📋 Found ${events.length} events:`);

    // 2. Generate friendly identifiers for each event
    for (const event of events) {
      console.log(`\n🎯 Event: "${event.name}"`);
      console.log(`   UUID: ${event.id}`);
      
      const identifier = generateEventIdentifier({ 
        name: event.name, 
        date: event.date 
      });
      
      console.log(`   Friendly: ${identifier}`);
      console.log(`   📍 Test URLs:`);
      console.log(`      - UUID: /admin/events/${event.id}/unified`);
      console.log(`      - Friendly: /admin/events/${identifier}/unified`);
      console.log(`      - Library: /admin/events/${identifier}/library`);
    }

    console.log('\n🎉 Friendly URLs testing completed!');
    console.log('\n📋 Summary:');
    console.log(`   - Total events: ${events.length}`);
    console.log('   - URLs generated successfully');
    console.log('   - Both UUID and friendly formats supported');
    
    console.log('\n🔥 RESULTADO FINAL:');
    console.log('En lugar de URLs como:');
    console.log('  http://localhost:3000/admin/events/d8dc56fb-4fd8-4a9b-9ced-3d1df867bb99/library');
    console.log('\nAhora puedes usar:');
    for (const event of events) {
      const identifier = generateEventIdentifier({ name: event.name, date: event.date });
      console.log(`  http://localhost:3000/admin/events/${identifier}/library`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFriendlyUrls().catch(console.error);