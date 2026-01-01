const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllSchemas() {
    console.log('🔍 Listing all schemas and tables...\n');

    // Query pg_namespace for schemas
    const { data: schemas, error: schemaError } = await supabase
        .rpc('get_schemas'); // This might not exist, let's try direct query if possible or fallback

    if (schemaError) {
        console.log('RPC get_schemas failed, trying to query information_schema...');
        const { data: infoSchemas, error: infoError } = await supabase
            .from('information_schema.schemata')
            .select('schema_name');

        if (infoError) {
            console.log('Failed to query information_schema.schemata:', infoError.message);
        } else {
            console.log('Schemas found:', infoSchemas.map(s => s.schema_name));
        }
    } else {
        console.log('Schemas:', schemas);
    }

    // List tables in all potential schemas
    const potentialSchemas = ['public', 'storage', 'auth'];
    for (const schema of potentialSchemas) {
        console.log(`\n--- Schema: ${schema} ---`);
        const { data: tables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', schema);

        if (error) {
            console.log(`Error listing tables in ${schema}:`, error.message);
        } else {
            tables.forEach(t => console.log(`- ${t.table_name}`));
        }
    }
}

listAllSchemas().catch(console.error);
