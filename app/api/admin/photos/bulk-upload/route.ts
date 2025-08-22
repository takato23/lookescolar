import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { storageService } from '@/lib/services/storage';
import { verifyAuthAdmin } from '@/lib/security/auth';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import sharp from 'sharp';
import { FreeTierOptimizer } from '@/lib/services/free-tier-optimizer';

// Input validation schema
const BulkUploadSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  photos: z.array(z.object({
    filename: z.string().min(1, 'Filename required'),
    size: z.number().positive('Invalid file size'),
    type: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/i, 'Invalid file type'),
    base64Data: z.string().min(1, 'Photo data required')
  })).min(1, 'At least one photo required').max(100, 'Maximum 100 photos per batch'),
  processingOptions: z.object({
    generatePreviews: z.boolean().default(true),
    detectQrCodes: z.boolean().default(true),
    processWatermarks: z.boolean().default(true),
    autoClassify: z.boolean().default(false)
  }).optional()
});

type UploadResult = {
  id: string;
  filename: string;
  status: 'success' | 'error';
  error?: string;
  processing_status: string;
  detected_qr_codes?: string[];
};

// QR Code detection using a simple pattern match
// In production, this would use a proper QR code detection library
async function detectQrCodes(imageBuffer: Buffer): Promise<string[]> {
  try {
    // This is a placeholder - in production you'd use a proper QR detection library
    // such as jsQR or a server-side QR detection service
    const qrCodes: string[] = [];
    
    // For now, we'll check for QR-like patterns in the filename or metadata
    // Real implementation would scan the actual image for QR codes
    
    return qrCodes;
  } catch (error) {
    console.error('QR detection error:', error);
    return [];
  }
}

// Process a single photo upload
async function processSinglePhoto(
  photo: { filename: string; size: number; type: string; base64Data: string },
  eventId: string,
  options: { generatePreviews: boolean; detectQrCodes: boolean; processWatermarks: boolean }
): Promise<UploadResult> {
  try {
    // Convert base64 to buffer
    const base64Data = photo.base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Validate image
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image data');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = photo.type.split('/')[1];
    const uniqueFilename = `${timestamp}-${randomSuffix}-${photo.filename.replace(/\.[^/.]+$/, '')}.${fileExtension}`;

    // Use Free Tier Optimizer for aggressive compression and watermarking
    // NO original storage - only optimized previews
    const containerPrefix = `events/${eventId}`;
    const previewPath = `${containerPrefix}/previews/${uniqueFilename}.webp`;

    // Get event name for watermark
    let wmLabel = 'Look Escolar';
    try {
      const { data: evInfo } = await supabaseAdmin
        .from('events')
        .select('name, school_name')
        .eq('id', eventId)
        .single();
      if (evInfo?.name || evInfo?.school_name) {
        wmLabel = `${evInfo.school_name || ''}${evInfo.school_name && evInfo.name ? ' · ' : ''}${evInfo.name || ''}`.trim() || wmLabel;
      }
    } catch {}

    // Process image with FreeTierOptimizer (no original storage)
    const optimizedResult = await FreeTierOptimizer.processForFreeTier(
      imageBuffer,
      {
        targetSizeKB: 35, // Aggressive compression for free tier
        maxDimension: 500, // Reduced dimensions for better compression
        watermarkText: wmLabel,
        enableOriginalStorage: false // NEVER store originals
      }
    );

    const previewBuffer = optimizedResult.processedBuffer;

    // Upload optimized preview to public bucket (NO original storage)
    const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';
    const { error: uploadError } = await supabaseAdmin.storage
      .from(PREVIEW_BUCKET)
      .upload(previewPath, previewBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Detect QR codes if enabled
    let detectedQrCodes: string[] = [];
    if (options.detectQrCodes) {
      detectedQrCodes = await detectQrCodes(imageBuffer);
    }

    // Create photo record in database (only with preview path)
    const { data: photoData, error: dbError } = await supabaseAdmin
      .from('photos')
      .insert({
        event_id: eventId,
        filename: uniqueFilename,
        original_filename: photo.filename,
        preview_path: previewPath, // Only store preview path
        file_size: optimizedResult.actualSizeKB * 1024, // Use optimized size
        mime_type: 'image/webp', // Always WebP for optimized images
        width: optimizedResult.finalDimensions.width,
        height: optimizedResult.finalDimensions.height,
        photo_type: 'individual',
        processing_status: 'completed', // Already processed
        detected_qr_codes: JSON.stringify(detectedQrCodes),
        approved: false,
        metadata: {
          freetier_optimized: true,
          compression_level: optimizedResult.compressionLevel,
          original_size: photo.size,
          optimization_ratio: Math.round((photo.size - optimizedResult.actualSizeKB * 1024) / photo.size * 100)
        }
      })
      .select('id, filename, processing_status')
      .single();

    if (dbError) {
      // Clean up uploaded preview on database error
      await supabaseAdmin.storage
        .from(PREVIEW_BUCKET)
        .remove([previewPath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    return {
      id: photoData.id,
      filename: photoData.filename,
      status: 'success',
      processing_status: photoData.processing_status,
      detected_qr_codes: detectedQrCodes
    };

  } catch (error) {
    console.error('Photo processing error:', error);
    return {
      id: '',
      filename: photo.filename,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      processing_status: 'failed'
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(req);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Verify admin authentication
    const user = await verifyAuthAdmin();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = BulkUploadSchema.parse(body);

    // Verify event exists and user has access
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, name, status')
      .eq('id', validatedData.eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'Event is not active' },
        { status: 400 }
      );
    }

    // Process all photos
    const results: UploadResult[] = [];
    
    for (const photo of validatedData.photos) {
      const result = await processSinglePhoto(
        photo,
        validatedData.eventId,
        {
          generatePreviews: validatedData.processingOptions?.generatePreviews ?? true,
          detectQrCodes: validatedData.processingOptions?.detectQrCodes ?? true,
          processWatermarks: validatedData.processingOptions?.processWatermarks ?? true
        }
      );
      results.push(result);
    }

    // Calculate success/failure statistics
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Processed ${results.length} photos: ${successCount} successful, ${errorCount} failed`,
      results,
      statistics: {
        total: results.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}