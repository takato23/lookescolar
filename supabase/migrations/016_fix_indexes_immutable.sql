-- ============================================================
-- Migration 016: Fix Indexes with Immutable Functions
-- Purpose: Create indexes without using NOW() in WHERE clause
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
-- 6. CREATE INDEXES WITHOUT NOW() IN WHERE CLAUSE
-- =======================

-- Drop problematic indexes if they exist
DROP INDEX IF EXISTS idx_subject_tokens_valid;
DROP INDEX IF EXISTS idx_events_active_date;
DROP INDEX IF EXISTS idx_photos_event_approved;

-- Events indexes (partial index with static condition)
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

-- Photos indexes (partial index with static condition)
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

-- Subject tokens indexes (WITHOUT the NOW() function in WHERE clause)
-- Create a simple index on token and expires_at without the WHERE clause
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'subject_tokens'
  ) THEN
    -- Simple index on token
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'subject_tokens' 
      AND indexname = 'idx_subject_tokens_token'
    ) THEN
      CREATE INDEX idx_subject_tokens_token ON subject_tokens(token);
      RAISE NOTICE 'Created index idx_subject_tokens_token';
    END IF;

    -- Composite index on token and expires_at (without WHERE clause)
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'subject_tokens' 
      AND indexname = 'idx_subject_tokens_token_expires'
    ) THEN
      CREATE INDEX idx_subject_tokens_token_expires ON subject_tokens(token, expires_at);
      RAISE NOTICE 'Created index idx_subject_tokens_token_expires';
    END IF;

    -- Index on expires_at for cleanup queries
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'subject_tokens' 
      AND indexname = 'idx_subject_tokens_expires_at'
    ) THEN
      CREATE INDEX idx_subject_tokens_expires_at ON subject_tokens(expires_at);
      RAISE NOTICE 'Created index idx_subject_tokens_expires_at';
    END IF;
  END IF;
END $$;

-- Photo subjects indexes
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

-- Other standard indexes (safe to create)
CREATE INDEX IF NOT EXISTS idx_subjects_event_id ON subjects(event_id);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_subject_id ON subject_tokens(subject_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_subject_id ON orders(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_photo ON order_items(order_id, photo_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_status ON payments(mp_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_event_date ON egress_metrics(event_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_price_lists_event_id ON price_lists(event_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_price_list_id ON price_list_items(price_list_id);

-- =======================
-- 7. ENABLE RLS ON ALL TABLES (IF NOT ALREADY ENABLED)
-- =======================

DO $$
DECLARE
  table_name TEXT;
  tables_array TEXT[] := ARRAY[
    'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
    'price_lists', 'price_list_items', 'orders', 'order_items', 'payments', 'egress_metrics'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_array
  LOOP
    -- Check if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      -- Check if RLS is disabled
      IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = table_name 
        AND rowsecurity = false
      ) THEN
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        RAISE NOTICE 'Enabled RLS on table: %', table_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- =======================
-- 8. CREATE RLS POLICIES (IF NOT EXIST)
-- =======================

DO $$
DECLARE
  tbl TEXT;
  tables_array TEXT[] := ARRAY[
    'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
    'price_lists', 'price_list_items', 'orders', 'order_items', 'payments', 'egress_metrics'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_array
  LOOP
    -- Check if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Create service role policy if not exists
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = tbl 
        AND policyname = 'Service role full access'
      ) THEN
        EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL TO service_role USING (true)', tbl);
        RAISE NOTICE 'Created service role policy for table: %', tbl;
      END IF;
      
      -- Create admin policy if not exists
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = tbl 
        AND policyname = format('Admin can manage all %I', tbl)
      ) THEN
        EXECUTE format('CREATE POLICY "Admin can manage all %I" ON %I FOR ALL TO authenticated USING (true)', tbl, tbl);
        RAISE NOTICE 'Created admin policy for table: %', tbl;
      END IF;
    END IF;
  END LOOP;
END $$;

-- =======================
-- 9. VERIFICATION
-- =======================

DO $$
DECLARE
  events_columns TEXT;
  photos_columns TEXT;
  photo_subjects_columns TEXT;
  index_count INTEGER;
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

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Total indexes created: %', index_count;
END $$;

COMMIT;

-- =======================
-- VERIFICATION QUERIES
-- =======================

/*
After running this migration, verify with:

1. Check all columns exist:
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'photos', 'photo_subjects', 'subject_tokens')
ORDER BY table_name, ordinal_position;

2. Check all indexes:
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

3. Check RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

4. Check policies:
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
*/