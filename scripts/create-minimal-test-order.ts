#!/usr/bin/env node

/**
 * CREATE MINIMAL TEST ORDER
 * Create a basic order that matches the actual table structure
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMinimalOrder() {
  console.log('🛒 Creating minimal test order...\n');

  try {
    // Get existing event
    const { data: events } = await supabase
      .from('events')
      .select('id, name')
      .limit(1);

    if (!events || events.length === 0) {
      console.log('❌ No events found. Create an event first.');
      return;
    }

    const event = events[0];
    console.log(`📅 Using event: ${event.name} (${event.id})`);

    // Try to create order with required fields based on error messages
    const testOrder = {
      event_id: event.id,
      order_number: `TEST-${Date.now()}`,
      status: 'pending'
    };

    console.log('📝 Attempting to create order with:', testOrder);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();

    if (orderError) {
      console.log('❌ Order creation failed:', orderError.message);

      // Try to understand what fields are actually required
      console.log('\n🔍 Trying to inspect table structure...');

      // This is a workaround to see what happens with different fields
      const attempts = [
        { event_id: event.id, order_number: `TEST-A-${Date.now()}`, status: 'pending' },
        { event_id: event.id, order_number: `TEST-B-${Date.now()}` },
        { order_number: `TEST-C-${Date.now()}`, status: 'pending' }
      ];

      for (const attempt of attempts) {
        try {
          const { error } = await supabase
            .from('orders')
            .insert(attempt);

          if (!error) {
            console.log(`✅ This worked: ${JSON.stringify(attempt)}`);
            break;
          } else {
            console.log(`❌ This failed: ${JSON.stringify(attempt)} - ${error.message}`);
          }
        } catch (err) {
          console.log(`❌ Exception: ${JSON.stringify(attempt)} - ${err}`);
        }
      }

    } else {
      console.log('✅ Order created successfully!');
      console.log('📋 Order details:', order);

      // Now test the MCP workflow tools with this order
      console.log('\n🚀 Testing MCP workflow tools...');
      console.log(`Order ID for testing: ${order.id}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createMinimalOrder().catch(console.error);
