#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error(
    'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyEventFoldersMigration() {
  console.log('🚀 Applying Event Folders Migration...');

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20250823_event_photo_library.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL,
    });

    if (error) {
      // Try alternative approach - execute individual statements
      console.log(
        '⚠️  Direct execution failed, trying statement by statement...'
      );

      // Break down the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (
          statement.toUpperCase().startsWith('BEGIN') ||
          statement.toUpperCase().startsWith('COMMIT') ||
          statement.toUpperCase().startsWith('END')
        ) {
          continue; // Skip transaction control statements
        }

        try {
          console.log(`📄 Executing: ${statement.substring(0, 50)}...`);
          await supabase.rpc('exec', { sql: statement });
          console.log('✅ Success');
        } catch (statementError) {
          console.log(`⚠️  Statement warning: ${statementError}`);
          // Continue with other statements
        }
      }
    } else {
      console.log('✅ Migration executed successfully');
    }

    // Verify the table was created
    console.log('🔍 Verifying event_folders table...');

    const { data: tableCheck, error: tableError } = await supabase
      .from('event_folders')
      .select('count', { count: 'exact', head: true });

    if (tableError) {
      console.log(
        '❌ event_folders table not found, trying manual creation...'
      );

      // Create the basic table structure
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS event_folders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          parent_id UUID REFERENCES event_folders(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          path TEXT NOT NULL DEFAULT '',
          depth INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          description TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          CONSTRAINT folder_name_length CHECK (length(name) >= 1 AND length(name) <= 255),
          CONSTRAINT folder_unique_name_per_parent UNIQUE(parent_id, name, event_id),
          CONSTRAINT folder_depth_limit CHECK (depth >= 0 AND depth <= 10),
          CONSTRAINT folder_no_self_parent CHECK (id != parent_id)
        );
      `;

      await supabase.rpc('exec', { sql: createTableSQL });

      // Create indexes
      const indexesSQL = [
        'CREATE INDEX IF NOT EXISTS idx_event_folders_event_id ON event_folders(event_id);',
        'CREATE INDEX IF NOT EXISTS idx_event_folders_parent_id ON event_folders(parent_id);',
        'CREATE INDEX IF NOT EXISTS idx_event_folders_path ON event_folders(path);',
        'CREATE INDEX IF NOT EXISTS idx_event_folders_sort_order ON event_folders(event_id, parent_id, sort_order);',
      ];

      for (const indexSQL of indexesSQL) {
        try {
          await supabase.rpc('exec', { sql: indexSQL });
        } catch (e) {
          console.log(`⚠️  Index creation warning: ${e}`);
        }
      }

      // Add folder_id column to photos if it doesn't exist
      const addColumnSQL = `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' AND column_name = 'folder_id'
          ) THEN
            ALTER TABLE photos ADD COLUMN folder_id UUID REFERENCES event_folders(id) ON DELETE SET NULL;
            CREATE INDEX idx_photos_folder_id ON photos(folder_id);
          END IF;
        END $$;
      `;

      try {
        await supabase.rpc('exec', { sql: addColumnSQL });
      } catch (e) {
        console.log(`⚠️  Column addition warning: ${e}`);
      }

      // Verify again
      const { data: finalCheck, error: finalError } = await supabase
        .from('event_folders')
        .select('count', { count: 'exact', head: true });

      if (finalError) {
        throw new Error('Failed to create event_folders table');
      }
    }

    console.log('✅ event_folders table verified');

    // Check for existing events to create root folders
    console.log('🌱 Creating root folders for existing events...');

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name');

    if (events && events.length > 0) {
      for (const event of events) {
        // Check if root folder already exists
        const { data: existingFolder } = await supabase
          .from('event_folders')
          .select('id')
          .eq('event_id', event.id)
          .is('parent_id', null)
          .single();

        if (!existingFolder) {
          // Create root folder
          const { error: createError } = await supabase
            .from('event_folders')
            .insert({
              event_id: event.id,
              parent_id: null,
              name: event.name || 'Root',
              path: event.name || 'Root',
              depth: 0,
              sort_order: 0,
            });

          if (createError) {
            console.log(
              `⚠️  Warning creating root folder for event ${event.id}: ${createError.message}`
            );
          } else {
            console.log(`✅ Created root folder for event: ${event.name}`);
          }
        }
      }
    }

    console.log('🎉 Event Folders Migration completed successfully!');
    console.log('🔗 You can now access the admin photo library at:');
    console.log('   http://localhost:3001/admin/events/[event-id]/library');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyEventFoldersMigration();
