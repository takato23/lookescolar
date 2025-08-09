#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filename, sql) {
  console.log(`\n📄 Running migration: ${filename}`);
  console.log('─'.repeat(50));
  
  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      // Skip empty statements
      if (!statement || statement.length < 5) continue;
      
      // Log the type of operation
      const operationType = statement.split(/\s+/)[0].toUpperCase();
      console.log(`  → Executing ${operationType}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });
      
      if (error) {
        // Check if it's a benign error (like "already exists")
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist')) {
          console.log(`  ⚠️  Skipped (${error.message})`);
        } else {
          console.error(`  ❌ Error: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log(`  ✅ Success`);
        successCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary for ${filename}:`);
    console.log(`  ✅ Successful statements: ${successCount}`);
    if (errorCount > 0) {
      console.log(`  ❌ Failed statements: ${errorCount}`);
    }
    
    return errorCount === 0;
  } catch (err) {
    console.error(`❌ Migration failed: ${err.message}`);
    return false;
  }
}

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function if not exists...');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;
  
  // We'll execute this directly via the service client
  // Since we can't use rpc yet, we'll just note this needs to be done manually
  console.log('⚠️  Note: You may need to create the exec_sql function manually in Supabase SQL Editor:');
  console.log(createFunctionSQL);
  console.log('');
}

async function main() {
  console.log('🚀 Starting database migration process...\n');
  
  // Note about exec_sql function
  await createExecSqlFunction();
  
  // Read migration files
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  const migrations = [
    '010_fix_schema_mismatches.sql',
    '011_cleanup_conflicting_schemas.sql'
  ];
  
  let allSuccess = true;
  
  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);
    
    try {
      const sql = await fs.readFile(filePath, 'utf-8');
      const success = await runMigration(migration, sql);
      
      if (!success) {
        allSuccess = false;
      }
    } catch (err) {
      console.error(`❌ Failed to read migration file ${migration}: ${err.message}`);
      allSuccess = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allSuccess) {
    console.log('✅ All migrations completed successfully!');
    console.log('\n🔍 Next step: Run the verification script to ensure schema integrity');
    console.log('   node scripts/verify-schema.js');
  } else {
    console.log('⚠️  Some migrations had issues. Please review the output above.');
    console.log('\n💡 Tip: You can also apply migrations manually via Supabase SQL Editor');
  }
}

// Run the migration
main().catch(console.error);