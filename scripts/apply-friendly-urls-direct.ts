#!/usr/bin/env node

/**
 * 🔧 FRIENDLY URLS - Direct Application Script
 * 
 * Applies the friendly URLs changes directly without migration framework
 * 
 * Usage:
 *   npx tsx scripts/apply-friendly-urls-direct.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

async function applyFriendlyUrlsDirect() {
  console.log('🔧 FRIENDLY URLS DIRECT APPLICATION');
  console.log('='.repeat(50));

  try {
    // 1. Add slug columns to events table
    console.log('📝 Adding slug column to events...');
    const { error: eventSlugError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;'
    });
    
    if (eventSlugError) {
      console.log('⚠️ Events slug column might already exist or using alternative method...');
    }

    // 2. Add slug column to folders table
    console.log('📝 Adding slug column to folders...');
    const { error: folderSlugError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE folders ADD COLUMN IF NOT EXISTS slug TEXT;'
    });
    
    if (folderSlugError) {
      console.log('⚠️ Folders slug column might already exist or using alternative method...');
    }

    // 3. Generate slugs for existing events
    console.log('📝 Generating slugs for existing events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, school_name, start_date, slug')
      .is('slug', null)
      .limit(10);

    if (!eventsError && events && events.length > 0) {
      for (const event of events) {
        const eventName = event.school_name || event.name || 'evento';
        const year = event.start_date ? new Date(event.start_date).getFullYear() : new Date().getFullYear();
        
        let slug = `${eventName}-${year}`.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
          .substring(0, 50)
          .replace(/-$/, '');

        if (!slug) slug = 'evento';

        // Check for uniqueness and add counter if needed
        let counter = 1;
        let uniqueSlug = slug;
        while (counter < 100) {
          const { data: existing } = await supabase
            .from('events')
            .select('id')
            .eq('slug', uniqueSlug)
            .single();
          
          if (!existing) break;
          
          counter++;
          uniqueSlug = `${slug}-${counter}`;
        }

        const { error: updateError } = await supabase
          .from('events')
          .update({ slug: uniqueSlug })
          .eq('id', event.id);

        if (!updateError) {
          console.log(`✅ Generated slug "${uniqueSlug}" for event: ${event.name}`);
        } else {
          console.warn(`⚠️ Failed to update event ${event.id}:`, updateError.message);
        }
      }
    }

    // 4. Generate slugs for existing folders
    console.log('📝 Generating slugs for existing folders...');
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, slug, parent_id, event_id')
      .is('slug', null)
      .limit(20);

    if (!foldersError && folders && folders.length > 0) {
      for (const folder of folders) {
        const folderName = folder.name || 'carpeta';
        
        let slug = folderName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
          .substring(0, 50)
          .replace(/-$/, '');

        if (!slug) slug = 'carpeta';

        // Check for uniqueness within same parent and event
        let counter = 1;
        let uniqueSlug = slug;
        while (counter < 100) {
          const query = supabase
            .from('folders')
            .select('id')
            .eq('slug', uniqueSlug)
            .eq('event_id', folder.event_id);
          
          if (folder.parent_id) {
            query.eq('parent_id', folder.parent_id);
          } else {
            query.is('parent_id', null);
          }
          
          const { data: existing } = await query.single();
          
          if (!existing) break;
          
          counter++;
          uniqueSlug = `${slug}-${counter}`;
        }

        const { error: updateError } = await supabase
          .from('folders')
          .update({ slug: uniqueSlug })
          .eq('id', folder.id);

        if (!updateError) {
          console.log(`✅ Generated slug "${uniqueSlug}" for folder: ${folder.name}`);
        } else {
          console.warn(`⚠️ Failed to update folder ${folder.id}:`, updateError.message);
        }
      }
    }

    // 5. Verify the changes
    console.log('\n🔍 Verifying changes...');
    
    const { data: eventsWithSlugs } = await supabase
      .from('events')
      .select('id, name, slug')
      .not('slug', 'is', null)
      .limit(3);

    const { data: foldersWithSlugs } = await supabase
      .from('folders')
      .select('id, name, slug')
      .not('slug', 'is', null)
      .limit(3);

    if (eventsWithSlugs && eventsWithSlugs.length > 0) {
      console.log('✅ Events with slugs:');
      eventsWithSlugs.forEach(event => {
        console.log(`  - ${event.name}: ${event.slug}`);
      });
    }

    if (foldersWithSlugs && foldersWithSlugs.length > 0) {
      console.log('✅ Folders with slugs:');
      foldersWithSlugs.forEach(folder => {
        console.log(`  - ${folder.name}: ${folder.slug}`);
      });
    }

    console.log('\n🎉 Friendly URLs setup completed!');
    console.log('📍 Next step: Update routing to support /admin/events/{slug}/library');

  } catch (error) {
    console.error('❌ Failed to apply friendly URLs:', error);
    process.exit(1);
  }
}

// Auto-execute
applyFriendlyUrlsDirect().catch(console.error);