-- ============================================================
-- Migration: QR System Enhancement for Student Identification
-- Purpose: Ensure complete QR code system integration for secondary schools
-- Addresses: Student QR codes, photo QR detection, A/B testing support
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENHANCE codes TABLE for student QR codes
-- ============================================================

-- Add columns for student QR code functionality if not exist
DO $$
BEGIN
  -- Add student_id reference for direct student QR codes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'codes' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE codes ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_codes_student_id ON codes(student_id);
  END IF;
  
  -- Add QR code type for classification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'codes' AND column_name = 'qr_type'
  ) THEN
    ALTER TABLE codes ADD COLUMN qr_type TEXT DEFAULT 'family_access' 
      CHECK (qr_type IN ('family_access', 'student_identification', 'course_group', 'event_access'));
    CREATE INDEX IF NOT EXISTS idx_codes_qr_type ON codes(event_id, qr_type);
  END IF;
  
  -- Add metadata for QR code additional information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'codes' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE codes ADD COLUMN metadata JSONB DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS idx_codes_metadata ON codes USING GIN(metadata);
  END IF;
  
  -- Add generation options storage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'codes' AND column_name = 'generation_options'
  ) THEN
    ALTER TABLE codes ADD COLUMN generation_options JSONB DEFAULT '{}';
  END IF;
  
  -- Add usage tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'codes' AND column_name = 'usage_count'
  ) THEN
    ALTER TABLE codes ADD COLUMN usage_count INTEGER DEFAULT 0;
  END IF;
  
  -- Add last used timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'codes' AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE codes ADD COLUMN last_used_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- 2. ENHANCE students TABLE for QR code integration
-- ============================================================

-- Ensure students table has proper QR code support
DO $$
BEGIN
  -- Reference to primary QR code (if different from qr_code field)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'primary_qr_code_id'
  ) THEN
    ALTER TABLE students ADD COLUMN primary_qr_code_id UUID REFERENCES codes(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_students_primary_qr_code ON students(primary_qr_code_id);
  END IF;
  
  -- QR code generation status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'qr_status'
  ) THEN
    ALTER TABLE students ADD COLUMN qr_status TEXT DEFAULT 'pending' 
      CHECK (qr_status IN ('pending', 'generated', 'printed', 'distributed', 'active', 'disabled'));
    CREATE INDEX IF NOT EXISTS idx_students_qr_status ON students(event_id, qr_status);
  END IF;
  
  -- A/B testing group assignment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'ab_test_group'
  ) THEN
    ALTER TABLE students ADD COLUMN ab_test_group TEXT DEFAULT 'qr_method' 
      CHECK (ab_test_group IN ('qr_method', 'traditional_method', 'control_group'));
    CREATE INDEX IF NOT EXISTS idx_students_ab_test ON students(event_id, ab_test_group);
  END IF;
END $$;

-- ============================================================
-- 3. CREATE qr_detections TABLE for tracking QR detection in photos
-- ============================================================

CREATE TABLE IF NOT EXISTS qr_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  code_id UUID REFERENCES codes(id) ON DELETE SET NULL,
  detected_value TEXT NOT NULL, -- Raw QR code value
  confidence_score DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  position JSONB, -- {x, y, width, height} of QR code in image
  detection_method TEXT DEFAULT 'jsqr' CHECK (detection_method IN ('jsqr', 'zxing', 'manual')),
  is_valid BOOLEAN DEFAULT true, -- Whether QR code is valid/recognized
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique detection per photo per position
  UNIQUE(photo_id, detected_value, position)
);

-- Create indexes for qr_detections
CREATE INDEX IF NOT EXISTS idx_qr_detections_photo_id ON qr_detections(photo_id);
CREATE INDEX IF NOT EXISTS idx_qr_detections_code_id ON qr_detections(code_id);
CREATE INDEX IF NOT EXISTS idx_qr_detections_value ON qr_detections(detected_value);
CREATE INDEX IF NOT EXISTS idx_qr_detections_processed ON qr_detections(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_detections_valid ON qr_detections(is_valid) WHERE is_valid = true;

-- ============================================================
-- 4. CREATE ab_testing_metrics TABLE for A/B testing analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS ab_testing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_group TEXT NOT NULL CHECK (test_group IN ('qr_method', 'traditional_method', 'control_group')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('classification_time', 'accuracy_score', 'error_rate', 'user_satisfaction')),
  metric_value DECIMAL(10,4) NOT NULL,
  measurement_date TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT, -- For grouping related measurements
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: unique metric per student per session
  UNIQUE(student_id, metric_type, session_id, measurement_date)
);

