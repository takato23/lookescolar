const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://exaighpowgvbdappydyx.supabase.co';
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2Nzk5MSwiZXhwIjoyMDY5OTQzOTkxfQ.gpH0Jd2fQliSMknPicdXEx9Em54o4WxKfZoK9rzK61E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPhoto() {
  try {
    // Buscar la foto que subimos
    const { data: photo, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', '215d0d33-2539-4946-8253-17641fa795d5')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Foto encontrada:');
    console.log('ID:', photo.id);
    console.log('Filename:', photo.original_filename);
    console.log('Storage path:', photo.storage_path);
    console.log('Preview path:', photo.preview_path);
    console.log('Event ID:', photo.event_id);
    console.log('Approved:', photo.approved);

    // Generar URL firmada para el preview
    if (photo.preview_path) {
      const { data: urlData } = await supabase.storage
        .from('photos')
        .createSignedUrl(photo.preview_path, 3600);

      if (urlData) {
        console.log('\nPreview URL (válida 1 hora):');
        console.log(urlData.signedUrl);
      }
    } else {
      console.log('\n⚠️ Esta foto NO tiene preview_path');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPhoto();
