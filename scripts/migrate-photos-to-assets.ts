#!/usr/bin/env tsx

/**
 * Migration script: Photos to Assets System
 *
 * This script migrates existing photos from the old event-based system
 * to the new folder/assets system.
 *
 * For each event:
 * 1. Creates a folder with the event name
 * 2. Migrates all photos to assets in that folder
 * 3. Preserves existing metadata
 */

import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

interface Event {
  id: string;
  name: string;
  location: string;
  date: string;
}

interface Photo {
  id: string;
  event_id: string;
  original_filename: string;
  storage_path: string;
  preview_path: string | null;
  watermark_path: string | null;
  file_size: number;
  width: number | null;
  height: number | null;
  approved: boolean;
  created_at: string;
}

async function migratePhotosToAssets() {
  try {
    console.log('🚀 Starting migration: Photos → Assets');
    console.log('=====================================');

    // 1. Get all events with photos
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: true });

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    console.log(`📂 Found ${events?.length || 0} events`);

    if (!events || events.length === 0) {
      console.log('✅ No events found, migration complete');
      return;
    }

    for (const event of events) {
      await migrateEventPhotos(event);
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function migrateEventPhotos(event: Event) {
  console.log(`\n📁 Processing event: ${event.name} (${event.id})`);

  // 1. Check if folder already exists for this event
  const { data: existingFolder } = await supabase
    .from('folders')
    .select('id, name, photo_count')
    .eq('event_id', event.id)
    .single();

  let folderId: string;

  if (existingFolder) {
    console.log(`   ↳ Using existing folder: ${existingFolder.name}`);
    folderId = existingFolder.id;
  } else {
    // 2. Create a new folder for this event
    const folderName = `${event.name} (${event.date})`;

    const { data: newFolder, error: folderError } = await supabase
      .from('folders')
      .insert({
        name: folderName,
        parent_id: null,
        event_id: event.id,
        depth: 0,
        sort_order: 0,
        photo_count: 0, // Will be updated by trigger
      })
      .select('id')
      .single();

    if (folderError) {
      console.error(`   ❌ Failed to create folder: ${folderError.message}`);
      return;
    }

    folderId = newFolder.id;
    console.log(`   ✅ Created folder: ${folderName}`);
  }

  // 3. Get all photos for this event
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', event.id)
    .order('created_at', { ascending: true });

  if (photosError) {
    console.error(`   ❌ Failed to fetch photos: ${photosError.message}`);
    return;
  }

  if (!photos || photos.length === 0) {
    console.log(`   ↳ No photos found for this event`);
    return;
  }

  console.log(`   📸 Found ${photos.length} photos to migrate`);

  // 4. Migrate each photo to an asset
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const photo of photos) {
    try {
      // Check if asset already exists for this photo
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('id')
        .eq('original_path', photo.storage_path)
        .single();

      if (existingAsset) {
        skippedCount++;
        continue; // Skip if already migrated
      }

      // Generate checksum if we have file size (approximate)
      const checksum = generatePhotoChecksum(photo);

      // Map paths to new system
      const previewPath =
        photo.preview_path ||
        (photo.watermark_path ? photo.watermark_path : null) ||
        `previews/${nanoid(12)}_preview.webp`;

      // Create asset record
      const { error: assetError } = await supabase.from('assets').insert({
        folder_id: folderId,
        filename: photo.original_filename,
        original_path: photo.storage_path,
        preview_path: previewPath,
        file_size: photo.file_size || 0,
        checksum: checksum,
        mime_type: getMimeTypeFromFilename(photo.original_filename),
        status: photo.approved ? 'ready' : 'pending',
        created_at: photo.created_at,
      });

      if (assetError) {
        console.error(
          `     ❌ Failed to create asset for ${photo.original_filename}: ${assetError.message}`
        );
        errorCount++;
      } else {
        migratedCount++;
      }
    } catch (error) {
      console.error(
        `     ❌ Error processing ${photo.original_filename}:`,
        error
      );
      errorCount++;
    }
  }

  console.log(
    `   📊 Results: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`
  );
}

function generatePhotoChecksum(photo: Photo): string {
  // Generate a pseudo-checksum based on available data
  const data = `${photo.id}-${photo.original_filename}-${photo.file_size}-${photo.created_at}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePhotosToAssets();
}

export { migratePhotosToAssets };
