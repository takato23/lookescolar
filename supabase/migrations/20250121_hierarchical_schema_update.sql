-- ============================================================
-- Migration: Hierarchical Schema Update for Event Organization
-- Purpose: Implement Event → Level → Course → Student → Photos hierarchy
-- Backward Compatible: Maintains existing data and relationships
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE event_levels TABLE (Optional organizational layer)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2), -- e.g., "Primaria", "Secundaria", "Jardín"
  description TEXT,
  sort_order INTEGER DEFAULT 0, -- For display ordering
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: unique level name per event
  UNIQUE(event_id, name)
);

-- Create indexes for event_levels
CREATE INDEX IF NOT EXISTS idx_event_levels_event_id ON event_levels(event_id);
CREATE INDEX IF NOT EXISTS idx_event_levels_sort_order ON event_levels(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_levels_active ON event_levels(event_id, active) WHERE active = true;

-- ============================================================
-- 2. UPDATE courses TABLE to support hierarchy
-- ============================================================

-- Add level_id to courses (optional - can be NULL for flat structure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'level_id'
  ) THEN
    ALTER TABLE courses ADD COLUMN level_id UUID REFERENCES event_levels(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_courses_level_id ON courses(level_id);
  END IF;
END $$;

-- Add additional course fields for better organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'description'
  ) THEN
    ALTER TABLE courses ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE courses ADD COLUMN sort_order INTEGER DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_courses_sort_order ON courses(event_id, sort_order);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'active'
  ) THEN
    ALTER TABLE courses ADD COLUMN active BOOLEAN DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(event_id, active) WHERE active = true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================================
-- 3. CREATE students TABLE (replace subjects for clarity)
-- ============================================================

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL, -- Students can be course-less initially
  name TEXT NOT NULL CHECK (length(name) >= 2),
  grade TEXT, -- e.g., "1º", "2º" (can differ from course for transfers)
  section TEXT, -- e.g., "A", "B", "Verde", "Azul"
  student_number TEXT, -- School internal student ID
  qr_code TEXT UNIQUE, -- For QR-based access (especially secondary school)
  email TEXT CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT,
  parent_name TEXT, -- Primary contact
  parent_email TEXT CHECK (parent_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  parent_phone TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(event_id, student_number), -- If student_number is provided, must be unique per event
  UNIQUE(event_id, name, course_id) -- Name unique per course (allows same name in different courses)
);

-- Create indexes for students
CREATE INDEX IF NOT EXISTS idx_students_event_id ON students(event_id);
CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_students_qr_code ON students(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_active ON students(event_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_students_name ON students(event_id, name);

-- ============================================================
-- 4. CREATE student_tokens TABLE (for family access)
-- ============================================================

CREATE TABLE IF NOT EXISTS student_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL CHECK (length(token) >= 20),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  rotation_warning_sent BOOLEAN DEFAULT false, -- Track if warning about expiry was sent
  
  -- Only one active token per student
  UNIQUE(student_id, expires_at) -- Allows multiple tokens but prevents duplicates
);

-- Create indexes for student_tokens
CREATE INDEX IF NOT EXISTS idx_student_tokens_token ON student_tokens(token);
CREATE INDEX IF NOT EXISTS idx_student_tokens_student_id ON student_tokens(student_id);
-- Avoid non-immutable functions in partial index predicates
-- Use standard indexes that the planner can use with runtime conditions
CREATE INDEX IF NOT EXISTS idx_student_tokens_token_expires ON student_tokens(token, expires_at);
CREATE INDEX IF NOT EXISTS idx_student_tokens_expires_not_null ON student_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- 5. CREATE photo_students TABLE (replace photo_subjects)
-- ============================================================

CREATE TABLE IF NOT EXISTS photo_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  tagged_by UUID REFERENCES auth.users(id),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1), -- For AI tagging
  manual_review BOOLEAN DEFAULT false, -- Flags photos needing manual review
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: unique photo-student association
  UNIQUE(photo_id, student_id)
);

