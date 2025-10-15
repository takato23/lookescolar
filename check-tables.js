#!/usr/bin/env node

/**
 * Script to check if required tables exist and apply migrations if needed
 */

async function checkTables() {
  console.log('🔍 Checking database tables...\n');

  // This would need to be run with proper Supabase credentials
  // For now, let's just check what migrations exist

  const fs = require('fs');
  const path = require('path');

  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir);

  const tokenMigrations = files.filter(f =>
    f.includes('token') || f.includes('enhanced')
  ).sort();

  console.log('📋 Token-related migrations found:');
  tokenMigrations.forEach(file => {
    console.log(`  - ${file}`);
  });

  console.log('\n📋 Required tables:');
  console.log('  - enhanced_tokens');
  console.log('  - token_aliases');

  console.log('\n💡 Recommendation: Run migrations in order:');
  console.log('  1. npm run db:consolidate (or apply individual migrations)');
  console.log('  2. Check if tables exist in Supabase dashboard');
  console.log('  3. Test the aliases API endpoint');
}

checkTables().catch(console.error);
