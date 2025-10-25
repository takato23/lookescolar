import type { RouteContext } from '@/types/next-route';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['export', 'qr', 'tokens', 'email', 'archive', 'delete']),
  item_ids: z.array(z.string()).min(1, 'At least one student ID is required'),
  email_options: z
    .object({
      sendEmails: z.boolean().optional(),
      customMessage: z.string().optional(),
      includeQR: z.boolean().optional(),
    })
    .optional(),
});

// POST /api/admin/events/[id]/students/bulk
export const POST = withAuth(
  async (req: NextRequest, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  try {
      const eventId = params.id;
      const body = await req.json();

      // Validate input
      const validatedData = bulkActionSchema.parse(body);
      const { action, item_ids: studentIds, email_options } = validatedData;

      const supabase = await createServerSupabaseServiceClient();

      // Verify all students belong to this event
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(
          `
        id,
        name,
        email,
        parent_name,
        parent_email,
        qr_code,
        active,
        student_tokens!left (
          id,
          token,
          expires_at
        )
      `
        )
        .eq('event_id', eventId)
        .in('id', studentIds);

      if (studentsError || !students) {
        console.error('Error fetching students:', studentsError);
        return NextResponse.json(
          {
            error: 'Failed to fetch students',
            details: studentsError?.message,
          },
          { status: 500 }
        );
      }

      if (students.length !== studentIds.length) {
        return NextResponse.json(
          { error: 'Some students not found or do not belong to this event' },
          { status: 400 }
        );
      }

      // Execute the requested action
      switch (action) {
        case 'qr':
          return await generateQRCodes(supabase, students, eventId);

        case 'tokens':
          return await generateTokens(supabase, students);

        case 'email':
          return await sendEmails(supabase, students, email_options || {});

        case 'archive':
          return await archiveStudents(supabase, studentIds);

        case 'delete':
          return await deleteStudents(supabase, studentIds, eventId);

        default:
          return NextResponse.json(
            { error: 'Unsupported action' },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error(
        'Error in POST /api/admin/events/[id]/students/bulk:',
        error
      );

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// Generate QR codes for students who don't have them
async function generateQRCodes(
  supabase: any,
  students: any[],
  eventId: string
) {
  const results = {
    success_count: 0,
    error_count: 0,
    errors: [] as any[],
    generated_codes: [] as any[],
  };

  for (const student of students) {
    try {
      if (student.qr_code) {
        // Skip students who already have QR codes
        continue;
      }

      // Generate unique QR code
      const qrCode = await generateStudentQRCode(eventId, student.name);

      const { error } = await supabase
        .from('students')
        .update({ qr_code: qrCode, updated_at: new Date().toISOString() })
        .eq('id', student.id);

      if (error) {
        results.errors.push({
          student_id: student.id,
          student_name: student.name,
          error: error.message,
        });
        results.error_count++;
      } else {
        results.generated_codes.push({
          student_id: student.id,
          student_name: student.name,
          qr_code: qrCode,
        });
        results.success_count++;
      }
    } catch (error) {
      results.errors.push({
        student_id: student.id,
        student_name: student.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      results.error_count++;
    }
  }

  return NextResponse.json(results);
}

// Generate access tokens for students
async function generateTokens(supabase: any, students: any[]) {
  const results = {
    success_count: 0,
    error_count: 0,
    errors: [] as any[],
    generated_tokens: [] as any[],
  };

  for (const student of students) {
    try {
      // Check if student already has an active token
      const activeToken = student.student_tokens?.find(
        (t: any) => new Date(t.expires_at) > new Date()
      );

      if (activeToken) {
        // Skip students who already have active tokens
        continue;
      }

      // Generate new token
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { error } = await supabase.from('student_tokens').insert({
        student_id: student.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

      if (error) {
        results.errors.push({
          student_id: student.id,
          student_name: student.name,
          error: error.message,
        });
        results.error_count++;
      } else {
        results.generated_tokens.push({
          student_id: student.id,
          student_name: student.name,
          token,
          expires_at: expiresAt.toISOString(),
          access_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/f/${token}`,
        });
        results.success_count++;
      }
    } catch (error) {
      results.errors.push({
        student_id: student.id,
        student_name: student.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      results.error_count++;
    }
  }

  return NextResponse.json(results);
}

// Send emails with tokens to parents
async function sendEmails(supabase: any, students: any[], emailOptions: any) {
  const results = {
    success_count: 0,
    error_count: 0,
    errors: [] as any[],
    sent_emails: [] as any[],
  };

  // Note: This is a placeholder implementation
  // In a real application, you would integrate with an email service like SendGrid, Mailgun, etc.

  for (const student of students) {
    try {
      if (!student.parent_email) {
        results.errors.push({
          student_id: student.id,
          student_name: student.name,
          error: 'No parent email address',
        });
        results.error_count++;
        continue;
      }

      // Get or create active token
      let activeToken = student.student_tokens?.find(
        (t: any) => new Date(t.expires_at) > new Date()
      );

      if (!activeToken) {
        const token = generateSecureToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const { data: newTokenData, error: tokenError } = await supabase
          .from('student_tokens')
          .insert({
            student_id: student.id,
            token,
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (tokenError) {
          results.errors.push({
            student_id: student.id,
            student_name: student.name,
            error: `Failed to create token: ${tokenError.message}`,
          });
          results.error_count++;
          continue;
        }

        activeToken = { token, expires_at: expiresAt.toISOString() };
      }

      // TODO: Implement actual email sending
      // const emailSent = await sendStudentAccessEmail({
      //   to: student.parent_email,
      //   studentName: student.name,
      //   parentName: student.parent_name || 'Estimado padre/madre',
      //   accessUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/f/${activeToken.token}`,
      //   qrCode: emailOptions.includeQR ? student.qr_code : null,
      //   customMessage: emailOptions.customMessage,
      // });

      // For now, just simulate successful sending
      results.sent_emails.push({
        student_id: student.id,
        student_name: student.name,
        parent_email: student.parent_email,
        token: activeToken.token,
        // sent_at: new Date().toISOString(),
        simulated: true, // Remove this when actual email sending is implemented
      });
      results.success_count++;
    } catch (error) {
      results.errors.push({
        student_id: student.id,
        student_name: student.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      results.error_count++;
    }
  }

  return NextResponse.json({
    ...results,
    notice:
      'Email sending is simulated. Implement actual email service integration.',
  });
}

// Archive students (set active = false)
async function archiveStudents(supabase: any, studentIds: string[]) {
  try {
    const { error } = await supabase
      .from('students')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .in('id', studentIds);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to archive students', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      archived_count: studentIds.length,
      message: `Successfully archived ${studentIds.length} students`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to archive students' },
      { status: 500 }
    );
  }
}

// Delete students permanently
async function deleteStudents(
  supabase: any,
  studentIds: string[],
  eventId: string
) {
  try {
    // Check for dependencies (photo assignments, tokens, etc.)
    const { data: photoAssignments } = await supabase
      .from('photo_students')
      .select('id')
      .in('student_id', studentIds);

    const { data: orders } = await supabase
      .from('orders')
      .select('id, subjects!inner(id)')
      .in('subjects.id', studentIds);

    if (
      (photoAssignments && photoAssignments.length > 0) ||
      (orders && orders.length > 0)
    ) {
      return NextResponse.json(
        {
          error: 'Cannot delete students with associated data',
          details: `Students have ${photoAssignments?.length || 0} photo assignments and ${orders?.length || 0} orders`,
          suggestion: 'Consider archiving instead of deleting',
        },
        { status: 400 }
      );
    }

    // Delete student tokens first (foreign key constraint)
    await supabase.from('student_tokens').delete().in('student_id', studentIds);

    // Delete students
    const { error } = await supabase
      .from('students')
      .delete()
      .in('id', studentIds);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete students', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: studentIds.length,
      message: `Successfully deleted ${studentIds.length} students`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete students' },
      { status: 500 }
    );
  }
}

// Utility functions
async function generateStudentQRCode(
  eventId: string,
  studentName: string
): Promise<string> {
  const prefix = 'STU';
  const eventShort = eventId.substring(0, 8);
  const nameShort = studentName.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();

  return `${prefix}-${eventShort}-${nameShort}-${random}-${timestamp}`;
}

function generateSecureToken(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
