-- ============================================================
-- Migration 015: Fix Missing Columns Before Creating Indexes
-- Purpose: Add missing columns to existing tables before creating indexes
-- ============================================================

BEGIN;

-- =======================
-- 1. ADD MISSING COLUMNS TO EVENTS TABLE
-- =======================

DO $$
BEGIN
  -- Add 'active' column to events if it doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    -- Add active column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'active'
    ) THEN
      ALTER TABLE events ADD COLUMN active BOOLEAN DEFAULT true;
      RAISE NOTICE 'Added active column to events table';
    END IF;

    -- Add created_by column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'created_by'
    ) THEN
      ALTER TABLE events ADD COLUMN created_by UUID REFERENCES auth.users(id);
      RAISE NOTICE 'Added created_by column to events table';
    END IF;

    -- Add updated_at column
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

-- =======================
-- 2. ADD MISSING COLUMNS TO SUBJECTS TABLE
-- =======================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'subjects'
  ) THEN
    -- Add email column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subjects' 
      AND column_name = 'email'
    ) THEN
      ALTER TABLE subjects ADD COLUMN email TEXT;
      RAISE NOTICE 'Added email column to subjects table';
    END IF;

    -- Add phone column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subjects' 
      AND column_name = 'phone'
    ) THEN
      ALTER TABLE subjects ADD COLUMN phone TEXT;
      RAISE NOTICE 'Added phone column to subjects table';
    END IF;

    -- Add grade column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subjects' 
      AND column_name = 'grade'
    ) THEN
      ALTER TABLE subjects ADD COLUMN grade TEXT;
      RAISE NOTICE 'Added grade column to subjects table';
    END IF;

    -- Add section column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subjects' 
      AND column_name = 'section'
    ) THEN
      ALTER TABLE subjects ADD COLUMN section TEXT;
      RAISE NOTICE 'Added section column to subjects table';
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subjects' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added updated_at column to subjects table';
    END IF;
  END IF;
END $$;

-- =======================
-- 3. ADD MISSING COLUMNS TO PHOTOS TABLE
-- =======================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'photos'
  ) THEN
    -- Add approved column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photos' 
      AND column_name = 'approved'
    ) THEN
      ALTER TABLE photos ADD COLUMN approved BOOLEAN DEFAULT false;
      RAISE NOTICE 'Added approved column to photos table';
    END IF;

    -- Add preview_path column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photos' 
      AND column_name = 'preview_path'
    ) THEN
      ALTER TABLE photos ADD COLUMN preview_path TEXT;
      RAISE NOTICE 'Added preview_path column to photos table';
    END IF;

    -- Add metadata column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photos' 
      AND column_name = 'metadata'
    ) THEN
      ALTER TABLE photos ADD COLUMN metadata JSONB DEFAULT '{}';
      RAISE NOTICE 'Added metadata column to photos table';
    END IF;

    -- Add uploaded_by column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photos' 
      AND column_name = 'uploaded_by'
    ) THEN
      ALTER TABLE photos ADD COLUMN uploaded_by UUID REFERENCES auth.users(id);
      RAISE NOTICE 'Added uploaded_by column to photos table';
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photos' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE photos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added updated_at column to photos table';
    END IF;
  END IF;
END $$;

-- =======================
-- 4. ADD MISSING COLUMNS TO PHOTO_SUBJECTS TABLE
-- =======================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'photo_subjects'
  ) THEN
    -- Add tagged_at column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photo_subjects' 
      AND column_name = 'tagged_at'
    ) THEN
      ALTER TABLE photo_subjects ADD COLUMN tagged_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added tagged_at column to photo_subjects table';
    END IF;

    -- Add tagged_by column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photo_subjects' 
      AND column_name = 'tagged_by'
    ) THEN
      ALTER TABLE photo_subjects ADD COLUMN tagged_by UUID REFERENCES auth.users(id);
      RAISE NOTICE 'Added tagged_by column to photo_subjects table';
    END IF;

    -- Add created_at column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'photo_subjects' 
      AND column_name = 'created_at'
    ) THEN
      ALTER TABLE photo_subjects ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
      RAISE NOTICE 'Added created_at column to photo_subjects table';
    END IF;
  END IF;
