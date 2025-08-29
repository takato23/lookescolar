import { NextRequest, NextResponse } from 'next/server';
import { qrDetectionService } from '@/lib/services/qr-detection.service';
import { adminAuth } from '@/lib/security/admin-auth';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

const detectQRSchema = z.object({
  eventId: z.string().uuid('Invalid event ID').optional(),
  images: z
    .array(
      z.object({
        filename: z.string().min(1, 'Filename is required'),
        buffer: z.string().min(1, 'Image data is required'), // Base64 encoded
      })
    )
    .min(1, 'At least one image is required')
    .max(10, 'Maximum 10 images per request'),
  options: z
    .object({
      maxWidth: z.number().min(100).max(4096).optional(),
      maxHeight: z.number().min(100).max(4096).optional(),
      enhanceContrast: z.boolean().optional(),
      rotateDegrees: z.array(z.number()).optional(),
    })
    .optional(),
});

/**
 * Detect QR codes in uploaded images
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Check admin authentication
    const authResult = await adminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = detectQRSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { eventId, images, options } = validation.data;

    // Convert base64 images to buffers
    const imageBuffers = images.map((img) => ({
      filename: img.filename,
      buffer: Buffer.from(img.buffer, 'base64'),
      eventId,
    }));

    // Detect QR codes in batch
    const results = await qrDetectionService.batchDetectQRCodes(
      imageBuffers,
      options
    );

    const totalQRs = results.reduce((sum, r) => sum + r.qrCodes.length, 0);
    const successCount = results.filter((r) => !r.error).length;

    logger.info('QR detection completed via API', {
      requestId,
      adminUserId: authResult.userId,
      eventId,
      totalImages: images.length,
      successCount,
      totalQRsDetected: totalQRs,
    });

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          totalImages: images.length,
          successfulImages: successCount,
          failedImages: images.length - successCount,
          totalQRsDetected: totalQRs,
        },
      },
    });
  } catch (error) {
    logger.error('QR detection API error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'QR detection failed',
        code: 'DETECTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
