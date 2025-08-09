-- ============================================================
-- Migration 017: Create All Tables Safely Before Adding Columns
-- Purpose: Create all required tables if they don't exist, then add columns
-- ============================================================

BEGIN;

-- =======================
-- PART 1: CREATE ALL TABLES (IF NOT EXISTS)
-- =======================

-- 1. Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school TEXT NOT NULL,
  date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  grade TEXT,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create subject_tokens table
CREATE TABLE IF NOT EXISTS subject_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- 4. Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  preview_path TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  approved BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create photo_subjects table (junction table)
CREATE TABLE IF NOT EXISTS photo_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  tagged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, subject_id)
);

-- 6. Create price_lists table
CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create price_list_items table
CREATE TABLE IF NOT EXISTS price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  photo_count INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_cents INTEGER DEFAULT 0,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_dni TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- 9. Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id),
  price_list_item_id UUID NOT NULL REFERENCES price_list_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mp_payment_id TEXT UNIQUE NOT NULL,
  mp_preference_id TEXT,
  mp_external_reference TEXT,
  mp_status TEXT NOT NULL DEFAULT 'pending',
  mp_status_detail TEXT,
  mp_payment_type TEXT,
  amount_cents INTEGER NOT NULL,
  processed_at TIMESTAMPTZ,
  webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create egress_metrics table (THIS WAS MISSING!)
CREATE TABLE IF NOT EXISTS egress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bytes_served BIGINT DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, date)
);

-- =======================
-- PART 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- =======================

-- Add missing columns to events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'active') THEN
    ALTER TABLE events ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by') THEN
    ALTER TABLE events ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'updated_at') THEN
    ALTER TABLE events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add missing columns to subjects
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'email') THEN
    ALTER TABLE subjects ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'phone') THEN
    ALTER TABLE subjects ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'grade') THEN
    ALTER TABLE subjects ADD COLUMN grade TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'section') THEN
    ALTER TABLE subjects ADD COLUMN section TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'updated_at') THEN
    ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add missing columns to photos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'approved') THEN
    ALTER TABLE photos ADD COLUMN approved BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'preview_path') THEN
    ALTER TABLE photos ADD COLUMN preview_path TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'metadata') THEN
    ALTER TABLE photos ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'uploaded_by') THEN
    ALTER TABLE photos ADD COLUMN uploaded_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'updated_at') THEN
    ALTER TABLE photos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add missing columns to photo_subjects
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photo_subjects' AND column_name = 'tagged_at') THEN
    ALTER TABLE photo_subjects ADD COLUMN tagged_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photo_subjects' AND column_name = 'tagged_by') THEN
    ALTER TABLE photo_subjects ADD COLUMN tagged_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photo_subjects' AND column_name = 'created_at') THEN
    ALTER TABLE photo_subjects ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- =======================
-- PART 3: ADD CONSTRAINTS SAFELY
-- =======================

-- Add constraints only if they don't exist
DO $$
BEGIN
  -- Check constraint for subject_tokens token length
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subject_tokens_min_length'
  ) THEN
    ALTER TABLE subject_tokens ADD CONSTRAINT subject_tokens_min_length 
      CHECK (length(token) >= 20);
  END IF;

  -- Check constraint for events school name
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'events_school_min_length'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_school_min_length 
      CHECK (length(school) >= 2);
  END IF;

  -- Check constraint for photos storage_path
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'photos_storage_path_not_empty'
  ) THEN
    ALTER TABLE photos ADD CONSTRAINT photos_storage_path_not_empty 
      CHECK (length(storage_path) > 0);
  END IF;

  -- Check constraint for price_list_items price
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'price_list_items_positive_price'
  ) THEN
    ALTER TABLE price_list_items ADD CONSTRAINT price_list_items_positive_price 
      CHECK (price_cents > 0);
  END IF;

  -- Check constraint for order_items quantity
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_items_positive_quantity'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_positive_quantity 
      CHECK (quantity > 0);
  END IF;

  -- Check constraint for payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_mp_payment_id_not_empty'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_mp_payment_id_not_empty 
      CHECK (length(mp_payment_id) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_amount_positive'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_amount_positive 
      CHECK (amount_cents > 0);
  END IF;

  -- Check constraint for orders status
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('pending', 'approved', 'delivered', 'cancelled'));
  END IF;
END $$;

-- =======================
-- PART 4: CREATE INDEXES SAFELY
-- =======================

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_events_active_date ON events(active, date DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_subjects_event_id ON subjects(event_id);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_token ON subject_tokens(token);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_subject_id ON subject_tokens(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_token_expires ON subject_tokens(token, expires_at);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_expires_at ON subject_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_approved ON photos(event_id, approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_tagged_at ON photo_subjects(tagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_lists_event_id ON price_lists(event_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_price_list_id ON price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_orders_subject_id ON orders(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_photo ON order_items(order_id, photo_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_status ON payments(mp_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_event_date ON egress_metrics(event_id, date DESC);

-- =======================
-- PART 5: ENABLE RLS ON ALL TABLES
-- =======================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE egress_metrics ENABLE ROW LEVEL SECURITY;

-- =======================
-- PART 6: CREATE RLS POLICIES
-- =======================

-- Drop and recreate policies for all tables
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
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Admin can manage all %I" ON %I', tbl, tbl);
    
    -- Create service role policy
    EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL TO service_role USING (true)', tbl);
    
    -- Create admin policy
    EXECUTE format('CREATE POLICY "Admin can manage all %I" ON %I FOR ALL TO authenticated USING (true)', tbl, tbl);
    
    RAISE NOTICE 'Created RLS policies for table: %', tbl;
  END LOOP;
END $$;

-- =======================
-- PART 7: FINAL VERIFICATION
-- =======================

DO $$
DECLARE
  missing_tables TEXT := '';
  table_count INTEGER := 0;
  required_tables TEXT[] := ARRAY[
    'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
    'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
    'egress_metrics'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY required_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      table_count := table_count + 1;
    ELSE
      missing_tables := missing_tables || tbl || ', ';
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Tables created: %/%', table_count, array_length(required_tables, 1);
  
  IF missing_tables != '' THEN
    RAISE WARNING '⚠️ Missing tables: %', missing_tables;
  ELSE
    RAISE NOTICE '🎉 All required tables exist!';
  END IF;
END $$;

COMMIT;

-- =======================
-- VERIFICATION QUERIES
-- =======================

/*
Run these queries after the migration to verify everything is correct:

-- 1. List all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Check egress_metrics exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'egress_metrics'
) as egress_metrics_exists;

-- 3. Count total indexes
SELECT COUNT(*) as total_indexes 
FROM pg_indexes 
WHERE schemaname = 'public';

-- 4. Check all required columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'photo_subjects', 'egress_metrics')
ORDER BY table_name, ordinal_position;
*/