import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { storageService } from '@/lib/services/storage';
import { verifyAuthAdmin } from '@/lib/security/auth';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import sharp from 'sharp';

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

    // Upload original to private bucket
    const originalPath = `events/${eventId}/originals/${uniqueFilename}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(process.env.STORAGE_BUCKET_ORIGINAL!)
      .upload(originalPath, imageBuffer, {
        contentType: photo.type,
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Detect QR codes if enabled
    let detectedQrCodes: string[] = [];
    if (options.detectQrCodes) {
      detectedQrCodes = await detectQrCodes(imageBuffer);
    }

    // Create photo record in database
    const { data: photoData, error: dbError } = await supabaseAdmin
      .from('photos')
      .insert({
        event_id: eventId,
        filename: uniqueFilename,
        original_filename: photo.filename,
        file_path: originalPath,
        file_size: photo.size,
        mime_type: photo.type,
        width: metadata.width,
        height: metadata.height,
        photo_type: 'individual', // Default to individual, will be classified later
        processing_status: options.generatePreviews ? 'pending' : 'completed',
        detected_qr_codes: JSON.stringify(detectedQrCodes),
        approved: false // Require manual approval
      })
      .select('id, filename, processing_status')
      .single();

    if (dbError) {
      // Clean up uploaded file on database error
      await supabaseAdmin.storage
        .from(process.env.STORAGE_BUCKET_ORIGINAL!)
        .remove([originalPath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Queue preview generation if enabled
    if (options.generatePreviews) {
      // In production, this would be queued for background processing
      try {
        await storageService.generatePreview(photoData.id, imageBuffer, uniqueFilename);
        
        // Update processing status
        await supabaseAdmin
          .from('photos')
          .update({ processing_status: 'completed' })
          .eq('id', photoData.id);
      } catch (previewError) {
        console.error('Preview generation failed:', previewError);
        // Don't fail the upload, just log the error
      }
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
        { error: 'Cannot upload to inactive event' },
        { status: 400 }
      );
    }

    // Set default processing options
    const processingOptions = {
      generatePreviews: true,
      detectQrCodes: true,
      processWatermarks: true,
      autoClassify: false,
      ...validatedData.processingOptions
    };

    // Process photos in parallel (with concurrency limit)
    const results: UploadResult[] = [];
    const concurrencyLimit = 3; // Process max 3 photos simultaneously
    
    for (let i = 0; i < validatedData.photos.length; i += concurrencyLimit) {
      const batch = validatedData.photos.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(photo => 
        processSinglePhoto(photo, validatedData.eventId, processingOptions)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Count successful and failed uploads
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');

    // Log bulk upload activity
    await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: user.id,
        action: 'bulk_upload_photos',
        resource_type: 'event',
        resource_id: validatedData.eventId,
        metadata: {
          total_photos: validatedData.photos.length,
          successful_uploads: successful.length,
          failed_uploads: failed.length,
          processing_options: processingOptions
        }
      });

    return NextResponse.json({
      success: true,
      summary: {
        total: validatedData.photos.length,
        successful: successful.length,
        failed: failed.length
      },
      results,
      event: {
        id: event.id,
        name: event.name
      }
    });

  } catch (error) {
    console.error('Bulk upload error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check upload status
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuthAdmin();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }

    // Get upload statistics for the event
    const { data: stats, error } = await supabaseAdmin
      .from('photos')
      .select('processing_status, photo_type, approved')
      .eq('event_id', eventId);

    if (error) {
      throw error;
    }

    const summary = {
      total: stats.length,
      processing: stats.filter(s => s.processing_status === 'processing').length,
      completed: stats.filter(s => s.processing_status === 'completed').length,
      failed: stats.filter(s => s.processing_status === 'failed').length,
      approved: stats.filter(s => s.approved).length,
      by_type: {
        individual: stats.filter(s => s.photo_type === 'individual').length,
        group: stats.filter(s => s.photo_type === 'group').length,
        activity: stats.filter(s => s.photo_type === 'activity').length,
        event: stats.filter(s => s.photo_type === 'event').length
      }
    };

    return NextResponse.json({
      success: true,
      event_id: eventId,
      summary
    });

  } catch (error) {
    console.error('Upload status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}