// Script para configurar la base de datos en Supabase Cloud
// Ejecutar con: node scripts/setup-db.js

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

// Crear cliente con service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('========================================');
  console.log('Setup de Base de Datos - LookEscolar');
  console.log('========================================');
  console.log('');
  
  try {
    // Leer el archivo SQL
    const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_create_all_tables.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    // Dividir el SQL en statements individuales
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Ejecutando ${statements.length} statements SQL...`);
    console.log('');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Extraer el tipo de operación para el log
      const operation = statement.match(/^(CREATE|DROP|ALTER|INSERT|COMMENT)/i)?.[1] || 'SQL';
      const target = statement.match(/(TABLE|INDEX|TRIGGER|FUNCTION|POLICY)\s+(?:IF\s+EXISTS\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i)?.[2] || '';
      
      process.stdout.write(`[${i + 1}/${statements.length}] ${operation} ${target}... `);
      
      try {
        // Ejecutar el statement usando RPC
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement
        });
        
        if (error) {
          // Si el error es porque la función exec_sql no existe, intentar de otra forma
          if (error.message.includes('exec_sql')) {
            console.log('⚠️  función exec_sql no disponible');
            console.log('');
            console.log('Por favor ejecuta el SQL manualmente en Supabase Dashboard:');
            console.log('1. Ve a https://supabase.com/dashboard');
            console.log('2. Selecciona tu proyecto');
            console.log('3. Ve a SQL Editor');
            console.log('4. Copia y pega el contenido de supabase/migrations/001_create_all_tables.sql');
            console.log('5. Ejecuta el SQL');
            return;
          }
          
          console.log(`❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('');
    console.log('========================================');
    console.log(`Resumen: ${successCount} exitosos, ${errorCount} errores`);
    console.log('========================================');
    
    if (errorCount > 0) {
      console.log('');
      console.log('⚠️  Algunos statements fallaron.');
      console.log('   Esto puede ser normal si las tablas ya existían.');
      console.log('   Verifica en Supabase Dashboard que las tablas estén creadas.');
    } else {
      console.log('');
      console.log('✅ Base de datos configurada exitosamente!');
    }
    
    console.log('');
    console.log('📊 Tablas que deberían estar creadas:');
    console.log('  • admin_users - Usuarios administradores');
    console.log('  • events - Eventos/sesiones fotográficas');
    console.log('  • subjects - Alumnos/familias con tokens');
    console.log('  • photos - Fotos con watermark');
    console.log('  • orders - Pedidos de compra');
    console.log('  • order_items - Items de cada pedido');
    console.log('  • egress_metrics - Métricas de transferencia');
    console.log('');
    console.log('Próximos pasos:');
    console.log('  1. Verifica las tablas en Supabase Dashboard');
    console.log('  2. Configura el Storage bucket (photos-bucket)');
    console.log('  3. Prueba la aplicación con npm run dev');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
setupDatabase().catch(console.error);