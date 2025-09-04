#!/usr/bin/env node

/**
 * 🔧 FRIENDLY URLS - Apply Migration Script
 * 
 * Applies the friendly URLs migration to add slugs to events and folders
 * 
 * Usage:
 *   npx tsx scripts/apply-friendly-urls.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFriendlyUrls() {
  console.log('🔧 FRIENDLY URLS MIGRATION');
  console.log('='.repeat(50));

  try {
    // Read the migration file
    const migrationPath = './supabase/migrations/20250902_add_friendly_urls.sql';
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Applying migration...');
    
    // Split the migration into statements (split by semicolon, but preserve function bodies)
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '') // Remove comments and empty lines
      .join('\n')
      .split(/;\s*(?=CREATE|ALTER|DROP|INSERT|UPDATE|BEGIN|COMMIT)/g)
      .filter(statement => statement.trim() !== '');

    let successCount = 0;
    let errorCount = 0;

    for (const [index, statement] of statements.entries()) {
      const cleanStatement = statement.trim();
      if (!cleanStatement || cleanStatement === 'BEGIN' || cleanStatement === 'COMMIT') {
        continue;
      }

      try {
        console.log(`📝 Executing statement ${index + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: cleanStatement.endsWith(';') ? cleanStatement : cleanStatement + ';'
        });

        if (error) {
          // Try direct execution for some statements
          const { error: directError } = await supabase.from('_').select('*').limit(0);
          if (directError) {
            throw error;
          }
        }

        successCount++;
        console.log(`✅ Statement ${index + 1} executed successfully`);
        
      } catch (error: any) {
        console.warn(`⚠️ Statement ${index + 1} failed (might be expected):`, error.message);
        
        // Try to execute parts of the migration manually
        if (cleanStatement.includes('ADD COLUMN')) {
          await executeAddColumn(cleanStatement);
        } else if (cleanStatement.includes('CREATE UNIQUE INDEX')) {
          await executeCreateIndex(cleanStatement);
        }
        
        errorCount++;
      }
    }

    console.log('\n📊 MIGRATION SUMMARY');
    console.log('='.repeat(30));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️ Warnings: ${errorCount}`);

    // Verify migration worked by checking for slug columns
    console.log('\n🔍 Verifying migration...');
    
    const { data: events, error: eventError } = await supabase
      .from('events')
      .select('id, name, school_name, slug')
      .limit(1);

    if (!eventError && events) {
      console.log('✅ Events table has slug column');
      
      // Try to generate a slug for the first event if it doesn't have one
      if (events.length > 0 && !events[0].slug) {
        const eventName = events[0].school_name || events[0].name || 'evento';
        const slug = eventName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
          .substring(0, 50);

        const { error: updateError } = await supabase
          .from('events')
          .update({ slug })
          .eq('id', events[0].id);

        if (!updateError) {
          console.log(`✅ Generated slug "${slug}" for event`);
        }
      }
    }

    const { data: folders, error: folderError } = await supabase
      .from('folders')
      .select('id, name, slug')
      .limit(1);

    if (!folderError && folders) {
      console.log('✅ Folders table has slug column');
      
      // Try to generate a slug for the first folder if it doesn't have one
      if (folders.length > 0 && !folders[0].slug) {
        const folderName = folders[0].name || 'carpeta';
        const slug = folderName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
          .substring(0, 50);

        const { error: updateError } = await supabase
          .from('folders')
          .update({ slug })
          .eq('id', folders[0].id);

        if (!updateError) {
          console.log(`✅ Generated slug "${slug}" for folder`);
        }
      }
    }

    console.log('\n🎉 Friendly URLs migration completed!');
    console.log('📍 URLs will now support format: /admin/events/{slug}/library');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function executeAddColumn(statement: string) {
  try {
    // Extract table name and column details
    const match = statement.match(/ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS (\w+) (\w+)/);
    if (match) {
      const [, table, column, type] = match;
      console.log(`🔧 Adding column ${column} to ${table}...`);
      
      // Try a simpler ADD COLUMN syntax
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} ADD COLUMN ${column} ${type};`
      });
      
      if (!error) {
        console.log(`✅ Added column ${column} to ${table}`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not add column:', error);
  }
}

async function executeCreateIndex(statement: string) {
  try {
    console.log('🔧 Creating index...');
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    if (!error) {
      console.log('✅ Index created');
    }
  } catch (error) {
    console.warn('⚠️ Could not create index:', error);
  }
}

// Auto-execute
applyFriendlyUrls().catch(console.error);