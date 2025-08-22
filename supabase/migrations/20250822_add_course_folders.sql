-- ============================================================
-- Migration: Add Folder Support to Courses
-- Purpose: Implement folder functionality for courses within events
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ADD parent_course_id COLUMN TO courses TABLE
-- ============================================================

-- Add parent_course_id column to support folder hierarchy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'parent_course_id'
  ) THEN
    ALTER TABLE courses ADD COLUMN parent_course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_courses_parent_id ON courses(parent_course_id);
  END IF;
END $$;

-- ============================================================
-- 2. ADD FOLDER TYPE COLUMN TO courses TABLE
-- ============================================================

-- Add is_folder column to distinguish folders from regular courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'is_folder'
  ) THEN
    ALTER TABLE courses ADD COLUMN is_folder BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_courses_is_folder ON courses(is_folder);
  END IF;
END $$;

-- ============================================================
-- 3. ADD CONSTRAINTS TO ENSURE DATA INTEGRITY
-- ============================================================

-- Ensure that folders can't have students directly assigned
-- This constraint will be enforced at the application level as well
-- since PostgreSQL doesn't support complex conditional constraints easily

-- ============================================================
-- 4. UPDATE RLS POLICIES (if needed)
-- ============================================================

-- Ensure service role has access to new columns
DO $$
BEGIN
  -- Update existing policies to include new columns
  DROP POLICY IF EXISTS "Service role full access" ON courses;
  CREATE POLICY "Service role full access" ON courses
    FOR ALL TO service_role USING (true);
    
  DROP POLICY IF EXISTS "Admin can manage courses" ON courses;
  CREATE POLICY "Admin can manage courses" ON courses
    FOR ALL TO authenticated USING (true);
END $$;

-- ============================================================
-- 5. CREATE UTILITY FUNCTIONS FOR FOLDER OPERATIONS
-- ============================================================

-- Function to get all child courses of a folder
CREATE OR REPLACE FUNCTION get_child_courses(folder_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  grade TEXT,
  section TEXT,
  is_folder BOOLEAN,
  level_id UUID,
  parent_course_id UUID,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE folder_tree AS (
    -- Base case: direct children
    SELECT c.id, c.name, c.grade, c.section, c.is_folder, c.level_id, c.parent_course_id, c.sort_order
    FROM courses c
    WHERE c.parent_course_id = folder_id
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT c.id, c.name, c.grade, c.section, c.is_folder, c.level_id, c.parent_course_id, c.sort_order
    FROM courses c
    INNER JOIN folder_tree ft ON c.parent_course_id = ft.id
  )
  SELECT * FROM folder_tree
  ORDER BY sort_order, name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a course is a folder
CREATE OR REPLACE FUNCTION is_course_folder(course_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT is_folder INTO result
  FROM courses
  WHERE id = course_id;
  
  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. CREATE VIEWS FOR FOLDER-BASED QUERIES
-- ============================================================

-- View to get courses with their folder information
CREATE OR REPLACE VIEW courses_with_folder_info AS
SELECT 
  c.id,
  c.event_id,
  c.name,
  c.grade,
  c.section,
  c.level_id,
  c.description,
  c.sort_order,
  c.active,
  c.is_folder,
  c.parent_course_id,
  p.name as parent_course_name,
  c.created_at,
  c.updated_at,
  -- Count direct children (courses/folders)
  (SELECT COUNT(*) FROM courses child WHERE child.parent_course_id = c.id) as child_count,
  -- Count students if not a folder
  CASE 
    WHEN c.is_folder = false THEN 
      (SELECT COUNT(*) FROM students s WHERE s.course_id = c.id AND s.active = true)
    ELSE 0
  END as student_count
FROM courses c
LEFT JOIN courses p ON c.parent_course_id = p.id
ORDER BY c.sort_order, c.name;

-- ============================================================
-- 7. FINAL VERIFICATION
-- ============================================================

DO $$
DECLARE
  missing_columns TEXT := '';
BEGIN
  -- Check if parent_course_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'parent_course_id'
  ) THEN
    missing_columns := missing_columns || 'parent_course_id, ';
  END IF;
  
  -- Check if is_folder column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'is_folder'
  ) THEN
    missing_columns := missing_columns || 'is_folder, ';
  END IF;

  IF missing_columns != '' THEN
    RAISE WARNING 'Missing columns: %', missing_columns;
  ELSE
    RAISE NOTICE 'Folder support added to courses table successfully';
    RAISE NOTICE 'New columns: parent_course_id, is_folder';
    RAISE NOTICE 'New functions: get_child_courses, is_course_folder';
    RAISE NOTICE 'New view: courses_with_folder_info';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (Run manually after migration)
-- ============================================================

/*
-- Check new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'courses' AND column_name IN ('parent_course_id', 'is_folder')
ORDER BY ordinal_position;

-- Check new indexes
SELECT indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'courses' 
  AND indexname IN ('idx_courses_parent_id', 'idx_courses_is_folder')
ORDER BY indexname;

-- Test the new functions
SELECT is_course_folder('some-course-id');

-- Test the new view
SELECT * FROM courses_with_folder_info LIMIT 5;
*/