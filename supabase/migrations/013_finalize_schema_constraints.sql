-- ============================================================
-- Migration 013: Finalize Schema Constraints and Optimizations
-- Adds final constraints, enums, and performance optimizations
-- ============================================================

BEGIN;

-- =======================
-- 1. CREATE MISSING ENUMS
-- =======================

-- Create payment status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'refunded');
    RAISE NOTICE 'Created payment_status enum';
  END IF;
END $$;

-- =======================
-- 2. UPDATE PAYMENTS TABLE WITH ENUM
-- =======================

-- Update payments table to use the enum for mp_status
DO $$
BEGIN
  -- Check if we need to alter the column type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'mp_status' AND data_type = 'text'
  ) THEN
    -- First, update any invalid statuses to pending
    UPDATE payments SET mp_status = 'pending' 
    WHERE mp_status NOT IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded');
    
    -- Alter column to use enum
    ALTER TABLE payments ALTER COLUMN mp_status TYPE payment_status 
      USING mp_status::payment_status;
    
    RAISE NOTICE 'Updated payments.mp_status to use payment_status enum';
  END IF;
END $$;

-- =======================
-- 3. ADD MISSING UNIQUE CONSTRAINTS
-- =======================

-- Egress metrics unique constraint for proper upsert functionality
ALTER TABLE egress_metrics 
  ADD CONSTRAINT IF NOT EXISTS egress_metrics_event_date_unique 
  UNIQUE (event_id, date);

-- Subject tokens unique constraint on token
ALTER TABLE subject_tokens 
  ADD CONSTRAINT IF NOT EXISTS subject_tokens_token_unique 
  UNIQUE (token);

-- =======================
-- 4. ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- =======================

-- Events: ensure date is not in the future by more than 1 year
ALTER TABLE events 
  ADD CONSTRAINT IF NOT EXISTS events_date_reasonable 
  CHECK (date::date <= (CURRENT_DATE + INTERVAL '1 year'));

-- Subject tokens: ensure expiration is in the future when created
ALTER TABLE subject_tokens 
  ADD CONSTRAINT IF NOT EXISTS subject_tokens_expires_future 
  CHECK (expires_at > created_at);

-- Photos: ensure dimensions are reasonable (if provided)
ALTER TABLE photos 
  ADD CONSTRAINT IF NOT EXISTS photos_dimensions_reasonable 
  CHECK ((width IS NULL AND height IS NULL) OR (width > 0 AND height > 0 AND width <= 10000 AND height <= 10000));

-- Payments: ensure processed_at is after created_at when set
ALTER TABLE payments 
  ADD CONSTRAINT IF NOT EXISTS payments_processed_after_created 
  CHECK (processed_at IS NULL OR processed_at >= created_at);

-- =======================
-- 5. CREATE COMPOSITE INDEXES FOR PERFORMANCE
-- =======================

-- Events: for active event queries by school
CREATE INDEX IF NOT EXISTS idx_events_school_active_date 
  ON events(school, active, date DESC) 
  WHERE active = true;

-- Photos: for gallery queries (event + approved status)
CREATE INDEX IF NOT EXISTS idx_photos_event_approved_created 
  ON photos(event_id, approved, created_at DESC) 
  WHERE approved = true;

-- Orders: for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created_desc 
  ON orders(status, created_at DESC);

-- Subject tokens: for fast token validation
CREATE INDEX IF NOT EXISTS idx_subject_tokens_token_valid 
  ON subject_tokens(token) 
  WHERE expires_at > NOW();

-- Photo subjects: for subject gallery queries
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_created 
  ON photo_subjects(subject_id, created_at DESC);

-- Payments: for order payment history
CREATE INDEX IF NOT EXISTS idx_payments_order_status_created 
  ON payments(order_id, mp_status, created_at DESC);

-- =======================
-- 6. ADD PARTIAL INDEXES FOR COMMON FILTERS
-- =======================

-- Only index active events
CREATE INDEX IF NOT EXISTS idx_events_active_only 
  ON events(id, name, school, date) 
  WHERE active = true;

-- Only index approved photos
CREATE INDEX IF NOT EXISTS idx_photos_approved_only 
  ON photos(id, event_id, storage_path, created_at) 
  WHERE approved = true;

