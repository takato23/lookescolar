const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnyData() {
    console.log('🔍 Checking for ANY data in photos, assets, events...\n');

    const tables = ['events', 'photos', 'assets', 'folders', 'subjects', 'orders'];

    for (const table of tables) {
        try {
            const { data, count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: false })
                .limit(5);

            if (error) {
                console.log(`❌ Table ${table}: Error - ${error.message}`);
            } else {
                console.log(`✅ Table ${table}: ${count} records found.`);
                if (data && data.length > 0) {
                    console.log(`   Sample from ${table}:`, JSON.stringify(data[0]).substring(0, 200) + '...');
                }
            }
        } catch (e) {
            console.log(`❌ Table ${table}: Exception - ${e.message}`);
        }
    }

    // Specifically check for ANY event_id in photos or assets
    console.log('\n🔍 Distinct event_ids in photos:');
    const { data: pIds } = await supabase.from('photos').select('event_id');
    const pSet = new Set((pIds || []).map(p => p.event_id).filter(id => id));
    console.log([...pSet]);

    console.log('\n🔍 Distinct event_ids in assets:');
    const { data: aIds } = await supabase.from('assets').select('event_id');
    const aSet = new Set((aIds || []).map(a => a.event_id).filter(id => id));
    console.log([...aSet]);
}

checkAnyData().catch(console.error);
