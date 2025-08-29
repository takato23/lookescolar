import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function testFamilyGalleryPerformance() {
  console.log('Testing family gallery performance...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get a valid token
  const { data: tokens } = await supabase
    .from('subject_tokens')
    .select('token, subject_id')
    .limit(1);

  if (!tokens || tokens.length === 0) {
    console.log('No tokens found');
    return;
  }

  const token = tokens[0].token;
  const subjectId = tokens[0].subject_id;

  console.log(`Testing with token: ${token}, subject_id: ${subjectId}`);

  // Test 1: Validate token (simulate familyService.getSubjectByToken)
  console.log('\nTest 1: Validating token...');
  const startTime1 = Date.now();

  const nowIso = new Date().toISOString();
  const { data: tokenRow, error: tokenError } = await supabase
    .from('subject_tokens')
    .select('subject_id, expires_at')
    .eq('token', token)
    .gt('expires_at', nowIso)
    .limit(1)
    .maybeSingle();

  const duration1 = Date.now() - startTime1;
  console.log(`Token validation took ${duration1}ms`);

  if (tokenError || !tokenRow) {
    console.log('Token validation failed');
    return;
  }

  // Test 2: Get subject info
  console.log('\nTest 2: Getting subject info...');
  const startTime2 = Date.now();

  const { data: subjectData, error: subjectError } = await supabase
    .from('subjects')
    .select(`id, event_id, name, created_at, event:events ( id, name, date )`)
    .eq('id', tokenRow.subject_id)
    .single();

  const duration2 = Date.now() - startTime2;
  console.log(`Getting subject info took ${duration2}ms`);

  if (subjectError) {
    console.log('Subject info failed');
    return;
  }

  console.log('Subject:', subjectData);

  // Test 3: Get photo assignments count
  console.log('\nTest 3: Getting photo assignments count...');
  const startTime3 = Date.now();

  const { count: photoCount, error: countError } = await supabase
    .from('photo_subjects')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subjectId);

  const duration3 = Date.now() - startTime3;
  console.log(`Getting photo assignments count took ${duration3}ms`);
  console.log(`Found ${photoCount} photo assignments`);

  if (countError) {
    console.log('Photo count failed');
  }

  // Test 4: Get photo assignments with photo details
  console.log('\nTest 4: Getting photo assignments with photo details...');
  const startTime4 = Date.now();

  const { data: photoAssignments, error: assignmentsError } = await supabase
    .from('photo_subjects')
    .select(
      `
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
    `
    )
    .eq('subject_id', subjectId)
    .order('assigned_at', { ascending: false })
    .limit(10);

  const duration4 = Date.now() - startTime4;
  console.log(`Getting photo assignments with details took ${duration4}ms`);
  console.log(
    `Found ${photoAssignments?.length || 0} photo assignments with details`
  );

  if (assignmentsError) {
    console.log('Photo assignments failed:', assignmentsError);
  }

  // Test 5: Get photos table count
  console.log('\nTest 5: Getting photos table count...');
  const startTime5 = Date.now();

  const { count: photosCount, error: photosCountError } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true });

  const duration5 = Date.now() - startTime5;
  console.log(`Getting photos table count took ${duration5}ms`);
  console.log(`Found ${photosCount} photos in total`);

  if (photosCountError) {
    console.log('Photos count failed:', photosCountError);
  }

  console.log('\n=== Performance Summary ===');
  console.log(`Token validation: ${duration1}ms`);
  console.log(`Subject info: ${duration2}ms`);
  console.log(`Photo assignments count: ${duration3}ms`);
  console.log(`Photo assignments with details: ${duration4}ms`);
  console.log(`Photos table count: ${duration5}ms`);
  console.log(
    `Total time: ${duration1 + duration2 + duration3 + duration4 + duration5}ms`
  );
}

testFamilyGalleryPerformance().catch(console.error);