-- Create indexes for photo_students
CREATE INDEX IF NOT EXISTS idx_photo_students_photo_id ON photo_students(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_students_student_id ON photo_students(student_id);
CREATE INDEX IF NOT EXISTS idx_photo_students_tagged_at ON photo_students(tagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_students_manual_review ON photo_students(manual_review) WHERE manual_review = true;

-- ============================================================
-- 6. CREATE photo_courses TABLE (for group/class photos)
-- ============================================================

CREATE TABLE IF NOT EXISTS photo_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  photo_type TEXT DEFAULT 'group' CHECK (photo_type IN ('group', 'activity', 'event')), -- Type of course photo
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  tagged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: unique photo-course association per type
  UNIQUE(photo_id, course_id, photo_type)
);

-- Create indexes for photo_courses
CREATE INDEX IF NOT EXISTS idx_photo_courses_photo_id ON photo_courses(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_courses_course_id ON photo_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_photo_courses_type ON photo_courses(course_id, photo_type);

-- ============================================================
-- 7. EXTEND photos TABLE to support hierarchy and QR codes
-- ============================================================

-- Add course_id to photos for direct course association (group photos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE photos ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_photos_course_id ON photos(course_id);
  END IF;
  
  -- Add QR detection fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'detected_qr_codes'
  ) THEN
    ALTER TABLE photos ADD COLUMN detected_qr_codes JSONB DEFAULT '[]'; -- Array of detected QR codes
    CREATE INDEX IF NOT EXISTS idx_photos_qr_codes ON photos USING GIN(detected_qr_codes);
  END IF;
  
  -- Add photo classification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'photo_type'
  ) THEN
    ALTER TABLE photos ADD COLUMN photo_type TEXT DEFAULT 'individual' CHECK (photo_type IN ('individual', 'group', 'activity', 'event'));
    CREATE INDEX IF NOT EXISTS idx_photos_type ON photos(event_id, photo_type);
  END IF;
  
  -- Add processing status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE photos ADD COLUMN processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
    CREATE INDEX IF NOT EXISTS idx_photos_processing ON photos(processing_status) WHERE processing_status != 'completed';
  END IF;
END $$;

-- ============================================================
-- 8. ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE event_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_courses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. CREATE RLS POLICIES FOR NEW TABLES
-- ============================================================

-- Event Levels Policies
CREATE POLICY "Service role full access" ON event_levels
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage event levels" ON event_levels
  FOR ALL TO authenticated USING (true);

-- Students Policies
CREATE POLICY "Service role full access" ON students
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage students" ON students
  FOR ALL TO authenticated USING (true);

-- Family access to their student data (via token)
CREATE POLICY "Family access to student data" ON students
  FOR SELECT USING (
    id IN (
      SELECT st.student_id FROM student_tokens st
      WHERE st.token = current_setting('request.jwt.claims.token', true)
        AND st.expires_at > NOW()
    )
  );

-- Student Tokens Policies
CREATE POLICY "Service role full access" ON student_tokens
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage student tokens" ON student_tokens
  FOR ALL TO authenticated USING (true);

-- Photo Students Policies
CREATE POLICY "Service role full access" ON photo_students
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage photo assignments" ON photo_students
  FOR ALL TO authenticated USING (true);

-- Family can view their photo assignments
CREATE POLICY "Family can view photo assignments" ON photo_students
  FOR SELECT USING (
    student_id IN (
      SELECT st.student_id FROM student_tokens st
      WHERE st.token = current_setting('request.jwt.claims.token', true)
        AND st.expires_at > NOW()
    )
  );

-- Photo Courses Policies
CREATE POLICY "Service role full access" ON photo_courses
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage photo course assignments" ON photo_courses
  FOR ALL TO authenticated USING (true);

-- Family can view course photos if their student is in the course
CREATE POLICY "Family can view course photos" ON photo_courses
  FOR SELECT USING (
    course_id IN (
      SELECT s.course_id FROM students s
      JOIN student_tokens st ON s.id = st.student_id
      WHERE st.token = current_setting('request.jwt.claims.token', true)
        AND st.expires_at > NOW()
        AND s.course_id IS NOT NULL
    )
  );

-- ============================================================
-- 10. CREATE MIGRATION FUNCTIONS FOR BACKWARD COMPATIBILITY
-- ============================================================

-- Function to migrate existing subjects to students
CREATE OR REPLACE FUNCTION migrate_subjects_to_students()
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER := 0;
  subject_record RECORD;
BEGIN
  -- Only migrate if students is empty; guard access to legacy tables
  IF (SELECT COUNT(*) FROM students) = 0 THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'subjects'
    ) THEN
      IF (SELECT COUNT(*) FROM subjects) > 0 THEN
        FOR subject_record IN 
          SELECT id, event_id, name, email, phone, grade_section, created_at, updated_at
          FROM subjects
        LOOP
          INSERT INTO students (
            id, event_id, name, email, phone, grade, created_at, updated_at
          ) VALUES (
            subject_record.id,
            subject_record.event_id,
            subject_record.name,
            subject_record.email,
            subject_record.phone,
            subject_record.grade_section,
            subject_record.created_at,
            subject_record.updated_at
          );
          migrated_count := migrated_count + 1;
        END LOOP;
        RAISE NOTICE 'Migrated % subjects to students', migrated_count;
      ELSE
        RAISE NOTICE 'No subjects found to migrate';
      END IF;
    ELSE
      RAISE NOTICE 'subjects table not found, skipping migration';
    END IF;
  ELSE
    RAISE NOTICE 'students table already has data - skipping migration';
  END IF;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing subject_tokens to student_tokens
