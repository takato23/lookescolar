import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function getStoreToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const eventId = 'c1b522cf-f586-4024-ac96-fc18aa171c2b';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log('🔍 Finding store token for event:', eventId);

    // First check if there's a published folder for this event
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, share_token, is_published')
      .eq('event_id', eventId)
      .eq('is_published', true)
      .not('share_token', 'is', null);

    if (foldersError) {
      console.error('❌ Error finding folders:', foldersError);
      return;
    }

    if (folders && folders.length > 0) {
      console.log('✅ Found published folder with token:');
      folders.forEach(folder => {
        console.log(`  📁 ${folder.name}: ${folder.share_token}`);
        console.log(`     URL: http://localhost:3000/store-unified/${folder.share_token}`);
      });
      return;
    }

    // If no published folders, check if there are any folders at all
    const { data: allFolders, error: allFoldersError } = await supabase
      .from('folders')
      .select('id, name, share_token, is_published')
      .eq('event_id', eventId);

    if (allFoldersError) {
      console.error('❌ Error finding all folders:', allFoldersError);
      return;
    }

    if (allFolders && allFolders.length > 0) {
      console.log('ℹ️  Found folders but none are published:');
      allFolders.forEach(folder => {
        console.log(`  📁 ${folder.name}: ${folder.is_published ? 'published' : 'not published'} (token: ${folder.share_token || 'none'})`);
      });
      console.log('\n💡 Need to publish a folder first to get a store token');
    } else {
      console.log('❌ No folders found for this event');
      console.log('💡 Need to create and publish a folder first');
    }

  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
  }
}

void getStoreToken();
