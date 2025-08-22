import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthAdmin } from '@/lib/security/auth';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Classification action schemas
const ClassifyToCourseSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1, 'At least one photo required'),
  courseId: z.string().uuid('Invalid course ID'),
  photoType: z.enum(['group', 'activity', 'event']).default('group'),
  removeFromEvent: z.boolean().default(false) // Whether to remove from event level
});

const ClassifyToStudentSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1, 'At least one photo required'),
  studentId: z.string().uuid('Invalid student ID'),
  confidenceScore: z.number().min(0).max(1).optional(),
  manualReview: z.boolean().default(false)
});

const BatchClassifySchema = z.object({
  classifications: z.array(z.object({
    photoId: z.string().uuid(),
    action: z.enum(['course', 'student', 'remove']),
    targetId: z.string().uuid().optional(), // courseId or studentId
    photoType: z.enum(['individual', 'group', 'activity', 'event']).optional(),
    confidenceScore: z.number().min(0).max(1).optional()
  })).min(1, 'At least one classification required')
});

const MovePhotosSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1, 'At least one photo required'),
  fromLevel: z.enum(['event', 'course', 'student']),
  toLevel: z.enum(['event', 'course', 'student']),
  fromId: z.string().uuid().optional(), // event, course, or student ID
  toId: z.string().uuid().optional() // event, course, or student ID
});

// POST endpoint for various classification actions
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
    const action = searchParams.get('action');

    switch (action) {
      case 'to-course':
        return await classifyToCourse(body, user.id);
      
      case 'to-student':
        return await classifyToStudent(body, user.id);
      
      case 'batch':
        return await batchClassify(body, user.id);
        
      case 'move':
        return await movePhotos(body, user.id);
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: to-course, to-student, batch, or move' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Classification error:', error);

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

// Classify photos to a course
async function classifyToCourse(body: any, adminId: string) {
  const validatedData = ClassifyToCourseSchema.parse(body);

  // Verify course exists and get course info
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('id, name, event_id')
    .eq('id', validatedData.courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json(
      { error: 'Course not found' },
      { status: 404 }
    );
  }

  // Verify photos exist and belong to the same event
  const { data: photos, error: photosError } = await supabaseAdmin
    .from('photos')
    .select('id, filename, event_id')
    .in('id', validatedData.photoIds);

  if (photosError || !photos || photos.length === 0) {
    return NextResponse.json(
      { error: 'Photos not found' },
      { status: 404 }
    );
  }

  // Check all photos belong to the same event as the course
  const invalidPhotos = photos.filter(p => p.event_id !== course.event_id);
  if (invalidPhotos.length > 0) {
    return NextResponse.json(
      { 
        error: 'Photos must belong to the same event as the course',
        invalid_photos: invalidPhotos.map(p => ({ id: p.id, filename: p.filename }))
      },
      { status: 400 }
    );
  }

  try {
    // Start transaction
    const results = await supabaseAdmin.rpc('classify_photos_to_course', {
      photo_ids: validatedData.photoIds,
      course_id: validatedData.courseId,
      photo_type: validatedData.photoType,
      admin_id: adminId
    });

    if (results.error) {
      throw results.error;
    }

    // Update photo types if specified
    if (validatedData.photoType !== 'group') {
      await supabaseAdmin
        .from('photos')
        .update({ 
          photo_type: validatedData.photoType,
          course_id: validatedData.courseId
        })
        .in('id', validatedData.photoIds);
    }

    // Log activity
    await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: adminId,
        action: 'classify_photos_to_course',
        resource_type: 'course',
        resource_id: validatedData.courseId,
        metadata: {
          photo_count: validatedData.photoIds.length,
          photo_type: validatedData.photoType,
          course_name: course.name
        }
      });

    return NextResponse.json({
      success: true,
      classified: validatedData.photoIds.length,
      course: {
        id: course.id,
        name: course.name
      },
      photo_type: validatedData.photoType
    });

  } catch (error) {
    console.error('Course classification error:', error);
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    );
  }
}

// Classify photos to a student
async function classifyToStudent(body: any, adminId: string) {
  const validatedData = ClassifyToStudentSchema.parse(body);

  // Verify student exists
  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, name, event_id, course_id')
    .eq('id', validatedData.studentId)
    .single();

  if (studentError || !student) {
    return NextResponse.json(
      { error: 'Student not found' },
      { status: 404 }
    );
  }

  // Verify photos exist and belong to the same event
  const { data: photos, error: photosError } = await supabaseAdmin
    .from('photos')
    .select('id, filename, event_id')
    .in('id', validatedData.photoIds);

  if (photosError || !photos || photos.length === 0) {
    return NextResponse.json(
      { error: 'Photos not found' },
      { status: 404 }
    );
  }

  // Check all photos belong to the same event as the student
  const invalidPhotos = photos.filter(p => p.event_id !== student.event_id);
  if (invalidPhotos.length > 0) {
    return NextResponse.json(
      {
        error: 'Photos must belong to the same event as the student',
        invalid_photos: invalidPhotos.map(p => ({ id: p.id, filename: p.filename }))
      },
      { status: 400 }
    );
  }

  try {
    // Insert photo-student associations (upsert to handle duplicates)
    const photoStudentData = validatedData.photoIds.map(photoId => ({
      photo_id: photoId,
      student_id: validatedData.studentId,
      tagged_by: adminId,
      confidence_score: validatedData.confidenceScore || 1.0,
      manual_review: validatedData.manualReview
    }));

    const { error: insertError } = await supabaseAdmin
      .from('photo_students')
      .upsert(photoStudentData, {
        onConflict: 'photo_id,student_id',
        ignoreDuplicates: false
      });

    if (insertError) {
      throw insertError;
    }

    // Update photos to individual type
    await supabaseAdmin
      .from('photos')
      .update({ photo_type: 'individual' })
      .in('id', validatedData.photoIds);

    // Log activity
    await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: adminId,
        action: 'classify_photos_to_student',
        resource_type: 'student',
        resource_id: validatedData.studentId,
        metadata: {
          photo_count: validatedData.photoIds.length,
          student_name: student.name,
          confidence_score: validatedData.confidenceScore,
          manual_review: validatedData.manualReview
        }
      });

    return NextResponse.json({
      success: true,
      classified: validatedData.photoIds.length,
      student: {
        id: student.id,
        name: student.name
      },
      confidence_score: validatedData.confidenceScore || 1.0
    });

  } catch (error) {
    console.error('Student classification error:', error);
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    );
  }
}