CREATE OR REPLACE FUNCTION migrate_subject_tokens_to_student_tokens()
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER := 0;
  token_record RECORD;
BEGIN
  -- Only migrate if student_tokens is empty; guard legacy table access
  IF (SELECT COUNT(*) FROM student_tokens) = 0 THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'subject_tokens'
    ) THEN
      IF (SELECT COUNT(*) FROM subject_tokens) > 0 THEN
        FOR token_record IN 
          SELECT id, subject_id, token, expires_at, created_at, used_at
          FROM subject_tokens
        LOOP
          INSERT INTO student_tokens (
            id, student_id, token, expires_at, created_at, used_at
          ) VALUES (
            token_record.id,
            token_record.subject_id,
            token_record.token,
            token_record.expires_at,
            token_record.created_at,
            token_record.used_at
          );
          migrated_count := migrated_count + 1;
        END LOOP;
        RAISE NOTICE 'Migrated % subject tokens to student tokens', migrated_count;
      ELSE
        RAISE NOTICE 'No subject_tokens found to migrate';
      END IF;
    ELSE
      RAISE NOTICE 'subject_tokens table not found, skipping migration';
    END IF;
  ELSE
    RAISE NOTICE 'student_tokens already has data - skipping migration';
  END IF;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing photo_subjects to photo_students
CREATE OR REPLACE FUNCTION migrate_photo_subjects_to_photo_students()
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER := 0;
  photo_subject_record RECORD;
BEGIN
  -- Only migrate if photo_students is empty; guard legacy table access
  IF (SELECT COUNT(*) FROM photo_students) = 0 THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'photo_subjects'
    ) THEN
      IF (SELECT COUNT(*) FROM photo_subjects) > 0 THEN
        FOR photo_subject_record IN 
          SELECT id, photo_id, subject_id, tagged_at, tagged_by, created_at
          FROM photo_subjects
        LOOP
          INSERT INTO photo_students (
            id, photo_id, student_id, tagged_at, tagged_by, created_at
          ) VALUES (
            photo_subject_record.id,
            photo_subject_record.photo_id,
            photo_subject_record.subject_id,
            photo_subject_record.tagged_at,
            photo_subject_record.tagged_by,
            photo_subject_record.created_at
          );
          migrated_count := migrated_count + 1;
        END LOOP;
        RAISE NOTICE 'Migrated % photo-subject associations to photo-student associations', migrated_count;
      ELSE
        RAISE NOTICE 'No photo_subjects found to migrate';
      END IF;
    ELSE
      RAISE NOTICE 'photo_subjects table not found, skipping migration';
    END IF;
  ELSE
    RAISE NOTICE 'photo_students already has data - skipping migration';
  END IF;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 11. RUN MIGRATION FUNCTIONS
