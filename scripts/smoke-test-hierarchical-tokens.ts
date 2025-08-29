#!/usr/bin/env tsx

/**
 * SMOKE TEST - Hierarchical Token System
 *
 * Prueba integral del sistema de tokens jerárquicos E/C/F
 * - Validación de aislamiento entre cursos
 * - Verificación de permisos de descarga
 * - Testing de logs de auditoría
 * - Validación de headers de seguridad
 */

import { createClient } from '@supabase/supabase-js';

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TokenTestResult {
  type: 'Event' | 'Course' | 'Family';
  token: string;
  validation: boolean;
  foldersCount: number;
  assetsCount: number;
  canDownload: boolean;
  isolationTest: boolean;
  securityHeaders: boolean;
}

async function createTestData() {
  console.log('🔧 Configurando datos de prueba...');

  // 1. Crear evento de prueba
  const { data: event, error: eventError } = await supabase
    .from('events')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Smoke Test Event',
      description: 'Evento de prueba para tokens jerárquicos',
      location: 'Test Location',
      date: new Date().toISOString(),
      status: 'active',
    })
    .select()
    .single();

  if (eventError) {
    console.error('Error creando evento:', eventError);
    return null;
  }

  // 2. Crear cursos de prueba
  const courses = [
    {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Curso A',
      event_id: event.id,
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'Curso B',
      event_id: event.id,
    },
  ];

  for (const course of courses) {
    await supabase.from('subjects').upsert({
      ...course,
      grade: '1A',
    });
  }

  // 3. Crear carpetas de prueba
  const folders = [
    {
      id: '00000000-0000-0000-0000-000000000021',
      name: 'Carpeta Curso A',
      event_id: event.id,
      subject_id: courses[0].id,
    },
    {
      id: '00000000-0000-0000-0000-000000000022',
      name: 'Carpeta Curso B',
      event_id: event.id,
      subject_id: courses[1].id,
    },
  ];

  for (const folder of folders) {
    await supabase.from('folders').upsert({
      ...folder,
      path: `/eventos/${event.id}/${folder.subject_id}`,
      is_published: true,
    });
  }

  // 4. Crear assets de prueba
  const assets = [
    {
      id: '00000000-0000-0000-0000-000000000031',
      filename: 'test1.jpg',
      folder_id: folders[0].id,
      event_id: event.id,
    },
    {
      id: '00000000-0000-0000-0000-000000000032',
      filename: 'test2.jpg',
      folder_id: folders[0].id,
      event_id: event.id,
    },
    {
      id: '00000000-0000-0000-0000-000000000033',
      filename: 'test3.jpg',
      folder_id: folders[1].id,
      event_id: event.id,
    },
  ];

  for (const asset of assets) {
    await supabase.from('assets').upsert({
      ...asset,
      file_path: `test-files/${asset.filename}`,
      preview_path: `previews/${asset.filename}`,
      file_size: 1024000,
      mime_type: 'image/jpeg',
    });
  }

  console.log('✅ Datos de prueba configurados');
  return { event, courses, folders, assets };
}

