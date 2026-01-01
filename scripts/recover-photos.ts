
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recoverPhotos() {
    console.log('🚀 Starting Photo Recovery Process...');

    // 1. Create or Get the Recovery Event
    const recoveryEventId = '83070ba2-738e-4038-ab5e-0c42fe4a2880'; // Using the one found in debug/logs if possible, or we could generate new
    const recoveryEventName = 'Evento Recuperado (Graduación)';

    console.log(`\n📋 1. Checking/Creating Event: ${recoveryEventId}`);

    // Check if it exists (it shouldn't based on previous checks, but let's be safe)
    const { data: existingEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', recoveryEventId)
        .single();

    let eventId = recoveryEventId;

    if (existingEvent) {
        console.log('   ✅ Event already exists. Using existing event.');
    } else {
        console.log('   ⚠️ Event not found. Creating new event...');
        const { data: newEvent, error: createError } = await supabase
            .from('events')
            .insert({
                id: recoveryEventId,
                name: recoveryEventName,
                status: 'active',
                date: new Date().toISOString(),
                location: 'Recuperado del Storage',
                price_per_photo: 1000,
                tenant_id: '00000000-0000-0000-0000-000000000001'
                // Add other necessary fields if required by your schema constraints
            })
            .select()
            .single();

        if (createError) {
            console.error('   ❌ Error creating event:', createError.message);
            // Fallback: create without ID to let Postgres generate it if UUID fails
            if (createError.message.includes('uuid')) {
                console.log('   Retrying creation with auto-generated ID...');
                const { data: autoEvent, error: autoError } = await supabase
                    .from('events')
                    .insert({
                        name: recoveryEventName,
                        status: 'active',
                        date: new Date().toISOString(),
                        location: 'Recuperado del Storage',
                        price_per_photo: 1000,
                        tenant_id: '00000000-0000-0000-0000-000000000001'
                    })
                    .select()
                    .single();

                if (autoError) {
                    console.error('   ❌ Fatal error creating event:', autoError);
                    return;
                }
                eventId = autoEvent.id;
                console.log(`   ✅ Created event with new ID: ${eventId}`);
            } else {
                return;
            }
        } else {
            console.log('   ✅ Event created successfully.');
        }
    }

    // 2. Scan Storage for Orphans
    console.log('\n🔍 2. Scanning Storage for Orphaned Files...');

    // We'll look in photo-private/originals
    const { data: files, error: listError } = await supabase.storage
        .from('photo-private')
        .list('originals', { limit: 1000 });

    if (listError) {
        console.error('   ❌ Error listing files:', listError);
        return;
    }

    if (!files || files.length === 0) {
        console.log('   ⚠️ No files found in photo-private/originals');
        return;
    }

    const potentialPhotos = files.filter(f => f.id !== null); // Filter out folders
    console.log(`   Found ${potentialPhotos.length} potential files in root of originals.`);

    // 3. Insert Records
    console.log('\n💾 3. Restoring Photo Records...');
    let restoredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const file of potentialPhotos) {
        const originalPath = `originals/${file.name}`;

        // Check if photo record already exists
        const { data: existingPhoto } = await supabase
            .from('photos')
            .select('id')
            .eq('storage_path', originalPath)
            .single();

        if (existingPhoto) {
            skippedCount++;
            process.stdout.write('.');
            continue;
        }

        // Prepare metadata
        const fileName = file.name;
        // Guess a preview path (standard logic often is previews/{name}_preview.webp or similar)
        // But we saw previews were in root or folders. Let's assume standard behavior for now or just check existing logic.
        // Based on `analyze-paths`, previews seemed to be `previews/FILENAME_preview.webp`
        const previewName = fileName.replace(/\.[^/.]+$/, "") + "_preview.webp";
        const previewPath = `previews/${previewName}`;

        // Insert into photos table
        const { data: photo, error: photoError } = await supabase
            .from('photos')
            .insert({
                event_id: eventId,
                storage_path: originalPath,
                original_filename: fileName,
                approved: true,
                tenant_id: '00000000-0000-0000-0000-000000000001'
            })
            .select()
            .single();

        if (photoError) {
            if (errorCount === 0) console.error(`\n   ❌ Error linking ${fileName}:`, photoError.message);
            errorCount++;
        } else {
            restoredCount++;

            // Also try to insert into 'assets' if that table is being used as the new system
            // We'll do a basic insert there too just in case
            /* 
            await supabase.from('assets').insert({
                event_id: eventId,
                filename: fileName,
                original_path: originalPath,
                preview_path: previewPath,
                // appropriate fields for assets table
            });
            */
            process.stdout.write('✅');
        }
    }

    console.log('\n\n📊 Recovery Summary:');
    console.log(`   - Target Event ID: ${eventId}`);
    console.log(`   - Total Files Scanned: ${potentialPhotos.length}`);
    console.log(`   - Restored (Created): ${restoredCount}`);
    console.log(`   - Skipped (Already Existed): ${skippedCount}`);
    console.log(`   - Errors: ${errorCount}`);

    if (restoredCount > 0) {
        console.log('\n🎉 Success! You should now see the photos in the Admin Panel.');
    }
}

recoverPhotos().catch(console.error);
