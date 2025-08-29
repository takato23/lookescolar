import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const galleryQuerySchema = z.object({
  eventId: z.string().optional(),
  levelId: z.string().optional(),
  courseId: z.string().optional(),
  studentId: z.string().optional(),
  view: z.enum(['overview', 'photos']).default('photos'),
  page: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
  approved: z.coerce.boolean().optional(),
  tagged: z.coerce.boolean().optional(),
  sortBy: z
    .enum(['created_at', 'original_filename', 'file_size'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/admin/gallery - Unified gallery data endpoint
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    // Validate query parameters
    const query = galleryQuerySchema.parse({
      eventId: searchParams.get('eventId'),
      levelId: searchParams.get('levelId'),
      courseId: searchParams.get('courseId'),
      studentId: searchParams.get('studentId'),
      view: searchParams.get('view'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      approved: searchParams.get('approved'),
      tagged: searchParams.get('tagged'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    const supabase = await createServerSupabaseServiceClient();

    // Build hierarchy context
    const hierarchyContext = await buildHierarchyContext(supabase, query);

    if (query.view === 'overview') {
      // Return overview data based on hierarchy level
      return NextResponse.json({
        hierarchy: hierarchyContext,
        overview: await getOverviewData(supabase, query),
      });
    } else {
      // Return photos with hierarchy context
      const photosResult = await getPhotosData(supabase, query);

      return NextResponse.json({
        hierarchy: hierarchyContext,
        photos: photosResult.photos,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: photosResult.total,
          hasMore: photosResult.hasMore,
          nextPage: photosResult.hasMore ? query.page + 1 : null,
        },
      });
    }
  } catch (error) {
    console.error('Error in GET /api/admin/gallery:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

async function buildHierarchyContext(supabase: any, query: any) {
  const context: any = {
    path: {},
    breadcrumbs: [],
    stats: {},
  };

  // Add event context
  if (query.eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('id, name, school, date')
      .eq('id', query.eventId)
      .single();

    if (event) {
      context.path.event = {
        id: event.id,
        name: `${event.school} - ${event.name}`,
      };
      context.breadcrumbs.push({
        label: event.school,
        path: { event: context.path.event },
        type: 'event',
      });
    }
  }

  // Add level context
  if (query.levelId && query.eventId) {
    const { data: level } = await supabase
      .from('event_levels')
      .select('id, name, description')
      .eq('id', query.levelId)
      .eq('event_id', query.eventId)
      .single();

    if (level) {
      context.path.level = {
        id: level.id,
        name: level.name,
      };
      context.breadcrumbs.push({
        label: level.name,
        path: { ...context.path },
        type: 'level',
      });
    }
  }

  // Add course context
  if (query.courseId) {
    const { data: course } = await supabase
      .from('courses')
      .select('id, name, grade, section, is_folder')
      .eq('id', query.courseId)
      .single();

    if (course) {
      context.path.course = {
        id: course.id,
        name: course.name,
        isFolder: course.is_folder,
      };
      context.breadcrumbs.push({
        label: course.name,
        path: { ...context.path },
        type: course.is_folder ? 'folder' : 'course',
      });
    }
  }

  // Add student context
  if (query.studentId) {
    const { data: student } = await supabase
      .from('students')
      .select('id, name, grade, section')
      .eq('id', query.studentId)
      .single();

    if (student) {
      context.path.student = {
        id: student.id,
        name: student.name,
      };
      context.breadcrumbs.push({
        label: student.name,
        path: { ...context.path },
        type: 'student',
      });
    }
  }

  // Get stats for current context
  context.stats = await getContextStats(supabase, query);

  return context;
}

async function getContextStats(supabase: any, query: any) {
  const stats: any = {
    photoCount: 0,
    approvedCount: 0,
    taggedCount: 0,
  };

  // Build photos query for counting
  let photosQuery = supabase
    .from('photos')
    .select('id, approved', { count: 'exact' });

  // Apply hierarchy filters
  if (query.eventId) {
    photosQuery = photosQuery.eq('event_id', query.eventId);
  }

  if (query.studentId) {
    // Join with photo_students for student-specific photos
    photosQuery = supabase
      .from('photo_students')
      .select('photos!inner(id, approved)', { count: 'exact' })
      .eq('student_id', query.studentId);
  } else if (query.courseId) {
    // Join with students to get course photos
    photosQuery = supabase
      .from('photos')
      .select(
        `
        id, approved,
        photo_students!inner(
          students!inner(course_id)
        )
      `,
        { count: 'exact' }
      )
      .eq('photo_students.students.course_id', query.courseId);
  } else if (query.levelId) {
    // Join through courses to get level photos
    photosQuery = supabase
      .from('photos')
      .select(
        `
        id, approved,
        photo_students!inner(
          students!inner(
            courses!inner(level_id)
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('photo_students.students.courses.level_id', query.levelId);
  }

  const { data: photoStats, count } = await photosQuery;

  stats.photoCount = count || 0;

  if (photoStats) {
    stats.approvedCount = photoStats.filter((p: any) => p.approved).length;
    // Tagged count would need additional logic based on photo_students relationships
  }

  return stats;
}

async function getOverviewData(supabase: any, query: any) {
  if (query.studentId) {
    // Student overview - show student's photos
    return await getStudentOverview(supabase, query.studentId);
  } else if (query.courseId) {
    // Course overview - show students in course
    return await getCourseOverview(supabase, query.courseId);
  } else if (query.levelId) {
    // Level overview - show courses in level
    return await getLevelOverview(supabase, query.levelId);
  } else if (query.eventId) {
    // Event overview - show levels or courses
    return await getEventOverview(supabase, query.eventId);
  } else {
    // Global overview - show all events
    return await getGlobalOverview(supabase);
  }
}

async function getEventOverview(supabase: any, eventId: string) {
  // Get levels for this event
  const { data: levels } = await supabase
    .from('event_levels')
    .select(
      `
      id, name, description, sort_order,
      courses:courses!left(id, active),
      courses(students:students!left(id, active))
    `
    )
    .eq('event_id', eventId)
    .eq('active', true)
    .order('sort_order');

  // If no levels, get courses directly
  let courses = [];
  if (!levels || levels.length === 0) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select(
        `
        id, name, grade, section, is_folder, sort_order,
        students:students!left(id, active)
      `
      )
      .eq('event_id', eventId)
      .eq('active', true)
      .is('level_id', null)
      .is('parent_course_id', null)
      .order('sort_order');

    courses = coursesData || [];
  }

  return {
    type: 'event',
    levels:
      levels?.map((level: any) => ({
        ...level,
        course_count: level.courses?.filter((c: any) => c.active).length || 0,
        student_count:
          level.courses?.reduce((total: number, course: any) => {
            return (
              total +
              (course.students?.filter((s: any) => s.active).length || 0)
            );
          }, 0) || 0,
      })) || [],
    courses: courses.map((course: any) => ({
      ...course,
      student_count: course.students?.filter((s: any) => s.active).length || 0,
    })),
  };
}

async function getLevelOverview(supabase: any, levelId: string) {
  const { data: courses } = await supabase
    .from('courses')
    .select(
      `
      id, name, grade, section, is_folder, sort_order,
      students:students!left(id, active)
    `
    )
    .eq('level_id', levelId)
    .eq('active', true)
    .is('parent_course_id', null)
    .order('sort_order');

  return {
    type: 'level',
    courses:
      courses?.map((course: any) => ({
        ...course,
        student_count:
          course.students?.filter((s: any) => s.active).length || 0,
      })) || [],
  };
}

async function getCourseOverview(supabase: any, courseId: string) {
  const { data: students } = await supabase
    .from('students')
    .select(
      `
      id, name, grade, section,
      photo_students:photo_students!left(photo_id)
    `
    )
    .eq('course_id', courseId)
    .eq('active', true)
    .order('name');

  return {
    type: 'course',
    students:
      students?.map((student: any) => ({
        ...student,
        photo_count: student.photo_students?.length || 0,
      })) || [],
  };
}

async function getStudentOverview(supabase: any, studentId: string) {
  const { data: photos } = await supabase
    .from('photo_students')
    .select(
      `
      photos!inner(
        id, original_filename, preview_url, approved, tagged, created_at, file_size
      )
    `
    )
    .eq('student_id', studentId)
    .order('photos(created_at)', { ascending: false })
    .limit(20);

  return {
    type: 'student',
    photos: photos?.map((p: any) => p.photos) || [],
  };
}

async function getGlobalOverview(supabase: any) {
  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id, name, school, date, active,
      courses:courses!left(
        id,
        students:students!left(id),
        photo_courses:photo_courses!left(id)
      ),
      photos:photos!left(id)
    `
    )
    .eq('active', true)
    .order('created_at', { ascending: false });

  return {
    type: 'global',
    events:
      events?.map((event: any) => ({
        ...event,
        course_count: event.courses?.length || 0,
        student_count:
          event.courses?.reduce((total: number, course: any) => {
            return total + (course.students?.length || 0);
          }, 0) || 0,
        photo_count: event.photos?.length || 0,
      })) || [],
  };
}

async function getPhotosData(supabase: any, query: any) {
  const offset = query.page * query.limit;

  // Build photos query
  let photosQuery = supabase.from('photos').select(
    `
      id, original_filename, storage_path, preview_url,
      file_size, width, height, approved, tagged, created_at,
      events!inner(id, name, school),
      photo_students!left(
        students!inner(id, name, grade, section)
      )
    `,
    { count: 'exact' }
  );

  // Apply hierarchy filters
  if (query.eventId) {
    photosQuery = photosQuery.eq('event_id', query.eventId);
  }

  if (query.studentId) {
    photosQuery = photosQuery.eq('photo_students.student_id', query.studentId);
  } else if (query.courseId) {
    photosQuery = photosQuery.eq(
      'photo_students.students.course_id',
      query.courseId
    );
  } else if (query.levelId) {
    // This would need a more complex join through courses
    photosQuery = photosQuery.eq(
      'photo_students.students.courses.level_id',
      query.levelId
    );
  }

  // Apply filters
  if (query.search) {
    photosQuery = photosQuery.ilike('original_filename', `%${query.search}%`);
  }

  if (query.approved !== undefined) {
    photosQuery = photosQuery.eq('approved', query.approved);
  }

  // Apply sorting
  photosQuery = photosQuery.order(query.sortBy, {
    ascending: query.sortOrder === 'asc',
  });

  // Apply pagination
  photosQuery = photosQuery.range(offset, offset + query.limit - 1);

  const { data: photos, error, count } = await photosQuery;

  if (error) {
    throw error;
  }

  const total = count || 0;
  const hasMore = total > offset + query.limit;

  return {
    photos:
      photos?.map((photo: any) => ({
        ...photo,
        event: photo.events,
        subject: photo.photo_students?.[0]?.students || null,
      })) || [],
    total,
    hasMore,
  };
}
