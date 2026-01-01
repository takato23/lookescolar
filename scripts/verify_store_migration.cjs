
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We cannot import the service class directly because it's TypeScript and uses module imports incompatible with simple node script execution without ts-node/tsx.
// Instead, we will perform a "smoke test" by reading the DB directly using the query logic we implemented to ensure data exists.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
    console.log('--- Verifying Data Structures ---');

    // 1. Check Store Configurations
    const { data: configs, error: configError } = await supabase
        .from('store_configurations')
        .select('*')
        .limit(5);

    if (configError) console.error('Error fetching configurations:', configError);
    console.log(`Found ${configs?.length || 0} store configurations.`);
    if (configs && configs.length > 0) {
        console.log('Sample config:', JSON.stringify(configs[0], null, 2));
    }

    // 2. Check Products
    const { data: products, error: productError } = await supabase
        .from('products')
        .select('*')
        .limit(5);

    if (productError) console.error('Error fetching products:', productError);
    console.log(`Found ${products?.length || 0} products.`);
    if (products && products.length > 0) {
        console.log('Sample product:', JSON.stringify(products[0], null, 2));
    }

    // 3. Check Legacy Settings (fallback)
    const { data: legacy, error: legacyError } = await supabase
        .from('store_settings')
        .select('count')
        .limit(1);

    if (legacyError) console.error('Error fetching legacy settings:', legacyError);
    else console.log('Legacy settings table is accessible.');

    console.log('--- Verification Complete ---');
}

verifyMigration();
