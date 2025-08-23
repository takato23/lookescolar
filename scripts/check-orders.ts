import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkOrders() {
  console.log('Checking order data...\n');
  
  try {
    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(5);
    
    if (ordersError) {
      console.log('❌ Error fetching orders:', ordersError.message);
      return;
    }
    
    console.log(`📊 Found ${orders.length} orders`);
    if (orders.length > 0) {
      console.log('Sample order:', orders[0]);
    }
    
    // Get order IDs
    const orderIds = orders.map(order => order.id);
    console.log('\nOrder IDs:', orderIds);
    
    // Test the order_details_with_audit view
    if (orderIds.length > 0) {
      console.log('\nTesting order_details_with_audit view...');
      const { data: orderDetails, error: detailsError } = await supabase
        .from('order_details_with_audit')
        .select('*')
        .eq('id', orderIds[0])
        .single();
      
      if (detailsError) {
        console.log('❌ Error fetching order details:', detailsError.message);
      } else {
        console.log('✅ Order details view working correctly');
        console.log('Sample order details:', {
          id: orderDetails.id,
          status: orderDetails.status,
          contact_name: orderDetails.contact_name,
          total_cents: orderDetails.total_cents
        });
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkOrders().catch(console.error);