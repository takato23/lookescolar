-- ============================================================
-- Migration: Bulk Classification Functions
-- Purpose: Add PostgreSQL functions to support bulk photo classification
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FUNCTION: Classify photos to course
-- ============================================================

CREATE OR REPLACE FUNCTION classify_photos_to_course(
  photo_ids UUID[],
  course_id UUID,
  photo_type TEXT DEFAULT 'group',
  admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
  photo_id UUID,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  photo_id UUID;
  course_exists BOOLEAN;
  result_status TEXT;
  result_error TEXT;
BEGIN
  -- Verify course exists
  SELECT EXISTS(SELECT 1 FROM courses WHERE id = classify_photos_to_course.course_id) INTO course_exists;
  
  IF NOT course_exists THEN
    -- Return error for all photos
    FOREACH photo_id IN ARRAY photo_ids
    LOOP
      RETURN QUERY SELECT photo_id, 'error'::TEXT, 'Course not found'::TEXT;
    END LOOP;
    RETURN;
  END IF;

  -- Process each photo
  FOREACH photo_id IN ARRAY photo_ids
  LOOP
    BEGIN
      -- Check if photo exists
      IF NOT EXISTS(SELECT 1 FROM photos WHERE id = photo_id) THEN
        RETURN QUERY SELECT photo_id, 'error'::TEXT, 'Photo not found'::TEXT;
        CONTINUE;
      END IF;

      -- Update photo with course assignment
      UPDATE photos 
      SET 
        course_id = classify_photos_to_course.course_id,
        photo_type = classify_photos_to_course.photo_type,
        updated_at = NOW()
      WHERE id = photo_id;

      -- Insert or update photo_courses association
      INSERT INTO photo_courses (photo_id, course_id, photo_type, tagged_by, tagged_at)
      VALUES (photo_id, classify_photos_to_course.course_id, classify_photos_to_course.photo_type, admin_id, NOW())
      ON CONFLICT (photo_id, course_id, photo_type) 
      DO UPDATE SET 
        tagged_by = admin_id,
        tagged_at = NOW();

      RETURN QUERY SELECT photo_id, 'success'::TEXT, NULL::TEXT;

    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT photo_id, 'error'::TEXT, SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. FUNCTION: Classify photos to student
-- ============================================================

CREATE OR REPLACE FUNCTION classify_photos_to_student(
  photo_ids UUID[],
  student_id UUID,
  confidence_score DECIMAL DEFAULT 1.0,
  manual_review BOOLEAN DEFAULT false,
  admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
  photo_id UUID,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  photo_id UUID;
  student_exists BOOLEAN;
  student_event_id UUID;
  photo_event_id UUID;
BEGIN
  -- Verify student exists and get event_id
  SELECT EXISTS(SELECT 1 FROM students WHERE id = classify_photos_to_student.student_id), 
         s.event_id
  INTO student_exists, student_event_id
  FROM students s 
  WHERE s.id = classify_photos_to_student.student_id;
  
  IF NOT student_exists THEN
    -- Return error for all photos
    FOREACH photo_id IN ARRAY photo_ids
    LOOP
      RETURN QUERY SELECT photo_id, 'error'::TEXT, 'Student not found'::TEXT;
    END LOOP;
    RETURN;
  END IF;

  -- Process each photo
  FOREACH photo_id IN ARRAY photo_ids
  LOOP
    BEGIN
      -- Check if photo exists and get its event_id
      SELECT p.event_id INTO photo_event_id
      FROM photos p 
      WHERE p.id = photo_id;

      IF photo_event_id IS NULL THEN
        RETURN QUERY SELECT photo_id, 'error'::TEXT, 'Photo not found'::TEXT;
        CONTINUE;
      END IF;

      -- Verify photo and student belong to same event
      IF photo_event_id != student_event_id THEN
        RETURN QUERY SELECT photo_id, 'error'::TEXT, 'Photo and student must belong to same event'::TEXT;
        CONTINUE;
      END IF;

      -- Update photo type to individual
      UPDATE photos 
      SET 
        photo_type = 'individual',
        updated_at = NOW()
      WHERE id = photo_id;

      -- Insert or update photo_students association
      INSERT INTO photo_students (
        photo_id, 
        student_id, 
        tagged_by, 
        confidence_score, 
        manual_review, 
        tagged_at
      )
      VALUES (
        photo_id, 
        classify_photos_to_student.student_id, 
        admin_id, 
        classify_photos_to_student.confidence_score, 
        classify_photos_to_student.manual_review, 
        NOW()
      )
      ON CONFLICT (photo_id, student_id) 
      DO UPDATE SET 
        tagged_by = admin_id,
        confidence_score = classify_photos_to_student.confidence_score,
        manual_review = classify_photos_to_student.manual_review,
        tagged_at = NOW();

      RETURN QUERY SELECT photo_id, 'success'::TEXT, NULL::TEXT;

    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT photo_id, 'error'::TEXT, SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. FUNCTION: Batch generate student tokens
-- ============================================================

CREATE OR REPLACE FUNCTION batch_generate_student_tokens(
  event_id UUID,
  regenerate_existing BOOLEAN DEFAULT false
)
RETURNS TABLE(
  student_id UUID,
  student_name TEXT,
  token TEXT,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  student_record RECORD;
  token_value TEXT;
  existing_token TEXT;
BEGIN
  -- Process each student in the event
  FOR student_record IN 
    SELECT id, name 
    FROM students 
    WHERE students.event_id = batch_generate_student_tokens.event_id 
      AND active = true
  LOOP
    BEGIN
      -- Check if student already has a valid token
      SELECT st.token INTO existing_token
      FROM student_tokens st
      WHERE st.student_id = student_record.id
        AND st.expires_at > NOW()
      LIMIT 1;

      -- Skip if token exists and we're not regenerating
      IF existing_token IS NOT NULL AND NOT regenerate_existing THEN
        RETURN QUERY SELECT 
          student_record.id, 
          student_record.name, 
          existing_token, 
          'existing'::TEXT, 
          NULL::TEXT;
        CONTINUE;
      END IF;

      -- Generate new token
      token_value := encode(gen_random_bytes(24), 'base64') || substr(md5(random()::text), 1, 8);
      token_value := regexp_replace(token_value, '[^a-zA-Z0-9]', '', 'g');
      token_value := substr(token_value, 1, 32);

      -- Insert new token (or update existing)
      INSERT INTO student_tokens (student_id, token, expires_at)
      VALUES (student_record.id, token_value, NOW() + INTERVAL '30 days')
      ON CONFLICT (student_id) 
      DO UPDATE SET 
        token = token_value,
        expires_at = NOW() + INTERVAL '30 days',
        created_at = NOW(),
        used_at = NULL,
        rotation_warning_sent = false;

      RETURN QUERY SELECT 
        student_record.id, 
        student_record.name, 
        token_value, 
        'generated'::TEXT, 
        NULL::TEXT;

    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT 
          student_record.id, 
          student_record.name, 
          NULL::TEXT, 
          'error'::TEXT, 
          SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. FUNCTION: Get event classification stats
-- ============================================================

CREATE OR REPLACE FUNCTION get_event_classification_stats(event_id UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'photos', json_build_object(
      'total', COALESCE(photo_stats.total, 0),
      'unclassified', COALESCE(photo_stats.unclassified, 0),
      'in_courses', COALESCE(photo_stats.in_courses, 0),
      'with_students', COALESCE(photo_stats.with_students, 0),
      'by_type', json_build_object(
        'individual', COALESCE(photo_stats.individual, 0),
        'group', COALESCE(photo_stats.group, 0),
        'activity', COALESCE(photo_stats.activity, 0),
        'event', COALESCE(photo_stats.event, 0)
      )
    ),
    'courses', json_build_object(
      'total', COALESCE(course_stats.total, 0),
      'with_photos', COALESCE(course_stats.with_photos, 0)
    ),
    'students', json_build_object(
      'total', COALESCE(student_stats.total, 0),
      'with_photos', COALESCE(student_stats.with_photos, 0),
      'with_tokens', COALESCE(student_stats.with_tokens, 0)
    )
  ) INTO stats
  FROM (
    -- Photo statistics
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE course_id IS NULL AND photo_type = 'individual') as unclassified,
      COUNT(*) FILTER (WHERE course_id IS NOT NULL) as in_courses,
      COUNT(DISTINCT ps.student_id) FILTER (WHERE ps.student_id IS NOT NULL) as with_students,
      COUNT(*) FILTER (WHERE photo_type = 'individual') as individual,
      COUNT(*) FILTER (WHERE photo_type = 'group') as group,
      COUNT(*) FILTER (WHERE photo_type = 'activity') as activity,
      COUNT(*) FILTER (WHERE photo_type = 'event') as event
    FROM photos p
    LEFT JOIN photo_students ps ON p.id = ps.photo_id
    WHERE p.event_id = get_event_classification_stats.event_id
  ) photo_stats,
  (
    -- Course statistics
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT pc.course_id) as with_photos
    FROM courses c
    LEFT JOIN photo_courses pc ON c.id = pc.course_id
    WHERE c.event_id = get_event_classification_stats.event_id
      AND c.active = true
  ) course_stats,
  (
    -- Student statistics
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT ps.student_id) as with_photos,
      COUNT(DISTINCT st.student_id) as with_tokens
    FROM students s
    LEFT JOIN photo_students ps ON s.id = ps.student_id
    LEFT JOIN student_tokens st ON s.id = st.student_id AND st.expires_at > NOW()
    WHERE s.event_id = get_event_classification_stats.event_id
      AND s.active = true
  ) student_stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. FUNCTION: Bulk update photo types
