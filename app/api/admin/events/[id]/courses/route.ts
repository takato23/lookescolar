import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { isCourseFolder } from '@/lib/courses/folders';

const courseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  grade: z.string().optional(),
  section: z.string().optional(),
  level_id: z.string().optional(),
  description: z.string().optional(),
  sort_order: z.number().optional(),
  active: z.boolean().optional(),
  parent_course_id: z.string().optional(),
  is_folder: z.boolean().optional(),
});

// GET /api/admin/events/[id]/courses
export const GET = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(req.url);
    
    const levelId = searchParams.get('level_id');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'sort_order';
    const sortOrder = searchParams.get('sort_order') || 'asc';
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const parentCourseId = searchParams.get('parent_course_id') || null;

    const supabase = await createServerSupabaseServiceClient();

    // Build query
    let query = supabase
      .from('courses')
      .select(`
        *,
        event_levels!left (
          id,
          name
        ),
        students:students!left (
          id,
          active,
          photo_students:photo_students!left (
            id,
            photo_id
          )
        ),
        photo_courses:photo_courses!left (
          id,
          photo_type
        ),
        parent_course:courses!parent_course_id (
          id,
          name
        )
      `)
      .eq('event_id', eventId);

    // Apply filters
    if (levelId) {
      query = query.eq('level_id', levelId);
    }
    
    if (parentCourseId) {
      // Check if the parent is actually a folder
      const isFolder = await isCourseFolder(parentCourseId);
      if (!isFolder) {
        return NextResponse.json(
          { error: 'Parent course is not a folder' },
          { status: 400 }
        );
      }
      query = query.eq('parent_course_id', parentCourseId);
    } else {
      // If no parent_course_id specified, only show root courses/folders
      query = query.or('parent_course_id.is.null,parent_course_id.eq.', { foreignTable: 'courses' });
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,grade.ilike.%${search}%,section.ilike.%${search}%`);
    }

    // Apply sorting
    const validSortColumns = ['name', 'grade', 'section', 'sort_order', 'created_at', 'updated_at'];
    const validSortOrder = ['asc', 'desc'];
    
    if (validSortColumns.includes(sortBy) && validSortOrder.includes(sortOrder)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('sort_order', { ascending: true });
    }

    // Apply pagination
    const offset = page * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: courses, error, count } = await query;

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses', details: error.message },
        { status: 500 }
      );
    }

    // Process courses with calculated fields
    const processedCourses = (courses || []).map(course => ({
      id: course.id,
      name: course.name,
      grade: course.grade,
      section: course.section,
      level_id: course.level_id,
      level_name: course.event_levels?.name,
      description: course.description,
      sort_order: course.sort_order,
      active: course.active,
      is_folder: course.is_folder || false,
      parent_course_id: course.parent_course_id,
      parent_course_name: course.parent_course?.name,
      created_at: course.created_at,
      updated_at: course.updated_at,
      student_count: course.students?.filter((s: any) => s.active)?.length || 0,
      photo_count: course.students?.reduce((total: number, student: any) => {
        return total + (student.photo_students?.length || 0);
      }, 0) || 0,
      group_photo_count: course.photo_courses?.length || 0,
    }));

    const totalCount = count || processedCourses.length;
    const hasMore = totalCount > (page + 1) * limit;

    return NextResponse.json({
      courses: processedCourses,
      pagination: {
        page,
        limit,
        total: totalCount,
        has_more: hasMore,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/events/[id]/courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/admin/events/[id]/courses
export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const body = await req.json();

    // Validate input
    const validatedData = courseSchema.parse(body);

    const supabase = await createServerSupabaseServiceClient();

    // Check if course with same name exists in the same parent context
    let nameCheckQuery = supabase
      .from('courses')
      .select('id')
      .eq('event_id', eventId)
      .eq('name', validatedData.name);
      
    if (validatedData.parent_course_id) {
      nameCheckQuery = nameCheckQuery.eq('parent_course_id', validatedData.parent_course_id);
    } else {
      nameCheckQuery = nameCheckQuery.is('parent_course_id', null);
    }

    const { data: existingCourse } = await nameCheckQuery.single();

    if (existingCourse) {
      return NextResponse.json(
        { error: 'A course or folder with this name already exists in this location' },
        { status: 400 }
      );
    }

    // Get next sort order if not provided
    let sortOrder = validatedData.sort_order;
    if (sortOrder === undefined) {
      let sortOrderQuery = supabase
        .from('courses')
        .select('sort_order')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: false })
        .limit(1);
        
      if (validatedData.parent_course_id) {
        sortOrderQuery = sortOrderQuery.eq('parent_course_id', validatedData.parent_course_id);
      } else {
        sortOrderQuery = sortOrderQuery.is('parent_course_id', null);
      }
      
      const { data: lastCourse } = await sortOrderQuery.single();
      
      sortOrder = (lastCourse?.sort_order || 0) + 1;
    }

    // Insert new course or folder
    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        event_id: eventId,
        name: validatedData.name,
        grade: validatedData.grade,
        section: validatedData.section,
        level_id: validatedData.level_id,
        description: validatedData.description,
        sort_order: sortOrder,
        active: validatedData.active ?? true,
        parent_course_id: validatedData.parent_course_id,
        is_folder: validatedData.is_folder ?? false,
      })
      .select(`
        *,
        event_levels!left (
          id,
          name
        ),
        parent_course:courses!parent_course_id (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating course:', error);
      return NextResponse.json(
        { error: 'Failed to create course', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/events/[id]/courses:', error);
    
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