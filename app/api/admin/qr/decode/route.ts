import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

// Schema for QR decode request
const QRDecodeSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
});

// Expected QR format: STUDENT:ID:NAME:EVENT_ID
const QR_PATTERN = /^STUDENT:([a-f0-9-]{36}):([^:]+):([a-f0-9-]{36})$/i;

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
    const { qrCode } = QRDecodeSchema.parse(body);

    logger.info('QR decode request received', {
      requestId,
      qrCodeLength: qrCode.length,
    });

    // Parse QR code format
    const match = qrCode.match(QR_PATTERN);
    if (!match) {
      logger.warn('Invalid QR code format', {
        requestId,
        qrCode: `${qrCode.substring(0, 10)}...`,
      });

      return NextResponse.json(
        {
          error: 'Invalid QR code format',
          details: 'Expected format: STUDENT:ID:NAME:EVENT_ID',
        },
        { status: 400 }
      );
    }

    const [, studentId, studentName, eventId] = match;

    // Validate UUIDs
    if (!isValidUUID(studentId) || !isValidUUID(eventId)) {
      logger.warn('Invalid UUIDs in QR code', {
        requestId,
        studentId: maskUUID(studentId),
        eventId: maskUUID(eventId),
      });

      return NextResponse.json(
        {
          error: 'Invalid QR code format',
          details: 'Student ID and Event ID must be valid UUIDs',
        },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role
    const supabase = await createServerSupabaseServiceClient();

    // Lookup student in database
    const { data: student, error: studentError } = await supabase
      .from('subjects')
      .select(
        `
        id,
        name,
        grade,
        token,
        event_id,
        token_expires_at,
        created_at,
        events (
          id,
          name,
          school_name,
          event_date,
          active
        )
      `
      )
      .eq('id', studentId)
      .eq('event_id', eventId)
      .single();

    if (studentError || !student) {
      logger.warn('Student not found', {
        requestId,
        studentId: maskUUID(studentId),
        eventId: maskUUID(eventId),
        error: studentError?.message,
      });

      return NextResponse.json(
        {
          error: 'Student not found',
          details: 'No student found with the provided ID and event ID',
        },
        { status: 404 }
      );
    }

    // Verify student name matches (fuzzy match for typos)
    if (!namesMatch(student.name, studentName)) {
      logger.warn('Student name mismatch', {
        requestId,
        studentId: maskUUID(studentId),
        expectedName: student.name,
        qrName: studentName,
      });

      return NextResponse.json(
        {
          error: 'Student name mismatch',
          details: 'The name in the QR code does not match the student record',
          expected: student.name,
          provided: studentName,
        },
        { status: 400 }
      );
    }

    // Check if event is active
    if (!student.events?.active) {
      logger.warn('Event is not active', {
        requestId,
        eventId: maskUUID(eventId),
        studentId: maskUUID(studentId),
      });

      return NextResponse.json(
        {
          error: 'Event not active',
          details: 'This event is no longer active for photo tagging',
        },
        { status: 400 }
      );
    }

    // Check if token is expired
    const tokenExpiresAt = student.token_expires_at
      ? new Date(student.token_expires_at)
      : null;
    const now = new Date();

    if (tokenExpiresAt && tokenExpiresAt < now) {
      logger.warn('Student token expired', {
        requestId,
        studentId: maskUUID(studentId),
        expiresAt: tokenExpiresAt.toISOString(),
      });

      return NextResponse.json(
        {
          error: 'Token expired',
          details: 'This student token has expired',
          expiresAt: tokenExpiresAt.toISOString(),
        },
        { status: 400 }
      );
    }

    // Get photo count for this student
    const { count: photoCount, error: countError } = await supabase
      .from('photo_subjects')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', studentId);

    if (countError) {
      logger.error('Error getting photo count', {
        requestId,
        studentId: maskUUID(studentId),
        error: countError.message,
      });
    }

    const duration = Date.now() - startTime;

    logger.info('QR decode successful', {
      requestId,
      studentId: maskUUID(studentId),
      eventId: maskUUID(eventId),
      photoCount: photoCount || 0,
      duration,
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        token: `tok_${student.token.substring(0, 3)}***`, // Masked for security
        event_id: student.event_id,
        photo_count: photoCount || 0,
        token_expires_at: student.token_expires_at,
        event: student.events
          ? {
              id: student.events.id,
              name: student.events.name,
              school_name: student.events.school_name,
              event_date: student.events.event_date,
              active: student.events.active,
            }
          : null,
      },
      metadata: {
        qr_format: 'valid',
        lookup_time_ms: duration,
        token_status: tokenExpiresAt
          ? tokenExpiresAt > now
            ? 'valid'
            : 'expired'
          : 'no_expiry',
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

/**
 * Validates if a string is a valid UUID
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Masks UUID for logging (shows first 8 chars + ***)
 */
function maskUUID(uuid: string): string {
  if (uuid.length < 8) return '***';
  return `${uuid.substring(0, 8)}***`;
}

/**
 * Fuzzy name matching to handle minor typos
 */
function namesMatch(expected: string, provided: string): boolean {
  // Normalize: trim, lowercase, remove extra spaces
  const normalize = (str: string) =>
    str.trim().toLowerCase().replace(/\s+/g, ' ');

  const expectedNorm = normalize(expected);
  const providedNorm = normalize(provided);

  // Exact match
  if (expectedNorm === providedNorm) return true;

  // Allow for minor differences (Levenshtein distance)
  const distance = levenshteinDistance(expectedNorm, providedNorm);
  const maxAllowedDistance = Math.floor(expectedNorm.length * 0.2); // 20% tolerance

  return distance <= maxAllowedDistance && distance <= 3; // Max 3 character diff
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Rate limiting configuration
export const runtime = 'nodejs';
