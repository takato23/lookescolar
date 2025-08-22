import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthAdmin } from '@/lib/security/auth';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Batch course operations schema
const BatchCourseSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  operation: z.enum(['create', 'update', 'delete', 'import']),
  courses: z.array(z.object({
    id: z.string().uuid().optional(), // For updates
    name: z.string().min(1, 'Course name required'),
    grade: z.string().optional(),
    section: z.string().optional(),
    levelId: z.string().uuid().optional(), // Optional level assignment
    description: z.string().optional(),
    sortOrder: z.number().default(0),
    active: z.boolean().default(true)
  })).min(1, 'At least one course required').max(50, 'Maximum 50 courses per batch')
});

// Batch student operations schema
const BatchStudentSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  courseId: z.string().uuid().optional(), // Optional course assignment
  operation: z.enum(['create', 'update', 'delete', 'import', 'assign_course', 'generate_tokens']),
  students: z.array(z.object({
    id: z.string().uuid().optional(), // For updates
    name: z.string().min(1, 'Student name required'),
    grade: z.string().optional(),
    section: z.string().optional(),
    studentNumber: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    parentName: z.string().optional(),
    parentEmail: z.string().email().optional(),
    parentPhone: z.string().optional(),
    courseId: z.string().uuid().optional(),
    generateQrCode: z.boolean().default(true),
    generateToken: z.boolean().default(true),
    active: z.boolean().default(true)
  })).min(1, 'At least one student required').max(100, 'Maximum 100 students per batch')
});

// CSV Import schema
const ImportCsvSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  type: z.enum(['courses', 'students']),
  csvData: z.string().min(1, 'CSV data required'),
  options: z.object({
    hasHeader: z.boolean().default(true),
    delimiter: z.string().default(','),
    skipEmptyRows: z.boolean().default(true),
    generateTokens: z.boolean().default(true),
    generateQrCodes: z.boolean().default(true)
  }).optional()
});

