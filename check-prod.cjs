const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// THE KEYS FROM .env.vercel.production
const supabaseUrl = "https://exaighpowgvbdappydyx.supabase.co";
const supabaseKey = "sb_secret_NzrbdSf8lGB1pEErXUjbrQ_33yCrBgI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductionData() {
    console.log('🔍 Checking for ANY data using PRODUCTION KEYS...\n');

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
                    console.table(data.map(d => ({
                        id: d.id,
                        name: d.name || d.original_filename || 'N/A',
                        created_at: d.created_at
                    })));
                }
            }
        } catch (e) {
            console.log(`❌ Table ${table}: Exception - ${e.message}`);
        }
    }

    // Check for the specific "419" or similar
    console.log('\n🔍 Searching for events with photos...');
    const { data: events } = await supabase.from('events').select('id, name');
    if (events) {
        for (const event of events) {
            const { count: pcount } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('event_id', event.id);
            const { count: acount } = await supabase.from('assets').select('*', { count: 'exact', head: true }).eq('event_id', event.id);
            console.log(`- Event ${event.name} (${event.id}): ${pcount} photos, ${acount} assets`);
        }
    }
}

checkProductionData().catch(console.error);
