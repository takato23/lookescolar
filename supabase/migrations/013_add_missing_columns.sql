-- ============================================================
-- Migration 013: Add Missing Columns
-- Fixes: column "tagged_at" does not exist error
-- ============================================================

BEGIN;

-- =======================
-- 1. ADD MISSING COLUMNS TO photo_subjects IF TABLE EXISTS
-- =======================

DO $$
BEGIN
  -- Check if photo_subjects table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'photo_subjects'
  ) THEN
    -- Add tagged_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photo_subjects' 
      AND column_name = 'tagged_at'
    ) THEN
      ALTER TABLE photo_subjects ADD COLUMN tagged_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added tagged_at column to photo_subjects table';
    END IF;

    -- Add tagged_by column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photo_subjects' 
      AND column_name = 'tagged_by'
    ) THEN
      ALTER TABLE photo_subjects ADD COLUMN tagged_by UUID REFERENCES auth.users(id);
      RAISE NOTICE 'Added tagged_by column to photo_subjects table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photo_subjects' 
      AND column_name = 'created_at'
    ) THEN
      ALTER TABLE photo_subjects ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added created_at column to photo_subjects table';
    END IF;
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE photo_subjects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      tagged_at TIMESTAMPTZ DEFAULT NOW(),
      tagged_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(photo_id, subject_id)
    );
    RAISE NOTICE 'Created photo_subjects table with all columns';
  END IF;
END $$;

-- =======================
-- 2. VERIFY OTHER TABLES HAVE REQUIRED COLUMNS
-- =======================

-- Check and add updated_at to events if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added updated_at column to events table';
    END IF;
  END IF;
END $$;

-- Check and add updated_at to payments if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE payments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added updated_at column to payments table';
    END IF;
  END IF;
END $$;

-- =======================
-- 3. CREATE INDEXES IF MISSING
-- =======================

-- Create indexes for photo_subjects if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'photo_subjects' 
    AND indexname = 'idx_photo_subjects_photo_id'
  ) THEN
    CREATE INDEX idx_photo_subjects_photo_id ON photo_subjects(photo_id);
    RAISE NOTICE 'Created index idx_photo_subjects_photo_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'photo_subjects' 
    AND indexname = 'idx_photo_subjects_subject_id'
  ) THEN
    CREATE INDEX idx_photo_subjects_subject_id ON photo_subjects(subject_id);
    RAISE NOTICE 'Created index idx_photo_subjects_subject_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'photo_subjects' 
    AND indexname = 'idx_photo_subjects_tagged_at'
  ) THEN
    CREATE INDEX idx_photo_subjects_tagged_at ON photo_subjects(tagged_at DESC);
    RAISE NOTICE 'Created index idx_photo_subjects_tagged_at';
  END IF;
END $$;

-- =======================
-- 4. ENABLE RLS IF NOT ENABLED
-- =======================

DO $$
BEGIN
  -- Enable RLS on photo_subjects if not enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'photo_subjects' 
    AND rowsecurity = false
  ) THEN
    ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on photo_subjects table';
  END IF;
END $$;

-- =======================
-- 5. CREATE RLS POLICIES IF MISSING
-- =======================

DO $$
BEGIN
  -- Service role policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'photo_subjects' 
    AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON photo_subjects
      FOR ALL TO service_role USING (true);
    RAISE NOTICE 'Created service role policy for photo_subjects';
  END IF;

  -- Admin policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'photo_subjects' 
    AND policyname = 'Admin can manage photo assignments'
  ) THEN
    CREATE POLICY "Admin can manage photo assignments" ON photo_subjects
      FOR ALL TO authenticated USING (true);
    RAISE NOTICE 'Created admin policy for photo_subjects';
  END IF;
END $$;

-- =======================
-- 6. VERIFICATION
-- =======================

DO $$
DECLARE
  missing_columns TEXT := '';
  col_record RECORD;
BEGIN
  -- Check all required columns exist in photo_subjects
  FOR col_record IN 
    SELECT column_name 
    FROM (VALUES ('id'), ('photo_id'), ('subject_id'), ('tagged_at'), ('tagged_by'), ('created_at')) AS required(column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photo_subjects' 
      AND column_name = required.column_name
    )
  LOOP
    missing_columns := missing_columns || col_record.column_name || ', ';
  END LOOP;

  IF missing_columns != '' THEN
    RAISE WARNING 'Missing columns in photo_subjects: %', missing_columns;
  ELSE
    RAISE NOTICE 'All required columns present in photo_subjects table';
  END IF;
END $$;

COMMIT;

-- =======================
-- POST-MIGRATION VERIFICATION QUERIES
-- =======================

/*
After running this migration, verify with:

1. Check photo_subjects structure:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'photo_subjects'
ORDER BY ordinal_position;

2. Check indexes:
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'photo_subjects';

3. Check RLS status:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'photo_subjects';

4. Check policies:
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'photo_subjects';
*/