-- Only index non-delivered orders (active orders)
CREATE INDEX IF NOT EXISTS idx_orders_active_only 
  ON orders(id, subject_id, status, created_at) 
  WHERE status != 'delivered';

-- Only index valid tokens
CREATE INDEX IF NOT EXISTS idx_subject_tokens_valid_only 
  ON subject_tokens(id, subject_id, token) 
  WHERE expires_at > NOW();

-- =======================
-- 7. UPDATE EXISTING FUNCTIONS WITH BETTER ERROR HANDLING
-- =======================

-- Enhanced validate_family_token with better security
CREATE OR REPLACE FUNCTION validate_family_token(token_value TEXT)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
  token_length INTEGER;
BEGIN
  -- Input validation
  IF token_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  token_length := LENGTH(token_value);
  
  -- Token security: minimum 20 characters (as per requirements)
  IF token_length < 20 THEN
    RAISE LOG 'Token validation failed: insufficient length (% chars)', token_length;
    RETURN NULL;
  END IF;
  
  -- Find valid token and return subject_id
  SELECT st.subject_id INTO subject_uuid
  FROM subject_tokens st
  WHERE st.token = token_value
    AND st.expires_at > NOW()
  LIMIT 1;
  
  -- Log access for security monitoring (without exposing token)
  IF subject_uuid IS NOT NULL THEN
    RAISE LOG 'Valid token access for subject: %', subject_uuid;
  ELSE
    RAISE LOG 'Invalid token access attempt with length: %', token_length;
  END IF;
  
  RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced assign_photo_to_subject with validation
CREATE OR REPLACE FUNCTION assign_photo_to_subject(
  photo_uuid UUID,
  subject_uuid UUID,
  admin_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  assignment_id UUID;
  photo_exists BOOLEAN;
  subject_exists BOOLEAN;
BEGIN
  -- Validate inputs exist
  SELECT EXISTS(SELECT 1 FROM photos WHERE id = photo_uuid) INTO photo_exists;
  SELECT EXISTS(SELECT 1 FROM subjects WHERE id = subject_uuid) INTO subject_exists;
  
  IF NOT photo_exists THEN
    RAISE EXCEPTION 'Photo with ID % does not exist', photo_uuid;
  END IF;
  
  IF NOT subject_exists THEN
    RAISE EXCEPTION 'Subject with ID % does not exist', subject_uuid;
  END IF;
  
  -- Insert assignment
  INSERT INTO photo_subjects (photo_id, subject_id, tagged_by, tagged_at)
  VALUES (photo_uuid, subject_uuid, admin_user_id, NOW())
  ON CONFLICT (photo_id, subject_id) 
  DO UPDATE SET 
    tagged_by = EXCLUDED.tagged_by,
    tagged_at = EXCLUDED.tagged_at
  RETURNING id INTO assignment_id;
  
  RETURN assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 8. CREATE UTILITY FUNCTIONS FOR ADMIN OPERATIONS
-- =======================

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_statistics(event_uuid UUID)
RETURNS TABLE(
  total_subjects INTEGER,
  total_photos INTEGER,
  tagged_photos INTEGER,
  untagged_photos INTEGER,
  total_orders INTEGER,
  pending_orders INTEGER,
  approved_orders INTEGER,
  delivered_orders INTEGER,
  total_revenue_cents INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH event_stats AS (
    SELECT 
      (SELECT COUNT(*)::INTEGER FROM subjects WHERE event_id = event_uuid) as total_subjects,
      (SELECT COUNT(*)::INTEGER FROM photos WHERE event_id = event_uuid) as total_photos,
      (SELECT COUNT(DISTINCT p.id)::INTEGER 
       FROM photos p 
       JOIN photo_subjects ps ON p.id = ps.photo_id 
       WHERE p.event_id = event_uuid) as tagged_photos,
      (SELECT COUNT(*)::INTEGER 
       FROM photos p 
       WHERE p.event_id = event_uuid 
         AND NOT EXISTS (SELECT 1 FROM photo_subjects ps WHERE ps.photo_id = p.id)) as untagged_photos
  ),
  order_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_orders,
      COUNT(*) FILTER (WHERE o.status = 'pending')::INTEGER as pending_orders,
      COUNT(*) FILTER (WHERE o.status = 'approved')::INTEGER as approved_orders,
      COUNT(*) FILTER (WHERE o.status = 'delivered')::INTEGER as delivered_orders,
      COALESCE(SUM(
        CASE 
          WHEN o.status IN ('approved', 'delivered') THEN 
            (SELECT SUM(pli.price_cents * oi.quantity)
             FROM order_items oi 
             JOIN price_list_items pli ON oi.price_list_item_id = pli.id 
             WHERE oi.order_id = o.id)
          ELSE 0 
        END
      ), 0)::INTEGER as total_revenue_cents
    FROM orders o
    JOIN subjects s ON o.subject_id = s.id
    WHERE s.event_id = event_uuid
  )
  SELECT 
    es.total_subjects,
    es.total_photos,
    es.tagged_photos,
    es.untagged_photos,
    os.total_orders,
    os.pending_orders,
    os.approved_orders,
    os.delivered_orders,
    os.total_revenue_cents
  FROM event_stats es
  CROSS JOIN order_stats os;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM subject_tokens 
  WHERE expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE LOG 'Cleaned up % expired tokens', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 9. CREATE ADMIN HELPER VIEWS (OPTIONAL)
-- =======================

-- View for event dashboard summary
CREATE OR REPLACE VIEW event_dashboard_summary AS
SELECT 
  e.id,
  e.name,
  e.school,
  e.date,
  e.active,
  e.created_at,
  COUNT(DISTINCT s.id) as total_subjects,
  COUNT(DISTINCT p.id) as total_photos,
  COUNT(DISTINCT ps.photo_id) as tagged_photos,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'approved') as approved_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as delivered_orders
