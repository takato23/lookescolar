-- ============================================================
-- Migration: Gallery Metadata Table
-- Purpose: Add table to store gallery metadata for events, levels, courses, and students
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE gallery_metadata TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS gallery_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  level_id UUID REFERENCES event_levels(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  tags TEXT[], -- Array of tags for the gallery
  custom_fields JSONB, -- For additional custom metadata
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: only one of level_id, course_id, student_id can be set (exclusive hierarchy)
  CONSTRAINT chk_gallery_hierarchy CHECK (
    (level_id IS NOT NULL AND course_id IS NULL AND student_id IS NULL) OR
    (level_id IS NULL AND course_id IS NOT NULL AND student_id IS NULL) OR
    (level_id IS NULL AND course_id IS NULL AND student_id IS NOT NULL) OR
    (level_id IS NULL AND course_id IS NULL AND student_id IS NULL) -- Event-level gallery
  ),
  
  -- Constraint: unique metadata per hierarchy level
  UNIQUE(event_id, level_id, course_id, student_id)
);

-- Create indexes for gallery_metadata
CREATE INDEX IF NOT EXISTS idx_gallery_metadata_event_id ON gallery_metadata(event_id);
CREATE INDEX IF NOT EXISTS idx_gallery_metadata_level_id ON gallery_metadata(level_id);
CREATE INDEX IF NOT EXISTS idx_gallery_metadata_course_id ON gallery_metadata(course_id);
CREATE INDEX IF NOT EXISTS idx_gallery_metadata_student_id ON gallery_metadata(student_id);
CREATE INDEX IF NOT EXISTS idx_gallery_metadata_cover_photo ON gallery_metadata(cover_photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_metadata_active ON gallery_metadata(event_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_gallery_metadata_sort_order ON gallery_metadata(event_id, sort_order);

-- ============================================================
-- 2. ENABLE RLS ON gallery_metadata TABLE
-- ============================================================

ALTER TABLE gallery_metadata ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. CREATE RLS POLICIES FOR gallery_metadata TABLE
-- ============================================================

-- Service role full access
CREATE POLICY "Service role full access" ON gallery_metadata
  FOR ALL TO service_role USING (true);

-- Admin can manage gallery metadata
CREATE POLICY "Admin can manage gallery metadata" ON gallery_metadata
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- 4. CREATE UTILITY FUNCTIONS
-- ============================================================

-- Function to get or create gallery metadata for a hierarchy level
CREATE OR REPLACE FUNCTION get_or_create_gallery_metadata(
  p_event_id UUID,
  p_level_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_student_id UUID DEFAULT NULL
)
RETURNS gallery_metadata AS $$
DECLARE
  metadata_record gallery_metadata;
BEGIN
  -- Try to find existing metadata
  SELECT * INTO metadata_record
  FROM gallery_metadata
  WHERE event_id = p_event_id
    AND level_id IS NOT DISTINCT FROM p_level_id
    AND course_id IS NOT DISTINCT FROM p_course_id
    AND student_id IS NOT DISTINCT FROM p_student_id;
  
  -- If not found, create new metadata
  IF NOT FOUND THEN
    INSERT INTO gallery_metadata (event_id, level_id, course_id, student_id)
    VALUES (p_event_id, p_level_id, p_course_id, p_student_id)
    RETURNING * INTO metadata_record;
  END IF;
  
  RETURN metadata_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update gallery metadata
CREATE OR REPLACE FUNCTION update_gallery_metadata(
  p_event_id UUID,
  p_level_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_student_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_cover_photo_id UUID DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_custom_fields JSONB DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL
)
RETURNS gallery_metadata AS $$
DECLARE
  metadata_record gallery_metadata;
BEGIN
  -- Insert or update gallery metadata
  INSERT INTO gallery_metadata (
    event_id, level_id, course_id, student_id,
    title, description, cover_photo_id, tags, custom_fields, sort_order, active
  )
  VALUES (
    p_event_id, p_level_id, p_course_id, p_student_id,
    p_title, p_description, p_cover_photo_id, p_tags, p_custom_fields, p_sort_order, p_active
  )
  ON CONFLICT (event_id, level_id, course_id, student_id)
  DO UPDATE SET
    title = COALESCE(EXCLUDED.title, gallery_metadata.title),
    description = COALESCE(EXCLUDED.description, gallery_metadata.description),
    cover_photo_id = COALESCE(EXCLUDED.cover_photo_id, gallery_metadata.cover_photo_id),
    tags = COALESCE(EXCLUDED.tags, gallery_metadata.tags),
    custom_fields = COALESCE(EXCLUDED.custom_fields, gallery_metadata.custom_fields),
    sort_order = COALESCE(EXCLUDED.sort_order, gallery_metadata.sort_order),
    active = COALESCE(EXCLUDED.active, gallery_metadata.active),
    updated_at = NOW()
  RETURNING * INTO metadata_record;
  
  RETURN metadata_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

-- Grant execute permissions to authenticated users (admins)
GRANT EXECUTE ON FUNCTION get_or_create_gallery_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION update_gallery_metadata TO authenticated;

-- Grant execute permissions to service role (for API calls)
GRANT EXECUTE ON FUNCTION get_or_create_gallery_metadata TO service_role;
GRANT EXECUTE ON FUNCTION update_gallery_metadata TO service_role;

-- ============================================================
-- 6. CREATE TRIGGERS
-- ============================================================

-- Add updated_at trigger
CREATE TRIGGER update_gallery_metadata_updated_at 
  BEFORE UPDATE ON gallery_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. VERIFICATION
-- ============================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  function_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gallery_metadata'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE 'Gallery metadata table created successfully';
  ELSE
    RAISE WARNING 'Gallery metadata table creation failed';
  END IF;
  
  -- Count created functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
    AND routine_name IN ('get_or_create_gallery_metadata', 'update_gallery_metadata');
  
  IF function_count = 2 THEN
    RAISE NOTICE 'All 2 gallery metadata functions created successfully';
  ELSE
    RAISE WARNING 'Expected 2 functions, found %', function_count;
  END IF;
END $$;

COMMIT;