
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('Checking for store_configurations table...');
    const { count: configCount, error: configError } = await supabase
        .from('store_configurations')
        .select('*', { count: 'exact', head: true });

    if (configError) {
        console.log('Error checking store_configurations:', configError.message);
    } else {
        console.log(`Table store_configurations exists. Row count: ${configCount}`);
    }

    console.log('Checking for store_settings table...');
    const { count: settingsCount, error: settingsError } = await supabase
        .from('store_settings')
        .select('*', { count: 'exact', head: true });

    if (settingsError) {
        console.log('Error checking store_settings:', settingsError.message);
    } else {
        console.log(`Table store_settings exists. Row count: ${settingsCount}`);
    }
}

checkTable();
