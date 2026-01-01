import { NextRequest, NextResponse } from 'next/server';
import { qrService } from '@/lib/services/qr.service';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { getQrTaggingStatus } from '@/lib/qr/feature';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';

const validateQRSchema = z.object({
  qrCode: z.string().min(1, 'QR code value is required'),
  eventId: z.string().uuid('Invalid event ID').optional(),
});

/**
 * Validate QR code and return student data
 * This endpoint can be used during photo upload to automatically classify photos
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const validation = validateQRSchema.safeParse(body);

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

    const { qrCode, eventId } = validation.data;

    if (eventId) {
      const { tenantId } = resolveTenantFromHeaders(request.headers);
      const featureStatus = await getQrTaggingStatus({
        tenantId,
        eventId,
      });

      if (!featureStatus.enabled) {
        return NextResponse.json({
          success: false,
          valid: false,
          message: 'QR tagging disabled for this event',
        });
      }
    }

    // Validate the QR code
    const studentData = await qrService.validateStudentQRCode(qrCode, eventId);

    if (!studentData) {
      logger.info('QR code validation failed - not found or invalid', {
        requestId,
        qrCode: qrCode.substring(0, 20) + '***',
        eventId,
      });

      return NextResponse.json({
        success: false,
        valid: false,
        message: 'QR code not found or invalid',
      });
    }

    logger.info('QR code validated successfully', {
      requestId,
      qrCodeId: studentData.id,
      studentId: studentData.studentId?.substring(0, 8) + '***',
      eventId: studentData.eventId,
    });

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        id: studentData.id,
        eventId: studentData.eventId,
        courseId: studentData.courseId,
        studentId: studentData.studentId,
        studentName: studentData.metadata?.studentName,
        type: studentData.type,
        metadata: {
          title: studentData.metadata?.title,
          createdAt: studentData.metadata?.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('QR validation API error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'QR validation failed',
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
