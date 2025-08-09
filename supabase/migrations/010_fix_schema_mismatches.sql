-- Migration 010: Fix Critical Schema Mismatches
-- This migration resolves conflicts between expected schema and actual database state
-- Ensures compatibility with application code expectations

-- Begin transaction for atomic changes
BEGIN;

-- =======================
-- 1. FIX EVENTS TABLE
-- =======================

-- Check if we need to fix the events table structure
-- The app expects 'school' and 'active' columns, not 'location' and 'status'

-- Add missing columns if they don't exist
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS school TEXT;

ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- If we have 'location' but no 'school', migrate data
DO $$
BEGIN
  -- Only migrate if school is empty but location exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'location'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'school'
  ) THEN
    -- Copy location to school if school is null
    UPDATE events SET school = COALESCE(location, 'No especificado') WHERE school IS NULL;
  END IF;
END $$;

-- If we have 'status' but need 'active' boolean, migrate data  
DO $$
BEGIN
  -- Only migrate if we have both columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'status'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'active'
  ) THEN
    -- Convert status to active boolean
    UPDATE events SET active = (status = 'active') WHERE active IS NULL;
  END IF;
END $$;

-- Ensure school is not null after migration
ALTER TABLE events 
  ALTER COLUMN school SET NOT NULL;

-- Add constraint for school minimum length
ALTER TABLE events 
  ADD CONSTRAINT IF NOT EXISTS events_school_length_check 
  CHECK (length(school) >= 3);

-- =======================
-- 2. ENSURE PAYMENTS TABLE EXISTS
-- =======================

-- Create payments table if it doesn't exist
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

-- =======================
-- 3. ENSURE PHOTO_SUBJECTS TABLE EXISTS
-- =======================

-- Create photo_subjects junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS photo_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, subject_id)
);

-- Migrate existing photo->subject relationships if needed
DO $$
BEGIN
  -- Only migrate if photos.subject_id exists and photo_subjects is empty
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'subject_id'
  ) AND NOT EXISTS (SELECT 1 FROM photo_subjects LIMIT 1) THEN
    INSERT INTO photo_subjects (photo_id, subject_id)
    SELECT id, subject_id 
    FROM photos 
    WHERE subject_id IS NOT NULL
    ON CONFLICT (photo_id, subject_id) DO NOTHING;
  END IF;
END $$;

-- =======================
-- 4. VERIFY ALL FOREIGN KEY CONSTRAINTS
-- =======================

-- Ensure order_items -> price_list_items FK exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_price_list_item_id_fkey'
  ) THEN
    -- Add missing FK constraint if price_list_item_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'order_items' AND column_name = 'price_list_item_id'
    ) THEN
      ALTER TABLE order_items 
        ADD CONSTRAINT order_items_price_list_item_id_fkey 
        FOREIGN KEY (price_list_item_id) REFERENCES price_list_items(id);
    END IF;
  END IF;
END $$;

-- Ensure subject_tokens -> subjects FK exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subject_tokens_subject_id_fkey'
  ) THEN
    ALTER TABLE subject_tokens 
      ADD CONSTRAINT subject_tokens_subject_id_fkey 
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure payments -> orders FK exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_order_id_fkey'
  ) THEN
    ALTER TABLE payments 
      ADD CONSTRAINT payments_order_id_fkey 
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =======================
-- 5. CREATE MISSING INDEXES
-- =======================

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_status ON payments(mp_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Indexes for photo_subjects table
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_active ON events(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_events_school ON events(school);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_expires_at ON subject_tokens(expires_at) WHERE expires_at > NOW();

-- =======================
-- 6. ENABLE RLS ON ALL TABLES
-- =======================

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on photo_subjects table  
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on all other tables (idempotent)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE egress_metrics ENABLE ROW LEVEL SECURITY;

-- =======================
-- 7. CREATE MISSING RLS POLICIES
-- =======================

-- RLS policies for payments table
DO $$
BEGIN
  -- Admin access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Admin can manage all payments'
  ) THEN
    CREATE POLICY "Admin can manage all payments" ON payments
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- RLS policies for photo_subjects table
DO $$
BEGIN
  -- Admin access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photo_subjects' AND policyname = 'Admin can manage photo assignments'
  ) THEN
    CREATE POLICY "Admin can manage photo assignments" ON photo_subjects
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  
  -- Family read access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photo_subjects' AND policyname = 'Family can view their photo assignments'
  ) THEN
    CREATE POLICY "Family can view their photo assignments" ON photo_subjects
      FOR SELECT USING (
        subject_id IN (
          SELECT s.id FROM subjects s
          JOIN subject_tokens st ON s.id = st.subject_id
          WHERE st.token = current_setting('request.jwt.claims.token', true)
            AND st.expires_at > NOW()
        )
      );
  END IF;
