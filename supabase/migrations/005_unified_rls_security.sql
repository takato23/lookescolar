-- Unified RLS Security Policies
-- Following security standards: Client NEVER accesses tables directly, only via API with service role

-- IMPORTANT: Drop existing conflicting policies first
DROP POLICY IF EXISTS "Admin can view all events" ON events;
DROP POLICY IF EXISTS "Admin can create events" ON events;
DROP POLICY IF EXISTS "Admin can update events" ON events;
DROP POLICY IF EXISTS "Admin can delete events" ON events;

DROP POLICY IF EXISTS "Admin can view all subjects" ON subjects;
DROP POLICY IF EXISTS "Admin can create subjects" ON subjects;
DROP POLICY IF EXISTS "Admin can update subjects" ON subjects;
DROP POLICY IF EXISTS "Admin can delete subjects" ON subjects;
DROP POLICY IF EXISTS "Service role can access subjects" ON subjects;

DROP POLICY IF EXISTS "Admin can view all photos" ON photos;
DROP POLICY IF EXISTS "Admin can create photos" ON photos;
DROP POLICY IF EXISTS "Admin can update photos" ON photos;
DROP POLICY IF EXISTS "Admin can delete photos" ON photos;
DROP POLICY IF EXISTS "Service role can access photos" ON photos;

DROP POLICY IF EXISTS "Admin can view photo_subjects" ON photo_subjects;
DROP POLICY IF EXISTS "Admin can create photo_subjects" ON photo_subjects;
DROP POLICY IF EXISTS "Admin can update photo_subjects" ON photo_subjects;
DROP POLICY IF EXISTS "Admin can delete photo_subjects" ON photo_subjects;
DROP POLICY IF EXISTS "Service role can access photo_subjects" ON photo_subjects;

DROP POLICY IF EXISTS "Admin can view all orders" ON orders;
DROP POLICY IF EXISTS "Service role can create orders" ON orders;
DROP POLICY IF EXISTS "Service role can update orders" ON orders;
DROP POLICY IF EXISTS "Service role can view orders" ON orders;

DROP POLICY IF EXISTS "Admin can view all order_items" ON order_items;
DROP POLICY IF EXISTS "Service role can create order_items" ON order_items;
DROP POLICY IF EXISTS "Service role can view order_items" ON order_items;

DROP POLICY IF EXISTS "Admin can view all payments" ON payments;
DROP POLICY IF EXISTS "Service role can create payments" ON payments;
DROP POLICY IF EXISTS "Service role can update payments" ON payments;
DROP POLICY IF EXISTS "Service role can view payments" ON payments;

-- Enable RLS on new tables (ensuring all tables have RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;

-- SECURITY STANDARD: Only service role can access tables
-- This enforces that all access goes through API routes with proper validation

-- Events: Service role full access
CREATE POLICY "Service role only access events"
  ON events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Subjects: Service role full access
CREATE POLICY "Service role only access subjects"
  ON subjects
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Subject tokens: Service role full access
CREATE POLICY "Service role only access subject_tokens"
  ON subject_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Photos: Service role full access
CREATE POLICY "Service role only access photos"
  ON photos
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Photo subjects relationship: Service role full access
CREATE POLICY "Service role only access photo_subjects"
  ON photo_subjects
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Price lists: Service role full access
CREATE POLICY "Service role only access price_lists"
  ON price_lists
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Price list items: Service role full access
CREATE POLICY "Service role only access price_list_items"
  ON price_list_items
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Orders: Service role full access
CREATE POLICY "Service role only access orders"
  ON orders
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Order items: Service role full access
CREATE POLICY "Service role only access order_items"
  ON order_items
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Payments: Service role full access
CREATE POLICY "Service role only access payments"
  ON payments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Email templates: Service role full access
CREATE POLICY "Service role only access email_templates"
  ON email_templates
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Email queue: Service role full access
CREATE POLICY "Service role only access email_queue"
  ON email_queue
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Egress metrics: Service role full access
CREATE POLICY "Service role only access egress_metrics"
  ON egress_metrics
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ADDITIONAL SECURITY: Create function to verify admin role from service role context
-- This allows API routes to verify admin authentication
CREATE OR REPLACE FUNCTION verify_admin_access(admin_uid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- In production, this would verify against a real admin table
  -- For now, we'll use a simple check that can be expanded
  RETURN admin_uid IS NOT NULL AND length(admin_uid) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify token and get subject info
-- Used by family API endpoints to validate token access
CREATE OR REPLACE FUNCTION get_subject_by_token(input_token TEXT)
RETURNS TABLE(
  subject_id UUID,
  event_id UUID,
  type subject_type,
  first_name TEXT,
  last_name TEXT,
  couple_first_name TEXT,
  couple_last_name TEXT,
  family_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.event_id,
    s.type,
    s.first_name,
    s.last_name,
    s.couple_first_name,
    s.couple_last_name,
    s.family_name
  FROM subjects s
  JOIN subject_tokens st ON s.id = st.subject_id
  WHERE st.token = input_token 
    AND st.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get photos for a subject by token
-- This enforces security at the database level
CREATE OR REPLACE FUNCTION get_photos_by_token(input_token TEXT)
RETURNS TABLE(
  photo_id UUID,
  storage_path TEXT,
  width INTEGER,
  height INTEGER,
  approved BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.storage_path,
    p.width,
    p.height,
    p.approved,
    p.created_at
  FROM photos p
  JOIN photo_subjects ps ON p.id = ps.photo_id
  JOIN subjects s ON ps.subject_id = s.id
  JOIN subject_tokens st ON s.id = st.subject_id
  WHERE st.token = input_token 
    AND st.expires_at > NOW()
    AND p.approved = true
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security audit function to check policy compliance
CREATE OR REPLACE FUNCTION audit_rls_policies()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    t.rowsecurity,
    COUNT(p.policyname) as policy_count
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the security approach
COMMENT ON POLICY "Service role only access events" ON events IS 
'Security: Only service role access enforces all client access through API validation';

COMMENT ON FUNCTION get_subject_by_token(TEXT) IS 
'Security: Validates token access and returns subject info for family portal';

COMMENT ON FUNCTION get_photos_by_token(TEXT) IS 
'Security: Returns approved photos for a valid token, enforcing photo access control';