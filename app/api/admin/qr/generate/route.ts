import { NextRequest, NextResponse } from 'next/server';
import { qrService } from '@/lib/services/qr.service';
import { adminAuth } from '@/lib/security/admin-auth';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

const generateQRSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  studentId: z.string().uuid('Invalid student ID'),
  studentName: z.string().min(1, 'Student name is required'),
  courseId: z.string().uuid().optional(),
  options: z.object({
    size: z.number().min(100).max(800).optional(),
    errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
    margin: z.number().min(0).max(10).optional(),
  }).optional(),
});

const batchGenerateQRSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  students: z.array(z.object({
    id: z.string().uuid('Invalid student ID'),
    name: z.string().min(1, 'Student name is required'),
    courseId: z.string().uuid().optional(),
    metadata: z.record(z.any()).optional(),
  })).min(1, 'At least one student is required').max(100, 'Maximum 100 students per batch'),
  options: z.object({
    size: z.number().min(100).max(800).optional(),
    errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
    margin: z.number().min(0).max(10).optional(),
  }).optional(),
});

/**
 * Generate QR code for a single student
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
    const validation = generateQRSchema.safeParse(body);

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

    const { eventId, studentId, studentName, courseId, options } = validation.data;

    // Generate QR code for student identification
    const result = await qrService.generateStudentIdentificationQR(
      eventId,
      studentId,
      studentName,
      courseId,
      options
    );

    logger.info('QR code generated via API', {
      requestId,
      adminUserId: authResult.userId,
      eventId,
      studentId: studentId.substring(0, 8) + '***',
      qrCodeId: result.qrCode,
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCodeId: result.qrCode,
        dataUrl: result.dataUrl,
        token: result.token,
        studentName,
      },
    });

  } catch (error) {
    logger.error('QR generation API error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'QR code generation failed',
        code: 'GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate QR codes for multiple students in batch
 */
export async function PUT(request: NextRequest) {
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
    const validation = batchGenerateQRSchema.safeParse(body);

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

    const { eventId, students, options } = validation.data;

    // Generate QR codes in batch
    const results = await qrService.generateBatchStudentQRCodes({
      eventId,
      students,
      options,
    });

    const successCount = results.filter(r => !r.error).length;
    const failureCount = results.length - successCount;

    logger.info('Batch QR codes generated via API', {
      requestId,
      adminUserId: authResult.userId,
      eventId,
      totalStudents: students.length,
      successCount,
      failureCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: students.length,
          successful: successCount,
          failed: failureCount,
        },
      },
    });

  } catch (error) {
    logger.error('Batch QR generation API error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Batch QR code generation failed',
        code: 'BATCH_GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}