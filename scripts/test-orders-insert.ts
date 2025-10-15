#!/usr/bin/env node

/**
 * TEST ORDERS INSERT
 * Test what columns are actually available in orders table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOrdersInsert() {
  console.log('🧪 Testing orders table insert...\n');

  try {
    // First, try to see what columns exist by attempting different inserts

    console.log('1️⃣ Testing minimal insert (id, status, created_at)...');
    const minimalOrder = {
      status: 'pending'
    };

    const { data: result1, error: error1 } = await supabase
      .from('orders')
      .insert(minimalOrder)
      .select();

    if (error1) {
      console.log('❌ Minimal insert failed:', error1.message);
    } else {
      console.log('✅ Minimal insert succeeded:', result1);
    }

    console.log('\n2️⃣ Testing with folder_id...');
    // Get a folder ID first
    const { data: folders } = await supabase
      .from('folders')
      .select('id')
      .limit(1);

    if (folders && folders.length > 0) {
      const orderWithFolder = {
        folder_id: folders[0].id,
        status: 'pending'
      };

      const { data: result2, error: error2 } = await supabase
        .from('orders')
        .insert(orderWithFolder)
        .select();

      if (error2) {
        console.log('❌ Folder insert failed:', error2.message);
      } else {
        console.log('✅ Folder insert succeeded:', result2);
      }
    } else {
      console.log('⚠️ No folders found to test with');
    }

    console.log('\n3️⃣ Testing with customer_name...');
    const orderWithName = {
      status: 'pending',
      customer_name: 'Test User'
    };

    const { data: result3, error: error3 } = await supabase
      .from('orders')
      .insert(orderWithName)
      .select();

    if (error3) {
      console.log('❌ Name insert failed:', error3.message);
    } else {
      console.log('✅ Name insert succeeded:', result3);
    }

    // Check what orders exist now
    const { data: allOrders, error: listError } = await supabase
      .from('orders')
      .select('*')
      .limit(10);

    if (listError) {
      console.log('❌ Could not list orders:', listError.message);
    } else {
      console.log(`\n📊 Current orders in table: ${allOrders.length}`);
      if (allOrders.length > 0) {
        console.log('Sample order:', JSON.stringify(allOrders[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testOrdersInsert().catch(console.error);
