const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEvents() {
    console.log('🚀 Debugging Events, Photos and Assets...\n');

    // 1. Fetch all events
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, status, created_at');

    if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return;
    }

    console.log(`Found ${events.length} events:`);
    console.table(events);

    // 2. Count photos/assets per event
    console.log('\n📊 Counts per event:');
    for (const event of events) {
        const { count: photoCount, error: photoError } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

        const { count: assetCount, error: assetError } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

        if (photoError) console.error(`Error counting photos for event ${event.id}:`, photoError.message);
        if (assetError) console.error(`Error counting assets for event ${event.id}:`, assetError.message);

        console.log(`- ${event.name} (${event.id}):`);
        console.log(`  - Photos (table photos): ${photoCount !== null ? photoCount : 'N/A'}`);
        console.log(`  - Assets (table assets): ${assetCount !== null ? assetCount : 'N/A'}`);
        console.log(`  - Status: ${event.status}`);
    }

    // 3. Check for orphaned items
    const { count: orphanedPhotos } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .is('event_id', null);

    const { count: orphanedAssets } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .is('event_id', null);

    console.log(`\n👻 Orphaned:`);
    console.log(`- Orphaned photos: ${orphanedPhotos}`);
    console.log(`- Orphaned assets: ${orphanedAssets}`);

    // 4. Try to find events NOT in the events table but referenced in photos/assets
    console.log('\n🔍 Searching for unknown event_ids in photos/assets...');

    const { data: photoEventIds } = await supabase.from('photos').select('event_id');
    const { data: assetEventIds } = await supabase.from('assets').select('event_id');

    const allEventIds = new Set(events.map(e => e.id));
    const unknownIds = new Set();

    if (photoEventIds) photoEventIds.forEach(p => { if (p.event_id && !allEventIds.has(p.event_id)) unknownIds.add(p.event_id); });
    if (assetEventIds) assetEventIds.forEach(a => { if (a.event_id && !allEventIds.has(a.event_id)) unknownIds.add(a.event_id); });

    if (unknownIds.size > 0) {
        console.log(`Found ${unknownIds.size} unknown event_ids:`);
        for (const id of unknownIds) {
            const { count: pCount } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('event_id', id);
            const { count: aCount } = await supabase.from('assets').select('*', { count: 'exact', head: true }).eq('event_id', id);
            console.log(`- Unknown Event ID ${id}: ${pCount} photos, ${aCount} assets`);
        }
    } else {
        console.log('No unknown event_ids found.');
    }

    // 5. Total counts
    const { count: totalPhotos } = await supabase.from('photos').select('*', { count: 'exact', head: true });
    const { count: totalAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true });
    console.log(`\n📈 Totals:`);
    console.log(`- Total photos: ${totalPhotos}`);
    console.log(`- Total assets: ${totalAssets}`);
}

debugEvents().catch(console.error);
