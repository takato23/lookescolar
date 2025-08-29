-- ============================================================
-- Migration: Gallery Sharing System
-- Purpose: Add tables and functions to support gallery sharing with access tokens
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE gallery_shares TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS gallery_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  level_id UUID REFERENCES event_levels(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  allow_download BOOLEAN DEFAULT true,
  allow_share BOOLEAN DEFAULT true,
  custom_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: only one of level_id, course_id, student_id can be set (exclusive hierarchy)
  CONSTRAINT chk_gallery_share_hierarchy CHECK (
    (level_id IS NOT NULL AND course_id IS NULL AND student_id IS NULL) OR
    (level_id IS NULL AND course_id IS NOT NULL AND student_id IS NULL) OR
    (level_id IS NULL AND course_id IS NULL AND student_id IS NOT NULL) OR
    (level_id IS NULL AND course_id IS NULL AND student_id IS NULL) -- Event-level share
  )
);

-- Create indexes for gallery_shares
CREATE INDEX IF NOT EXISTS idx_gallery_shares_event_id ON gallery_shares(event_id);
CREATE INDEX IF NOT EXISTS idx_gallery_shares_level_id ON gallery_shares(level_id);
CREATE INDEX IF NOT EXISTS idx_gallery_shares_course_id ON gallery_shares(course_id);
CREATE INDEX IF NOT EXISTS idx_gallery_shares_student_id ON gallery_shares(student_id);
CREATE INDEX IF NOT EXISTS idx_gallery_shares_token ON gallery_shares(token);
CREATE INDEX IF NOT EXISTS idx_gallery_shares_expires_at ON gallery_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_gallery_shares_active ON gallery_shares(event_id, expires_at) WHERE expires_at > NOW();

-- ============================================================
-- 2. ENABLE RLS ON gallery_shares TABLE
-- ============================================================

ALTER TABLE gallery_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. CREATE RLS POLICIES FOR gallery_shares TABLE
-- ============================================================

-- Service role full access
CREATE POLICY "Service role full access" ON gallery_shares
  FOR ALL TO service_role USING (true);

-- Admin can manage gallery shares
CREATE POLICY "Admin can manage gallery shares" ON gallery_shares
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- 4. CREATE UTILITY FUNCTIONS
-- ============================================================

-- Function to create a gallery share
CREATE OR REPLACE FUNCTION create_gallery_share(
  p_event_id UUID,
  p_level_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_student_id UUID DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 7,
  p_max_views INTEGER DEFAULT NULL,
  p_allow_download BOOLEAN DEFAULT true,
  p_allow_share BOOLEAN DEFAULT true,
  p_custom_message TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS gallery_shares AS $$
DECLARE
  share_record gallery_shares;
  token_value TEXT;
BEGIN
  -- Generate a unique token
  token_value := encode(gen_random_bytes(32), 'base64');
  token_value := regexp_replace(token_value, '[^a-zA-Z0-9]', '', 'g');
  token_value := substr(token_value, 1, 32);
  
  -- Insert the gallery share
  INSERT INTO gallery_shares (
    event_id,
    level_id,
    course_id,
    student_id,
    token,
    expires_at,
    max_views,
    allow_download,
    allow_share,
    custom_message,
    created_by
  )
  VALUES (
    p_event_id,
    p_level_id,
    p_course_id,
    p_student_id,
    token_value,
    NOW() + INTERVAL '1 day' * p_expires_in_days,
    p_max_views,
    p_allow_download,
    p_allow_share,
    p_custom_message,
    p_created_by
  )
  RETURNING * INTO share_record;
  
  RETURN share_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate a gallery share token
CREATE OR REPLACE FUNCTION validate_gallery_share_token(
  p_token TEXT
)
RETURNS TABLE(
  is_valid BOOLEAN,
  share_id UUID,
  event_id UUID,
  level_id UUID,
  course_id UUID,
  student_id UUID,
  allow_download BOOLEAN,
  allow_share BOOLEAN,
  max_views INTEGER,
  view_count INTEGER,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  share_record gallery_shares;
BEGIN
  -- Find the share record
  SELECT * INTO share_record
  FROM gallery_shares
  WHERE token = p_token
    AND expires_at > NOW()
    AND (max_views IS NULL OR view_count < max_views);
  
  -- If found, increment view count
  IF FOUND THEN
    UPDATE gallery_shares
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = share_record.id;
    
    RETURN QUERY SELECT 
      true,
      share_record.id,
      share_record.event_id,
      share_record.level_id,
      share_record.course_id,
      share_record.student_id,
      share_record.allow_download,
      share_record.allow_share,
      share_record.max_views,
      share_record.view_count + 1,
      share_record.expires_at;
  ELSE
    RETURN QUERY SELECT 
      false,
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      false,
      false,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

-- Grant execute permissions to authenticated users (admins)
GRANT EXECUTE ON FUNCTION create_gallery_share TO authenticated;
GRANT EXECUTE ON FUNCTION validate_gallery_share_token TO authenticated;
GRANT EXECUTE ON FUNCTION validate_gallery_share_token TO anon; -- For public access

-- Grant execute permissions to service role (for API calls)
GRANT EXECUTE ON FUNCTION create_gallery_share TO service_role;
GRANT EXECUTE ON FUNCTION validate_gallery_share_token TO service_role;

-- ============================================================
-- 6. CREATE TRIGGERS
-- ============================================================

-- Add updated_at trigger
CREATE TRIGGER update_gallery_shares_updated_at 
  BEFORE UPDATE ON gallery_shares
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
    WHERE table_schema = 'public' AND table_name = 'gallery_shares'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE 'Gallery shares table created successfully';
  ELSE
    RAISE WARNING 'Gallery shares table creation failed';
  END IF;
  
  -- Count created functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
    AND routine_name IN ('create_gallery_share', 'validate_gallery_share_token');
  
  IF function_count = 2 THEN
    RAISE NOTICE 'All 2 gallery sharing functions created successfully';
  ELSE
    RAISE WARNING 'Expected 2 functions, found %', function_count;
  END IF;
END $$;

COMMIT;