-- ============================================================

CREATE OR REPLACE FUNCTION bulk_update_photo_types(
  photo_ids UUID[],
  new_photo_type TEXT
)
RETURNS TABLE(
  photo_id UUID,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  photo_id UUID;
  valid_types TEXT[] := ARRAY['individual', 'group', 'activity', 'event'];
BEGIN
  -- Validate photo type
  IF new_photo_type != ALL(valid_types) THEN
    FOREACH photo_id IN ARRAY photo_ids
    LOOP
      RETURN QUERY SELECT photo_id, 'error'::TEXT, 'Invalid photo type'::TEXT;
    END LOOP;
    RETURN;
  END IF;

  -- Process each photo
  FOREACH photo_id IN ARRAY photo_ids
  LOOP
    BEGIN
      -- Update photo type
      UPDATE photos 
      SET 
        photo_type = new_photo_type,
        updated_at = NOW()
      WHERE id = photo_id;

      IF FOUND THEN
        RETURN QUERY SELECT photo_id, 'success'::TEXT, NULL::TEXT;
      ELSE
        RETURN QUERY SELECT photo_id, 'error'::TEXT, 'Photo not found'::TEXT;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT photo_id, 'error'::TEXT, SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. FUNCTION: Remove photo classifications
-- ============================================================

CREATE OR REPLACE FUNCTION remove_photo_classifications(
  photo_ids UUID[],
  classification_type TEXT DEFAULT 'all' -- 'all', 'courses', 'students'
)
RETURNS TABLE(
  photo_id UUID,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  photo_id UUID;
BEGIN
  -- Process each photo
  FOREACH photo_id IN ARRAY photo_ids
  LOOP
    BEGIN
      -- Remove student classifications
      IF classification_type = 'all' OR classification_type = 'students' THEN
        DELETE FROM photo_students WHERE photo_students.photo_id = remove_photo_classifications.photo_id;
      END IF;

      -- Remove course classifications
      IF classification_type = 'all' OR classification_type = 'courses' THEN
        DELETE FROM photo_courses WHERE photo_courses.photo_id = remove_photo_classifications.photo_id;
      END IF;

      -- Reset photo to unclassified state
      IF classification_type = 'all' THEN
        UPDATE photos 
        SET 
          photo_type = 'individual',
          course_id = NULL,
          updated_at = NOW()
        WHERE id = photo_id;
      END IF;

      RETURN QUERY SELECT photo_id, 'success'::TEXT, NULL::TEXT;

    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT photo_id, 'error'::TEXT, SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

-- Indexes for photo classification queries
CREATE INDEX IF NOT EXISTS idx_photos_event_course_type ON photos(event_id, course_id, photo_type) WHERE processing_status = 'completed';
CREATE INDEX IF NOT EXISTS idx_photos_unclassified ON photos(event_id) WHERE course_id IS NULL AND photo_type = 'individual' AND processing_status = 'completed';

-- Indexes for student token queries
CREATE INDEX IF NOT EXISTS idx_student_tokens_valid_by_student ON student_tokens(student_id, expires_at) WHERE expires_at > NOW();

-- Indexes for classification associations
CREATE INDEX IF NOT EXISTS idx_photo_students_by_student ON photo_students(student_id, tagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_courses_by_course ON photo_courses(course_id, tagged_at DESC);

-- ============================================================
-- 8. GRANT PERMISSIONS
-- ============================================================

-- Grant execute permissions to authenticated users (admins)
GRANT EXECUTE ON FUNCTION classify_photos_to_course(UUID[], UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION classify_photos_to_student(UUID[], UUID, DECIMAL, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_generate_student_tokens(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_classification_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_photo_types(UUID[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_photo_classifications(UUID[], TEXT) TO authenticated;

-- Grant execute permissions to service role (for API calls)
GRANT EXECUTE ON FUNCTION classify_photos_to_course(UUID[], UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION classify_photos_to_student(UUID[], UUID, DECIMAL, BOOLEAN, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION batch_generate_student_tokens(UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION get_event_classification_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION bulk_update_photo_types(UUID[], TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION remove_photo_classifications(UUID[], TEXT) TO service_role;

-- ============================================================
-- 9. VERIFICATION
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
      'classify_photos_to_course',
      'classify_photos_to_student', 
      'batch_generate_student_tokens',
      'get_event_classification_stats',
      'bulk_update_photo_types',
      'remove_photo_classifications'
    );

  IF function_count = 6 THEN
    RAISE NOTICE 'All 6 bulk classification functions created successfully';
  ELSE
    RAISE WARNING 'Expected 6 functions, found %', function_count;
  END IF;
END $$;

COMMIT;