-- ============================================================
-- Migration: Gallery Support Functions
-- Purpose: Add PostgreSQL functions to support gallery functionality
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FUNCTION: Get courses for level
-- Returns array of course IDs for a given level
-- ============================================================

CREATE OR REPLACE FUNCTION get_courses_for_level(level_id UUID)
RETURNS UUID[] AS $$
DECLARE
  course_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(c.id) INTO course_ids
  FROM courses c
  WHERE c.level_id = get_courses_for_level.level_id
    AND c.active = true;
  
  RETURN COALESCE(course_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. FUNCTION: Get students for level
-- Returns array of student IDs for a given level (through courses)
-- ============================================================

CREATE OR REPLACE FUNCTION get_students_for_level(level_id UUID)
RETURNS UUID[] AS $$
DECLARE
  student_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(s.id) INTO student_ids
  FROM students s
  JOIN courses c ON s.course_id = c.id
  WHERE c.level_id = get_students_for_level.level_id
    AND s.active = true
    AND c.active = true;
  
  RETURN COALESCE(student_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. FUNCTION: Get students for course
-- Returns array of student IDs for a given course
-- ============================================================

CREATE OR REPLACE FUNCTION get_students_for_course(course_id UUID)
RETURNS UUID[] AS $$
DECLARE
  student_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(s.id) INTO student_ids
  FROM students s
  WHERE s.course_id = get_students_for_course.course_id
    AND s.active = true;
  
  RETURN COALESCE(student_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. FUNCTION: Get level gallery statistics
-- Returns statistics for a level gallery
-- ============================================================

CREATE OR REPLACE FUNCTION get_level_gallery_stats(level_id UUID)
RETURNS TABLE(
  total_photos BIGINT,
  approved_photos BIGINT,
  individual_photos BIGINT,
  group_photos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id) as total_photos,
    COUNT(DISTINCT CASE WHEN p.approved = true THEN p.id END) as approved_photos,
    COUNT(DISTINCT CASE WHEN p.photo_type = 'individual' THEN p.id END) as individual_photos,
    COUNT(DISTINCT CASE WHEN p.photo_type = 'group' THEN p.id END) as group_photos
  FROM photos p
  WHERE p.event_id = (SELECT event_id FROM event_levels WHERE id = get_level_gallery_stats.level_id)
    AND (
      p.course_id IN (SELECT id FROM courses WHERE level_id = get_level_gallery_stats.level_id AND active = true)
      OR p.id IN (
        SELECT ps.photo_id 
        FROM photo_students ps
        JOIN students s ON ps.student_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE c.level_id = get_level_gallery_stats.level_id AND s.active = true AND c.active = true
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. FUNCTION: Get course gallery statistics
-- Returns statistics for a course gallery
-- ============================================================

CREATE OR REPLACE FUNCTION get_course_gallery_stats(course_id UUID)
RETURNS TABLE(
  total_photos BIGINT,
  approved_photos BIGINT,
  individual_photos BIGINT,
  group_photos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id) as total_photos,
    COUNT(DISTINCT CASE WHEN p.approved = true THEN p.id END) as approved_photos,
    COUNT(DISTINCT CASE WHEN p.photo_type = 'individual' THEN p.id END) as individual_photos,
    COUNT(DISTINCT CASE WHEN p.photo_type = 'group' THEN p.id END) as group_photos
  FROM photos p
  WHERE p.event_id = (SELECT event_id FROM courses WHERE id = get_course_gallery_stats.course_id)
    AND (
      p.course_id = get_course_gallery_stats.course_id
      OR p.id IN (
        SELECT ps.photo_id 
        FROM photo_students ps
        JOIN students s ON ps.student_id = s.id
        WHERE s.course_id = get_course_gallery_stats.course_id AND s.active = true
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. FUNCTION: Get student gallery statistics
-- Returns statistics for a student gallery
-- ============================================================

CREATE OR REPLACE FUNCTION get_student_gallery_stats(student_id UUID)
RETURNS TABLE(
  total_photos BIGINT,
  approved_photos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id) as total_photos,
    COUNT(DISTINCT CASE WHEN p.approved = true THEN p.id END) as approved_photos
  FROM photos p
  JOIN photo_students ps ON p.id = ps.photo_id
  WHERE ps.student_id = get_student_gallery_stats.student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. GRANT PERMISSIONS
-- ============================================================

-- Grant execute permissions to authenticated users (admins)
GRANT EXECUTE ON FUNCTION get_courses_for_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_students_for_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_students_for_course(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_level_gallery_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_gallery_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_gallery_stats(UUID) TO authenticated;

-- Grant execute permissions to service role (for API calls)
GRANT EXECUTE ON FUNCTION get_courses_for_level(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_students_for_level(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_students_for_course(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_level_gallery_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_course_gallery_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_student_gallery_stats(UUID) TO service_role;

-- ============================================================
-- 8. VERIFICATION
-- ============================================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  -- Count created functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
    AND routine_name IN (
      'get_courses_for_level',
      'get_students_for_level',
      'get_students_for_course',
      'get_level_gallery_stats',
      'get_course_gallery_stats',
      'get_student_gallery_stats'
    );

  IF function_count = 6 THEN
    RAISE NOTICE 'All 6 gallery support functions created successfully';
  ELSE
    RAISE WARNING 'Expected 6 functions, found %', function_count;
  END IF;
END $$;

COMMIT;
