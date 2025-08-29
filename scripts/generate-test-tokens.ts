#!/usr/bin/env tsx

/**
 * GENERADOR DE TOKENS DE PRUEBA
 * 
 * Genera tokens E/C/F para smoke test final
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateTestTokens() {
  console.log('🎫 Generando tokens de prueba...\n');

  try {
    // Obtener un evento existente
    const { data: events } = await supabase
      .from('events')
      .select('id, name')
      .eq('status', 'active')
      .limit(1);

    if (!events || events.length === 0) {
      console.log('❌ No hay eventos activos. Creando evento de prueba...');
      
      const { data: newEvent } = await supabase
        .from('events')
        .insert({
          name: 'Test Event for Tokens',
          description: 'Evento para testing de tokens jerárquicos',
          location: 'Test Location',
          date: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();
        
      events.push(newEvent);
    }

    const event = events[0];
    console.log(`📅 Usando evento: ${event.name} (${event.id})\n`);

    // Obtener cualquier curso existente (no necesariamente del evento)
    let { data: courses } = await supabase
      .from('subjects')
      .select('id, name')
      .limit(1);

    if (!courses || courses.length === 0) {
      console.log('❌ No hay cursos disponibles. Por favor crear algunos cursos en el admin primero.');
      return;
    }

    const course = courses[0];
    console.log(`📚 Usando curso: ${course.name} (${course.id})\n`);

    // Crear tokens usando la API admin
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const ADMIN_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Token de Evento (E_*)
    const eventTokenResponse = await fetch(`${SITE_URL}/api/admin/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        scope: 'event',
        resourceId: event.id,
        accessLevel: 'full',
        canDownload: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: { purpose: 'smoke-test' }
      })
    });

    // Token de Curso (C_*)
    const courseTokenResponse = await fetch(`${SITE_URL}/api/admin/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        scope: 'course',
        resourceId: course.id,
        accessLevel: 'read_only',
        canDownload: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: { purpose: 'smoke-test' }
      })
    });

    // Token de Familia (F_*)
    const familyTokenResponse = await fetch(`${SITE_URL}/api/admin/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        scope: 'family',
        resourceId: course.id, // En family scope, resourceId es el subject/student
        accessLevel: 'read_only',
        canDownload: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: { purpose: 'smoke-test' }
      })
    });

    const results = await Promise.all([
      eventTokenResponse.json(),
      courseTokenResponse.json(),
      familyTokenResponse.json()
    ]);

    console.log('🎯 URLs DE PRUEBA GENERADAS:');
    console.log('================================\n');

    if (results[0].success) {
      console.log(`📊 EVENT Token: ${SITE_URL}/s/${results[0].data.token}`);
    } else {
      console.log('❌ Event Token FAILED:', results[0].error);
    }

    if (results[1].success) {
      console.log(`📚 COURSE Token: ${SITE_URL}/s/${results[1].data.token}`);
    } else {
      console.log('❌ Course Token FAILED:', results[1].error);
    }

    if (results[2].success) {
      console.log(`👨‍👩‍👧‍👦 FAMILY Token: ${SITE_URL}/s/${results[2].data.token}`);
    } else {
      console.log('❌ Family Token FAILED:', results[2].error);
    }

    // Obtener un asset de ejemplo para prueba de preview/descarga
    const { data: assets } = await supabase
      .from('assets')
      .select('id, filename')
      .eq('event_id', event.id)
      .limit(1);

    if (assets && assets.length > 0) {
      console.log(`\n📷 AssetId de ejemplo: ${assets[0].id} (${assets[0].filename})`);
      
      if (results[1].success) {
        const courseToken = results[1].data.token;
        console.log(`\n🔗 URLs de prueba para asset:`);
        console.log(`Preview: ${SITE_URL}/api/s/${courseToken}/preview/${assets[0].id}`);
        console.log(`Download: ${SITE_URL}/api/s/${courseToken}/download/${assets[0].id}`);
      }
    } else {
      console.log('\n⚠️ No se encontraron assets para pruebas de preview/descarga');
    }

    console.log('\n✅ Tokens generados exitosamente. Ready for smoke test!');

  } catch (error) {
    console.error('❌ Error generando tokens:', error);
  }
}

generateTestTokens().catch(console.error);