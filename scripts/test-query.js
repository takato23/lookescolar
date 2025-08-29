// Script para probar la consulta a la base de datos
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://exaighpowgvbdappydyx.supabase.co';
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2Nzk5MSwiZXhwIjoyMDY5OTQzOTkxfQ.gpH0Jd2fQliSMknPicdXEx9Em54o4WxKfZoK9rzK61E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuery() {
  try {
    console.log('1. Probando consulta básica de fotos...');

    const { data: photos, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', '5237bf7b-6fd4-4823-bade-4736dfb9c716')
      .limit(5);

    if (error) {
      console.error('Error en consulta básica:', error);
      return;
    }

    console.log('Fotos encontradas:', photos?.length || 0);
    if (photos && photos.length > 0) {
      console.log('Primera foto:', {
        id: photos[0].id,
        filename: photos[0].original_filename,
        event_id: photos[0].event_id,
        code_id: photos[0].code_id,
      });
    }

    console.log('\n2. Probando consulta con joins (como en el endpoint)...');

    const { data: photosWithJoins, error: joinError } = await supabase
      .from('photos')
      .select(
        `
        id, 
        event_id, 
        code_id, 
        original_filename, 
        storage_path, 
        preview_path, 
        watermark_path, 
        approved, 
        created_at,
        photo_subjects(subject_id, subjects(id, name))
      `
      )
      .eq('event_id', '5237bf7b-6fd4-4823-bade-4736dfb9c716')
      .limit(5);

    if (joinError) {
      console.error('Error en consulta con joins:', joinError);
      return;
    }

    console.log('Fotos con joins encontradas:', photosWithJoins?.length || 0);

    console.log('\n3. Probando filtro por code_id null...');

    const { data: photosNull, error: nullError } = await supabase
      .from('photos')
      .select('id, original_filename, code_id')
      .eq('event_id', '5237bf7b-6fd4-4823-bade-4736dfb9c716')
      .is('code_id', null)
      .limit(5);

    if (nullError) {
      console.error('Error en consulta con code_id null:', nullError);
      return;
    }

    console.log('Fotos sin code_id:', photosNull?.length || 0);
  } catch (error) {
    console.error('Error inesperado:', error);
  }
}

testQuery();
