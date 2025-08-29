import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');

    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client created');

    // Test a simple query
    const { data, error } = await supabase.from('orders').select('id').limit(1);

    if (error) {
      console.error('Error querying orders:', error);
      return;
    }

    console.log('Successfully queried orders table');
    console.log('Data:', data);
  } catch (error) {
    console.error('Error in testSupabase:', error);
  }
}

testSupabase();
