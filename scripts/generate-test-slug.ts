#!/usr/bin/env node

/**
 * 🏷️ GENERATE TEST SLUG - Para el evento existente
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateTestSlug() {
  console.log('🏷️ GENERATING TEST SLUG');
  console.log('='.repeat(30));

  try {
    // 1. First, let's try to add the slug column directly via raw SQL
    console.log('📝 Adding slug column to events table...');
    
    const { error: alterError } = await supabase
      .from('events')
      .select('*')
      .limit(1);
      
    if (alterError) {
      console.error('Query test failed:', alterError);
      return;
    }

    // 2. Get existing events
    console.log('📋 Getting existing events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, description, date');

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      return;
    }

    console.log(`📋 Found ${events?.length || 0} events`);

    if (events && events.length > 0) {
      for (const event of events) {
        // Generate a simple slug
        const eventName = event.name || event.description || 'evento';
        const year = event.date ? new Date(event.date).getFullYear() : new Date().getFullYear();
        let slug = `${eventName}-${year}`.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
          .substring(0, 50);

        if (!slug) slug = 'evento';

        console.log(`🔄 Event: "${event.name}" → trying to set slug: "${slug}"`);

        // Try to update manually using raw update
        try {
          // Use the update endpoint instead of direct SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/events?id=eq.${event.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ slug })
          });

          if (response.ok) {
            console.log(`✅ Successfully set slug for "${event.name}": ${slug}`);
            
            // Test URL generation
            console.log(`📍 URLs:`);
            console.log(`   - UUID: /admin/events/${event.id}/unified`);
            console.log(`   - Slug: /admin/events/${slug}/unified`);
            console.log(`   - Library: /admin/events/${slug}/library`);
          } else {
            const errorText = await response.text();
            console.log(`⚠️ HTTP error updating event ${event.id}:`, response.status, errorText);
          }
        } catch (updateError) {
          console.warn(`⚠️ Failed to update event ${event.id}:`, updateError);
        }
      }
    }

    console.log('\n🎉 Test slug generation completed!');
    console.log('📍 Next: Test the URLs in your browser');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generateTestSlug().catch(console.error);