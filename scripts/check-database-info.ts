import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDatabaseInfo() {
  console.log('🔍 Checking database schema and row counts...\n');
  
  const tables = ['subjects', 'photos', 'photo_subjects', 'events', 'subject_tokens'];
  
  for (const table of tables) {
    try {
      // Check if table exists by trying to count rows
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`📊 ${table}: ${count} rows`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err}`);
    }
  }
  
  console.log('\n✅ Database check completed');
}

checkDatabaseInfo().catch(console.error);