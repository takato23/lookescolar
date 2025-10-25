import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { qrService } from '@/lib/services/qr.service';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const studentIdSchema = z.string().uuid('Invalid student ID');

/**
 * Get QR code for a student (family access)
 */
export async function GET(
  request: NextRequest, context: RouteContext<{ studentId: string }>) {
  const params = await context.params;
  const requestId = crypto.randomUUID();
  const { studentId: studentIdParam } = params;

  try {
    // Extract family token from headers
    const authorization = request.headers.get('authorization');
    const token = authorization?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const studentIdValidation = studentIdSchema.safeParse(studentIdParam);
    if (!studentIdValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid student ID',
          code: 'VALIDATION_ERROR',
          details: studentIdValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const studentId = studentIdValidation.data;

    // Verify family token and access to student
    const supabase = createServerSupabaseServiceClient();

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select(
        `
        id, 
        name, 
        access_token, 
        event_id,
        qr_code,
        metadata
      `
      )
      .eq('id', studentId)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json(
        { error: 'Student not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify family has access to this student
    if (subject.access_token !== token) {
      logger.warn('Unauthorized QR access attempt', {
        requestId,
        studentId: studentId.substring(0, 8) + '***',
        providedToken: token.substring(0, 8) + '***',
        actualToken: subject.access_token.substring(0, 8) + '***',
      });

      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 }
      );
    }

    // Get QR code information if exists
    if (!subject.qr_code) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No QR code generated for this student yet',
      });
    }

    // Get QR code details
    const qrCodeData = await qrService.getQRCode(subject.qr_code);

    if (!qrCodeData) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'QR code data not found',
      });
    }

    // Generate QR code image for display
    const qrResult = await qrService.generateQRForSubject(
      studentId,
      subject.name,
      {
        size: 200,
        errorCorrectionLevel: 'M',
      }
    );

    const responseData = {
      qrCodeId: qrCodeData.id,
      dataUrl: qrResult.dataUrl,
      token: qrCodeData.token,
      codeValue: qrCodeData.codeValue,
      createdAt: qrCodeData.metadata?.createdAt || new Date().toISOString(),
      isActive: true, // QR codes are active by default
      studentName: subject.name,
      eventId: subject.event_id,
    };

    logger.info('Family QR code accessed', {
      requestId,
      studentId: studentId.substring(0, 8) + '***',
      qrCodeId: qrCodeData.id,
      eventId: subject.event_id,
    });

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Family QR API error', {
      requestId,
      studentId: studentIdParam?.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to load QR code',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
