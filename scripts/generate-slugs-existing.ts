#!/usr/bin/env node

/**
 * 🏷️ GENERATE SLUGS - Para eventos existentes
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50)
    .replace(/^-+|-+$/g, '');
}

async function generateSlugsForExistingData() {
  console.log('🏷️ GENERATING SLUGS FOR EXISTING DATA');
  console.log('='.repeat(40));

  try {
    // 1. Get events without slugs
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, description, date')
      .is('slug', null);

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      return;
    }

    console.log(`📋 Found ${events?.length || 0} events without slugs`);

    if (events && events.length > 0) {
      for (const event of events) {
        let slug = generateSlug(event.name);
        if (!slug) slug = 'evento';
        
        // Add year if available
        if (event.date) {
          const year = new Date(event.date).getFullYear();
          slug = `${slug}-${year}`;
        }

        console.log(`🔄 Generating slug for "${event.name}": ${slug}`);

        const { error: updateError } = await supabase
          .from('events')
          .update({ slug })
          .eq('id', event.id);

        if (updateError) {
          console.warn(`⚠️ Failed to update event ${event.id}:`, updateError.message);
        } else {
          console.log(`✅ Updated event: ${event.name} → ${slug}`);
        }
      }
    }

    // 2. Get folders without slugs
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, event_id, parent_id')
      .is('slug', null)
      .limit(10);

    if (foldersError) {
      console.error('❌ Error fetching folders:', foldersError);
      return;
    }

    console.log(`\n📁 Found ${folders?.length || 0} folders without slugs`);

    if (folders && folders.length > 0) {
      for (const folder of folders) {
        let slug = generateSlug(folder.name);
        if (!slug) slug = 'carpeta';

        console.log(`🔄 Generating slug for folder "${folder.name}": ${slug}`);

        const { error: updateError } = await supabase
          .from('folders')
          .update({ slug })
          .eq('id', folder.id);

        if (updateError) {
          console.warn(`⚠️ Failed to update folder ${folder.id}:`, updateError.message);
        } else {
          console.log(`✅ Updated folder: ${folder.name} → ${slug}`);
        }
      }
    }

    // 3. Verify results
    console.log('\n🔍 VERIFICATION');
    console.log('='.repeat(20));

    const { data: updatedEvents } = await supabase
      .from('events')
      .select('id, name, slug')
      .not('slug', 'is', null);

    if (updatedEvents && updatedEvents.length > 0) {
      console.log('✅ Events with slugs:');
      updatedEvents.forEach(event => {
        console.log(`  📅 ${event.name} → /admin/events/${event.slug}`);
      });
    }

    console.log('\n🎉 Slug generation completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generateSlugsForExistingData().catch(console.error);