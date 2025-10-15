import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function applyMigration(migrationPath: string) {
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
    console.log(`🔄 Applying migration: ${migrationPath}`);

    // Read migration file
    const migrationSQL = readFileSync(resolve(process.cwd(), migrationPath), 'utf8');

    // Split by statements (basic approach - assumes ; separates statements)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toUpperCase().includes('COMMIT') ||
          statement.toUpperCase().includes('BEGIN') ||
          statement.trim() === '') {
        continue;
      }

      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        // Try direct SQL execution as fallback
        try {
          const { error: directError } = await supabase.from('_supabase_migration_temp').select('*').limit(0);
          if (directError) {
            // This will fail, but we can try to execute raw SQL
            console.log('💡 Attempting raw SQL execution...');
          }
        } catch {
          // Fallback: try to execute via a different method
        }

        throw error;
      }
    }

    console.log('✅ Migration applied successfully');

  } catch (error: any) {
    console.error('❌ Failed to apply migration:', error?.message || error);

    // Fallback: try to execute the entire migration as one statement
    console.log('🔄 Trying to execute entire migration as single statement...');

    try {
      const fullMigrationSQL = readFileSync(resolve(process.cwd(), migrationPath), 'utf8');
      const { error: fallbackError } = await supabase.rpc('exec_sql', {
        sql: fullMigrationSQL
      });

      if (fallbackError) {
        console.error('❌ Fallback execution also failed:', fallbackError);
        process.exit(1);
      } else {
        console.log('✅ Migration applied successfully via fallback');
      }
    } catch (fallbackError: any) {
      console.error('❌ All migration attempts failed:', fallbackError?.message || fallbackError);
      process.exit(1);
    }
  }
}

// Get migration path from command line
const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error('Usage: npx tsx scripts/apply-migration.ts <migration-file-path>');
  process.exit(1);
}

void applyMigration(migrationPath);