// POST endpoint for batch operations
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const operation = searchParams.get('operation');

    switch (operation) {
      case 'courses':
        return await batchCourseOperations(body, user.id);
      
      case 'students':
        return await batchStudentOperations(body, user.id);
      
      case 'import-csv':
        return await importFromCsv(body, user.id);
        
      default:
        return NextResponse.json(
          { error: 'Invalid operation. Use: courses, students, or import-csv' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Batch operation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
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

// Batch course operations
async function batchCourseOperations(body: any, adminId: string) {
  const validatedData = BatchCourseSchema.parse(body);

  // Verify event exists
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, name, status')
    .eq('id', validatedData.eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    );
  }

  const results: Array<{
    index: number;
    courseName: string;
    status: 'success' | 'error';
    id?: string;
    error?: string;
  }> = [];

  try {
    for (let i = 0; i < validatedData.courses.length; i++) {
      const course = validatedData.courses[i];
      
      try {
        switch (validatedData.operation) {
          case 'create':
            const { data: newCourse, error: createError } = await supabaseAdmin
              .from('courses')
              .insert({
                event_id: validatedData.eventId,
                level_id: course.levelId,
                name: course.name,
                grade: course.grade,
                section: course.section,
                description: course.description,
                sort_order: course.sortOrder,
                active: course.active
              })
              .select('id')
              .single();

            if (createError) throw createError;

            results.push({
              index: i,
              courseName: course.name,
              status: 'success',
              id: newCourse.id
            });
            break;

          case 'update':
            if (!course.id) {
              throw new Error('Course ID required for update operation');
            }

            const { error: updateError } = await supabaseAdmin
              .from('courses')
              .update({
                level_id: course.levelId,
                name: course.name,
                grade: course.grade,
                section: course.section,
                description: course.description,
                sort_order: course.sortOrder,
                active: course.active
              })
              .eq('id', course.id)
              .eq('event_id', validatedData.eventId);

            if (updateError) throw updateError;

            results.push({
              index: i,
              courseName: course.name,
              status: 'success',
              id: course.id
            });
            break;

          case 'delete':
            if (!course.id) {
              throw new Error('Course ID required for delete operation');
            }

            // Check if course has students
            const { data: students } = await supabaseAdmin
              .from('students')
              .select('id')
              .eq('course_id', course.id)
              .limit(1);

            if (students && students.length > 0) {
              throw new Error('Cannot delete course with students. Move students first.');
            }

            const { error: deleteError } = await supabaseAdmin
              .from('courses')
              .delete()
              .eq('id', course.id)
              .eq('event_id', validatedData.eventId);

            if (deleteError) throw deleteError;

            results.push({
              index: i,
              courseName: course.name,
              status: 'success',
              id: course.id
            });
            break;

          default:
            throw new Error(`Unsupported operation: ${validatedData.operation}`);
        }

      } catch (error) {
        results.push({
          index: i,
          courseName: course.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log batch activity
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: adminId,
        action: `batch_${validatedData.operation}_courses`,
        resource_type: 'event',
        resource_id: validatedData.eventId,
        metadata: {
          total_courses: validatedData.courses.length,
          successful,
          failed,
          operation: validatedData.operation
        }
      });

    return NextResponse.json({
      success: true,
      summary: {
        total: validatedData.courses.length,
        successful,
        failed
      },
      results,
      event: {
        id: event.id,
        name: event.name
      }
    });

  } catch (error) {
    console.error('Course batch operation error:', error);
    return NextResponse.json(
      { error: 'Batch operation failed' },
      { status: 500 }
    );
  }
}

// Batch student operations
async function batchStudentOperations(body: any, adminId: string) {
  const validatedData = BatchStudentSchema.parse(body);

  // Verify event exists
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, name, status')
    .eq('id', validatedData.eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    );
  }

  const results: Array<{
    index: number;
    studentName: string;
    status: 'success' | 'error';
    id?: string;
    token?: string;
    qrCode?: string;
    error?: string;
  }> = [];

  try {
    for (let i = 0; i < validatedData.students.length; i++) {
      const student = validatedData.students[i];
      
      try {
        switch (validatedData.operation) {
          case 'create':
            // Generate QR code if requested
            let qrCode: string | undefined;
            if (student.generateQrCode) {
              qrCode = `STU-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
            }

            const { data: newStudent, error: createError } = await supabaseAdmin
              .from('students')
              .insert({
                event_id: validatedData.eventId,
                course_id: student.courseId || validatedData.courseId,
                name: student.name,
                grade: student.grade,
                section: student.section,
                student_number: student.studentNumber,
                email: student.email,
                phone: student.phone,
                parent_name: student.parentName,
                parent_email: student.parentEmail,
                parent_phone: student.parentPhone,
                qr_code: qrCode,
                active: student.active
              })
              .select('id')
              .single();

            if (createError) throw createError;

            // Generate token if requested
            let token: string | undefined;
            if (student.generateToken) {
              const tokenValue = Buffer.from(
                `${newStudent.id}-${Date.now()}-${Math.random()}`
              ).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);

              const { error: tokenError } = await supabaseAdmin
                .from('student_tokens')
                .insert({
                  student_id: newStudent.id,
                  token: tokenValue
                });

              if (!tokenError) {
                token = tokenValue;
              }
            }

            results.push({
              index: i,
              studentName: student.name,
              status: 'success',
              id: newStudent.id,
              token,
              qrCode
            });
            break;

          case 'update':
            if (!student.id) {
              throw new Error('Student ID required for update operation');
            }

            const { error: updateError } = await supabaseAdmin
              .from('students')
              .update({
                course_id: student.courseId,
                name: student.name,
                grade: student.grade,
                section: student.section,
                student_number: student.studentNumber,
                email: student.email,
                phone: student.phone,
                parent_name: student.parentName,
                parent_email: student.parentEmail,
                parent_phone: student.parentPhone,
                active: student.active
              })
              .eq('id', student.id)
              .eq('event_id', validatedData.eventId);

            if (updateError) throw updateError;

            results.push({
              index: i,
              studentName: student.name,
              status: 'success',
              id: student.id
            });
            break;

          case 'assign_course':
            if (!student.id) {
              throw new Error('Student ID required for course assignment');
            }

            const courseId = student.courseId || validatedData.courseId;
            if (!courseId) {
              throw new Error('Course ID required for assignment');
            }

            const { error: assignError } = await supabaseAdmin
              .from('students')
              .update({ course_id: courseId })
              .eq('id', student.id)
              .eq('event_id', validatedData.eventId);

            if (assignError) throw assignError;

            results.push({
              index: i,
              studentName: student.name,
              status: 'success',
              id: student.id
            });
            break;

          case 'generate_tokens':
            if (!student.id) {
              throw new Error('Student ID required for token generation');
            }

            const tokenValue = Buffer.from(
              `${student.id}-${Date.now()}-${Math.random()}`
            ).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);

            const { error: tokenError } = await supabaseAdmin
              .from('student_tokens')
              .upsert({
                student_id: student.id,
                token: tokenValue
              }, {
                onConflict: 'student_id'
              });

            if (tokenError) throw tokenError;

            results.push({
              index: i,
              studentName: student.name,
              status: 'success',
              id: student.id,
              token: tokenValue
            });
            break;

          default:
            throw new Error(`Unsupported operation: ${validatedData.operation}`);
        }

      } catch (error) {
        results.push({
          index: i,
          studentName: student.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log batch activity
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: adminId,
        action: `batch_${validatedData.operation}_students`,
        resource_type: 'event',
        resource_id: validatedData.eventId,
        metadata: {
          total_students: validatedData.students.length,
          successful,
          failed,
          operation: validatedData.operation,
          course_id: validatedData.courseId
        }
      });

    return NextResponse.json({
      success: true,
      summary: {
        total: validatedData.students.length,
        successful,
        failed
      },
      results,
      event: {
        id: event.id,
        name: event.name
      }
    });

  } catch (error) {
    console.error('Student batch operation error:', error);
    return NextResponse.json(
      { error: 'Batch operation failed' },
      { status: 500 }
    );
  }
}

// Import from CSV
async function importFromCsv(body: any, adminId: string) {
  const validatedData = ImportCsvSchema.parse(body);

  try {
    // Parse CSV data
    const options = {
      hasHeader: true,
      delimiter: ',',
      skipEmptyRows: true,
      generateTokens: true,
      generateQrCodes: true,
      ...validatedData.options
    };

    const lines = validatedData.csvData.split('\n').filter(line => 
      options.skipEmptyRows ? line.trim() : true
    );

    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'No data found in CSV' },
        { status: 400 }
      );
    }

    let dataLines = lines;
    let headers: string[] = [];

    if (options.hasHeader) {
      headers = lines[0].split(options.delimiter).map(h => h.trim().replace(/"/g, ''));
      dataLines = lines.slice(1);
    }

    const results: Array<{
      row: number;
      name: string;
      status: 'success' | 'error';
      id?: string;
      error?: string;
    }> = [];

    // Process each row
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;

      try {
        const values = line.split(options.delimiter).map(v => v.trim().replace(/"/g, ''));
        
        if (validatedData.type === 'courses') {
          // Expected columns: name, grade, section, description
          const courseName = values[0] || '';
          if (!courseName) {
            throw new Error('Course name is required');
          }

          const { data: newCourse, error } = await supabaseAdmin
            .from('courses')
            .insert({
              event_id: validatedData.eventId,
              name: courseName,
              grade: values[1] || null,
              section: values[2] || null,
              description: values[3] || null,
              sort_order: i
            })
            .select('id')
            .single();

          if (error) throw error;

          results.push({
            row: i + 1,
            name: courseName,
            status: 'success',
            id: newCourse.id
          });

        } else if (validatedData.type === 'students') {
          // Expected columns: name, grade, section, student_number, email, parent_name, parent_email, course_name
          const studentName = values[0] || '';
          if (!studentName) {
            throw new Error('Student name is required');
          }

          // Find course by name if provided
          let courseId: string | null = null;
          const courseName = values[7] || '';
          if (courseName) {
            const { data: course } = await supabaseAdmin
              .from('courses')
              .select('id')
              .eq('event_id', validatedData.eventId)
              .eq('name', courseName)
              .single();
            
            courseId = course?.id || null;
          }

          // Generate QR code and token
          const qrCode = options.generateQrCodes 
            ? `STU-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
            : null;

          const { data: newStudent, error } = await supabaseAdmin
            .from('students')
            .insert({
              event_id: validatedData.eventId,
              course_id: courseId,
              name: studentName,
              grade: values[1] || null,
              section: values[2] || null,
              student_number: values[3] || null,
              email: values[4] || null,
              parent_name: values[5] || null,
              parent_email: values[6] || null,
              qr_code: qrCode
            })
            .select('id')
            .single();

          if (error) throw error;

          // Generate token if requested
          if (options.generateTokens) {
            const tokenValue = Buffer.from(
              `${newStudent.id}-${Date.now()}-${Math.random()}`
            ).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);

            await supabaseAdmin
              .from('student_tokens')
              .insert({
                student_id: newStudent.id,
                token: tokenValue
              });
          }

          results.push({
            row: i + 1,
            name: studentName,
            status: 'success',
            id: newStudent.id
          });
        }

      } catch (error) {
        results.push({
          row: i + 1,
          name: 'Unknown',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log import activity
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: adminId,
        action: `import_csv_${validatedData.type}`,
        resource_type: 'event',
        resource_id: validatedData.eventId,
        metadata: {
          total_rows: dataLines.length,
          successful,
          failed,
          type: validatedData.type,
          options
        }
      });

    return NextResponse.json({
      success: true,
      summary: {
        total: dataLines.length,
        successful,
        failed
      },
      results,
      headers: options.hasHeader ? headers : null
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Import failed' },
      { status: 500 }
    );
  }
}

// GET endpoint for batch operation templates and statistics
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuthAdmin();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const eventId = searchParams.get('eventId');

    switch (action) {
      case 'csv-template':
        const type = searchParams.get('type') as 'courses' | 'students';
        if (!type || !['courses', 'students'].includes(type)) {
          return NextResponse.json(
            { error: 'Type must be "courses" or "students"' },
            { status: 400 }
          );
        }

        const templates = {
          courses: {
            headers: ['name', 'grade', 'section', 'description'],
            example: 'Primer Grado A,1º,A,Primer grado sección A\nSegundo Grado B,2º,B,Segundo grado sección B'
          },
          students: {
            headers: ['name', 'grade', 'section', 'student_number', 'email', 'parent_name', 'parent_email', 'course_name'],
            example: 'Juan Pérez,1º,A,12345,juan@example.com,María Pérez,maria@example.com,Primer Grado A\nAna García,1º,A,12346,ana@example.com,Carlos García,carlos@example.com,Primer Grado A'
          }
        };

        return NextResponse.json({
          success: true,
          template: templates[type]
        });

      case 'statistics':
        if (!eventId) {
          return NextResponse.json(
            { error: 'Event ID required' },
            { status: 400 }
          );
        }

        // Get event statistics
        const { data: courses } = await supabaseAdmin
          .from('courses')
          .select('id')
          .eq('event_id', eventId);

        const { data: students } = await supabaseAdmin
          .from('students')
          .select('id, course_id')
          .eq('event_id', eventId);

        const { data: photos } = await supabaseAdmin
          .from('photos')
          .select('id, photo_type')
          .eq('event_id', eventId);

        const stats = {
          courses: {
            total: courses?.length || 0
          },
          students: {
            total: students?.length || 0,
            assigned_to_courses: students?.filter(s => s.course_id).length || 0,
            unassigned: students?.filter(s => !s.course_id).length || 0
          },
          photos: {
            total: photos?.length || 0,
            classified: photos?.filter(p => p.photo_type !== 'individual').length || 0,
            unclassified: photos?.filter(p => p.photo_type === 'individual').length || 0
          }
        };

        return NextResponse.json({
          success: true,
          event_id: eventId,
          statistics: stats
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: csv-template or statistics' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Batch operations GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}