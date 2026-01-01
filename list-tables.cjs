const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public');

  if (error) {
    // If we can't query pg_tables directly, try to infer from common tables
    console.log('Unable to query pg_tables, trying to list common tables...');
    const tables = ['events', 'photos', 'folders', 'subjects', 'orders', 'users', 'profiles'];
    for (const table of tables) {
        const { error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!tableError) console.log(`✅ Table exists: ${table}`);
        else console.log(`❌ Table missing or error for: ${table} (${tableError.message})`);
    }
  } else {
    console.log('Tables in public schema:');
    data.forEach(t => console.log(`- ${t.tablename}`));
  }
}

listTables().catch(console.error);
