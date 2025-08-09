-- ============================================================
-- Migration 014: Create Missing Tables and Structure
-- Purpose: Ensure all required tables exist with correct structure
-- ============================================================

BEGIN;

-- =======================
-- 1. CREATE events TABLE IF NOT EXISTS
-- =======================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school TEXT NOT NULL CHECK (length(school) >= 2),
  date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =======================
-- 2. CREATE subjects TABLE IF NOT EXISTS
-- =======================

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

-- =======================
-- 3. CREATE subject_tokens TABLE IF NOT EXISTS
-- =======================

CREATE TABLE IF NOT EXISTS subject_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  CONSTRAINT subject_tokens_min_length CHECK (length(token) >= 20)
);

-- =======================
-- 4. CREATE photos TABLE IF NOT EXISTS
-- =======================

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT photos_storage_path_not_empty CHECK (length(storage_path) > 0)
);

-- =======================
-- 5. CREATE photo_subjects TABLE (JUNCTION TABLE)
-- =======================

CREATE TABLE IF NOT EXISTS photo_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  tagged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, subject_id)
);

-- =======================
-- 6. CREATE price_lists TABLE IF NOT EXISTS
-- =======================

CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 7. CREATE price_list_items TABLE IF NOT EXISTS
-- =======================

CREATE TABLE IF NOT EXISTS price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  photo_count INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT price_list_items_positive_price CHECK (price_cents > 0)
);

-- =======================
-- 8. CREATE orders TABLE IF NOT EXISTS
-- =======================

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
  delivered_at TIMESTAMPTZ,
  CONSTRAINT orders_status_check CHECK (status IN ('pending', 'approved', 'delivered', 'cancelled'))
);

-- =======================
-- 9. CREATE order_items TABLE IF NOT EXISTS
-- =======================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id),
  price_list_item_id UUID NOT NULL REFERENCES price_list_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT order_items_positive_quantity CHECK (quantity > 0)
);

-- =======================
-- 10. CREATE payments TABLE IF NOT EXISTS
-- =======================

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payments_mp_payment_id_not_empty CHECK (length(mp_payment_id) > 0),
  CONSTRAINT payments_amount_positive CHECK (amount_cents > 0)
);

-- =======================
-- 11. CREATE egress_metrics TABLE IF NOT EXISTS
-- =======================

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
-- 12. CREATE INDEXES
-- =======================

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_active_date ON events(active, date DESC) WHERE active = true;

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_event_id ON subjects(event_id);

-- Subject tokens indexes
CREATE INDEX IF NOT EXISTS idx_subject_tokens_token ON subject_tokens(token);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_subject_id ON subject_tokens(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_valid ON subject_tokens(token, expires_at) WHERE expires_at > NOW();

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_approved ON photos(event_id, approved) WHERE approved = true;

-- Photo subjects indexes
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_tagged_at ON photo_subjects(tagged_at DESC);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_subject_id ON orders(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_photo ON order_items(order_id, photo_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_status ON payments(mp_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Egress metrics indexes
CREATE INDEX IF NOT EXISTS idx_egress_metrics_event_date ON egress_metrics(event_id, date DESC);

-- =======================
-- 13. ENABLE RLS ON ALL TABLES
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
-- 14. CREATE RLS POLICIES
-- =======================

-- Create service role policies for all tables
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
    -- Drop existing policies if they exist
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Admin can manage all %I" ON %I', table_name, table_name);
    
    -- Create service role policy
    EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL TO service_role USING (true)', table_name);
    
    -- Create admin policy
    EXECUTE format('CREATE POLICY "Admin can manage all %I" ON %I FOR ALL TO authenticated USING (true)', table_name, table_name);
    
    RAISE NOTICE 'Created RLS policies for table: %', table_name;
  END LOOP;
END $$;

-- =======================
-- 15. FINAL VERIFICATION
-- =======================

DO $$
DECLARE
  required_tables TEXT[] := ARRAY[
    'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
    'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
    'egress_metrics'
  ];
  table_name TEXT;
  missing_tables TEXT := '';
BEGIN
  FOREACH table_name IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      missing_tables := missing_tables || table_name || ', ';
    END IF;
  END LOOP;

  IF missing_tables != '' THEN
    RAISE WARNING 'Missing tables: %', missing_tables;
  ELSE
    RAISE NOTICE 'All required tables exist successfully';
  END IF;
END $$;

COMMIT;

-- =======================
-- VERIFICATION QUERIES
-- =======================

/*
Run these queries to verify the migration:

-- List all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check photo_subjects structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'photo_subjects'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/