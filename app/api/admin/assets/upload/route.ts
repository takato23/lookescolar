// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { logger } from '@/lib/utils/logger';
import { FreeTierOptimizer } from '@/lib/services/free-tier-optimizer';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/admin/assets/upload
 * Direct file upload for the new assets system
 * Accepts FormData with files and folder_id
 */
async function handlePOST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderId = formData.get('folder_id') as string;

    if (!folderId) {
      return NextResponse.json(
        { success: false, error: 'folder_id is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validation
    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_FILES = 10;

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Verify folder exists and fetch event for watermark label if available
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, event_id')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }

    const results = [];
    const errors = [];

    // Preload event label (optimistic)
    let watermarkLabel: string | null = null;
    try {
      if (folder?.event_id) {
        const { data: ev } = await supabase
          .from('events')
          .select('name, school_name')
          .eq('id', folder.event_id)
          .single();
        if (ev) {
          watermarkLabel =
            `${ev.school_name || ''}${ev.school_name && ev.name ? ' · ' : ''}${ev.name || ''}`.trim() ||
            'Look Escolar';
        }
      }
    } catch {}

    for (const file of files) {
      try {
        // Validate file
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          errors.push({ filename: file.name, error: 'Invalid file type' });
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          errors.push({ filename: file.name, error: 'File too large' });
          continue;
        }

        // Generate file paths
        const fileId = nanoid(12);
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const originalPath = `originals/${fileId}.${fileExt}`;
        let previewPath = `previews/${fileId}_preview.webp`; // Will be updated with multi-res path

        // Get file buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Generate checksum
        const checksum = crypto
          .createHash('sha256')
          .update(buffer)
          .digest('hex');

        // Check for duplicates
        const { data: existing } = await supabase
          .from('assets')
          .select('id, filename')
          .eq('checksum', checksum)
          .single();

        if (existing) {
          errors.push({
            filename: file.name,
            error: `Duplicate of ${existing.filename}`,
          });
          continue;
        }

        // Upload original file (kept private). In free tier deployments you may skip storing originals.
        const { error: uploadError } = await supabase.storage
          .from('photo-private')
          .upload(originalPath, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          logger.error('Upload failed', {
            filename: file.name,
            error: uploadError.message,
          });
          errors.push({ filename: file.name, error: 'Upload failed' });
          continue;
        }

        // Generate multi-resolution WebP versions: 300px, 800px, 1200px
        try {
          const multiResVersions = await FreeTierOptimizer.generateMultiResolutionWebP(
            buffer,
            watermarkLabel || 'LOOK ESCOLAR'
          );

          // Upload all versions
          for (const version of multiResVersions) {
            const versionPath = version.path.replace('preview_', ''); // e.g., 800.webp, 1200.webp
            await supabase.storage
              .from('photos')
              .upload(`previews/${fileId}_${versionPath}`, version.buffer, {
                contentType: 'image/webp',
                upsert: true,
              });
          }

          // Store path to 800px preview as primary (for compatibility)
          previewPath = `previews/${fileId}_800.webp`;
        } catch (previewError) {
          logger.warn('Preview generation failed', {
            filename: file.name,
            error:
              previewError instanceof Error
                ? previewError.message
                : previewError,
          });
          // Continue without preview
        }

        // Create asset record
        const { data: asset, error: insertError } = await supabase
          .from('assets')
          .insert({
            folder_id: folderId,
            filename: file.name,
            original_path: originalPath,
            preview_path: previewPath,
            file_size: file.size,
            checksum,
            mime_type: file.type,
            status: 'ready',
          })
          .select('id, filename')
          .single();

        if (insertError) {
          logger.error('Asset record creation failed', {
            filename: file.name,
            error: insertError.message,
          });

          // Cleanup uploaded file
          await supabase.storage.from('photo-private').remove([originalPath]);
          await supabase.storage.from('photos').remove([previewPath]);

          errors.push({ filename: file.name, error: 'Database error' });
          continue;
        }

        results.push({
          id: asset.id,
          filename: asset.filename,
          status: 'success',
        });

        logger.info('Asset uploaded successfully', {
          assetId: asset.id,
          filename: file.name,
          folderId,
          fileSize: file.size,
        });
      } catch (fileError) {
        logger.error('File processing error', {
          filename: file.name,
          error: fileError instanceof Error ? fileError.message : fileError,
        });
        errors.push({ filename: file.name, error: 'Processing failed' });
      }
    }

    const success = results.length > 0;
    // Update cached folder photo_count (delta or fallback recalc)
    if (success) {
      try {
        const delta = results.length;
        const rpcRes = await supabase.rpc('update_folder_photo_count_delta', {
          folder_id: folderId,
          delta,
        });
        if (rpcRes.error) {
          // Fallback: recalc precise count and set
          const [{ count: assetsCount }, { count: photosCount }] =
            await Promise.all([
              (await createServerSupabaseServiceClient())
                .from('assets')
                .select('id', { count: 'exact', head: true })
                .eq('folder_id', folderId),
              (await createServerSupabaseServiceClient())
                .from('photos')
                .select('id', { count: 'exact', head: true })
                .eq('subject_id', folderId),
            ]);
          const newCount = (assetsCount || 0) + (photosCount || 0);
          const { error: setErr } = await (
            await createServerSupabaseServiceClient()
          )
            .from('folders')
            .update({ photo_count: newCount })
            .eq('id', folderId);
          if (setErr) {
            logger.warn('Failed to set recalculated folder count (upload)', {
              folderId,
              error: setErr.message,
            });
          }
        }
      } catch (e: any) {
        logger.warn('Failed to update folder count after upload', {
          folderId,
          error: e?.message || String(e),
        });
      }
    }
    const response = {
      success,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors,
    };

    if (results.length > 0) {
      logger.info('Batch upload completed', {
        folderId,
        uploaded: results.length,
        failed: errors.length,
      });
    }

    return NextResponse.json(response, {
      status: success ? 200 : 400,
    });
  } catch (error) {
    logger.error('Upload API error', {
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = RateLimitMiddleware.withRateLimit(withAuth(handlePOST));
