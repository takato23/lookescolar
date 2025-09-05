import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  generateChecksum,
  checkDuplicateByChecksum,
} from '@/lib/services/checksum.service';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Validation schema for unified upload
const UploadSchema = z.object({
  folder_id: z.string().uuid(),
  files: z
    .array(
      z.object({
        filename: z.string().min(1).max(255),
        mime_type: z.string(),
        size: z.number().positive(),
      })
    )
    .min(1)
    .max(10), // Max 10 files per request
  generate_previews: z.boolean().default(true),
  watermark_text: z.string().optional(),
});

interface UploadResult {
  success: boolean;
  asset?: any;
  duplicate?: {
    id: string;
    filename: string;
    folder: string;
    path: string;
  };
  error?: string;
}

/**
 * Generate preview from image buffer using Sharp
 */
async function generatePreview(
  buffer: Buffer,
  mime_type: string,
  watermark_text?: string
): Promise<{ buffer: Buffer; filename: string }> {
  let image = sharp(buffer);

  // Resize to 1024px max width/height while maintaining aspect ratio
  image = image.resize(1024, 1024, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  // Add watermark if specified
  if (watermark_text) {
    const watermarkSvg = `
      <svg width="200" height="50">
        <text x="10" y="30" font-family="Arial" font-size="16" fill="white" fill-opacity="0.7">
          ${watermark_text}
        </text>
      </svg>
    `;

    const watermarkBuffer = Buffer.from(watermarkSvg);
    image = image.composite([
      {
        input: watermarkBuffer,
        gravity: 'southeast',
      },
    ]);
  }

  // Convert to WebP for optimal compression
  const processedBuffer = await image.webp({ quality: 85 }).toBuffer();

  return {
    buffer: processedBuffer,
    filename: `preview_${Date.now()}.webp`,
  };
}

/**
 * Upload file to Supabase storage
 */
async function uploadToStorage(
  supabase: any,
  bucket: string,
  path: string,
  buffer: Buffer,
  mime_type: string
): Promise<{ path: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: mime_type,
      upsert: false,
    });

  if (error) {
    return { path, error: error.message };
  }

  return { path: data.path };
}

// POST /api/admin/upload/unified - Upload files to unified system
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const folderId = formData.get('folder_id') as string;
    const generatePreviews = formData.get('generate_previews') !== 'false';
    const watermarkText =
      (formData.get('watermark_text') as string) || undefined;

    if (!folderId) {
      return NextResponse.json(
        { success: false, error: 'folder_id is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Verify admin access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify folder exists
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, path')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Process uploaded files
    const files = Array.from(formData.entries())
      .filter(([key]) => key.startsWith('file_'))
      .map(([_, file]) => file as File);

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    const results: UploadResult[] = [];
    const serviceRoleSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    for (const file of files) {
      try {
        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Generate checksum for deduplication
        const checksum = generateChecksum(buffer);

        // Check for duplicates
        const duplicateCheck = await checkDuplicateByChecksum(
          checksum,
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (duplicateCheck.isDuplicate) {
          results.push({
            success: false,
            duplicate: duplicateCheck.duplicateAsset,
            error: `Duplicate file detected: ${file.name}`,
          });
          continue;
        }

        // Get image dimensions if it's an image
        let dimensions = null;
        if (file.type.startsWith('image/')) {
          try {
            const metadata = await sharp(buffer).metadata();
            dimensions = {
              width: metadata.width || 0,
              height: metadata.height || 0,
            };
          } catch (e) {
            console.warn('Could not extract image dimensions:', e);
          }
        }

        // Generate storage paths
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop() || '';
        const baseFileName = file.name.replace(/\.[^/.]+$/, '');
        const originalPath = `${folder.path}/${baseFileName}_${timestamp}.${fileExtension}`;

        // Upload original file
        const originalUpload = await uploadToStorage(
          serviceRoleSupabase,
          'originals',
          originalPath,
          buffer,
          file.type
        );

        if (originalUpload.error) {
          results.push({
            success: false,
            error: `Failed to upload original: ${originalUpload.error}`,
          });
          continue;
        }

        // Generate and upload preview if it's an image
        let previewPath = null;
        if (generatePreviews && file.type.startsWith('image/')) {
          try {
            const preview = await generatePreview(
              buffer,
              file.type,
              watermarkText
            );
            const previewUploadPath = `${folder.path}/${baseFileName}_preview_${timestamp}.webp`;

            const previewUpload = await uploadToStorage(
              serviceRoleSupabase,
              'previews',
              previewUploadPath,
              preview.buffer,
              'image/webp'
            );

            if (!previewUpload.error) {
              previewPath = previewUpload.path;
            }
          } catch (e) {
            console.warn('Failed to generate preview:', e);
          }
        }

        // Create asset record
        const assetData = {
          folder_id: folderId,
          filename: file.name,
          original_path: originalUpload.path,
          preview_path: previewPath,
          checksum,
          file_size: file.size,
          mime_type: file.type,
          dimensions,
          status: 'ready' as const,
          metadata: {
            uploaded_by: user.id,
            upload_timestamp: new Date().toISOString(),
            watermark_applied: !!watermarkText,
            preview_generated: !!previewPath,
          },
        };

        const { data: newAsset, error: createError } = await supabase
          .from('assets')
          .insert(assetData)
          .select(
            `
            *,
            folder:folders!inner(
              id,
              name,
              path
            )
          `
          )
          .single();

        if (createError) {
          console.error('Error creating asset:', createError);
          results.push({
            success: false,
            error: `Failed to create asset record: ${createError.message}`,
          });
          continue;
        }

        results.push({
          success: true,
          asset: newAsset,
        });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        results.push({
          success: false,
          error: `Failed to process file: ${error}`,
        });
      }
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const duplicates = results.filter((r) => r.duplicate).length;

    return NextResponse.json({
      success: successful > 0,
      summary: {
        total: files.length,
        successful,
        failed,
        duplicates,
      },
      results,
      folder: {
        id: folder.id,
        name: folder.name,
        path: folder.path,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
