import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAndFixOrderView() {
  console.log('🔍 Checking order_details_with_audit view...');
  
  try {
    // First, check if the view exists by trying to query it
    const { data, error } = await supabase
      .from('order_details_with_audit')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Error querying order_details_with_audit view:', error.message);
      console.log('🔧 Attempting to recreate the view...');
      await recreateOrderView();
    } else {
      console.log('✅ order_details_with_audit view exists and is queryable');
      console.log(`Found ${data.length} orders in the view`);
    }
  } catch (error) {
    console.log('❌ Error in checkAndFixOrderView:', error.message);
  }
}

async function recreateOrderView() {
  try {
    // Drop the view if it exists
    console.log('🗑️  Dropping existing view if it exists...');
    const { error: dropError } = await supabase.rpc('execute_sql', {
      sql: 'DROP VIEW IF EXISTS order_details_with_audit'
    });
    
    if (dropError) {
      console.log('⚠️  Warning dropping view:', dropError.message);
    }
    
    // Create the view
    console.log('🔨 Creating order_details_with_audit view...');
    const createViewSQL = `
      CREATE OR REPLACE VIEW order_details_with_audit AS
      SELECT 
          o.*,
          -- Audit information
          (
              SELECT COUNT(*) 
              FROM order_audit_log oal 
              WHERE oal.order_id = o.id
          ) as audit_log_count,
          (
              SELECT jsonb_agg(
                  jsonb_build_object(
                      'action_type', oal.action_type,
                      'created_at', oal.created_at,
                      'changed_by_type', oal.changed_by_type,
                      'notes', oal.notes
                  ) ORDER BY oal.created_at DESC
              )
              FROM order_audit_log oal 
              WHERE oal.order_id = o.id
              LIMIT 10
          ) as recent_audit_events,
          -- Enhanced status information
          CASE 
              WHEN o.status = 'pending' AND o.created_at < NOW() - INTERVAL '24 hours' THEN 'pending_overdue'
              WHEN o.status = 'approved' AND o.estimated_delivery_date IS NOT NULL AND o.estimated_delivery_date < CURRENT_DATE THEN 'delivery_overdue'
              ELSE o.status
          END as enhanced_status,
          -- Time calculations
          EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 3600 as hours_since_created,
          CASE 
              WHEN o.last_status_change IS NOT NULL THEN 
                  EXTRACT(EPOCH FROM (NOW() - o.last_status_change)) / 3600
              ELSE NULL
          END as hours_since_status_change
      FROM orders o
    `;
    
    const { error: createError } = await supabase.rpc('execute_sql', {
      sql: createViewSQL
    });
    
    if (createError) {
      console.log('❌ Error creating view:', createError.message);
      return;
    }
    
    console.log('✅ order_details_with_audit view created successfully');
    
    // Test the view
    console.log('🧪 Testing the new view...');
    const { data, error } = await supabase
      .from('order_details_with_audit')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Error querying newly created view:', error.message);
    } else {
      console.log('✅ Successfully queried the new view');
      console.log(`Found ${data.length} orders in the view`);
    }
  } catch (error) {
    console.log('❌ Error recreating view:', error.message);
  }
}

checkAndFixOrderView().catch(console.error);