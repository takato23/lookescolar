import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exaighpowgvbdappydyx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2Nzk5MSwiZXhwIjoyMDY5OTQzOTkxfQ.gpH0Jd2fQliSMknPicdXEx9Em54o4WxKfZoK9rzK61E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('🚀 Creando datos de prueba para el portal familia...\n');

  try {
    // 1. Crear o obtener un evento de prueba
    let event;
    const { data: existingEvent } = await supabase
      .from('events')
      .select('*')
      .limit(1)
      .single();

    if (existingEvent) {
      event = existingEvent;
      console.log('✅ Usando evento existente:', event.name);
    } else {
      // Crear un evento de prueba
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          name: 'Acto de Fin de Año 2024',
          school: 'Colegio San Martín',
          location: 'Salón Principal',
          date: new Date().toISOString().split('T')[0],
          status: 'active',
          price_per_photo: 50000 // $500 en centavos
        })
        .select()
        .single();

      if (eventError) {
        console.error('❌ Error creando evento:', eventError);
        return;
      }
      event = newEvent;
      console.log('✅ Evento creado:', event.name);
    }

    // 2. Crear un sujeto (familia) con token
    const token = nanoid(24); // Token seguro de 24 caracteres
    
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        event_id: event.id,
        name: 'Familia Pérez - Juan (3°A)',
        email: 'familia.perez@test.com',
        phone: '11-1234-5678',
        access_token: token,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
        metadata: {
          test: true,
          created_by_script: true
        }
      })
      .select()
      .single();

    if (subjectError) {
      console.error('❌ Error creando sujeto:', subjectError);
      return;
    }

    console.log('✅ Sujeto creado:', subject.name);

    // 3. Crear algunas fotos de ejemplo
    const photos = [
      'foto_grupal_01.jpg',
      'foto_individual_juan.jpg',
      'foto_acto_01.jpg',
      'foto_acto_02.jpg',
      'foto_diploma.jpg'
    ];

    for (const filename of photos) {
      const { error: photoError } = await supabase
        .from('photos')
        .insert({
          event_id: event.id,
          subject_id: subject.id,
          original_filename: filename,
          storage_path: `events/${event.id}/${filename}`,
          watermark_path: `events/${event.id}/watermark_${filename}`,
          file_size: Math.floor(Math.random() * 5000000) + 1000000, // 1-6 MB
          width: 1920,
          height: 1080,
          approved: true,
          processing_status: 'completed'
        });

      if (photoError) {
        console.error(`❌ Error creando foto ${filename}:`, photoError);
      } else {
        console.log(`✅ Foto creada: ${filename}`);
      }
    }

    // 4. Mostrar la información de acceso
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATOS DE PRUEBA CREADOS EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📱 ACCESO AL PORTAL FAMILIA:');
    console.log('─'.repeat(60));
    console.log(`URL: http://localhost:3000/f/${token}`);
    console.log(`Token: ${token}`);
    console.log('─'.repeat(60));
    console.log('\n📋 INFORMACIÓN DEL ALUMNO:');
    console.log(`Nombre: ${subject.name}`);
    console.log(`Evento: ${event.name}`);
    console.log(`Colegio: ${event.school}`);
    console.log(`Precio por foto: $${event.price_per_photo / 100}`);
    console.log('─'.repeat(60));
    console.log('\n🛒 PARA PROBAR EL FLUJO COMPLETO:');
    console.log('1. Abre la URL del portal');
    console.log('2. Verás las 5 fotos de ejemplo');
    console.log('3. Agrega fotos al carrito');
    console.log('4. Procede al checkout');
    console.log('5. Usa las tarjetas de prueba de Mercado Pago');
    console.log('─'.repeat(60));
    console.log('\n💳 TARJETA DE PRUEBA RÁPIDA:');
    console.log('Número: 5031 7557 3453 0604');
    console.log('CVV: 123');
    console.log('Vencimiento: 11/25');
    console.log('Nombre: APRO');
    console.log('DNI: 12345678');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
createTestData();