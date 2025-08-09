-- Migration 011: Clean up conflicting schema elements
-- This migration removes or fixes any conflicting elements from the alternative schema

-- Begin transaction for atomic changes
BEGIN;

-- =======================
-- 1. HANDLE CONFLICTING COLUMNS IN EVENTS TABLE
-- =======================

-- Remove 'location' column if it exists and 'school' is properly populated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'location'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'school'
  ) THEN
    -- Only drop if school has data and location is redundant
    IF NOT EXISTS (
      SELECT 1 FROM events WHERE school IS NULL OR school = ''
    ) THEN
      RAISE NOTICE 'Dropping redundant location column from events table';
      ALTER TABLE events DROP COLUMN location;
    END IF;
  END IF;
END $$;

-- Remove 'status' column if it exists and 'active' is properly populated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'status'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'active'
  ) THEN
    -- Only drop if active has proper boolean values
    IF NOT EXISTS (
      SELECT 1 FROM events WHERE active IS NULL
    ) THEN
      RAISE NOTICE 'Dropping redundant status column from events table';
      ALTER TABLE events DROP COLUMN status;
    END IF;
  END IF;
END $$;

-- =======================
-- 2. HANDLE CONFLICTING SUBJECTS STRUCTURE
-- =======================

-- Check if subjects table has the wrong structure (simplified version)
DO $$
DECLARE
  has_type_column BOOLEAN;
  has_first_name_column BOOLEAN;
  has_simplified_name_column BOOLEAN;
BEGIN
  -- Check for the complex structure columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'type'
  ) INTO has_type_column;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'first_name'
  ) INTO has_first_name_column;
  
  -- Check for simplified structure
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'name' 
  ) AND NOT has_first_name_column INTO has_simplified_name_column;
  
  -- If we have simplified structure, we need to convert to complex structure
  IF has_simplified_name_column AND NOT has_type_column THEN
    RAISE NOTICE 'Converting subjects table from simplified to complex structure';
    
    -- Add missing columns for complex structure
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS type subject_type DEFAULT 'student';
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS couple_first_name TEXT;
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS couple_last_name TEXT;
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS family_name TEXT;
    
    -- Migrate data from 'name' to 'first_name'
    UPDATE subjects SET first_name = name WHERE first_name IS NULL AND name IS NOT NULL;
    
    -- Set first_name as NOT NULL
    ALTER TABLE subjects ALTER COLUMN first_name SET NOT NULL;
    
    -- Drop the simplified 'name' column
    ALTER TABLE subjects DROP COLUMN IF EXISTS name;
  END IF;
  
  -- Ensure type column exists and has proper constraint
  IF NOT has_type_column THEN
    ALTER TABLE subjects ADD COLUMN type subject_type DEFAULT 'student';
  END IF;
  
  -- Ensure first_name exists and is not null
  IF NOT has_first_name_column THEN
    ALTER TABLE subjects ADD COLUMN first_name TEXT NOT NULL DEFAULT 'Unknown';
  END IF;
END $$;

-- =======================
-- 3. ENSURE SUBJECT_TOKENS TABLE EXISTS SEPARATELY
-- =======================

-- If subjects table has embedded token columns, extract them to subject_tokens table
DO $$
DECLARE
  has_embedded_token BOOLEAN;
  subjects_record RECORD;
BEGIN
  -- Check if subjects has embedded token column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'token'
  ) INTO has_embedded_token;
  
  IF has_embedded_token THEN
    RAISE NOTICE 'Extracting embedded tokens from subjects to subject_tokens table';
    
    -- Ensure subject_tokens table exists
    CREATE TABLE IF NOT EXISTS subject_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL CHECK (length(token) >= 20),
      expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Migrate token data
    FOR subjects_record IN 
      SELECT id, token, token_expires_at 
      FROM subjects 
      WHERE token IS NOT NULL 
    LOOP
      INSERT INTO subject_tokens (subject_id, token, expires_at)
      VALUES (
        subjects_record.id, 
        subjects_record.token, 
        COALESCE(subjects_record.token_expires_at, NOW() + INTERVAL '30 days')
      )
      ON CONFLICT (token) DO NOTHING;
    END LOOP;
    
    -- Remove embedded token columns from subjects
    ALTER TABLE subjects DROP COLUMN IF EXISTS token;
    ALTER TABLE subjects DROP COLUMN IF EXISTS token_expires_at;
  END IF;
END $$;

-- =======================
-- 4. HANDLE CONFLICTING ORDER ITEMS STRUCTURE
-- =======================

