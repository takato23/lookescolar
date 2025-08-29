import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const subjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  grade: z.string().optional(),
  section: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/admin/events/[id]/students
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const eventId = (await params).id;
      const { searchParams } = new URL(req.url);

      const courseId = searchParams.get('course_id');
      const search = searchParams.get('search');
      const sortBy = searchParams.get('sort_by') || 'name';
      const sortOrder = searchParams.get('sort_order') || 'asc';
      const active = searchParams.get('active');
      const page = parseInt(searchParams.get('page') || '0');
      const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Max 500 for performance

      const supabase = await createServerSupabaseServiceClient();

      // Build query using subjects table (all columns available now)
      let query = supabase
        .from('subjects')
        .select(
          `
        id,
        name,
        grade,
        section,
        qr_code,
        email,
        phone,
        metadata,
        created_at,
        updated_at,
        access_token,
        token_expires_at
      `,
          { count: 'exact' }
        )
        .eq('event_id', eventId);

      // Apply filters
      // Note: courseId filter removed as subjects table doesn't have course_id
      // TODO: Add course relationship logic if needed

      // Filter by search terms
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,email.ilike.%${search}%,qr_code.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      // Apply sorting with performance optimization
      const validSortColumns = [
        'name',
        'grade',
        'section',
        'created_at',
        'updated_at',
      ];
      const validSortOrder = ['asc', 'desc'];

      if (
        validSortColumns.includes(sortBy) &&
        validSortOrder.includes(sortOrder)
      ) {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      } else {
        query = query.order('name', { ascending: true });
      }

      // Apply pagination
      const offset = page * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: students, error, count } = await query;

      if (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json(
          { error: 'Failed to fetch students', details: error.message },
          { status: 500 }
        );
      }

      // Process subjects (students) with simplified data
      const processedStudents = (students || []).map((subject) => {
        // Check if access token is still valid
        const hasActiveToken =
          subject.access_token &&
          new Date(subject.token_expires_at) > new Date();

        return {
          id: subject.id,
          name: subject.name,
          grade: subject.grade,
          section: subject.section,
          qr_code: subject.qr_code,
          email: subject.email,
          phone: subject.phone,
          metadata: subject.metadata,
          created_at: subject.created_at,
          updated_at: subject.updated_at,
          photo_count: 0, // TODO: Get from separate query if needed
          last_photo_tagged: null, // TODO: Get from separate query if needed
          has_active_token: hasActiveToken,
          token_expires_at: subject.token_expires_at,
        };
      });

      const totalCount = count || processedStudents.length;
      const hasMore = totalCount > (page + 1) * limit;

      return NextResponse.json({
        students: processedStudents,
        pagination: {
          page,
          limit,
          total: totalCount,
          has_more: hasMore,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/admin/events/[id]/students:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// POST /api/admin/events/[id]/students
export const POST = withAuth(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const eventId = (await params).id;
      const body = await req.json();

      // Handle bulk import
      if (Array.isArray(body)) {
        return await handleBulkStudentImport(eventId, body);
      }

      // Handle single subject creation
      const validatedData = subjectSchema.parse(body);
      const supabase = await createServerSupabaseServiceClient();

      // Check for duplicate name in same event
      const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('event_id', eventId)
        .eq('name', validatedData.name)
        .single();

      if (existingSubject) {
        return NextResponse.json(
          { error: 'A subject with this name already exists in this event' },
          { status: 400 }
        );
      }

      // Generate QR code if not provided
      const qrCode = await generateStudentQRCode(eventId, validatedData.name);

      // Generate access token
      const accessToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Insert new subject
      const { data: subject, error } = await supabase
        .from('subjects')
        .insert({
          event_id: eventId,
          name: validatedData.name,
          grade: validatedData.grade,
          section: validatedData.section,
          qr_code: qrCode,
          email: validatedData.email,
          phone: validatedData.phone,
          metadata: validatedData.metadata || {},
          access_token: accessToken,
          token_expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subject:', error);
        return NextResponse.json(
          { error: 'Failed to create subject', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          student: {
            ...subject,
            photo_count: 0,
            last_photo_tagged: null,
            has_active_token: true,
            token_expires_at: subject.token_expires_at,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/admin/events/[id]/students:', error);

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

// Handle bulk subject import
async function handleBulkStudentImport(eventId: string, subjects: any[]) {
  const supabase = await createServerSupabaseServiceClient();
  const results = {
    success_count: 0,
    error_count: 0,
    errors: [] as any[],
    students: [] as any[],
  };

  for (let i = 0; i < subjects.length; i++) {
    try {
      const validatedData = subjectSchema.parse(subjects[i]);

      // Check for duplicates
      const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('event_id', eventId)
        .eq('name', validatedData.name)
        .maybeSingle();

      if (existingSubject) {
        results.errors.push({
          index: i,
          student: subjects[i],
          error: 'Subject with this name already exists',
        });
        results.error_count++;
        continue;
      }

      // Generate QR code and access token
      const qrCode = await generateStudentQRCode(eventId, validatedData.name);
      const accessToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Insert subject
      const { data: subject, error } = await supabase
        .from('subjects')
        .insert({
          event_id: eventId,
          name: validatedData.name,
          grade: validatedData.grade,
          section: validatedData.section,
          qr_code: qrCode,
          email: validatedData.email,
          phone: validatedData.phone,
          metadata: validatedData.metadata || {},
          access_token: accessToken,
          token_expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        results.errors.push({
          index: i,
          student: subjects[i],
          error: error.message,
        });
        results.error_count++;
        continue;
      }

      results.students.push(subject);
      results.success_count++;
    } catch (error) {
      results.errors.push({
        index: i,
        student: subjects[i],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      results.error_count++;
    }
  }

  return NextResponse.json(results, { status: 201 });
}

// Generate unique QR code for student
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

// Generate secure token
function generateSecureToken(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
