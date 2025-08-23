import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function populatePhotoSubjects() {
  console.log('Populating photo_subjects table with test data...\n');
  
  try {
    // Get all subjects
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id');
    
    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError.message);
      return;
    }
    
    console.log(`Found ${subjects.length} subjects`);
    
    // Get all approved photos
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id')
      .eq('approved', true);
    
    if (photosError) {
      console.error('Error fetching photos:', photosError.message);
      return;
    }
    
    console.log(`Found ${photos.length} approved photos`);
    
    if (subjects.length === 0 || photos.length === 0) {
      console.log('No subjects or photos found. Cannot create assignments.');
      return;
    }
    
    // Create assignments - assign each photo to each subject
    const assignments = [];
    const now = new Date().toISOString();
    
    for (const photo of photos) {
      for (const subject of subjects) {
        assignments.push({
          photo_id: photo.id,
          subject_id: subject.id,
          tagged_at: now  // Changed from assigned_at to tagged_at
        });
      }
    }
    
    console.log(`Creating ${assignments.length} photo assignments...`);
    
    // Insert assignments in batches to avoid timeouts
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('photo_subjects')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError.message);
        // Continue with other batches
      } else {
        insertedCount += batch.length;
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} assignments`);
      }
    }
    
    console.log(`\n✅ Successfully inserted ${insertedCount} photo assignments`);
    
    // Verify the insertion
    const { count: finalCount, error: countError } = await supabase
      .from('photo_subjects')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error verifying insertion:', countError.message);
    } else {
      console.log(`📊 Final photo_subjects count: ${finalCount}`);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

populatePhotoSubjects().catch(console.error);