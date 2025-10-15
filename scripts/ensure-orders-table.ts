#!/usr/bin/env node

/**
 * ENSURE ORDERS TABLE EXISTS
 * Creates the orders table if it doesn't exist
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureOrdersTable() {
  console.log('🔧 Ensuring orders table exists...\n');

  try {
    // First, check if orders table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Orders table already exists');
      return;
    }

    // If table doesn't exist, try to create it via SQL
    console.log('📝 Orders table not found, creating it...');

    const sqlContent = fs.readFileSync('scripts/create-orders-table.sql', 'utf8');

    // Split SQL commands and execute them
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);

    for (const command of commands) {
      if (command.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: command.trim() + ';' });

        if (error) {
          console.log(`⚠️ Could not execute via RPC: ${error.message}`);
          // Try direct SQL execution
          try {
            await supabase.from('_temp').select('*').limit(0); // Dummy query to establish connection
          } catch (e) {
            // Ignore connection errors
          }
        }
      }
    }

    // Verify table was created
    const { data: verifyTable, error: verifyError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.log('❌ Failed to create orders table:', verifyError.message);
      console.log('🔧 You may need to run the migration manually:');
      console.log('   supabase/migrations/20250131_orders_only.sql');
    } else {
      console.log('✅ Orders table created successfully');
    }

  } catch (error) {
    console.error('❌ Error ensuring orders table:', error);
  }
}

ensureOrdersTable().catch(console.error);
