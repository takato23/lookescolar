import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkDatabaseSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log('🔍 Checking database schema...\n');

    // Check if store_settings table exists by trying to query it
    try {
      const { data: storeData, error: storeError } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1);

      if (storeError && storeError.code === 'PGRST116') {
        console.log('❌ store_settings table does not exist');
      } else if (storeError) {
        console.log('❌ Error accessing store_settings:', storeError.message);
      } else {
        console.log('✅ store_settings table exists');
        console.log('📊 Sample data:', JSON.stringify(storeData?.[0] || {}, null, 2));
      }
    } catch (error) {
      console.log('❌ store_settings table does not exist');
    }

    // Check what columns store_settings has
    try {
      const { data: storeSettings, error: settingsError } = await supabase
        .from('store_settings')
        .select('event_id, folder_id, enabled, template')
        .eq('event_id', 'c1b522cf-f586-4024-ac96-fc18aa171c2b')
        .single();

      if (settingsError) {
        console.log('❌ Error checking store_settings columns:', settingsError.message);
        if (settingsError.message.includes('folder_id')) {
          console.log('💡 The folder_id column is missing from store_settings table!');
        }
      } else {
        console.log('✅ store_settings record found:', {
          event_id: storeSettings.event_id,
          folder_id: storeSettings.folder_id || 'NULL',
          enabled: storeSettings.enabled,
          template: storeSettings.template
        });
      }
    } catch (error: any) {
      console.log('❌ Error checking store_settings record:', error?.message || error);
    }

    // Check if event exists
    try {
      const eventId = 'c1b522cf-f586-4024-ac96-fc18aa171c2b';
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', eventId)
        .single();

      if (eventError && eventError.code !== 'PGRST116') {
        console.error('❌ Error checking event:', eventError);
      } else if (event) {
        console.log(`✅ Event found: ${event.name} (${event.id})`);
      } else {
        console.log(`❌ Event ${eventId} not found`);
      }
    } catch (error) {
      console.log('❌ events table does not exist or event not found');
    }

    // Try to run the seed script to see what happens
    console.log('\n🔧 Testing seed script...');
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('event_id', 'c1b522cf-f586-4024-ac96-fc18aa171c2b')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('❌ store_settings query error:', error.message);
        if (error.message.includes('folder_id')) {
          console.log('💡 The error mentions folder_id column - this column is missing!');
        }
      } else if (data) {
        console.log('✅ Store settings already exist for this event');
      } else {
        console.log('ℹ️  No store settings found for this event');
      }
    } catch (error: any) {
      console.log('❌ Error testing store_settings:', error?.message || error);
    }

  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
  }
}

void checkDatabaseSchema();