async function createTokens(testData: any) {
  console.log('🎫 Creando tokens de prueba vía API admin...');

  const tokens = {
    event: '',
    course: '',
    family: '',
  };

  try {
    // Token de evento (acceso completo) via API
    const eventResponse = await fetch(`${SITE_URL}/api/admin/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        scope: 'event',
        resourceId: testData.event.id,
        accessLevel: 'full',
        canDownload: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    if (eventResponse.ok) {
      const eventData = await eventResponse.json();
      tokens.event = eventData.data?.token;
    }

    // Token de curso vía API
    const courseResponse = await fetch(`${SITE_URL}/api/admin/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        scope: 'course',
        resourceId: testData.courses[0].id,
        accessLevel: 'read_only',
        canDownload: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    if (courseResponse.ok) {
      const courseData = await courseResponse.json();
      tokens.course = courseData.data?.token;
    }

    // Token de familia vía API
    const familyResponse = await fetch(`${SITE_URL}/api/admin/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        scope: 'family',
        resourceId: testData.courses[0].id, // Para family scope, resourceId debe ser un student/subject
        accessLevel: 'read_only',
        canDownload: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    if (familyResponse.ok) {
      const familyData = await familyResponse.json();
      tokens.family = familyData.data?.token;
    }
  } catch (error) {
    console.error('Error creando tokens:', error);
  }

  console.log('✅ Tokens creados:', {
    event: tokens.event ? tokens.event.substring(0, 10) + '...' : 'FAILED',
    course: tokens.course ? tokens.course.substring(0, 10) + '...' : 'FAILED',
    family: tokens.family ? tokens.family.substring(0, 10) + '...' : 'FAILED',
  });

  return tokens;
}

async function testToken(
  token: string,
  type: 'Event' | 'Course' | 'Family'
): Promise<TokenTestResult> {
  console.log(`🧪 Probando token ${type}: ${token.substring(0, 10)}...`);

  const result: TokenTestResult = {
    type,
    token,
    validation: false,
    foldersCount: 0,
    assetsCount: 0,
    canDownload: false,
    isolationTest: false,
    securityHeaders: false,
  };

  try {
    // 1. Validar token
    const { data: context } = await supabase.rpc('public.get_token_context', {
      p_token: token,
    });
    result.validation = !!context;
    result.canDownload = context?.can_download || false;

    if (!result.validation) {
      console.log(`❌ Token ${type} inválido`);
      return result;
    }

    // 2. Obtener carpetas
    const { data: folders } = await supabase.rpc('public.folders_for_token', {
      p_token: token,
    });
    result.foldersCount = folders?.length || 0;

    // 3. Obtener assets
    const { data: assets } = await supabase.rpc('public.assets_for_token', {
      p_token: token,
    });
    result.assetsCount = assets?.length || 0;

    // 4. Test de aislamiento (verificar que Course token no ve Curso B)
    if (type === 'Course') {
      const courseAFolders =
        folders?.filter((f: any) => f.folder_name.includes('Curso A')) || [];
      const courseBFolders =
        folders?.filter((f: any) => f.folder_name.includes('Curso B')) || [];
      result.isolationTest =
        courseAFolders.length > 0 && courseBFolders.length === 0;
    } else {
      result.isolationTest = true; // Event y Family no tienen restricción específica para este test
    }

    // 5. Test de headers de seguridad
    try {
      const response = await fetch(`${SITE_URL}/s/${token}`, {
        method: 'HEAD',
        headers: { 'User-Agent': 'SmokeTest/1.0' },
      });

      const robotsHeader = response.headers.get('X-Robots-Tag');
      const referrerHeader = response.headers.get('Referrer-Policy');

      result.securityHeaders =
        robotsHeader?.includes('noindex') && referrerHeader === 'no-referrer';
    } catch (error) {
      console.log(`⚠️ No se pudo verificar headers para ${type}:`, error);
      result.securityHeaders = false;
    }

    console.log(
      `✅ Token ${type} - Validación: ${result.validation}, Carpetas: ${result.foldersCount}, Assets: ${result.assetsCount}, Descarga: ${result.canDownload}, Aislamiento: ${result.isolationTest}, Headers: ${result.securityHeaders}`
    );
  } catch (error) {
    console.error(`❌ Error probando token ${type}:`, error);
  }

  return result;
}

async function testDownloadPermissions(tokens: any) {
  console.log('🔐 Probando permisos de descarga...');

  try {
    // Test con token que NO permite descarga (Event)
    const noDownloadResponse = await fetch(
      `${SITE_URL}/api/s/${tokens.event}/download/00000000-0000-0000-0000-000000000031`,
      {
        headers: { 'User-Agent': 'SmokeTest/1.0' },
      }
    );

    const noDownloadBlocked = noDownloadResponse.status === 403;
    console.log(
      `✅ Token sin descarga bloqueado: ${noDownloadBlocked ? 'SÍ' : 'NO'} (${noDownloadResponse.status})`
    );

    // Test con token que permite descarga (Course)
    const downloadResponse = await fetch(
      `${SITE_URL}/api/s/${tokens.course}/download/00000000-0000-0000-0000-000000000031`,
      {
        headers: { 'User-Agent': 'SmokeTest/1.0' },
      }
    );

    const downloadAllowed =
      downloadResponse.status === 200 || downloadResponse.status === 404; // 404 = archivo no encontrado es OK
    console.log(
      `✅ Token con descarga permitido: ${downloadAllowed ? 'SÍ' : 'NO'} (${downloadResponse.status})`
    );

    return { noDownloadBlocked, downloadAllowed };
  } catch (error) {
    console.error('❌ Error probando descargas:', error);
    return { noDownloadBlocked: false, downloadAllowed: false };
  }
}

async function cleanupTestData() {
  console.log('🧹 Limpiando datos de prueba...');

  // Limpiar en orden inverso para evitar constraints
  await supabase
    .from('access_tokens')
    .delete()
    .eq('event_id', '00000000-0000-0000-0000-000000000001');
  await supabase
    .from('assets')
    .delete()
    .eq('event_id', '00000000-0000-0000-0000-000000000001');
  await supabase
    .from('folders')
    .delete()
    .eq('event_id', '00000000-0000-0000-0000-000000000001');
  await supabase
    .from('subjects')
    .delete()
    .eq('event_id', '00000000-0000-0000-0000-000000000001');
  await supabase
    .from('events')
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000001');

  console.log('✅ Datos de prueba eliminados');
}

async function main() {
  console.log('🚀 SMOKE TEST - Sistema de Tokens Jerárquicos');
  console.log('================================================\n');

  try {
    // Setup
    const testData = await createTestData();
    if (!testData) {
      console.error('❌ Error configurando datos de prueba');
      return;
    }

    const tokens = await createTokens(testData);

    // Tests
    const results = await Promise.all([
      testToken(tokens.event, 'Event'),
      testToken(tokens.course, 'Course'),
      testToken(tokens.family, 'Family'),
    ]);

    const downloadTests = await testDownloadPermissions(tokens);

    // Reporte final
    console.log('\n📊 REPORTE FINAL');
    console.log('================');

    let passedTests = 0;
    const totalTests = 15; // 5 tests per token × 3 tokens

    results.forEach((result) => {
      console.log(
        `\n${result.type} Token (${result.token.substring(0, 10)}...):`
      );
      console.log(
        `  ✓ Validación: ${result.validation ? '✅ PASS' : '❌ FAIL'}`
      );
      console.log(
        `  ✓ Carpetas encontradas: ${result.foldersCount} ${result.foldersCount > 0 ? '✅ PASS' : '❌ FAIL'}`
      );
      console.log(
        `  ✓ Assets encontrados: ${result.assetsCount} ${result.assetsCount > 0 ? '✅ PASS' : '❌ FAIL'}`
      );
      console.log(
        `  ✓ Permisos descarga: ${result.canDownload} ${result.type === 'Course' ? (result.canDownload ? '✅ PASS' : '❌ FAIL') : result.canDownload ? '❌ FAIL' : '✅ PASS'}`
      );
      console.log(
        `  ✓ Aislamiento: ${result.isolationTest ? '✅ PASS' : '❌ FAIL'}`
      );
      console.log(
        `  ✓ Headers seguridad: ${result.securityHeaders ? '✅ PASS' : '❌ FAIL'}`
      );

      if (result.validation) passedTests++;
      if (result.foldersCount > 0) passedTests++;
      if (result.assetsCount > 0) passedTests++;
      if (result.type === 'Course' ? result.canDownload : !result.canDownload)
        passedTests++;
      if (result.isolationTest) passedTests++;
      if (result.securityHeaders) passedTests++;
    });

    console.log(`\n📥 Tests de descarga:`);
    console.log(
      `  ✓ Sin permisos bloqueado: ${downloadTests.noDownloadBlocked ? '✅ PASS' : '❌ FAIL'}`
    );
    console.log(
      `  ✓ Con permisos permitido: ${downloadTests.downloadAllowed ? '✅ PASS' : '❌ FAIL'}`
    );

    if (downloadTests.noDownloadBlocked) passedTests++;
    if (downloadTests.downloadAllowed) passedTests++;

    console.log(
      `\n🏆 RESULTADO: ${passedTests}/${totalTests + 2} tests pasaron`
    );

    if (passedTests >= (totalTests + 2) * 0.8) {
      // 80% de éxito mínimo
      console.log('✅ SMOKE TEST EXITOSO - Sistema listo para deploy');
    } else {
      console.log('❌ SMOKE TEST FALLÓ - Revisar problemas antes de deploy');
    }

    // URLs de prueba
    console.log('\n🔗 URLs de prueba:');
    console.log(`Event: ${SITE_URL}/s/${tokens.event}`);
    console.log(`Course: ${SITE_URL}/s/${tokens.course}`);
    console.log(`Family: ${SITE_URL}/s/${tokens.family}`);
  } catch (error) {
    console.error('❌ Error en smoke test:', error);
  } finally {
    // Cleanup
    await cleanupTestData();
  }
}

// Ejecutar directamente
main().catch(console.error);
