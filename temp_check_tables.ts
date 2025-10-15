import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  console.log('🔍 Verificando tablas de orders...\n');

  const tablesToCheck = ['orders', 'unified_orders'];

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        console.log(`❌ Tabla '${table}' - Error: ${error.message}`);
      } else {
        console.log(`✅ Tabla '${table}' - Existe (${data?.length ?? 0} registros encontrados)`);
      }
    } catch (err) {
      console.log(`❌ Tabla '${table}' - Error de conexión`);
    }
  }
}

checkTables().catch(console.error);
