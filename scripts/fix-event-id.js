const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://exaighpowgvbdappydyx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2Nzk5MSwiZXhwIjoyMDY5OTQzOTkxfQ.gpH0Jd2fQliSMknPicdXEx9Em54o4WxKfZoK9rzK61E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEventId() {
  try {
    // Primero verificar la estructura actual
    const { data: testInsert, error: testError } = await supabase
      .from('photos')
      .insert({
        storage_path: 'test/path.jpg',
        preview_path: 'test/preview.jpg',
        original_filename: 'test.jpg',
        file_size: 1000,
        mime_type: 'image/jpeg',
        width: 100,
        height: 100,
        approved: true,
        event_id: null // Intentar con NULL
      })
      .select()
      .single();

    if (testError) {
      console.log('Error con event_id NULL:', testError.message);
      
      // Si falla, intentar con un evento dummy
      // Primero crear o obtener un evento
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .limit(1);

      if (events && events.length > 0) {
        console.log('Usando evento existente:', events[0].id);
        // El event_id es requerido, no podemos cambiar eso desde aquí
        console.log('La columna event_id es NOT NULL y no se puede cambiar via API.');
        console.log('Necesitas acceder directamente a la base de datos para ejecutar:');
        console.log('ALTER TABLE photos ALTER COLUMN event_id DROP NOT NULL;');
      } else {
        // Crear un evento dummy si no hay ninguno
        const { data: newEvent, error: createError } = await supabase
          .from('events')
          .insert({
            name: 'Sin Asignar',
            date: new Date().toISOString(),
            status: 'active'
          })
          .select()
          .single();

        if (newEvent) {
          console.log('Evento dummy creado:', newEvent.id);
          console.log('Usa este event_id para fotos sin asignar:', newEvent.id);
        } else {
          console.log('Error creando evento:', createError);
        }
      }
    } else {
      console.log('¡event_id NULL ya está permitido!');
      // Limpiar el test
      await supabase.from('photos').delete().eq('id', testInsert.id);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixEventId();