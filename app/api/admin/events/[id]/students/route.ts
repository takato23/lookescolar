import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  grade: z.string().optional(),
  section: z.string().optional(),
  course_id: z.string().nullable().optional(),
  student_number: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  parent_name: z.string().optional(),
  parent_email: z.string().email().optional(),
  parent_phone: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

// GET /api/admin/events/[id]/students
export const GET = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(req.url);
    
    const courseId = searchParams.get('course_id');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortOrder = searchParams.get('sort_order') || 'asc';
    const active = searchParams.get('active');
    const page = parseInt(searchParams.get('page') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Max 500 for performance

    const supabase = await createServerSupabaseServiceClient();

    // Build query with optimized joins
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        grade,
        section,
        course_id,
        student_number,
        qr_code,
        email,
        phone,
        parent_name,
        parent_email,
        parent_phone,
        notes,
        active,
        created_at,
        updated_at,
        courses!left (
          id,
          name,
          grade,
          section
        ),
        photo_students!left (
          id,
          photo_id,
          tagged_at
        ),
        student_tokens!left (
          id,
          token,
          expires_at
        )
      `, { count: 'exact' })
      .eq('event_id', eventId);

    // Apply filters
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (active !== null && active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,parent_name.ilike.%${search}%,qr_code.ilike.%${search}%,student_number.ilike.%${search}%`
      );
    }

    // Apply sorting with performance optimization
    const validSortColumns = ['name', 'grade', 'section', 'created_at', 'updated_at'];
    const validSortOrder = ['asc', 'desc'];
    
    if (validSortColumns.includes(sortBy) && validSortOrder.includes(sortOrder)) {
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

    // Process students with calculated fields
    const processedStudents = (students || []).map(student => {
      const photoStudents = student.photo_students || [];
      const activeToken = student.student_tokens?.find((t: any) => 
        new Date(t.expires_at) > new Date()
      );

      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        section: student.section,
        course_id: student.course_id,
        course_name: student.courses?.name,
        student_number: student.student_number,
        qr_code: student.qr_code,
        email: student.email,
        phone: student.phone,
        parent_name: student.parent_name,
        parent_email: student.parent_email,
        parent_phone: student.parent_phone,
        notes: student.notes,
        active: student.active,
        created_at: student.created_at,
        updated_at: student.updated_at,
        photo_count: photoStudents.length,
        last_photo_tagged: photoStudents.length > 0
          ? photoStudents.reduce((latest: string, ps: any) => {
              return ps.tagged_at > latest ? ps.tagged_at : latest;
            }, photoStudents[0].tagged_at)
          : null,
        has_active_token: !!activeToken,
        token_expires_at: activeToken?.expires_at || null,
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
});

// POST /api/admin/events/[id]/students
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const body = await req.json();

    // Handle bulk import
    if (Array.isArray(body)) {
      return await handleBulkStudentImport(eventId, body);
    }

    // Handle single student creation
    const validatedData = studentSchema.parse(body);
    const supabase = await createServerSupabaseServiceClient();

    // Check for duplicate name in same course (if course specified)
    if (validatedData.course_id) {
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('event_id', eventId)
        .eq('course_id', validatedData.course_id)
        .eq('name', validatedData.name)
        .single();

      if (existingStudent) {
        return NextResponse.json(
          { error: 'A student with this name already exists in this course' },
          { status: 400 }
        );
      }
    }

    // Generate QR code if not provided
    const qrCode = await generateStudentQRCode(eventId, validatedData.name);

    // Insert new student
    const { data: student, error } = await supabase
      .from('students')
      .insert({
        event_id: eventId,
        name: validatedData.name,
        grade: validatedData.grade,
        section: validatedData.section,
        course_id: validatedData.course_id,
        student_number: validatedData.student_number,
        qr_code: qrCode,
        email: validatedData.email,
        phone: validatedData.phone,
        parent_name: validatedData.parent_name,
        parent_email: validatedData.parent_email,
        parent_phone: validatedData.parent_phone,
        notes: validatedData.notes,
        active: validatedData.active ?? true,
      })
      .select(`
        *,
        courses!left (
          id,
          name,
          grade,
          section
        )
      `)
      .single();

    if (error) {
      console.error('Error creating student:', error);
      return NextResponse.json(
        { error: 'Failed to create student', details: error.message },
        { status: 500 }
      );
    }

    // Generate initial access token
    const token = await generateStudentToken(student.id);

    return NextResponse.json({ 
      student: {
        ...student,
        course_name: student.courses?.name,
        photo_count: 0,
        last_photo_tagged: null,
        has_active_token: true,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }
    }, { status: 201 });
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
});

// Handle bulk student import
async function handleBulkStudentImport(eventId: string, students: any[]) {
  const supabase = await createServerSupabaseServiceClient();
  const results = {
    success_count: 0,
    error_count: 0,
    errors: [] as any[],
    students: [] as any[],
  };

  for (let i = 0; i < students.length; i++) {
    try {
      const validatedData = studentSchema.parse(students[i]);
      
      // Check for duplicates
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('event_id', eventId)
        .eq('name', validatedData.name)
        .maybeSingle();

      if (existingStudent) {
        results.errors.push({
          index: i,
          student: students[i],
          error: 'Student with this name already exists',
        });
        results.error_count++;
        continue;
      }

      // Generate QR code
      const qrCode = await generateStudentQRCode(eventId, validatedData.name);

      // Insert student
      const { data: student, error } = await supabase
        .from('students')
        .insert({
          event_id: eventId,
          name: validatedData.name,
          grade: validatedData.grade,
          section: validatedData.section,
          course_id: validatedData.course_id,
          student_number: validatedData.student_number,
          qr_code: qrCode,
          email: validatedData.email,
          phone: validatedData.phone,
          parent_name: validatedData.parent_name,
          parent_email: validatedData.parent_email,
          parent_phone: validatedData.parent_phone,
          notes: validatedData.notes,
          active: validatedData.active ?? true,
        })
        .select()
        .single();

      if (error) {
        results.errors.push({
          index: i,
          student: students[i],
          error: error.message,
        });
        results.error_count++;
        continue;
      }

      // Generate token
      await generateStudentToken(student.id);

      results.students.push(student);
      results.success_count++;
    } catch (error) {
      results.errors.push({
        index: i,
        student: students[i],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      results.error_count++;
    }
  }

  return NextResponse.json(results, { status: 201 });
}

// Generate unique QR code for student
async function generateStudentQRCode(eventId: string, studentName: string): Promise<string> {
  const prefix = 'STU';
  const eventShort = eventId.substring(0, 8);
  const nameShort = studentName.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  
  return `${prefix}-${eventShort}-${nameShort}-${random}-${timestamp}`;
}

// Generate access token for student
async function generateStudentToken(studentId: string): Promise<string> {
  const supabase = await createServerSupabaseServiceClient();
  
  // Generate secure token
  const tokenValue = generateSecureToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const { error } = await supabase
    .from('student_tokens')
    .insert({
      student_id: studentId,
      token: tokenValue,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('Error creating student token:', error);
    throw new Error('Failed to create student token');
  }

  return tokenValue;
}

// Generate secure token
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}