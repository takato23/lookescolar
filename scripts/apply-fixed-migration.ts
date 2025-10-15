import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function applyFixedMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log('🚀 Aplicando migración corregida de public_access_tokens...\n');

    // Leer la migración corregida
    const migrationPath = 'supabase/migrations/202510070001_public_access_tokens.sql';
    const migrationSQL = readFileSync(resolve(process.cwd(), migrationPath), 'utf8');

    console.log('📄 Ejecutando migración completa (esta puede tomar tiempo)...');

    // Intentar ejecutar con RPC
    try {
      const { error: rpcError } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      });

      if (rpcError) {
        console.log('💡 RPC falló, aplicando manualmente...');
        throw rpcError;
      }

      console.log('✅ Migración aplicada exitosamente via RPC');
    } catch (rpcError) {
      console.log('📋 INSTRUCCIONES PARA APLICACIÓN MANUAL:');
      console.log('1. Ve a https://supabase.com → Tu proyecto → SQL Editor');
      console.log('2. Crea una nueva consulta');
      console.log('3. Copia y pega el contenido del archivo:');
      console.log('   supabase/migrations/202510070001_public_access_tokens.sql');
      console.log('4. Ejecuta la migración');
      console.log('5. Vuelve aquí y confirma que se aplicó');
      console.log('');
      console.log('¿Ya aplicaste la migración? (y/N): ');

      // Esperar confirmación del usuario
      process.stdout.write('Respuesta: ');
      process.stdin.once('data', async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          await verifyMigration(supabase);
        } else {
          console.log('❌ Migración no aplicada. Saliendo...');
          process.exit(1);
        }
      });
      return;
    }

    await verifyMigration(supabase);

  } catch (error: any) {
    console.error('❌ Error aplicando migración:', error?.message || error);
  }
}

async function verifyMigration(supabase: any) {
  console.log('\n🔍 Verificando migración...');

  // Verificar tabla public_access_tokens
  try {
    const { count, error } = await supabase
      .from('public_access_tokens')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Error verificando public_access_tokens:', error.message);
    } else {
      console.log(`✅ Tabla public_access_tokens existe (${count} registros)`);
    }
  } catch (error) {
    console.log('❌ Error verificando tabla');
  }

  // Verificar que el token problemático ahora funcione
  try {
    const token = 'cbe7d4605d512e4097f9284e5c8d20f03d2081a8dc838b3d2c10604c18dde5ec';
    const { data, error } = await supabase
      .rpc('get_store_data', { p_token: token })
      .single();

    if (error) {
      console.log('❌ Token aún no funciona:', error.message);
    } else {
      console.log('✅ Token ahora funciona correctamente');
    }
  } catch (error) {
    console.log('❌ Error verificando token');
  }

  console.log('\n🎉 Verificación completada!');
  console.log('Ahora puedes aplicar la segunda migración (folder_id) y reiniciar el servidor.');
}

void applyFixedMigration();