END $$;

-- =======================
-- 8. ADD UPDATED_AT TRIGGERS
-- =======================

-- Updated_at trigger for payments
CREATE TRIGGER IF NOT EXISTS payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =======================
-- 9. VALIDATION AND CLEANUP
-- =======================

-- Add validation constraints
ALTER TABLE payments ADD CONSTRAINT IF NOT EXISTS payments_amount_positive 
  CHECK (amount_cents > 0);

ALTER TABLE payments ADD CONSTRAINT IF NOT EXISTS payments_mp_payment_id_not_empty 
  CHECK (length(mp_payment_id) > 0);

-- Ensure unique constraints exist
DO $$
BEGIN
  -- Unique MP payment ID for idempotent webhooks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'payments' 
      AND constraint_name = 'payments_mp_payment_id_key'
      AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_mp_payment_id_key UNIQUE (mp_payment_id);
  END IF;
END $$;

-- =======================
-- 10. CREATE USEFUL FUNCTIONS
-- =======================

-- Function to validate family token access
CREATE OR REPLACE FUNCTION validate_family_token_access(input_token TEXT)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
BEGIN
  -- Find subject by valid token
  SELECT s.id INTO subject_uuid
  FROM subjects s
  JOIN subject_tokens st ON s.id = st.subject_id
  WHERE st.token = input_token 
    AND st.expires_at > NOW();
  
  RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get photos for a subject (via junction table)
CREATE OR REPLACE FUNCTION get_subject_photos(subject_uuid UUID)
RETURNS SETOF photos AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM photos p
  JOIN photo_subjects ps ON p.id = ps.photo_id
  WHERE ps.subject_id = subject_uuid
    AND p.approved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update egress metrics safely
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
-- 11. FINAL VERIFICATION
-- =======================

-- Verify critical columns exist
DO $$
BEGIN
  -- Check events.school exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'school'
  ) THEN
    RAISE EXCEPTION 'Critical error: events.school column missing after migration';
  END IF;
  
  -- Check events.active exists  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'active'
  ) THEN
    RAISE EXCEPTION 'Critical error: events.active column missing after migration';
  END IF;
  
  -- Check payments table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'payments'
  ) THEN
    RAISE EXCEPTION 'Critical error: payments table missing after migration';
  END IF;
  
  -- Check photo_subjects table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'photo_subjects'
  ) THEN
    RAISE EXCEPTION 'Critical error: photo_subjects table missing after migration';
  END IF;

  RAISE NOTICE 'Schema migration completed successfully - all critical structures verified';
END $$;

COMMIT;

-- =======================
-- ROLLBACK SCRIPT (for reference)
-- =======================
/*
-- To rollback this migration (use with caution):

BEGIN;

-- Remove added constraints and indexes
DROP INDEX IF EXISTS idx_payments_order_id;
DROP INDEX IF EXISTS idx_payments_mp_payment_id;
DROP INDEX IF EXISTS idx_payments_mp_status;
DROP INDEX IF EXISTS idx_payments_created_at;
DROP INDEX IF EXISTS idx_photo_subjects_photo_id;
DROP INDEX IF EXISTS idx_photo_subjects_subject_id;
DROP INDEX IF EXISTS idx_events_active;
DROP INDEX IF EXISTS idx_events_school;
DROP INDEX IF EXISTS idx_subject_tokens_expires_at;

-- Remove added policies
DROP POLICY IF EXISTS "Admin can manage all payments" ON payments;
DROP POLICY IF EXISTS "Admin can manage photo assignments" ON photo_subjects;
DROP POLICY IF EXISTS "Family can view their photo assignments" ON photo_subjects;

-- Remove added functions
DROP FUNCTION IF EXISTS validate_family_token_access(TEXT);
DROP FUNCTION IF EXISTS get_subject_photos(UUID);

-- Remove added tables (DANGEROUS - will lose data)
-- DROP TABLE IF EXISTS photo_subjects;
-- DROP TABLE IF EXISTS payments;

-- Remove added columns (DANGEROUS - will lose data)
-- ALTER TABLE events DROP COLUMN IF EXISTS school;
-- ALTER TABLE events DROP COLUMN IF EXISTS active;

COMMIT;
*/