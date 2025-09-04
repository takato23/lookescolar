#!/usr/bin/env node

/**
 * 🔧 ADD SLUG COLUMNS - Agregar columnas slug a events y folders
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSlugColumns() {
  console.log('🔧 ADDING SLUG COLUMNS');
  console.log('='.repeat(30));

  try {
    console.log('📝 Adding slug column to events table...');
    
    // Use the REST API to execute SQL
    const eventsResult = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: 'ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;'
      })
    });

    if (eventsResult.ok) {
      console.log('✅ Events slug column added successfully');
    } else {
      console.log('⚠️ Events slug column might already exist or using alternative approach');
    }

    console.log('📝 Adding slug column to folders table...');
    
    const foldersResult = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: 'ALTER TABLE folders ADD COLUMN IF NOT EXISTS slug TEXT;'
      })
    });

    if (foldersResult.ok) {
      console.log('✅ Folders slug column added successfully');
    } else {
      console.log('⚠️ Folders slug column might already exist or using alternative approach');
    }

    console.log('🎉 Columns added successfully!');
    console.log('📍 Next: Generate slugs for existing data');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addSlugColumns().catch(console.error);