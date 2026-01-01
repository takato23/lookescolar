import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { qrService } from '@/lib/services/qr.service';
import { parseStudentQRCode } from '@/lib/qr/format';

// Schema for QR decode request
const QRDecodeSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  eventId: z.string().uuid().optional(),
});

/**
 * POST /api/admin/qr/decode
 * Decodes and validates QR code, returns student information
 */
export const POST = withAuth(async function (request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const { qrCode, eventId } = QRDecodeSchema.parse(body);

    logger.info('QR decode request received', {
      requestId,
      qrCodeLength: qrCode.length,
    });

    const parsed = parseStudentQRCode(qrCode);
    if (!parsed) {
      return NextResponse.json(
        {
          error: 'Invalid QR code format',
          details: 'Expected LKSTUDENT_<token> or legacy STUDENT:<uuid>:<name>:<eventId>',
        },
        { status: 400 }
      );
    }

    const studentData = await qrService.validateStudentQRCode(qrCode, eventId);

    if (!studentData) {
      logger.warn('Invalid or unknown QR code', {
        requestId,
        qrCode: `${qrCode.substring(0, 10)}...`,
      });

      return NextResponse.json(
        {
          error: 'Invalid QR code',
          details: 'QR code not found or not linked to a student',
        },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;

    logger.info('QR decode successful', {
      requestId,
      studentId: studentData.studentId?.substring(0, 8) + '***',
      eventId: studentData.eventId,
      duration,
    });

    return NextResponse.json({
      success: true,
      student: {
        id: studentData.studentId,
        name: studentData.metadata?.studentName ?? 'Estudiante sin nombre',
        event_id: studentData.eventId,
        code_id: studentData.id,
      },
      metadata: {
        qr_format: parsed.kind,
        lookup_time_ms: duration,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.warn('Invalid request data', {
        requestId,
        errors: error.errors,
        duration,
      });

      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('QR decode error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to decode QR code',
      },
      { status: 500 }
    );
  }
});

// Rate limiting configuration
export const runtime = 'nodejs';