-- Check if order_items has unit_price instead of price_list_item_id
DO $$
DECLARE
  has_unit_price BOOLEAN;
  has_price_list_item_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'unit_price'
  ) INTO has_unit_price;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'price_list_item_id'
  ) INTO has_price_list_item_id;
  
  -- If we have unit_price but not price_list_item_id, we need to restructure
  IF has_unit_price AND NOT has_price_list_item_id THEN
    RAISE NOTICE 'Converting order_items from unit_price to price_list_item_id structure';
    
    -- Add the price_list_item_id column
    ALTER TABLE order_items ADD COLUMN price_list_item_id UUID REFERENCES price_list_items(id);
    
    -- For now, we'll keep both columns and let the application handle the migration
    -- In production, you would need a more sophisticated migration strategy
    RAISE NOTICE 'Added price_list_item_id column. Manual data migration may be required.';
  END IF;
END $$;

-- =======================
-- 5. REMOVE CONFLICTING CONSTRAINTS
-- =======================

-- Remove any constraints that conflict with our expected schema
DO $$
BEGIN
  -- Remove conflicting unique constraints on subjects
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'subjects' 
      AND constraint_name LIKE '%name%'
      AND constraint_type = 'UNIQUE'
  ) THEN
    -- Find and drop the specific constraint
    DECLARE
      constraint_name_var TEXT;
    BEGIN
      SELECT constraint_name INTO constraint_name_var
      FROM information_schema.table_constraints 
      WHERE table_name = 'subjects' 
        AND constraint_name LIKE '%name%'
        AND constraint_type = 'UNIQUE'
      LIMIT 1;
      
      IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE subjects DROP CONSTRAINT ' || constraint_name_var;
        RAISE NOTICE 'Removed conflicting constraint: %', constraint_name_var;
      END IF;
    END;
  END IF;
END $$;

-- =======================
-- 6. ENSURE PROPER CONSTRAINTS FOR EXPECTED SCHEMA
-- =======================

-- Add proper constraints for the expected schema
ALTER TABLE subjects ADD CONSTRAINT IF NOT EXISTS subjects_first_name_length 
  CHECK (length(first_name) >= 2);

ALTER TABLE subjects ADD CONSTRAINT IF NOT EXISTS subjects_type_not_null
  CHECK (type IS NOT NULL);

-- Ensure proper unique constraint for event_id + names combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'subjects' 
      AND constraint_name = 'subjects_event_unique_identity'
      AND constraint_type = 'UNIQUE'
  ) THEN
    -- Create a unique constraint based on event and identity
    ALTER TABLE subjects ADD CONSTRAINT subjects_event_unique_identity 
      UNIQUE (event_id, type, first_name, COALESCE(last_name, ''), COALESCE(family_name, ''));
  END IF;
END $$;

-- =======================
-- 7. UPDATE STATISTICS AND ANALYZE
-- =======================

-- Update table statistics for better query planning
ANALYZE events;
ANALYZE subjects;
ANALYZE subject_tokens;
ANALYZE photos;
ANALYZE photo_subjects;
ANALYZE orders;
ANALYZE order_items;
ANALYZE payments;
ANALYZE price_lists;
ANALYZE price_list_items;
ANALYZE egress_metrics;

-- =======================
-- 8. FINAL VERIFICATION
-- =======================

DO $$
DECLARE
  table_count INTEGER;
  rls_count INTEGER;
BEGIN
  -- Count expected tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN (
      'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
      'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
      'egress_metrics'
    );
  
  IF table_count < 11 THEN
    RAISE EXCEPTION 'Missing tables after cleanup migration. Expected 11, found %', table_count;
  END IF;
  
  -- Count RLS enabled tables
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename IN (
      'events', 'subjects', 'subject_tokens', 'photos', 'photo_subjects',
      'orders', 'order_items', 'payments', 'price_lists', 'price_list_items',
      'egress_metrics'
    );
  
  IF rls_count < 11 THEN
    RAISE WARNING 'Not all tables have RLS enabled. Expected 11, found %', rls_count;
  END IF;
  
  RAISE NOTICE 'Schema cleanup completed successfully. Tables: %, RLS enabled: %', table_count, rls_count;
END $$;

COMMIT;

-- =======================
-- NOTES FOR MANUAL VERIFICATION
-- =======================

/*
After running this migration, manually verify:

1. Check events table structure:
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'events' 
   ORDER BY ordinal_position;

2. Check subjects table structure:
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'subjects' 
   ORDER BY ordinal_position;

3. Verify all foreign key relationships:
   SELECT 
     tc.table_name, 
     kcu.column_name, 
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name 
   FROM information_schema.table_constraints AS tc 
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE constraint_type = 'FOREIGN KEY'
   ORDER BY tc.table_name;

4. Verify RLS is enabled:
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   ORDER BY tablename;
*/