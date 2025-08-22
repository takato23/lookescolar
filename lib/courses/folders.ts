import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Create a new course folder
 * @param params Folder creation parameters
 * @returns The created folder
 */
export async function createCourseFolder({
  eventId,
  name,
  description,
  levelId,
  parentCourseId,
}: {
  eventId: string;
  name: string;
  description?: string;
  levelId?: string;
  parentCourseId?: string;
}) {
  const supabase = await createServerSupabaseServiceClient();

  const { data, error } = await supabase
    .from('courses')
    .insert({
      event_id: eventId,
      name,
      description,
      level_id: levelId,
      parent_course_id: parentCourseId,
      is_folder: true,
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create course folder: ${error.message}`);
  }

  return data;
}

/**
 * Get all courses and folders within a specific folder
 * @param folderId The ID of the folder to get contents for
 * @returns Array of courses and folders
 */
export async function getCoursesInFolder(folderId: string) {
  const supabase = await createServerSupabaseServiceClient();

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      students:students!left (
        id,
        active
      ),
      photo_courses:photo_courses!left (
        id
      )
    `)
    .eq('parent_course_id', folderId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to get courses in folder: ${error.message}`);
  }

  // Process the data to add calculated fields
  return (data || []).map(course => ({
    ...course,
    student_count: course.students?.filter((s: any) => s.active)?.length || 0,
    photo_count: course.photo_courses?.length || 0,
  }));
}

/**
 * Get the folder hierarchy path for a course or folder
 * @param courseId The ID of the course or folder
 * @returns Array of folder names representing the path
 */
export async function getFolderHierarchy(courseId: string): Promise<string[]> {
  const supabase = await createServerSupabaseServiceClient();
  
  const hierarchy: string[] = [];
  let currentId = courseId;
  
  // Traverse up the hierarchy until we reach the root
  while (currentId) {
    const { data: course, error } = await supabase
      .from('courses')
      .select('name, parent_course_id')
      .eq('id', currentId)
      .single();
      
    if (error || !course) {
      break;
    }
    
    hierarchy.unshift(course.name);
    currentId = course.parent_course_id;
  }
  
  return hierarchy;
}

/**
 * Move a course or folder to a different parent
 * @param courseId The ID of the course or folder to move
 * @param newParentId The ID of the new parent folder (null for root)
 * @returns Updated course/folder
 */
export async function moveCourseToFolder(courseId: string, newParentId: string | null) {
  const supabase = await createServerSupabaseServiceClient();

  const { data, error } = await supabase
    .from('courses')
    .update({
      parent_course_id: newParentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to move course to folder: ${error.message}`);
  }

  return data;
}

/**
 * Check if a course is actually a folder
 * @param courseId The ID of the course to check
 * @returns True if the course is a folder, false otherwise
 */
export async function isCourseFolder(courseId: string): Promise<boolean> {
  const supabase = await createServerSupabaseServiceClient();

  const { data, error } = await supabase
    .from('courses')
    .select('is_folder')
    .eq('id', courseId)
    .single();

  if (error) {
    throw new Error(`Failed to check if course is folder: ${error.message}`);
  }

  return data?.is_folder || false;
}