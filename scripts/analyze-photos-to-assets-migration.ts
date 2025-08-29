#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeCurrentStructure() {
  console.log('🔍 ANÁLISIS COMPLETO: Estructura actual vs esperada\n');

  try {
    // 1. Verificar qué tablas existen realmente
    console.log('1. 📋 TABLAS EXISTENTES:');
    const tables = ['photos', 'assets', 'events', 'folders', 'subjects'];

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
          console.log(`   ❌ ${table}: NO EXISTE (${error.message})`);
        } else {
          console.log(`   ✅ ${table}: EXISTE`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ERROR AL CONSULTAR`);
      }
    }

    // 2. Verificar estructura de photos vs assets
    console.log('\n2. 🏗️  ESTRUCTURA DE COLUMNAS:');

    console.log('\n   📸 TABLA PHOTOS:');
    try {
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .limit(1);

      if (photosError) {
        console.log(
          `      ❌ No se puede consultar photos: ${photosError.message}`
        );
      } else {
        const columns = photosData?.[0] ? Object.keys(photosData[0]) : [];
        console.log(`      Columnas: ${columns.join(', ')}`);
      }
    } catch (err) {
      console.log('      ❌ Error al consultar photos');
    }

    console.log('\n   🗂️  TABLA ASSETS:');
    try {
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .limit(1);

      if (assetsError) {
        console.log(
          `      ❌ No se puede consultar assets: ${assetsError.message}`
        );
      } else {
        const columns = assetsData?.[0] ? Object.keys(assetsData[0]) : [];
        console.log(`      Columnas: ${columns.join(', ')}`);
      }
    } catch (err) {
      console.log('      ❌ Error al consultar assets');
    }

    // 3. Verificar cantidad de datos en cada tabla
    console.log('\n3. 📊 CANTIDAD DE REGISTROS:');

    for (const table of ['photos', 'assets']) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`   ${table}: ❌ Error: ${error.message}`);
        } else {
          console.log(`   ${table}: ${count || 0} registros`);
        }
      } catch (err) {
        console.log(`   ${table}: ❌ No consultable`);
      }
    }

    // 4. Verificar relaciones
    console.log('\n4. 🔗 RELACIONES:');

    // Verificar si photos tiene event_id directo vs assets que usa folder_id
    console.log('\n   📸 Estructura relacional photos:');
    try {
      const { data: photosSample } = await supabase
        .from('photos')
        .select('id, event_id, folder_id')
        .limit(3);

      if (photosSample?.length) {
        console.log('      Estructura: event_id directo + folder_id opcional');
        photosSample.forEach((p) => {
          console.log(
            `      - ID: ${p.id}, event_id: ${p.event_id}, folder_id: ${p.folder_id || 'null'}`
          );
        });
      }
    } catch (err) {
      console.log('      ❌ No se puede analizar estructura photos');
    }

    console.log('\n   🗂️  Estructura relacional assets:');
    try {
      const { data: assetsSample } = await supabase
        .from('assets')
        .select('id, folder_id')
        .limit(3);

      if (assetsSample?.length) {
        console.log('      Estructura: folder_id → folders → event_id');
        assetsSample.forEach((a) => {
          console.log(`      - ID: ${a.id}, folder_id: ${a.folder_id}`);
        });
      }
    } catch (err) {
      console.log('      ❌ No se puede analizar estructura assets');
    }
  } catch (error) {
    console.error('❌ Error durante análisis:', error);
  }

  console.log('\n📋 CONCLUSIONES:');
  console.log(
    '   1. Necesito verificar si photos y assets coexisten o si photos es legacy'
  );
  console.log('   2. Mapear correctamente las columnas entre ambas tablas');
  console.log(
    '   3. Entender si la relación cambió: photos.event_id vs assets.folder_id → folders.event_id'
  );
  console.log('   4. Hacer migración sistemática por tipo de endpoint');
}

analyzeCurrentStructure().catch(console.error);
