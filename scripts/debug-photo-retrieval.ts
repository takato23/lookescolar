import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugPhotoRetrieval() {
  console.log('🔍 Debugging photo retrieval...\n');
  
  // Get a valid token and subject
  const { data: tokens } = await supabase
    .from('subject_tokens')
    .select('token, subject_id')
    .limit(1);
  
  if (!tokens || tokens.length === 0) {
    console.log('❌ No tokens found');
    return;
  }
  
  const token = tokens[0].token;
  const subjectId = tokens[0].subject_id;
  
  console.log(`Using token: ${token}`);
  console.log(`Subject ID: ${subjectId}\n`);
  
  // Test 1: Try to get individual photos using photo_subjects table
  console.log('Test 1: Getting individual photos from photo_subjects...');
  const { data: photoSubjects, error: psError } = await supabase
    .from('photo_subjects')
    .select(`
      id,
      photo_id,
      subject_id,
      assigned_at,
      photo:photos (
        id,
        event_id,
        filename,
        storage_path,
        preview_path,
        watermark_path,
        created_at,
        photo_type,
        approved
      )
    `)
    .eq('subject_id', subjectId)
    .order('assigned_at', { ascending: false })
    .limit(5);
  
  if (psError) {
    console.log(`❌ Error: ${psError.message}`);
  } else {
    console.log(`✅ Found ${photoSubjects?.length || 0} photo assignments`);
    if (photoSubjects && photoSubjects.length > 0) {
      console.log('Sample photo assignment:', photoSubjects[0]);
    }
  }
  
  // Test 2: Check if photos exist in the photos table
  console.log('\nTest 2: Checking photos table...');
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('id, filename, approved')
    .limit(5);
  
  if (photosError) {
    console.log(`❌ Error: ${photosError.message}`);
  } else {
    console.log(`✅ Found ${photos?.length || 0} photos in photos table`);
    if (photos && photos.length > 0) {
      console.log('Sample photos:', photos);
    }
  }
  
  // Test 3: Try direct photo_subjects count
  console.log('\nTest 3: Counting photo_subjects...');
  const { count: psCount, error: countError } = await supabase
    .from('photo_subjects')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.log(`❌ Error: ${countError.message}`);
  } else {
    console.log(`📊 Total photo_subjects: ${psCount}`);
  }
  
  console.log('\n✅ Debug completed');
}

debugPhotoRetrieval().catch(console.error);