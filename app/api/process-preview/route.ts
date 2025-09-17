import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Dynamic import of Sharp to avoid Vercel issues
let sharp: any = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('[ProcessPreview] Sharp not available, will use fallback');
}

// Validation schema
const ProcessPreviewSchema = z.object({
  assetId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { assetId } = ProcessPreviewSchema.parse(body);

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

    // Get asset record
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(
        `
        id,
        original_path,
        folder_id,
        original_filename,
        file_size,
        folders!inner(
          id,
          name,
          event_id,
          events(
            id,
            name,
            school_name
          )
        )
      `
      )
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from('assets')
      .update({ status: 'processing' })
      .eq('id', assetId);

    try {
      // Download original image
      const ORIGINAL_BUCKET =
        process.env['STORAGE_BUCKET_ORIGINAL'] ||
        process.env['STORAGE_BUCKET'] ||
        'photo-private';
      const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

      const { data: originalData, error: downloadError } = await supabase.storage
        .from(ORIGINAL_BUCKET)
        .download(asset.original_path);

      if (downloadError || !originalData) {
        throw new Error('Failed to download original image');
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await originalData.arrayBuffer());

      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      const { width, height, format } = metadata;

      // Generate watermark text
      const folder = asset.folders;
      const event = folder.events;
      let watermarkText = 'LookEscolar';

      if (event?.school_name && event?.name) {
        watermarkText = `${event.school_name} - ${event.name}`;
      } else if (event?.name) {
        watermarkText = event.name;
      } else if (folder.name) {
        watermarkText = folder.name;
      }

      // Create watermark SVG
      const watermarkSvg = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="watermark" patternUnits="userSpaceOnUse" width="400" height="200">
              <text x="200" y="100" text-anchor="middle" 
                    font-family="Arial, sans-serif" 
                    font-size="24" 
                    font-weight="bold"
                    fill="rgba(255,255,255,0.6)"
                    transform="rotate(-30 200 100)">
                ${watermarkText}
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#watermark)"/>
        </svg>
      `;

      // Process image with watermark
      let processedImage = sharp(buffer);

      // Resize to max 1600px while maintaining aspect ratio
      processedImage = processedImage.resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Add watermark overlay
      const watermarkBuffer = Buffer.from(watermarkSvg);
      processedImage = processedImage.composite([
        {
          input: watermarkBuffer,
          blend: 'over',
        },
      ]);

      // Convert to WebP and optimize for 35KB target
      let quality = 80;
      let imageBuffer: Buffer;
      let attempts = 0;
      const maxAttempts = 10;
      const targetSize = 35 * 1024; // 35KB

      do {
        imageBuffer = await processedImage
          .webp({ quality, effort: 6 })
          .toBuffer();

        if (imageBuffer.length <= targetSize || quality <= 20) {
          break;
        }

        quality -= 8;
        attempts++;
      } while (attempts < maxAttempts);

      // Generate preview path (standardized): previews/<basename>_preview.webp
      const baseName = String(asset.original_path)
        .split('/')
        .pop()!
        .replace(/\.[^.]+$/, '');
      const previewPath = `previews/${baseName}_preview.webp`;

      // Upload preview to public bucket
      const { error: uploadError } = await supabase.storage
        .from(PREVIEW_BUCKET)
        .upload(previewPath, imageBuffer, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error('Failed to upload preview image');
      }

      // Update asset record with preview information
      const updateData = {
        preview_path: previewPath,
        watermark_path: previewPath, // Same as preview for MVP
        width: width || null,
        height: height || null,
        status: 'ready',
        metadata: {
          ...asset.metadata,
          preview_size: imageBuffer.length,
          preview_quality: quality,
          original_format: format,
          processed_at: new Date().toISOString(),
        },
      };

      const { error: updateError } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', assetId);

      if (updateError) {
        throw new Error('Failed to update asset record');
      }

      return NextResponse.json({
        success: true,
        assetId,
        previewPath,
        previewSize: imageBuffer.length,
        quality,
        watermarkText,
        originalSize: asset.file_size,
        compressionRatio: Math.round(
          (1 - imageBuffer.length / asset.file_size) * 100
        ),
      });
    } catch (processingError) {
      console.error('Preview processing error:', processingError);

      // Update status to error
      await supabase
        .from('assets')
        .update({
          status: 'error',
          metadata: {
            ...asset.metadata,
            error:
              processingError instanceof Error
                ? processingError.message
                : 'Processing failed',
            error_at: new Date().toISOString(),
          },
        })
        .eq('id', assetId);

      return NextResponse.json(
        {
          success: false,
          error: 'Preview processing failed',
          details:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Process preview error:', error);

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
