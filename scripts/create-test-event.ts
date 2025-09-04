#!/usr/bin/env node

/**
 * 🏫 CREATE TEST EVENT - Para probar el sistema de slugs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestEvent() {
  console.log('🏫 CREATING TEST EVENT');
  console.log('='.repeat(30));

  try {
    // Create test event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Graduación Primaria',
        description: 'Ceremonia de graduación de sexto grado', 
        location: 'Salón de actos',
        date: '2024-12-15',
        status: 'active',
        public_gallery_enabled: true
      })
      .select()
      .single();

    if (eventError) {
      console.error('❌ Error creating event:', eventError);
      return;
    }

    console.log('✅ Event created:', event.name);
    console.log('📋 Event ID:', event.id);
    console.log('🏷️ Event slug:', event.slug);

    // Create test folder structure
    console.log('\n📁 Creating folder structure...');

    // Level 1: Grado
    const { data: gradeFolder, error: gradeFolderError } = await supabase
      .from('folders')
      .insert({
        name: 'Sexto Grado A',
        event_id: event.id,
        depth: 1,
        parent_id: null
      })
      .select()
      .single();

    if (gradeFolderError) {
      console.error('❌ Error creating grade folder:', gradeFolderError);
      return;
    }

    console.log('✅ Grade folder created:', gradeFolder.name);
    console.log('🏷️ Grade folder slug:', gradeFolder.slug);

    // Level 2: Familia de ejemplo
    const { data: familyFolder, error: familyFolderError } = await supabase
      .from('folders')
      .insert({
        name: 'Familia González',
        event_id: event.id,
        parent_id: gradeFolder.id,
        depth: 2
      })
      .select()
      .single();

    if (familyFolderError) {
      console.error('❌ Error creating family folder:', familyFolderError);
      return;
    }

    console.log('✅ Family folder created:', familyFolder.name);
    console.log('🏷️ Family folder slug:', familyFolder.slug);

    console.log('\n🎉 Test event and folders created successfully!');
    console.log('📍 You can now test URLs:');
    console.log(`   - UUID: /admin/events/${event.id}/library`);
    console.log(`   - Slug: /admin/events/${event.slug}/library`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestEvent().catch(console.error);