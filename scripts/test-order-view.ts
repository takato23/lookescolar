import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

async function testOrderView() {
  try {
    console.log('Testing order view connection...');
    
    const supabase = await createServerSupabaseServiceClient();
    console.log('Supabase client created successfully');
    
    // Test if we can query the view
    const { data, error } = await supabase
      .from('order_details_with_audit')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying order_details_with_audit view:', error);
      return;
    }
    
    console.log('Successfully queried order_details_with_audit view');
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error in testOrderView:', error);
  }
}

testOrderView();