-- ============================================================

SELECT migrate_subjects_to_students();
SELECT migrate_subject_tokens_to_student_tokens();
SELECT migrate_photo_subjects_to_photo_students();

-- ============================================================
-- 12. CREATE UTILITY FUNCTIONS
-- ============================================================

-- Function to generate QR codes for students
CREATE OR REPLACE FUNCTION generate_student_qr_code(student_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  qr_code_value TEXT;
BEGIN
  -- Generate a unique QR code based on student ID and timestamp
  qr_code_value := 'STU-' || encode(gen_random_bytes(8), 'hex') || '-' || EXTRACT(epoch FROM NOW())::TEXT;
  
  -- Update the student with the generated QR code
  UPDATE students 
  SET qr_code = qr_code_value 
  WHERE id = student_id_param;
  
  RETURN qr_code_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure tokens for students
CREATE OR REPLACE FUNCTION generate_student_token(student_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  token_value TEXT;
BEGIN
  -- Generate a secure token
  token_value := encode(gen_random_bytes(24), 'base64') || substr(md5(random()::text), 1, 8);
  
  -- Insert the new token
  INSERT INTO student_tokens (student_id, token)
  VALUES (student_id_param, token_value);
  
  RETURN token_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 13. CREATE UPDATED TRIGGERS
-- ============================================================

-- Add updated_at trigger for new tables
CREATE TRIGGER update_event_levels_updated_at 
  BEFORE UPDATE ON event_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at 
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at 
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 14. CREATE VIEWS FOR EASIER QUERYING
-- ============================================================

-- Create hierarchical_event_structure view with compatibility for events without 'active' column
DO $$
DECLARE
  has_active_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'active'
  ) INTO has_active_column;

  IF has_active_column THEN
    EXECUTE $$
      CREATE OR REPLACE VIEW hierarchical_event_structure AS
      SELECT 
        e.id as event_id,
        e.name as event_name,
        e.date as event_date,
        el.id as level_id,
        el.name as level_name,
        el.sort_order as level_sort_order,
        c.id as course_id,
        c.name as course_name,
        c.grade,
        c.section,
        c.sort_order as course_sort_order,
        COUNT(DISTINCT s.id) as student_count,
        COUNT(DISTINCT p.id) as photo_count
      FROM events e
      LEFT JOIN event_levels el ON e.id = el.event_id AND el.active = true
      LEFT JOIN courses c ON e.id = c.event_id AND c.active = true AND (c.level_id = el.id OR c.level_id IS NULL)
      LEFT JOIN students s ON c.id = s.course_id AND s.active = true
      LEFT JOIN photo_students ps ON s.id = ps.student_id
      LEFT JOIN photos p ON ps.photo_id = p.id AND p.approved = true
      WHERE e.active = true
      GROUP BY e.id, e.name, e.date, el.id, el.name, el.sort_order, c.id, c.name, c.grade, c.section, c.sort_order
      ORDER BY e.date DESC, el.sort_order, c.sort_order
    $$;
  ELSE
    EXECUTE $$
      CREATE OR REPLACE VIEW hierarchical_event_structure AS
      SELECT 
        e.id as event_id,
        e.name as event_name,
        e.date as event_date,
        el.id as level_id,
        el.name as level_name,
        el.sort_order as level_sort_order,
        c.id as course_id,
        c.name as course_name,
        c.grade,
        c.section,
        c.sort_order as course_sort_order,
        COUNT(DISTINCT s.id) as student_count,
        COUNT(DISTINCT p.id) as photo_count
      FROM events e
      LEFT JOIN event_levels el ON e.id = el.event_id AND el.active = true
      LEFT JOIN courses c ON e.id = c.event_id AND c.active = true AND (c.level_id = el.id OR c.level_id IS NULL)
      LEFT JOIN students s ON c.id = s.course_id AND s.active = true
      LEFT JOIN photo_students ps ON s.id = ps.student_id
      LEFT JOIN photos p ON ps.photo_id = p.id AND p.approved = true
      GROUP BY e.id, e.name, e.date, el.id, el.name, el.sort_order, c.id, c.name, c.grade, c.section, c.sort_order
      ORDER BY e.date DESC, el.sort_order, c.sort_order
    $$;
  END IF;
END $$;

-- View for student photo statistics
CREATE OR REPLACE VIEW student_photo_stats AS
SELECT 
  s.id as student_id,
  s.name as student_name,
  s.event_id,
  e.name as event_name,
  s.course_id,
  c.name as course_name,
  COUNT(DISTINCT ps.photo_id) as total_photos,
  COUNT(DISTINCT CASE WHEN p.approved = true THEN ps.photo_id END) as approved_photos,
  MAX(ps.tagged_at) as last_photo_tagged,
  CASE 
    WHEN st.token IS NOT NULL AND st.expires_at > NOW() THEN st.token
    ELSE NULL 
  END as active_token
FROM students s
JOIN events e ON s.event_id = e.id
LEFT JOIN courses c ON s.course_id = c.id
LEFT JOIN photo_students ps ON s.id = ps.student_id
LEFT JOIN photos p ON ps.photo_id = p.id
LEFT JOIN student_tokens st ON s.id = st.student_id AND st.expires_at > NOW()
WHERE s.active = true
GROUP BY s.id, s.name, s.event_id, e.name, s.course_id, c.name, st.token, st.expires_at
ORDER BY e.date DESC, c.sort_order, s.name;

-- ============================================================
-- 15. FINAL VERIFICATION
-- ============================================================

DO $$
DECLARE
  new_tables TEXT[] := ARRAY[
    'event_levels', 'students', 'student_tokens', 'photo_students', 'photo_courses'
  ];
  table_name TEXT;
  missing_tables TEXT := '';
  table_count INTEGER;
BEGIN
  FOREACH table_name IN ARRAY new_tables
  LOOP
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = table_name;
    
    IF table_count = 0 THEN
      missing_tables := missing_tables || table_name || ', ';
    END IF;
  END LOOP;

  IF missing_tables != '' THEN
    RAISE WARNING 'Missing new tables: %', missing_tables;
  ELSE
    RAISE NOTICE 'All new hierarchical tables created successfully';
  END IF;
  
  -- Report migration results
  RAISE NOTICE 'Migration completed - hierarchical schema is ready';
  RAISE NOTICE 'New structure: Event → Level (optional) → Course → Student → Photos';
  RAISE NOTICE 'Backward compatibility maintained through migration functions';
END $$;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (Run manually after migration)
-- ============================================================

/*
-- Check hierarchical structure
SELECT 
  event_name, level_name, course_name, student_count, photo_count
FROM hierarchical_event_structure 
ORDER BY event_name, level_sort_order, course_sort_order
LIMIT 10;

-- Check student migrations
SELECT 
  'students' as table_name, COUNT(*) as count
FROM students
UNION ALL
SELECT 
  'student_tokens' as table_name, COUNT(*) as count
FROM student_tokens
UNION ALL
SELECT 
  'photo_students' as table_name, COUNT(*) as count
FROM photo_students;

-- Check new indexes
SELECT 
  schemaname, tablename, indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('event_levels', 'students', 'student_tokens', 'photo_students', 'photo_courses')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
  tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('event_levels', 'students', 'student_tokens', 'photo_students', 'photo_courses')
ORDER BY tablename, policyname;
*/
