const { createClient } = require('@supabase/supabase-js');

async function testFamilyGalleryPerformance() {
  console.log('Testing family gallery performance...');
  
  // Using the service role key for full access
  const supabase = createClient(
    'https://exaighpowgvbdappydyx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2Nzk5MSwiZXhwIjoyMDY5OTQzOTkxfQ.gpH0Jd2fQliSMknPicdXEx9Em54o4WxKfZoK9rzK61E'
  );
  
  // Test 1: Get a sample student/subject
  console.log('Test 1: Getting sample subject...');
  const startTime1 = Date.now();
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id')
    .limit(1);
  
  const duration1 = Date.now() - startTime1;
  console.log(`Subject query took ${duration1}ms`);
  
  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError);
    return;
  }
  
  if (!subjects || subjects.length === 0) {
    console.log('No subjects found');
    return;
  }
  
  const subject = subjects[0];
  console.log('Sample subject:', subject);
  
  // Test 2: Get individual photos count
  console.log('\nTest 2: Getting individual photos count...');
  const startTime2 = Date.now();
  const { count: individualCount, error: countError } = await supabase
    .from('photo_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subject.id);
  
  const duration2 = Date.now() - startTime2;
  console.log(`Individual photos count query took ${duration2}ms`);
  console.log(`Individual photos count: ${individualCount}`);
  
  if (countError) {
    console.error('Error counting individual photos:', countError);
  }
  
  // Test 3: Get group photos count
  console.log('\nTest 3: Getting group photos count...');
  const startTime3 = Date.now();
  let groupCount = 0;
  // For now, we'll skip group photos count as we don't have course_id
  console.log('Skipping group photos count for subjects (no course_id)');
    
  const duration3 = Date.now() - startTime3;
  console.log(`Group photos count query took ${duration3}ms`);
  
  // Test 4: Fetch individual photos with details
  console.log('\nTest 4: Fetching individual photos with details...');
  const startTime4 = Date.now();
  const { data: individualPhotos, error: photosError } = await supabase
    .from('photo_assignments')
    .select(`
      id,
      photo_id,
      subject_id as student_id,
      assigned_at as tagged_at,
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
    .eq('subject_id', subject.id)
    .eq('photo.approved', true)
    .order('assigned_at', { ascending: false })
    .limit(10);
  
  const duration4 = Date.now() - startTime4;
  console.log(`Individual photos query took ${duration4}ms`);
  console.log(`Fetched ${individualPhotos ? individualPhotos.length : 0} individual photos`);
  
  if (photosError) {
    console.error('Error fetching individual photos:', photosError);
  }
  
  // Test 5: Skip group photos for subjects
  const duration5 = 0;
  console.log('\nTest 5: Skipping group photos for subjects (no course_id)');
  
  console.log('\n=== Performance Test Summary ===');
  console.log(`Subject query: ${duration1}ms`);
  console.log(`Individual photos count: ${duration2}ms`);
  console.log(`Group photos count: ${duration3}ms`);
  console.log(`Individual photos fetch: ${duration4}ms`);
  console.log(`Group photos fetch: ${duration5 || 0}ms`);
  console.log(`Total time: ${duration1 + duration2 + duration3 + duration4 + (duration5 || 0)}ms`);
}

testFamilyGalleryPerformance().catch(console.error);