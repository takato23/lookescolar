-- ============================================================
-- CRITICAL SCHEMA FIXES FOR LOOKESCOLAR
-- Apply this script in Supabase SQL Editor
-- ============================================================

-- 1. Create payments table for MercadoPago webhook idempotency
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_payment_id TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  status_detail TEXT,
  amount_cents INTEGER NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 2. Create photo_subjects junction table for photo tagging
CREATE TABLE IF NOT EXISTS photo_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  tagged_by UUID REFERENCES auth.users(id),
  UNIQUE(photo_id, subject_id)
);

-- Indexes for photo_subjects
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject ON photo_subjects(subject_id);

-- 3. Enable RLS on both new tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for payments table
-- Admin can see all payments
CREATE POLICY "Admin can view all payments" ON payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin%'
    )
  );

-- 5. Create RLS policies for photo_subjects table
-- Admin can manage all photo-subject relationships
CREATE POLICY "Admin can manage photo subjects" ON photo_subjects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin%'
    )
  );

-- Family members can view their tagged photos
CREATE POLICY "Families can view their photo tags" ON photo_subjects
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      JOIN subject_tokens st ON s.id = st.subject_id
      WHERE s.id = photo_subjects.subject_id
      AND st.expires_at > NOW()
    )
  );

-- 6. Create helper function for token validation
CREATE OR REPLACE FUNCTION validate_family_token(token_value TEXT)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
BEGIN
  -- Token must be at least 20 characters
  IF LENGTH(token_value) < 20 THEN
    RETURN NULL;
  END IF;
  
  -- Find valid token
  SELECT subject_id INTO subject_uuid
  FROM subject_tokens
  WHERE token = token_value
  AND expires_at > NOW()
  LIMIT 1;
  
  RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 8. Create missing foreign key constraints if needed
-- (Only if not already exist)
DO $$
BEGIN
  -- Check and add foreign key from order_items to price_list_items if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'order_items'
    AND constraint_name LIKE '%price_list_item%'
  ) THEN
    ALTER TABLE order_items 
    ADD CONSTRAINT fk_order_items_price_list_item 
    FOREIGN KEY (price_list_item_id) 
    REFERENCES price_list_items(id);
  END IF;
END $$;

-- 9. Verify all tables have RLS enabled
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('schema_migrations', 'supabase_migrations')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'RLS enabled on table: %', tbl.tablename;
  END LOOP;
END $$;

-- ============================================================
-- VERIFICATION QUERIES
-- Run these to verify everything is working:
-- ============================================================

-- Check if all required tables exist
SELECT 
  'events' as table_name, 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'events') as exists
UNION ALL
SELECT 'subjects', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects')
UNION ALL
SELECT 'photos', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photos')
UNION ALL
SELECT 'photo_subjects', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_subjects')
UNION ALL
SELECT 'orders', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'orders')
UNION ALL
SELECT 'order_items', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items')
UNION ALL
SELECT 'payments', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payments')
UNION ALL
SELECT 'price_lists', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'price_lists')
UNION ALL
SELECT 'price_list_items', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'price_list_items')
UNION ALL
SELECT 'subject_tokens', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'subject_tokens');

-- Check if RLS is enabled on all tables
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN ('schema_migrations', 'supabase_migrations')
ORDER BY tablename;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
-- If all queries above show:
-- 1. All tables exist = true
-- 2. All tables have rowsecurity = true
-- Then the schema is ready!

-- After applying this script:
-- 1. Restart your Next.js development server
-- 2. The application should work without database errors
-- ============================================================