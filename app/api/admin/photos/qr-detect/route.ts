import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthAdmin } from '@/lib/security/auth';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import sharp from 'sharp';

// QR Detection schema
const QrDetectionSchema = z.object({
  photoIds: z.array(z.string().uuid()).optional(),
  eventId: z.string().uuid().optional(),
  autoMatch: z.boolean().default(true), // Auto-match detected QR codes to students
  updateExisting: z.boolean().default(false), // Re-process photos that already have QR data
});

// Mock QR detection function - in production, use a proper QR detection library
async function detectQrCodesInImage(imageBuffer: Buffer): Promise<string[]> {
  try {
    // This is a placeholder implementation
    // In production, you would use libraries like:
    // - jsQR (client-side)
    // - node-qrcode-decoder
    // - zxing-js (server-side)
    // - Computer vision APIs (Google Vision, AWS Rekognition)

    const qrCodes: string[] = [];

    // For demonstration, we'll create a simple pattern matcher
    // Real implementation would scan the actual image pixels

    // Example: Look for QR-like patterns in image metadata or EXIF data
    const metadata = await sharp(imageBuffer).metadata();

    // Simulate QR detection based on image characteristics
    // This is just for testing - replace with real QR detection
    if (
      metadata.width &&
      metadata.height &&
      metadata.width > 200 &&
      metadata.height > 200
    ) {
      // Simulate finding QR codes based on image size and characteristics
      // In reality, this would scan the actual image for QR patterns

      // Example QR code patterns that might be detected
      const simulatedQrCodes = [
        'STU-' + Math.random().toString(36).substr(2, 8),
        'STUDENT-' + Math.random().toString(36).substr(2, 10),
      ];

      // Randomly detect 0-2 QR codes for simulation
      const detectedCount = Math.floor(Math.random() * 3);
      qrCodes.push(...simulatedQrCodes.slice(0, detectedCount));
    }

    return qrCodes.filter((code) => code.length > 5); // Filter valid codes
  } catch (error) {
    console.error('QR detection error:', error);
    return [];
  }
}

// Match QR codes to students
async function matchQrCodesToStudents(qrCodes: string[], eventId: string) {
  if (qrCodes.length === 0) return [];

  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('id, name, qr_code')
    .eq('event_id', eventId)
    .in('qr_code', qrCodes);

  if (error) {
    console.error('Error matching QR codes to students:', error);
    return [];
  }

  return students || [];
}

