#!/usr/bin/env node

/**
 * 🔥 UNIFIED SYSTEM BACKFILL SCRIPT
 * 
 * Migrates existing photos from the legacy `photos` table to the modern `assets` table
 * This ensures all photos are visible in the unified interface
 * 
 * Usage:
 *   npx tsx scripts/backfill-photos-to-assets.ts [EVENT_ID] [--dry-run] [--folder-name=NAME]
 * 
 * Examples:
 *   npx tsx scripts/backfill-photos-to-assets.ts --dry-run  # Preview all changes
 *   npx tsx scripts/backfill-photos-to-assets.ts d8dc56fb-4fd8-4a9b-9ced-3d1df867bb99  # Migrate specific event
 *   npx tsx scripts/backfill-photos-to-assets.ts --folder-name="Imported Photos"  # Custom folder name
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LegacyPhoto {
  id: string;
  event_id: string;
  subject_id: string | null;
  storage_path: string;
  width?: number;
  height?: number;
  file_size?: number;
  approved: boolean;
  is_original: boolean;
  metadata: any;
  original_filename?: string;
  created_at: string;
}

interface AssetInsert {
  folder_id: string;
  filename: string;
  original_path: string;
  preview_path: string;
  checksum: string | null;
  file_size: number;
  mime_type: string;
  dimensions: { width: number | null; height: number | null };
  status: 'ready';
  metadata: {
    source: 'backfill-migration';
    legacy_photo_id: string;
    original_metadata?: any;
    migrated_at: string;
  };
  created_at: string;
}

async function getOrCreateImportFolder(eventId: string, folderName: string = 'Imported Photos'): Promise<string> {
  // Try to find existing import folder
  const { data: existingFolder, error: findError } = await supabase
    .from('folders')
    .select('id')
    .eq('event_id', eventId)
    .eq('name', folderName)
    .is('parent_id', null)
    .single();

  if (existingFolder) {
    console.log(`📁 Using existing folder: ${folderName} (${existingFolder.id})`);
    return existingFolder.id;
  }

  // Create new import folder
  const { data: newFolder, error: createError } = await supabase
    .from('folders')
    .insert({
      event_id: eventId,
      name: folderName,
      parent_id: null,
      depth: 0,
      sort_order: 999, // Place at end
    })
    .select('id')
    .single();

  if (createError) {
    throw new Error(`Failed to create import folder: ${createError.message}`);
  }

  console.log(`📁 Created new folder: ${folderName} (${newFolder.id})`);
  return newFolder.id;
}

async function generateChecksum(data: string): Promise<string> {
  // Simple checksum based on storage path + file size
  return Buffer.from(data, 'utf8').toString('hex').slice(0, 64).padEnd(64, '0');
}

async function backfillPhotosToAssets(eventId?: string, dryRun: boolean = false, folderName?: string) {
  console.log('🔥 UNIFIED SYSTEM BACKFILL - Photos to Assets Migration');
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  
  // Build query for legacy photos
  let query = supabase
    .from('photos')
    .select('*')
    .eq('approved', true) // Only migrate approved photos
    .order('created_at', { ascending: true });

  if (eventId) {
    query = query.eq('event_id', eventId);
    console.log(`📋 Filtering to event: ${eventId.substring(0, 8)}***`);
  }

  const { data: legacyPhotos, error: photosError } = await query;

  if (photosError) {
    throw new Error(`Failed to fetch legacy photos: ${photosError.message}`);
  }

  if (!legacyPhotos || legacyPhotos.length === 0) {
    console.log('✅ No legacy photos found to migrate');
    return;
  }

  console.log(`📸 Found ${legacyPhotos.length} legacy photos to migrate`);

  // Group photos by event
  const photosByEvent = legacyPhotos.reduce((acc, photo) => {
    if (!acc[photo.event_id]) {
      acc[photo.event_id] = [];
    }
    acc[photo.event_id].push(photo);
    return acc;
  }, {} as Record<string, LegacyPhoto[]>);

  let totalMigrated = 0;
  let totalSkipped = 0;
  const errors: Array<{ photo: LegacyPhoto; error: string }> = [];

  for (const [currentEventId, photos] of Object.entries(photosByEvent)) {
    console.log(`\n📁 Processing event ${currentEventId.substring(0, 8)}*** (${photos.length} photos)`);

    try {
      // Get or create import folder for this event
      let importFolderId: string;
      
      if (!dryRun) {
        importFolderId = await getOrCreateImportFolder(currentEventId, folderName);
      } else {
        importFolderId = 'dry-run-folder-id';
        console.log(`📁 [DRY RUN] Would create/use folder: ${folderName || 'Imported Photos'}`);
      }

      // Check for existing asset migrations to avoid duplicates
      const { data: existingAssets } = await supabase
        .from('assets')
        .select('metadata')
        .eq('folder_id', importFolderId);

      const existingPhotoIds = new Set(
        existingAssets
          ?.filter(a => a.metadata?.legacy_photo_id)
          .map(a => a.metadata.legacy_photo_id) || []
      );

      for (const photo of photos) {
        if (existingPhotoIds.has(photo.id)) {
          console.log(`⏭️  Skipping ${photo.id} - already migrated`);
          totalSkipped++;
          continue;
        }

        try {
          // Generate filename from storage path
          const filename = photo.original_filename || 
            photo.storage_path.split('/').pop() || 
            `photo-${photo.id}.webp`;

          // Generate checksum for deduplication
          const checksum = await generateChecksum(photo.storage_path + (photo.file_size || 0));

          // Prepare asset data
          const assetData: AssetInsert = {
            folder_id: importFolderId,
            filename,
            original_path: photo.storage_path,
            preview_path: photo.storage_path, // Same as original (already processed)
            checksum,
            file_size: photo.file_size || 0,
            mime_type: 'image/webp', // Assume WebP since it's from our system
            dimensions: {
              width: photo.width || null,
              height: photo.height || null
            },
            status: 'ready',
            metadata: {
              source: 'backfill-migration',
              legacy_photo_id: photo.id,
              original_metadata: photo.metadata,
              migrated_at: new Date().toISOString()
            },
            created_at: photo.created_at
          };

          if (dryRun) {
            console.log(`📋 [DRY RUN] Would migrate: ${filename} (${photo.id})`);
            console.log(`   Size: ${Math.round((photo.file_size || 0) / 1024)}KB`);
            console.log(`   Dimensions: ${photo.width || '?'}x${photo.height || '?'}`);
            console.log(`   Path: ${photo.storage_path}`);
          } else {
            // Insert asset
            const { error: insertError } = await supabase
              .from('assets')
              .insert(assetData);

            if (insertError) {
              throw new Error(`Insert failed: ${insertError.message}`);
            }

            console.log(`✅ Migrated: ${filename} → assets table`);
          }

          totalMigrated++;

        } catch (photoError) {
          const errorMsg = photoError instanceof Error ? photoError.message : 'Unknown error';
          console.error(`❌ Failed to migrate photo ${photo.id}: ${errorMsg}`);
          errors.push({ photo, error: errorMsg });
        }
      }

    } catch (eventError) {
      console.error(`❌ Failed to process event ${currentEventId}: ${eventError}`);
    }
  }

  // Summary
  console.log('\n🔥 UNIFIED MIGRATION SUMMARY');
  console.log('='.repeat(40));
  console.log(`✅ Successfully migrated: ${totalMigrated} photos`);
  console.log(`⏭️  Skipped (already exists): ${totalSkipped} photos`);
  console.log(`❌ Errors encountered: ${errors.length} photos`);

  if (errors.length > 0) {
    console.log('\n❌ Error Details:');
    errors.forEach(({ photo, error }, i) => {
      console.log(`${i + 1}. Photo ${photo.id}: ${error}`);
    });
  }

  if (dryRun) {
    console.log('\n🔍 This was a DRY RUN - no actual changes were made');
    console.log('Remove --dry-run flag to perform the actual migration');
  } else {
    console.log('\n🎉 Migration completed! Photos should now be visible in the unified interface');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const eventId = args.find(arg => !arg.startsWith('--') && arg.match(/^[a-f0-9-]{36}$/i));
  const folderNameArg = args.find(arg => arg.startsWith('--folder-name='));
  const folderName = folderNameArg ? folderNameArg.split('=')[1] : undefined;

  try {
    await backfillPhotosToAssets(eventId, dryRun, folderName);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Auto-execute
main().catch(console.error);