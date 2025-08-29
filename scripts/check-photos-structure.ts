import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPhotosTable() {
  console.log('Checking photos table structure...');

  // Get column names
  const { data, error } = await supabase.from('photos').select('*').limit(1);

  if (error) {
    console.log('Error:', error.message);
  } else {
    if (data && data.length > 0) {
      console.log('Photos table columns:');
      Object.keys(data[0]).forEach((col) => console.log('  -', col));
    } else {
      console.log('No data found in photos table');
    }
  }
}

checkPhotosTable().catch(console.error);