END $$;

-- =======================
-- 5. ADD MISSING COLUMNS TO ORDERS TABLE
-- =======================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    -- Add delivered_at column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'delivered_at'
    ) THEN
      ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
      RAISE NOTICE 'Added delivered_at column to orders table';
    END IF;

    -- Add notes column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'notes'
    ) THEN
      ALTER TABLE orders ADD COLUMN notes TEXT;
      RAISE NOTICE 'Added notes column to orders table';
    END IF;
  END IF;
END $$;

-- =======================
-- 6. NOW CREATE INDEXES SAFELY
-- =======================

-- Events indexes (now that 'active' column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'active'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'events' 
      AND indexname = 'idx_events_active_date'
    ) THEN
      CREATE INDEX idx_events_active_date ON events(active, date DESC) WHERE active = true;
      RAISE NOTICE 'Created index idx_events_active_date';
    END IF;
  END IF;
END $$;

-- Photos indexes (now that 'approved' column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'photos' 
    AND column_name = 'approved'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'photos' 
      AND indexname = 'idx_photos_event_approved'
    ) THEN
      CREATE INDEX idx_photos_event_approved ON photos(event_id, approved) WHERE approved = true;
      RAISE NOTICE 'Created index idx_photos_event_approved';
    END IF;
  END IF;
END $$;

-- Subject tokens indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'subject_tokens'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'subject_tokens' 
      AND indexname = 'idx_subject_tokens_valid'
    ) THEN
      CREATE INDEX idx_subject_tokens_valid ON subject_tokens(token, expires_at) WHERE expires_at > NOW();
      RAISE NOTICE 'Created index idx_subject_tokens_valid';
    END IF;
  END IF;
END $$;

-- Photo subjects indexes (now that 'tagged_at' column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'photo_subjects' 
    AND column_name = 'tagged_at'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'photo_subjects' 
      AND indexname = 'idx_photo_subjects_tagged_at'
    ) THEN
      CREATE INDEX idx_photo_subjects_tagged_at ON photo_subjects(tagged_at DESC);
      RAISE NOTICE 'Created index idx_photo_subjects_tagged_at';
    END IF;
  END IF;
END $$;

-- Other standard indexes
CREATE INDEX IF NOT EXISTS idx_subjects_event_id ON subjects(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_subject_id ON orders(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);

-- =======================
-- 7. VERIFICATION
-- =======================

DO $$
DECLARE
  events_columns TEXT;
  photos_columns TEXT;
  photo_subjects_columns TEXT;
BEGIN
  -- Check events table columns
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO events_columns
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'events';
  
  IF events_columns IS NOT NULL THEN
    RAISE NOTICE 'Events table columns: %', events_columns;
  END IF;

  -- Check photos table columns
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO photos_columns
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'photos';
  
  IF photos_columns IS NOT NULL THEN
    RAISE NOTICE 'Photos table columns: %', photos_columns;
  END IF;

  -- Check photo_subjects table columns
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO photo_subjects_columns
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'photo_subjects';
  
  IF photo_subjects_columns IS NOT NULL THEN
    RAISE NOTICE 'Photo_subjects table columns: %', photo_subjects_columns;
  END IF;
END $$;

COMMIT;

-- =======================
-- VERIFICATION QUERIES
-- =======================

/*
After running this migration, verify with:

1. Check events table has 'active' column:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'active';

2. Check photos table has 'approved' column:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'photos' AND column_name = 'approved';

3. Check photo_subjects table has 'tagged_at' column:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'photo_subjects' AND column_name = 'tagged_at';

4. List all indexes:
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
*/