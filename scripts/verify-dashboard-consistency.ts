import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const baseUrl = 'http://localhost:3002'; // Usando el puerto correcto

async function testAPI(endpoint: string, description: string): Promise<{ count: number | null, error: string | null }> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`);
    
    if (!response.ok) {
      return { count: null, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    // Extraer el conteo dependiendo de la estructura de la respuesta
    let count: number | null = null;
    
    if (data.event?.stats?.totalPhotos !== undefined) {
      count = data.event.stats.totalPhotos;
    } else if (data.photos?.length !== undefined) {
      count = data.photos.length;
    } else if (data.assets?.length !== undefined) {
      count = data.assets.length;
    } else if (data.count !== undefined) {
      count = data.count;
    } else if (data.folders?.length !== undefined) {
      // Para folders, sumamos el photo_count de cada folder
      count = data.folders.reduce((sum: number, folder: any) => sum + (folder.photo_count || 0), 0);
    }
    
    return { count, error: null };
    
  } catch (error: any) {
    return { count: null, error: error.message };
  }
}

async function verifyDashboardConsistency() {
  console.log('🔍 Verificando consistencia entre dashboards de fotos...\n');
  
  const eventId = '83070ba2-738e-4038-ab5e-0c42fe4a2880';
  
  // Lista de endpoints que deberían mostrar fotos del evento
  const endpoints = [
    {
      endpoint: `/api/admin/events/${eventId}`,
      description: '📊 Dashboard evento (stats)',
      system: 'Unificado (nueva implementación)'
    },
    {
      endpoint: `/api/admin/assets?event_id=${eventId}`,
      description: '🗂️  Admin assets/photos page',
      system: 'Nuevo (folders/assets)'
    },
    {
      endpoint: `/api/admin/folders/published?event_id=${eventId}`,
      description: '📁 Admin publish page (folders)',
      system: 'Nuevo (folders/assets)'
    },
    {
      endpoint: `/api/admin/events/${eventId}/photos`,
      description: '📷 Evento photos API (legacy)',
      system: 'Antiguo (photos)'
    }
  ];
  
  console.log('🧪 Probando endpoints...\n');
  
  const results: Array<{
    endpoint: string;
    description: string;
    system: string;
    count: number | null;
    error: string | null;
    status: string;
  }> = [];
  
  for (const test of endpoints) {
    console.log(`   Probando: ${test.description}`);
    console.log(`   Endpoint: ${test.endpoint}`);
    
    const result = await testAPI(test.endpoint, test.description);
    
    const status = result.error ? '❌ ERROR' : result.count !== null ? '✅ OK' : '⚠️  NO_COUNT';
    
    results.push({
      ...test,
      count: result.count,
      error: result.error,
      status
    });
    
    if (result.error) {
      console.log(`   Resultado: ${status} - ${result.error}`);
    } else if (result.count !== null) {
      console.log(`   Resultado: ${status} - ${result.count} fotos`);
    } else {
      console.log(`   Resultado: ${status} - No se pudo extraer conteo`);
    }
    
    console.log('');
  }
  
  // Análisis de resultados
  console.log('📊 ANÁLISIS DE RESULTADOS:\n');
  
  const validResults = results.filter(r => r.count !== null && r.error === null);
  const counts = validResults.map(r => r.count!);
  const uniqueCounts = [...new Set(counts)];
  
  if (uniqueCounts.length === 1) {
    console.log(`✅ CONSISTENCIA PERFECTA!`);
    console.log(`   Todos los endpoints que funcionan muestran: ${uniqueCounts[0]} fotos`);
  } else if (uniqueCounts.length > 1) {
    console.log(`⚠️  INCONSISTENCIA DETECTADA!`);
    console.log(`   Diferentes números de fotos encontrados: ${uniqueCounts.join(', ')}`);
  } else {
    console.log(`❌ NO HAY DATOS VÁLIDOS`);
    console.log(`   Ningún endpoint retornó un conteo válido`);
  }
  
  console.log('\n📋 RESUMEN POR SISTEMA:\n');
  
  // Agrupar por sistema
  const systemGroups = results.reduce((groups: any, result) => {
    if (!groups[result.system]) {
      groups[result.system] = [];
    }
    groups[result.system].push(result);
    return groups;
  }, {});
  
  for (const [systemName, systemResults] of Object.entries(systemGroups) as [string, any[]][]) {
    console.log(`🔧 ${systemName}:`);
    
    const validCounts = systemResults
      .filter(r => r.count !== null)
      .map(r => r.count);
    
    if (validCounts.length > 0) {
      const uniqueSystemCounts = [...new Set(validCounts)];
      if (uniqueSystemCounts.length === 1) {
        console.log(`   ✅ Consistente: ${uniqueSystemCounts[0]} fotos`);
      } else {
        console.log(`   ⚠️  Inconsistente: ${uniqueSystemCounts.join(', ')} fotos`);
      }
    } else {
      console.log(`   ❌ No hay datos válidos`);
    }
    
    // Mostrar detalles de errores
    const errors = systemResults.filter(r => r.error !== null);
    if (errors.length > 0) {
      console.log(`   Errores:`);
      errors.forEach(error => {
        console.log(`     - ${error.description}: ${error.error}`);
      });
    }
    
    console.log('');
  }
  
  // Recomendaciones
  console.log('💡 RECOMENDACIONES:\n');
  
  if (uniqueCounts.length > 1) {
    console.log('1. ✅ El sistema unificado ya está funcionando');
    console.log('2. 🔄 Migrar endpoints restantes al sistema unificado');
    console.log('3. 🧪 Validar que las APIs legacy funcionen correctamente');
    console.log('4. 📝 Documentar diferencias encontradas');
  } else if (uniqueCounts.length === 1) {
    console.log('1. ✅ Sistema unificado exitoso');
    console.log('2. 🔄 Considerar deprecar APIs legacy');
    console.log('3. 📝 Actualizar documentación');
  } else {
    console.log('1. ❌ Revisar errores en las APIs');
    console.log('2. 🔧 Verificar configuración del servidor');
    console.log('3. 📋 Validar estructura de datos');
  }
  
  console.log('\n🎯 Estado de la unificación: ' + 
    (uniqueCounts.length <= 1 ? 'ÉXITO ✅' : 'EN PROGRESO 🔄'));
}

// Función para verificar la base de datos directamente
async function verifyDatabaseDirectly() {
  console.log('\n🗄️  VERIFICACIÓN DIRECTA DE BASE DE DATOS:\n');
  
  const eventId = '83070ba2-738e-4038-ab5e-0c42fe4a2880';
  
  try {
    // Sistema antiguo
    const { count: oldCount } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);
    
    // Sistema nuevo
    const { data: folders } = await supabase
      .from('folders')
      .select('id')
      .eq('event_id', eventId);
    
    let newCount = 0;
    if (folders && folders.length > 0) {
      const folderIds = folders.map((f: any) => f.id);
      const { count: assetCount } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .in('folder_id', folderIds);
      newCount = assetCount || 0;
    }
    
    console.log(`📊 Sistema antiguo (photos): ${oldCount || 0} fotos`);
    console.log(`🗂️  Sistema nuevo (assets): ${newCount} fotos`);
    console.log(`📁 Folders encontrados: ${folders?.length || 0}`);
    
    if (oldCount === newCount) {
      console.log(`✅ Bases de datos consistentes`);
    } else {
      console.log(`⚠️  Diferencia de ${Math.abs((oldCount || 0) - newCount)} fotos`);
    }
    
  } catch (error: any) {
    console.log(`❌ Error consultando base de datos: ${error.message}`);
  }
}

// Ejecutar verificaciones
async function main() {
  await verifyDashboardConsistency();
  await verifyDatabaseDirectly();
}

main().catch(console.error);