-- Create indexes for ab_testing_metrics
CREATE INDEX IF NOT EXISTS idx_ab_testing_event_id ON ab_testing_metrics(event_id);
CREATE INDEX IF NOT EXISTS idx_ab_testing_student_id ON ab_testing_metrics(student_id);
CREATE INDEX IF NOT EXISTS idx_ab_testing_group_metric ON ab_testing_metrics(event_id, test_group, metric_type);
CREATE INDEX IF NOT EXISTS idx_ab_testing_date ON ab_testing_metrics(measurement_date DESC);

-- ============================================================
-- 5. ENHANCE photos TABLE for QR detection support
-- ============================================================

-- Ensure photos table has QR detection fields
DO $$
BEGIN
  -- Update detected_qr_codes column if it exists but needs enhancement
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'detected_qr_codes'
  ) THEN
    -- Add constraint to ensure it's an array
    ALTER TABLE photos ADD CONSTRAINT chk_detected_qr_codes_is_array 
      CHECK (jsonb_typeof(detected_qr_codes) = 'array');
  END IF;
  
  -- Add QR detection status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'qr_detection_status'
  ) THEN
    ALTER TABLE photos ADD COLUMN qr_detection_status TEXT DEFAULT 'pending' 
      CHECK (qr_detection_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));
    CREATE INDEX IF NOT EXISTS idx_photos_qr_detection_status ON photos(qr_detection_status) 
      WHERE qr_detection_status != 'completed';
  END IF;
  
  -- Add QR detection timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'qr_detected_at'
  ) THEN
    ALTER TABLE photos ADD COLUMN qr_detected_at TIMESTAMPTZ;
  END IF;
  
  -- Add count of detected QR codes for quick statistics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'qr_count'
  ) THEN
    ALTER TABLE photos ADD COLUMN qr_count INTEGER DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_photos_qr_count ON photos(qr_count) WHERE qr_count > 0;
  END IF;
END $$;

-- ============================================================
-- 6. ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE qr_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_testing_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. CREATE RLS POLICIES FOR NEW TABLES
-- ============================================================

-- QR Detections Policies
CREATE POLICY "Service role full access" ON qr_detections
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage QR detections" ON qr_detections
  FOR ALL TO authenticated USING (true);

-- Family can view QR detections for their photos (via student photos)
CREATE POLICY "Family can view QR detections" ON qr_detections
  FOR SELECT USING (
    photo_id IN (
      SELECT ps.photo_id FROM photo_students ps
      JOIN students s ON ps.student_id = s.id
      JOIN student_tokens st ON s.id = st.student_id
      WHERE st.token = current_setting('request.jwt.claims.token', true)
        AND st.expires_at > NOW()
    )
  );

-- A/B Testing Metrics Policies
CREATE POLICY "Service role full access" ON ab_testing_metrics
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admin can manage A/B testing metrics" ON ab_testing_metrics
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- 8. CREATE UTILITY FUNCTIONS FOR QR SYSTEM
-- ============================================================

