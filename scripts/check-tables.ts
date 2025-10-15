import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkTables() {
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
    console.log('🔍 Verificando tablas disponibles...\n');

    // Verificar tablas relacionadas con tokens
    const tablesToCheck = [
      'share_tokens',
      'subject_tokens',
      'student_tokens',
      'folders',
      'events',
      'public_access_tokens',
      'store_settings'
    ];

    for (const tableName of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error && error.code === 'PGRST116') {
          console.log(`❌ ${tableName}: NO EXISTE`);
        } else if (error) {
          console.log(`⚠️  ${tableName}: ERROR - ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: EXISTE (${count} registros)`);
        }
      } catch (error) {
        console.log(`❌ ${tableName}: ERROR AL VERIFICAR`);
      }
    }

    // Verificar share_tokens específicamente
    console.log('\n🔍 Verificando contenido de share_tokens...');
    const { data: shareTokens, error: shareError } = await supabase
      .from('share_tokens')
      .select('id, token, share_type, folder_id, event_id, is_active')
      .limit(5);

    if (shareError) {
      console.log('❌ Error consultando share_tokens:', shareError.message);
    } else {
      console.log('📊 Share tokens encontrados:');
      shareTokens?.forEach(token => {
        console.log(`  - ${token.token}: ${token.share_type} (${token.is_active ? 'activo' : 'inactivo'})`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
  }
}

void checkTables();
