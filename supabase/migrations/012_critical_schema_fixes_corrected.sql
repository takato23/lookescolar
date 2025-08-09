-- ============================================================
-- Migration 012: Critical Schema Fixes for LookEscolar (CORRECTED)
-- Resolves schema conflicts and ensures complete database structure
-- ============================================================

BEGIN;

-- =======================
-- 1. VERIFY AND FIX MISSING TABLES
-- =======================

-- Create payments table with all required fields for Mercado Pago integration
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mp_payment_id TEXT UNIQUE NOT NULL CHECK (length(mp_payment_id) > 0),
  mp_preference_id TEXT,
  mp_external_reference TEXT,
  mp_status TEXT NOT NULL DEFAULT 'pending',
  mp_status_detail TEXT,
  mp_payment_type TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  processed_at TIMESTAMPTZ,
  webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create photo_subjects junction table for many-to-many photo assignments
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
-- 2. PERFORMANCE INDEXES
-- =======================

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_status ON payments(mp_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Photo subjects junction table indexes
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_tagged_at ON photo_subjects(tagged_at DESC);

-- Additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_active_date ON events(active, date DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_photos_event_approved ON photos(event_id, approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_subject_tokens_valid ON subject_tokens(token, expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_photo ON order_items(order_id, photo_id);

-- =======================
-- 3. ENABLE RLS ON NEW TABLES
-- =======================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;

-- =======================
-- 4. CREATE COMPREHENSIVE RLS POLICIES
-- =======================

-- Payments RLS Policies
DO $$
BEGIN
  -- Service role has full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON payments
      FOR ALL TO service_role USING (true);
  END IF;

  -- Authenticated users (admin) can manage all payments  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Admin can manage all payments'
  ) THEN
    CREATE POLICY "Admin can manage all payments" ON payments
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Photo Subjects RLS Policies
DO $$
BEGIN
  -- Service role has full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photo_subjects' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON photo_subjects
      FOR ALL TO service_role USING (true);
  END IF;

  -- Authenticated users (admin) can manage photo assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photo_subjects' AND policyname = 'Admin can manage photo assignments'
  ) THEN
    CREATE POLICY "Admin can manage photo assignments" ON photo_subjects
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- =======================
-- 5. UPDATE EXISTING RLS POLICIES TO SERVICE ROLE PATTERN
-- =======================

-- Drop existing policies and create service role policies for all tables
DO $$
DECLARE
  table_name TEXT;
  tables_to_update TEXT[] := ARRAY['events', 'subjects', 'subject_tokens', 'photos', 
                                   'price_lists', 'price_list_items', 'orders', 
                                   'order_items', 'egress_metrics'];
BEGIN
  FOREACH table_name IN ARRAY tables_to_update
  LOOP
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Admin can manage all %I" ON %I', table_name, table_name);
    
    -- Create service role policy
    EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL TO service_role USING (true)', table_name);
    
    -- Create admin policy  
    EXECUTE format('CREATE POLICY "Admin can manage all %I" ON %I FOR ALL TO authenticated USING (true)', table_name, table_name);
    
    RAISE NOTICE 'Updated RLS policies for table: %', table_name;
  END LOOP;
END $$;

-- =======================
-- 6. CREATE ESSENTIAL FUNCTIONS
-- =======================

-- Token validation function with proper security
CREATE OR REPLACE FUNCTION validate_family_token(token_value TEXT)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
BEGIN
  -- Token security: minimum 20 characters
  IF token_value IS NULL OR LENGTH(token_value) < 20 THEN
    RETURN NULL;
  END IF;
  
  -- Find valid token and return subject_id
  SELECT st.subject_id INTO subject_uuid
  FROM subject_tokens st
  WHERE st.token = token_value
    AND st.expires_at > NOW()
  LIMIT 1;
  
  RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get photos assigned to a subject
CREATE OR REPLACE FUNCTION get_subject_photos(subject_uuid UUID)
RETURNS SETOF photos AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM photos p
  INNER JOIN photo_subjects ps ON p.id = ps.photo_id
  WHERE ps.subject_id = subject_uuid
    AND p.approved = true
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign photo to subject (tagging)
CREATE OR REPLACE FUNCTION assign_photo_to_subject(
  photo_uuid UUID,
  subject_uuid UUID,
  admin_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  assignment_id UUID;
BEGIN
  INSERT INTO photo_subjects (photo_id, subject_id, tagged_by)
  VALUES (photo_uuid, subject_uuid, admin_user_id)
  ON CONFLICT (photo_id, subject_id) DO NOTHING
  RETURNING id INTO assignment_id;
  
  RETURN assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate order total from order items
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_cents INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(pli.price_cents * oi.quantity), 0) INTO total_cents
  FROM order_items oi
  INNER JOIN price_list_items pli ON oi.price_list_item_id = pli.id
  WHERE oi.order_id = order_uuid;
  
  RETURN total_cents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update egress metrics (bandwidth tracking)
CREATE OR REPLACE FUNCTION update_egress_metrics(
  p_event_id UUID,
  p_bytes_served BIGINT,
  p_requests_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO egress_metrics (event_id, date, bytes_served, requests_count)
  VALUES (p_event_id, CURRENT_DATE, p_bytes_served, p_requests_count)
  ON CONFLICT (event_id, date)
  DO UPDATE SET
    bytes_served = egress_metrics.bytes_served + p_bytes_served,
    requests_count = egress_metrics.requests_count + p_requests_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 7. ADD MISSING CONSTRAINTS (CORRECTED - without IF NOT EXISTS)
-- =======================

-- Add constraints only if they don't exist
DO $$
BEGIN
  -- Subject tokens: enforce minimum token length
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subject_tokens_min_length'
  ) THEN
    ALTER TABLE subject_tokens ADD CONSTRAINT subject_tokens_min_length 
      CHECK (length(token) >= 20);
  END IF;

  -- Events: school name minimum length
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'events_school_min_length'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_school_min_length 
      CHECK (length(school) >= 2);
  END IF;

  -- Photos: storage path must not be empty
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'photos_storage_path_not_empty'
  ) THEN
    ALTER TABLE photos ADD CONSTRAINT photos_storage_path_not_empty 
      CHECK (length(storage_path) > 0);
  END IF;

  -- Price list items: positive price
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'price_list_items_positive_price'
  ) THEN
    ALTER TABLE price_list_items ADD CONSTRAINT price_list_items_positive_price 
      CHECK (price_cents > 0);
  END IF;

  -- Order items: positive quantity  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_items_positive_quantity'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_positive_quantity 
      CHECK (quantity > 0);
  END IF;
