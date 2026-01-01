const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAllFiles(bucketName, path = '') {
    const { data, error } = await supabase.storage.from(bucketName).list(path, { limit: 100 });

    if (error) {
        console.error(`Error listing ${bucketName}/${path}:`, error.message);
        return;
    }

    if (!data || data.length === 0) {
        // console.log(`Empty: ${bucketName}/${path}`);
        return;
    }

    for (const item of data) {
        const fullPath = path ? `${path}/${item.name}` : item.name;

        // Check if it's a folder (no ID usually means folder in this context, or it's just a common pattern)
        // However, sometimes files also don't have IDs in list() depending on adapter.
        // We'll treat everything without metadata or with id=null as potentially a folder

        if (!item.id) {
            console.log(`📁 FOLDER: ${bucketName}/${fullPath}`);
            // Recurse
            await listAllFiles(bucketName, fullPath);
        } else {
            console.log(`📄 FILE: ${bucketName}/${fullPath} (ID: ${item.id})`);
        }
    }
}

async function deepScan() {
    console.log('🚀 Starting Deep Storage Scan...');

    console.log('\n--- Scanning bucket: photos ---');
    await listAllFiles('photos', 'previews');

    console.log('\n--- Scanning bucket: photo-private ---');
    await listAllFiles('photo-private', 'originals');

    console.log('\n--- Scanning bucket: photo-private (events) ---');
    await listAllFiles('photo-private', 'events');
}

deepScan().catch(console.error);