// Process QR detection for a single photo
async function processPhotoQrDetection(
  photoId: string,
  autoMatch: boolean,
  eventId?: string
): Promise<{
  photoId: string;
  status: 'success' | 'error';
  detectedQrCodes: string[];
  matchedStudents: Array<{ id: string; name: string; qr_code: string }>;
  error?: string;
}> {
  try {
    // Get photo data
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .select('id, filename, file_path, event_id, detected_qr_codes')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return {
        photoId,
        status: 'error',
        detectedQrCodes: [],
        matchedStudents: [],
        error: 'Photo not found',
      };
    }

    // Get image from storage
    const { data: imageData, error: storageError } = await supabaseAdmin.storage
      .from(process.env.STORAGE_BUCKET_ORIGINAL!)
      .download(photo.file_path);

    if (storageError || !imageData) {
      return {
        photoId,
        status: 'error',
        detectedQrCodes: [],
        matchedStudents: [],
        error: 'Failed to download image',
      };
    }

    // Convert to buffer
    const imageBuffer = Buffer.from(await imageData.arrayBuffer());

    // Detect QR codes
    const detectedQrCodes = await detectQrCodesInImage(imageBuffer);

    // Update photo with detected QR codes
    await supabaseAdmin
      .from('photos')
      .update({ detected_qr_codes: JSON.stringify(detectedQrCodes) })
      .eq('id', photoId);

    let matchedStudents: Array<{ id: string; name: string; qr_code: string }> =
      [];

    // Auto-match to students if enabled
    if (autoMatch && detectedQrCodes.length > 0) {
      matchedStudents = await matchQrCodesToStudents(
        detectedQrCodes,
        eventId || photo.event_id
      );

      // Create photo-student associations for matched students
      if (matchedStudents.length > 0) {
        const photoStudentData = matchedStudents.map((student) => ({
          photo_id: photoId,
          student_id: student.id,
          confidence_score: 0.9, // High confidence for QR matches
          manual_review: false,
        }));

        await supabaseAdmin.from('photo_students').upsert(photoStudentData, {
          onConflict: 'photo_id,student_id',
          ignoreDuplicates: true,
        });

        // Update photo type to individual if students matched
        await supabaseAdmin
          .from('photos')
          .update({ photo_type: 'individual' })
          .eq('id', photoId);
      }
    }

    return {
      photoId,
      status: 'success',
      detectedQrCodes,
      matchedStudents,
    };
  } catch (error) {
    console.error('QR processing error:', error);
    return {
      photoId,
      status: 'error',
      detectedQrCodes: [],
      matchedStudents: [],
      error: error instanceof Error ? error.message : 'Unknown error',
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const validatedData = QrDetectionSchema.parse(body);

    let photoIds: string[] = [];

    // Get photo IDs to process
    if (validatedData.photoIds && validatedData.photoIds.length > 0) {
      photoIds = validatedData.photoIds;
    } else if (validatedData.eventId) {
      // Get all photos from event that need QR processing
      let query = supabaseAdmin
        .from('photos')
        .select('id')
        .eq('event_id', validatedData.eventId)
        .eq('processing_status', 'completed');

      // Only process photos without existing QR data unless updateExisting is true
      if (!validatedData.updateExisting) {
        query = query.or('detected_qr_codes.is.null,detected_qr_codes.eq.[]');
      }

      const { data: photos, error } = await query.limit(100); // Limit to prevent overload

      if (error) {
        throw error;
      }

      photoIds = photos?.map((p) => p.id) || [];
    } else {
      return NextResponse.json(
        { error: 'Either photoIds or eventId must be provided' },
        { status: 400 }
      );
    }

    if (photoIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No photos to process',
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
          qr_codes_detected: 0,
          students_matched: 0,
        },
        results: [],
      });
    }

    // Process photos in batches to avoid overwhelming the system
    const batchSize = 5;
    const results: Array<{
      photoId: string;
      status: 'success' | 'error';
      detectedQrCodes: string[];
      matchedStudents: Array<{ id: string; name: string; qr_code: string }>;
      error?: string;
    }> = [];

    for (let i = 0; i < photoIds.length; i += batchSize) {
      const batch = photoIds.slice(i, i + batchSize);
      const batchPromises = batch.map((photoId) =>
        processPhotoQrDetection(
          photoId,
          validatedData.autoMatch,
          validatedData.eventId
        )
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Calculate summary statistics
    const successful = results.filter((r) => r.status === 'success');
    const failed = results.filter((r) => r.status === 'error');
    const totalQrCodes = successful.reduce(
      (sum, r) => sum + r.detectedQrCodes.length,
      0
    );
    const totalMatches = successful.reduce(
      (sum, r) => sum + r.matchedStudents.length,
      0
    );

    // Log activity
    await supabaseAdmin.from('admin_activity').insert({
      admin_id: user.id,
      action: 'qr_detection_batch',
      resource_type: 'photo',
      metadata: {
        total_photos: photoIds.length,
        successful_detections: successful.length,
        failed_detections: failed.length,
        qr_codes_detected: totalQrCodes,
        students_matched: totalMatches,
        auto_match: validatedData.autoMatch,
        event_id: validatedData.eventId,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: photoIds.length,
        successful: successful.length,
        failed: failed.length,
        qr_codes_detected: totalQrCodes,
        students_matched: totalMatches,
      },
      results,
    });
  } catch (error) {
    console.error('QR detection error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
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

// GET endpoint to retrieve QR detection statistics
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuthAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Get QR detection statistics
    const { data: photos, error } = await supabaseAdmin
      .from('photos')
      .select('id, detected_qr_codes, photo_type')
      .eq('event_id', eventId);

    if (error) {
      throw error;
    }

    const stats = {
      total_photos: photos?.length || 0,
      photos_with_qr:
        photos?.filter((p) => {
          try {
            const qrCodes = JSON.parse(p.detected_qr_codes || '[]');
            return Array.isArray(qrCodes) && qrCodes.length > 0;
          } catch {
            return false;
          }
        }).length || 0,
      photos_without_qr:
        photos?.filter((p) => {
          try {
            const qrCodes = JSON.parse(p.detected_qr_codes || '[]');
            return !Array.isArray(qrCodes) || qrCodes.length === 0;
          } catch {
            return true;
          }
        }).length || 0,
      total_qr_codes:
        photos?.reduce((sum, p) => {
          try {
            const qrCodes = JSON.parse(p.detected_qr_codes || '[]');
            return sum + (Array.isArray(qrCodes) ? qrCodes.length : 0);
          } catch {
            return sum;
          }
        }, 0) || 0,
    };

    // Get matched students count
    const { data: matchedStudents, error: matchError } = await supabaseAdmin
      .from('photo_students')
      .select('student_id')
      .in('photo_id', photos?.map((p) => p.id) || []);

    if (!matchError && matchedStudents) {
      stats.matched_students = new Set(
        matchedStudents.map((m) => m.student_id)
      ).size;
    }

    return NextResponse.json({
      success: true,
      event_id: eventId,
      qr_detection_stats: stats,
    });
  } catch (error) {
    console.error('QR stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
