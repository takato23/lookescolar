const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenants() {
  console.log('🔍 Checking Tenants and Data partitioning...\n');

  // Check tenants table if it exists
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('*');

  if (tenantsError) {
    console.log('No tenants table found or error:', tenantsError.message);
  } else {
    console.log(`Found ${tenants.length} tenants:`);
    console.table(tenants);
  }

  // Check columns in events table
  const { data: eventCols, error: eventColsError } = await supabase
    .from('events')
    .select('*')
    .limit(1);

  if (eventCols \u0026\u0026 eventCols.length \u003e 0) {
    console.log('Columns in events table:', Object.keys(eventCols[0]));
  }
}

checkTenants().catch(console.error);