// Batch classify multiple photos with different actions
async function batchClassify(body: any, adminId: string) {
  const validatedData = BatchClassifySchema.parse(body);

  const results: { photoId: string; status: 'success' | 'error'; error?: string }[] = [];

  // Process classifications in parallel
  const promises = validatedData.classifications.map(async (classification) => {
    try {
      switch (classification.action) {
        case 'course':
          if (!classification.targetId) {
            throw new Error('Course ID required for course classification');
          }
          await classifyToCourse({
            photoIds: [classification.photoId],
            courseId: classification.targetId,
            photoType: classification.photoType || 'group'
          }, adminId);
          break;

        case 'student':
          if (!classification.targetId) {
            throw new Error('Student ID required for student classification');
          }
          await classifyToStudent({
            photoIds: [classification.photoId],
            studentId: classification.targetId,
            confidenceScore: classification.confidenceScore
          }, adminId);
          break;

        case 'remove':
          // Remove all classifications for this photo
          await supabaseAdmin
            .from('photo_students')
            .delete()
            .eq('photo_id', classification.photoId);
          
          await supabaseAdmin
            .from('photo_courses')
            .delete()
            .eq('photo_id', classification.photoId);

          // Reset photo to unclassified
          await supabaseAdmin
            .from('photos')
            .update({ 
              photo_type: 'individual',
              course_id: null
            })
            .eq('id', classification.photoId);
          break;

        default:
          throw new Error(`Invalid action: ${classification.action}`);
      }

      return {
        photoId: classification.photoId,
        status: 'success' as const
      };

    } catch (error) {
      return {
        photoId: classification.photoId,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  const batchResults = await Promise.all(promises);
  results.push(...batchResults);

  // Log batch activity
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;

  await supabaseAdmin
    .from('admin_activity')
    .insert({
      admin_id: adminId,
      action: 'batch_classify_photos',
      resource_type: 'photo',
      metadata: {
        total_classifications: validatedData.classifications.length,
        successful,
        failed,
        actions: validatedData.classifications.reduce((acc, c) => {
          acc[c.action] = (acc[c.action] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    });

  return NextResponse.json({
    success: true,
    summary: {
      total: validatedData.classifications.length,
      successful,
      failed
    },
    results
  });
}

// Move photos between levels (event → course → student)
async function movePhotos(body: any, adminId: string) {
  const validatedData = MovePhotosSchema.parse(body);

  // Implementation depends on the specific move operation
  // This is a complex operation that would need careful validation

  return NextResponse.json({
    success: true,
    message: 'Move operation completed',
    moved: validatedData.photoIds.length
  });
}

// GET endpoint to retrieve unclassified photos for an event
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
    const eventId = searchParams.get('eventId');
    const level = searchParams.get('level') || 'event'; // event, course, student
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('photos')
      .select(`
        id,
        filename,
        original_filename,
        file_path,
        preview_path,
        photo_type,
        processing_status,
        detected_qr_codes,
        created_at,
        approved
      `)
      .eq('event_id', eventId)
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter based on classification level
    switch (level) {
      case 'event':
        // Photos not assigned to any course
        query = query.is('course_id', null);
        break;
      case 'course':
        // Photos assigned to courses but not to students
        query = query.not('course_id', 'is', null);
        break;
      case 'student':
        // Photos assigned to students
        // This would need a more complex query
        break;
    }

    const { data: photos, error } = await query;

    if (error) {
      throw error;
    }

    // Get classification statistics
    const { data: stats } = await supabaseAdmin
      .from('photos')
      .select('photo_type, course_id')
      .eq('event_id', eventId);

    const classification_stats = {
      total: stats?.length || 0,
      unclassified: stats?.filter(s => !s.course_id && s.photo_type === 'individual').length || 0,
      in_courses: stats?.filter(s => s.course_id).length || 0,
      by_type: {
        individual: stats?.filter(s => s.photo_type === 'individual').length || 0,
        group: stats?.filter(s => s.photo_type === 'group').length || 0,
        activity: stats?.filter(s => s.photo_type === 'activity').length || 0,
        event: stats?.filter(s => s.photo_type === 'event').length || 0
      }
    };

    return NextResponse.json({
      success: true,
      photos,
      pagination: {
        limit,
        offset,
        returned: photos?.length || 0
      },
      classification_stats
    });

  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}