-- Function to generate student QR code with proper format
CREATE OR REPLACE FUNCTION generate_student_qr_code_enhanced(
  student_id_param UUID,
  event_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  qr_token TEXT;
  qr_code_value TEXT;
  qr_code_id UUID;
  result JSONB;
BEGIN
  -- Generate secure token
  qr_token := encode(gen_random_bytes(16), 'base64url');
  
  -- Generate QR code value with LKSTUDENT prefix
  qr_code_value := 'LKSTUDENT_' || qr_token;
  
  -- Insert QR code record
  INSERT INTO codes (
    event_id,
    student_id,
    code_value,
    token,
    qr_type,
    title,
    is_published,
    metadata
  ) VALUES (
    event_id_param,
    student_id_param,
    qr_code_value,
    qr_token,
    'student_identification',
    'QR Identificación - ' || (SELECT name FROM students WHERE id = student_id_param),
    true,
    jsonb_build_object(
      'generated_at', NOW(),
      'method', 'enhanced_generation',
      'purpose', 'student_identification'
    )
  ) RETURNING id INTO qr_code_id;
  
  -- Update student with QR code reference
  UPDATE students 
  SET 
    qr_code = qr_code_value,
    primary_qr_code_id = qr_code_id,
    qr_status = 'generated'
  WHERE id = student_id_param;
  
  -- Build result
  result := jsonb_build_object(
    'qr_code_id', qr_code_id,
    'code_value', qr_code_value,
    'token', qr_token,
    'student_id', student_id_param,
    'generated_at', NOW()
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to generate QR code for student %: %', student_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process QR detection in photo
CREATE OR REPLACE FUNCTION process_qr_detection(
  photo_id_param UUID,
  detected_qrs JSONB
)
RETURNS INTEGER AS $$
DECLARE
  qr_data JSONB;
  qr_value TEXT;
  code_record RECORD;
  detection_count INTEGER := 0;
BEGIN
  -- Update photo QR detection status
  UPDATE photos 
  SET 
    qr_detection_status = 'processing',
    qr_detected_at = NOW()
  WHERE id = photo_id_param;
  
  -- Process each detected QR code
  FOR qr_data IN SELECT jsonb_array_elements(detected_qrs)
  LOOP
    qr_value := qr_data->>'value';
    
    -- Find corresponding code record
    SELECT * INTO code_record
    FROM codes
    WHERE code_value = qr_value
      AND qr_type = 'student_identification'
      AND is_published = true;
    
    -- Insert detection record
    INSERT INTO qr_detections (
      photo_id,
      code_id,
      detected_value,
      confidence_score,
      position,
      detection_method,
      is_valid
    ) VALUES (
      photo_id_param,
      code_record.id,
      qr_value,
      COALESCE((qr_data->>'confidence')::DECIMAL, 1.0),
      qr_data->'position',
      COALESCE(qr_data->>'method', 'jsqr'),
      code_record.id IS NOT NULL
    )
    ON CONFLICT (photo_id, detected_value, position) DO UPDATE SET
      confidence_score = EXCLUDED.confidence_score,
      detection_method = EXCLUDED.detection_method,
      is_valid = EXCLUDED.is_valid,
      processed_at = NOW();
    
    -- If valid QR code found, create photo-student association
    IF code_record.id IS NOT NULL AND code_record.student_id IS NOT NULL THEN
      INSERT INTO photo_students (photo_id, student_id, tagged_at, confidence_score)
      VALUES (photo_id_param, code_record.student_id, NOW(), COALESCE((qr_data->>'confidence')::DECIMAL, 1.0))
      ON CONFLICT (photo_id, student_id) DO UPDATE SET
        confidence_score = GREATEST(photo_students.confidence_score, EXCLUDED.confidence_score),
        tagged_at = NOW();
      
      -- Update QR code usage
      UPDATE codes 
      SET 
        usage_count = usage_count + 1,
        last_used_at = NOW()
      WHERE id = code_record.id;
    END IF;
    
    detection_count := detection_count + 1;
  END LOOP;
  
  -- Update photo with detection results
  UPDATE photos 
  SET 
    qr_detection_status = 'completed',
    qr_count = detection_count,
    detected_qr_codes = detected_qrs
  WHERE id = photo_id_param;
  
  RETURN detection_count;
EXCEPTION
  WHEN OTHERS THEN
    -- Mark photo as failed detection
    UPDATE photos 
    SET qr_detection_status = 'failed'
    WHERE id = photo_id_param;
    
    RAISE EXCEPTION 'Failed to process QR detection for photo %: %', photo_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get QR code statistics for an event
CREATE OR REPLACE FUNCTION get_qr_statistics(event_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_students INTEGER;
  students_with_qr INTEGER;
  total_photos INTEGER;
  photos_with_qr INTEGER;
  detection_accuracy DECIMAL;
BEGIN
  -- Count students
  SELECT COUNT(*) INTO total_students
  FROM students
  WHERE event_id = event_id_param AND active = true;
  
  SELECT COUNT(*) INTO students_with_qr
  FROM students
  WHERE event_id = event_id_param 
    AND active = true 
    AND qr_status IN ('generated', 'printed', 'distributed', 'active');
  
  -- Count photos
  SELECT COUNT(*) INTO total_photos
  FROM photos
  WHERE event_id = event_id_param AND approved = true;
  
  SELECT COUNT(DISTINCT photo_id) INTO photos_with_qr
  FROM qr_detections qd
  JOIN photos p ON qd.photo_id = p.id
  WHERE p.event_id = event_id_param 
    AND p.approved = true 
    AND qd.is_valid = true;
  
  -- Calculate detection accuracy
  SELECT AVG(confidence_score) INTO detection_accuracy
  FROM qr_detections qd
  JOIN photos p ON qd.photo_id = p.id
  WHERE p.event_id = event_id_param 
    AND qd.is_valid = true;
  
  -- Build result
  result := jsonb_build_object(
    'total_students', total_students,
    'students_with_qr', students_with_qr,
    'qr_coverage_percentage', CASE WHEN total_students > 0 THEN ROUND((students_with_qr::DECIMAL / total_students * 100), 2) ELSE 0 END,
    'total_photos', total_photos,
    'photos_with_qr_detected', photos_with_qr,
    'qr_detection_rate', CASE WHEN total_photos > 0 THEN ROUND((photos_with_qr::DECIMAL / total_photos * 100), 2) ELSE 0 END,
    'average_detection_confidence', COALESCE(ROUND(detection_accuracy, 3), 0),
    'generated_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

-- Performance indexes for QR operations
CREATE INDEX IF NOT EXISTS idx_codes_student_qr_lookup ON codes(qr_type, code_value, is_published) 
  WHERE qr_type = 'student_identification';

CREATE INDEX IF NOT EXISTS idx_photos_qr_processing ON photos(event_id, qr_detection_status) 
  WHERE qr_detection_status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_students_qr_active ON students(event_id, qr_status, active) 
  WHERE active = true;

-- Composite index for A/B testing queries
CREATE INDEX IF NOT EXISTS idx_ab_testing_analysis ON ab_testing_metrics(event_id, test_group, metric_type, measurement_date);

-- ============================================================
-- 10. UPDATE EXISTING CONSTRAINTS AND VALIDATIONS
-- ============================================================

-- Ensure code_value uniqueness includes QR type for better data integrity
DO $$
BEGIN
  -- Drop old unique constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'codes' 
      AND constraint_name = 'codes_event_id_code_value_key'
  ) THEN
    ALTER TABLE codes DROP CONSTRAINT codes_event_id_code_value_key;
  END IF;
  
  -- Add new composite unique constraint
  ALTER TABLE codes ADD CONSTRAINT codes_event_qr_type_value_unique 
    UNIQUE(event_id, qr_type, code_value);
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, skip
    NULL;
END $$;

-- ============================================================
-- 11. FINAL VERIFICATION AND REPORTING
-- ============================================================

DO $$
DECLARE
  enhancement_summary JSONB;
  tables_created TEXT[] := ARRAY['qr_detections', 'ab_testing_metrics'];
  functions_created TEXT[] := ARRAY[
    'generate_student_qr_code_enhanced', 
    'process_qr_detection', 
    'get_qr_statistics'
  ];
  table_name TEXT;
  function_name TEXT;
  missing_items TEXT := '';
BEGIN
  -- Verify tables
  FOREACH table_name IN ARRAY tables_created
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      missing_items := missing_items || 'Table: ' || table_name || ', ';
    END IF;
  END LOOP;
  
  -- Verify functions
  FOREACH function_name IN ARRAY functions_created
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name = function_name
    ) THEN
      missing_items := missing_items || 'Function: ' || function_name || ', ';
    END IF;
  END LOOP;
  
  IF missing_items != '' THEN
    RAISE WARNING 'Missing items after migration: %', missing_items;
  ELSE
    RAISE NOTICE 'QR System Enhancement completed successfully';
  END IF;
  
  -- Create enhancement summary
  enhancement_summary := jsonb_build_object(
    'migration_completed_at', NOW(),
    'tables_enhanced', ARRAY['codes', 'students', 'photos'],
    'tables_created', tables_created,
    'functions_created', functions_created,
    'features_added', ARRAY[
      'Student QR code generation and tracking',
      'QR detection in photos with position tracking',
      'A/B testing metrics collection',
      'Enhanced QR code metadata and usage tracking',
      'Comprehensive QR statistics and analytics'
    ]
  );
  
  RAISE NOTICE 'Enhancement Summary: %', enhancement_summary;
END $$;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (Run manually to verify migration)
-- ============================================================

/*
-- Verify QR system tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('codes', 'students', 'photos', 'qr_detections', 'ab_testing_metrics')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verify QR system functions
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%qr%'
ORDER BY routine_name;

-- Test QR statistics function
SELECT get_qr_statistics('<event-id>');

-- Check QR system indexes
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (indexname LIKE '%qr%' OR tablename IN ('qr_detections', 'ab_testing_metrics'))
ORDER BY tablename, indexname;
*/