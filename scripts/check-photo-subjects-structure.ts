import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPhotoSubjectsTable() {
  console.log('Checking photo_subjects table structure...');
  
  // Get column names
  const { data, error } = await supabase
    .from('photo_subjects')
    .select('*')
    .limit(1);
    
  if (error) {
    console.log('Error:', error.message);
  } else {
    if (data && data.length > 0) {
      console.log('Photo_subjects table columns:');
      Object.keys(data[0]).forEach(col => console.log('  -', col));
    } else {
      console.log('No data found in photo_subjects table');
      console.log('Photo_subjects table is empty');
    }
  }
  
  // Also check the count
  const { count, countError } = await supabase
    .from('photo_subjects')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.log('Count error:', countError.message);
  } else {
    console.log(`Total photo_subjects rows: ${count}`);
  }
}

checkPhotoSubjectsTable().catch(console.error);