FROM events e
LEFT JOIN subjects s ON e.id = s.event_id
LEFT JOIN photos p ON e.id = p.event_id
LEFT JOIN photo_subjects ps ON p.id = ps.photo_id
LEFT JOIN orders o ON s.id = o.subject_id
GROUP BY e.id, e.name, e.school, e.date, e.active, e.created_at
ORDER BY e.created_at DESC;

-- =======================
-- 10. FINAL VERIFICATION AND CLEANUP
-- =======================

-- Update table statistics for optimal query planning
ANALYZE;

-- Verify all critical constraints exist
DO $$
DECLARE
  constraint_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check critical constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND constraint_type = 'CHECK'
    AND constraint_name IN (
      'subject_tokens_min_length',
      'events_school_min_length',
      'photos_storage_path_not_empty',
      'price_list_items_positive_price',
      'order_items_positive_quantity',
      'payments_amount_positive'
    );
  
  -- Check critical indexes exist
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_payments_mp_payment_id',
      'idx_photo_subjects_subject_id',
      'idx_subject_tokens_valid',
      'egress_metrics_event_date_unique'
    );
  
  IF constraint_count < 5 THEN
    RAISE WARNING 'Some critical constraints missing. Expected >= 5, found %', constraint_count;
  END IF;
  
  IF index_count < 3 THEN
    RAISE WARNING 'Some critical indexes missing. Expected >= 3, found %', index_count;
  END IF;
  
  RAISE NOTICE 'Schema finalization complete. Constraints: %, Indexes: %', constraint_count, index_count;
END $$;

COMMIT;

-- =======================
-- POST-MIGRATION VERIFICATION SCRIPT
-- =======================

/*
Run these queries to verify the migration was successful:

1. Check all constraints:
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND constraint_type IN ('CHECK', 'UNIQUE', 'FOREIGN KEY')
ORDER BY table_name, constraint_type;

2. Check all indexes:
SELECT 
  schemaname,
  tablename, 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename;

3. Check all functions:
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

4. Test token validation:
SELECT validate_family_token('invalid_token');
SELECT validate_family_token('valid_token_12345678901234567890');

5. Test event statistics:
SELECT * FROM get_event_statistics('00000000-0000-0000-0000-000000000000');

6. Check payment status enum:
SELECT unnest(enum_range(NULL::payment_status)) as payment_status;
*/