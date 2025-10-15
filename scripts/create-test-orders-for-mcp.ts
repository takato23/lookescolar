#!/usr/bin/env node

/**
 * 🛒 CREATE TEST ORDERS FOR MCP TESTING
 * Crea pedidos de prueba para probar las herramientas workflow de MCP
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestDataForMCP() {
  console.log('🛒 CREATING TEST DATA FOR MCP WORKFLOW TOOLS');
  console.log('='.repeat(50));

  try {
    // 1. Create test event
    console.log('\n🏫 Creating test event...');
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Bautizo de Juan - Test MCP',
        description: 'Evento de prueba para testing de herramientas MCP',
        location: 'Iglesia San Miguel',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días en el futuro
        status: 'active',
        public_gallery_enabled: true
      })
      .select()
      .single();

    if (eventError) {
      console.error('❌ Error creating event:', eventError);
      return;
    }

    console.log('✅ Event created:', event.name);
    console.log('📋 Event ID:', event.id);

    // 2. Create test folder
    console.log('\n📁 Creating test folder...');
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .insert({
        name: 'Familia Rodríguez - Test',
        event_id: event.id,
        depth: 1,
        parent_id: null
      })
      .select()
      .single();

    if (folderError) {
      console.error('❌ Error creating folder:', folderError);
      return;
    }

    console.log('✅ Folder created:', folder.name);
    console.log('📋 Folder ID:', folder.id);

    // 3. Create test orders with different statuses
    console.log('\n🛒 Creating test orders...');

    // First, let's check what columns actually exist
    console.log('🔍 Checking orders table schema...');
    try {
      const { data: sampleOrder, error: sampleError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

      if (sampleError && sampleError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.log('⚠️ Could not query orders table:', sampleError.message);
      }
    } catch (err) {
      console.log('⚠️ Orders table might not be properly set up');
    }

    const testOrders = [
      {
        folder_id: folder.id,
        customer_name: 'María González',
        customer_email: 'maria@example.com',
        customer_phone: '+5491123456789',
        total_amount: 25000,
        status: 'pending',
        items: [{ type: 'photo_package', name: 'Paquete Básico', quantity: 1, price: 25000 }]
      },
      {
        folder_id: folder.id,
        customer_name: 'Carlos López',
        customer_email: 'carlos@example.com',
        customer_phone: '+5491198765432',
        total_amount: 45000,
        status: 'paid',
        items: [{ type: 'photo_package', name: 'Paquete Premium', quantity: 1, price: 45000 }]
      },
      {
        folder_id: folder.id,
        customer_name: 'Ana Martínez',
        customer_email: 'ana@example.com',
        customer_phone: '+5491134567890',
        total_amount: 35000,
        status: 'processing',
        items: [{ type: 'photo_package', name: 'Paquete Intermedio', quantity: 1, price: 35000 }]
      },
      {
        folder_id: folder.id,
        customer_name: 'Pedro Sánchez',
        customer_email: 'pedro@example.com',
        customer_phone: '+5491176543210',
        total_amount: 55000,
        status: 'delivered',
        items: [{ type: 'photo_package', name: 'Paquete Deluxe', quantity: 1, price: 55000 }]
      }
    ];

    const createdOrders = [];

    for (const orderData of testOrders) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Error creating order:', orderError);
        continue;
      }

      createdOrders.push(order);
      console.log(`✅ Order created: ${order.customer_name} (${order.status}) - ID: ${order.id}`);
    }

    // 4. Create some workflow configurations (if the table exists)
    console.log('\n⚙️ Checking for workflows table...');
    try {
      const { data: workflows, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .limit(1);

      if (!workflowError) {
        console.log('✅ Workflows table exists, checking existing workflows...');
        // If workflows exist, we're good. If not, the tools will handle it.
      }
    } catch (error) {
      console.log('⚠️ Workflows table not found or no workflows configured');
      console.log('ℹ️ The MCP workflow tools will still work, but may not find specific workflows');
    }

    // Summary
    console.log('\n🎉 TEST DATA CREATION COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📊 Event: ${event.name} (ID: ${event.id})`);
    console.log(`📁 Folder: ${folder.name} (ID: ${folder.id})`);
    console.log(`🛒 Orders created: ${createdOrders.length}`);
    console.log('\n📋 Order Status Summary:');
    createdOrders.forEach(order => {
      console.log(`   - ${order.customer_name}: ${order.status}`);
    });

    if (createdOrders.length > 0) {
      console.log('\n🚀 NOW YOU CAN TEST MCP TOOLS:');
      console.log(`   📅 agenda_workflow - Should show ${createdOrders.filter(o => o.status !== 'delivered').length} pending orders`);
      console.log(`   🔍 simular_workflow_pedido - Use orderId: ${createdOrders[0].id}`);
      console.log(`   ▶️ disparar_workflow_pedido - Test with orderId: ${createdOrders[0].id}`);
    } else {
      console.log('\n⚠️ No orders were created. Check the table structure.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestDataForMCP().catch(console.error);