END $$;

-- =======================
-- 8. CREATE UPDATED_AT TRIGGERS
-- =======================

-- Ensure update_updated_at function exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers for tables that need them
DO $$
BEGIN
  -- Payments table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'payments_updated_at' AND event_object_table = 'payments'
  ) THEN
    CREATE TRIGGER payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;

  -- Events table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'events_updated_at' AND event_object_table = 'events'
  ) THEN
    CREATE TRIGGER events_updated_at
      BEFORE UPDATE ON events
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- =======================
-- 9. GRANT PROPER PERMISSIONS
-- =======================

-- Grant service role permissions (for API routes)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant authenticated user permissions (for admin interface)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant anon read permissions (for family portal)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION validate_family_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_subject_photos(UUID) TO anon;

-- =======================
-- 10. FINAL VERIFICATION
-- =======================

DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
    'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
    'egress_metrics'
  ];
  table_name TEXT;
  table_count INTEGER := 0;
  rls_count INTEGER := 0;
BEGIN
  -- Check all expected tables exist
  FOREACH table_name IN ARRAY expected_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      table_count := table_count + 1;
      
      -- Check RLS is enabled
      IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = table_name AND rowsecurity = true
      ) THEN
        rls_count := rls_count + 1;
      END IF;
    ELSE
      RAISE WARNING 'Missing table: %. Will continue but may need to create it separately.', table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Schema validation: % tables found, % with RLS enabled', table_count, rls_count;
END $$;

COMMIT;

-- =======================
-- POST-MIGRATION VERIFICATION QUERIES
-- =======================

/*
After running this migration, verify with:

1. Check tables:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

2. Check constraints:
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE contype = 'c' 
ORDER BY conrelid::regclass;

3. Check RLS policies:
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
*/