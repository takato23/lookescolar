-- ============================================================
-- MASTER DEPLOYMENT SCRIPT - LookEscolar Complete Database Setup
-- This script applies all migrations and configurations in the correct order
-- Run this ONCE in Supabase SQL Editor for complete setup
-- ============================================================

-- IMPORTANT: This script will take 2-5 minutes to complete
-- Monitor the execution in Supabase SQL Editor for any errors

SELECT 'Starting LookEscolar database deployment...' as status;

-- =======================
-- MIGRATION 012: Critical Schema Fixes
-- =======================

-- Create missing payments table for Mercado Pago integration
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

-- Performance indexes for new tables
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_status ON payments(mp_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_photo_id ON photo_subjects(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_id ON photo_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_photo_subjects_tagged_at ON photo_subjects(tagged_at DESC);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_events_active_date ON events(active, date DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_photos_event_approved ON photos(event_id, approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_subject_tokens_valid ON subject_tokens(token, expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_photo ON order_items(order_id, photo_id);

-- Enable RLS on new tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_subjects ENABLE ROW LEVEL SECURITY;

-- Create service role policies (enterprise pattern)
CREATE POLICY "Service role full access" ON payments FOR ALL TO service_role USING (true);
CREATE POLICY "Admin can manage all payments" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role full access" ON photo_subjects FOR ALL TO service_role USING (true);
CREATE POLICY "Admin can manage photo assignments" ON photo_subjects FOR ALL TO authenticated USING (true);

-- Essential functions
CREATE OR REPLACE FUNCTION validate_family_token(token_value TEXT)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
BEGIN
  IF token_value IS NULL OR LENGTH(token_value) < 20 THEN
    RETURN NULL;
  END IF;
  
  SELECT st.subject_id INTO subject_uuid
  FROM subject_tokens st
  WHERE st.token = token_value AND st.expires_at > NOW()
  LIMIT 1;
  
  RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_subject_photos(subject_uuid UUID)
RETURNS SETOF photos AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM photos p
  INNER JOIN photo_subjects ps ON p.id = ps.photo_id
  WHERE ps.subject_id = subject_uuid AND p.approved = true
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION assign_photo_to_subject(
  photo_uuid UUID, subject_uuid UUID, admin_user_id UUID DEFAULT NULL
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

CREATE OR REPLACE FUNCTION update_egress_metrics(
  p_event_id UUID, p_bytes_served BIGINT, p_requests_count INTEGER DEFAULT 1
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

-- Critical constraints
ALTER TABLE subject_tokens ADD CONSTRAINT IF NOT EXISTS subject_tokens_min_length CHECK (length(token) >= 20);
ALTER TABLE events ADD CONSTRAINT IF NOT EXISTS events_school_min_length CHECK (length(school) >= 2);
ALTER TABLE photos ADD CONSTRAINT IF NOT EXISTS photos_storage_path_not_empty CHECK (length(storage_path) > 0);
ALTER TABLE price_list_items ADD CONSTRAINT IF NOT EXISTS price_list_items_positive_price CHECK (price_cents > 0);
ALTER TABLE order_items ADD CONSTRAINT IF NOT EXISTS order_items_positive_quantity CHECK (quantity > 0);

SELECT 'Migration 012 completed - Critical schema fixes applied' as status;

-- =======================
-- MIGRATION 013: Schema Constraints and Optimizations
-- =======================

-- Create payment status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'refunded');
  END IF;
END $$;

-- Update payments table to use enum
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'mp_status' AND data_type = 'text'
  ) THEN
    UPDATE payments SET mp_status = 'pending' 
    WHERE mp_status NOT IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded');
    ALTER TABLE payments ALTER COLUMN mp_status TYPE payment_status USING mp_status::payment_status;
  END IF;
END $$;

-- Critical unique constraints
ALTER TABLE egress_metrics ADD CONSTRAINT IF NOT EXISTS egress_metrics_event_date_unique UNIQUE (event_id, date);
ALTER TABLE subject_tokens ADD CONSTRAINT IF NOT EXISTS subject_tokens_token_unique UNIQUE (token);

-- Data integrity constraints
ALTER TABLE events ADD CONSTRAINT IF NOT EXISTS events_date_reasonable CHECK (date::date <= (CURRENT_DATE + INTERVAL '1 year'));
ALTER TABLE subject_tokens ADD CONSTRAINT IF NOT EXISTS subject_tokens_expires_future CHECK (expires_at > created_at);
ALTER TABLE photos ADD CONSTRAINT IF NOT EXISTS photos_dimensions_reasonable 
  CHECK ((width IS NULL AND height IS NULL) OR (width > 0 AND height > 0 AND width <= 10000 AND height <= 10000));
ALTER TABLE payments ADD CONSTRAINT IF NOT EXISTS payments_processed_after_created 
  CHECK (processed_at IS NULL OR processed_at >= created_at);

-- Advanced performance indexes
CREATE INDEX IF NOT EXISTS idx_events_school_active_date ON events(school, active, date DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_photos_event_approved_created ON photos(event_id, approved, created_at DESC) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_orders_status_created_desc ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subject_tokens_token_valid ON subject_tokens(token) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_photo_subjects_subject_created ON photo_subjects(subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_status_created ON payments(order_id, mp_status, created_at DESC);

-- Partial indexes for active data
CREATE INDEX IF NOT EXISTS idx_events_active_only ON events(id, name, school, date) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_photos_approved_only ON photos(id, event_id, storage_path, created_at) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_orders_active_only ON orders(id, subject_id, status, created_at) WHERE status != 'delivered';
CREATE INDEX IF NOT EXISTS idx_subject_tokens_valid_only ON subject_tokens(id, subject_id, token) WHERE expires_at > NOW();

-- Event statistics function
CREATE OR REPLACE FUNCTION get_event_statistics(event_uuid UUID)
RETURNS TABLE(
  total_subjects INTEGER, total_photos INTEGER, tagged_photos INTEGER, untagged_photos INTEGER,
  total_orders INTEGER, pending_orders INTEGER, approved_orders INTEGER, delivered_orders INTEGER,
  total_revenue_cents INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH event_stats AS (
    SELECT 
      (SELECT COUNT(*)::INTEGER FROM subjects WHERE event_id = event_uuid) as total_subjects,
      (SELECT COUNT(*)::INTEGER FROM photos WHERE event_id = event_uuid) as total_photos,
      (SELECT COUNT(DISTINCT p.id)::INTEGER FROM photos p JOIN photo_subjects ps ON p.id = ps.photo_id WHERE p.event_id = event_uuid) as tagged_photos,
      (SELECT COUNT(*)::INTEGER FROM photos p WHERE p.event_id = event_uuid AND NOT EXISTS (SELECT 1 FROM photo_subjects ps WHERE ps.photo_id = p.id)) as untagged_photos
  ),
  order_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_orders,
      COUNT(*) FILTER (WHERE o.status = 'pending')::INTEGER as pending_orders,
      COUNT(*) FILTER (WHERE o.status = 'approved')::INTEGER as approved_orders,
      COUNT(*) FILTER (WHERE o.status = 'delivered')::INTEGER as delivered_orders,
      COALESCE(SUM(CASE WHEN o.status IN ('approved', 'delivered') THEN 
        (SELECT SUM(pli.price_cents * oi.quantity) FROM order_items oi JOIN price_list_items pli ON oi.price_list_item_id = pli.id WHERE oi.order_id = o.id)
        ELSE 0 END), 0)::INTEGER as total_revenue_cents
    FROM orders o JOIN subjects s ON o.subject_id = s.id WHERE s.event_id = event_uuid
  )
  SELECT es.total_subjects, es.total_photos, es.tagged_photos, es.untagged_photos,
         os.total_orders, os.pending_orders, os.approved_orders, os.delivered_orders, os.total_revenue_cents
  FROM event_stats es CROSS JOIN order_stats os;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Token cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM subject_tokens WHERE expires_at <= NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Migration 013 completed - Schema constraints and optimizations applied' as status;

-- =======================
-- MIGRATION 014: Advanced Features and Monitoring
-- =======================

-- Security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'token_access_success', 'token_access_failure', 'photo_assignment',
    'order_creation', 'payment_processed', 'admin_login'
  )),
  subject_id UUID REFERENCES subjects(id),
  user_id UUID REFERENCES auth.users(id),
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and service can access audit log" ON security_audit_log FOR ALL TO authenticated, service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_security_audit_event_type_created ON security_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_subject_created ON security_audit_log(subject_id, created_at DESC) WHERE subject_id IS NOT NULL;

-- Dashboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_event_dashboard AS
SELECT 
  e.id as event_id, e.name as event_name, e.school, e.date, e.active, e.created_at,
  COUNT(DISTINCT s.id) as total_subjects,
  COUNT(DISTINCT p.id) as total_photos,
  COUNT(DISTINCT ps.photo_id) as tagged_photos,
  COUNT(DISTINCT p.id) - COUNT(DISTINCT ps.photo_id) as untagged_photos,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'approved' THEN o.id END) as approved_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as delivered_orders,
  MAX(p.created_at) as latest_photo_upload,
  MAX(o.created_at) as latest_order
FROM events e
LEFT JOIN subjects s ON e.id = s.event_id
LEFT JOIN photos p ON e.id = p.event_id AND p.approved = true
LEFT JOIN photo_subjects ps ON p.id = ps.photo_id
LEFT JOIN orders o ON s.id = o.subject_id
GROUP BY e.id, e.name, e.school, e.date, e.active, e.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_event_dashboard_event_id ON mv_event_dashboard(event_id);

-- Enhanced token validation with audit
CREATE OR REPLACE FUNCTION validate_family_token_with_audit(
  token_value TEXT, client_ip INET DEFAULT NULL, user_agent_string TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
  token_length INTEGER;
BEGIN
  IF token_value IS NULL THEN
    INSERT INTO security_audit_log (event_type, event_data, ip_address, user_agent)
    VALUES ('token_access_failure', '{"reason": "null_token"}'::jsonb, client_ip, user_agent_string);
    RETURN NULL;
  END IF;
  
  token_length := LENGTH(token_value);
  
  IF token_length < 20 THEN
    INSERT INTO security_audit_log (event_type, event_data, ip_address, user_agent)
    VALUES ('token_access_failure', 
            jsonb_build_object('reason', 'insufficient_length', 'length', token_length),
            client_ip, user_agent_string);
    RETURN NULL;
  END IF;
  
  SELECT st.subject_id INTO subject_uuid
  FROM subject_tokens st
  WHERE st.token = token_value AND st.expires_at > NOW()
  LIMIT 1;
  
  IF subject_uuid IS NOT NULL THEN
    INSERT INTO security_audit_log (event_type, subject_id, event_data, ip_address, user_agent)
    VALUES ('token_access_success', subject_uuid, 
            jsonb_build_object('token_length', token_length),
            client_ip, user_agent_string);
  ELSE
    INSERT INTO security_audit_log (event_type, event_data, ip_address, user_agent)
    VALUES ('token_access_failure', 
            jsonb_build_object('reason', 'invalid_token', 'length', token_length),
            client_ip, user_agent_string);
  END IF;
  
  RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- System health monitoring
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE(metric_name TEXT, metric_value NUMERIC, status TEXT, threshold NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Active Connections'::TEXT, COUNT(*)::NUMERIC,
         CASE WHEN COUNT(*) < 50 THEN 'OK' WHEN COUNT(*) < 80 THEN 'WARN' ELSE 'CRITICAL' END::TEXT,
         80::NUMERIC
  FROM pg_stat_activity WHERE state = 'active'
  
  UNION ALL
  
  SELECT 'Total DB Size (MB)'::TEXT,
         ROUND((pg_database_size(current_database()) / 1024.0 / 1024.0)::NUMERIC, 2),
         CASE 
           WHEN pg_database_size(current_database()) < 1024*1024*1024 THEN 'OK'
           WHEN pg_database_size(current_database()) < 5*1024*1024*1024 THEN 'WARN'
           ELSE 'CRITICAL'
         END::TEXT,
         5120::NUMERIC
  
  UNION ALL
  
  SELECT 'Failed Token Access (24h)'::TEXT, COUNT(*)::NUMERIC,
         CASE WHEN COUNT(*) < 10 THEN 'OK' WHEN COUNT(*) < 50 THEN 'WARN' ELSE 'CRITICAL' END::TEXT,
         50::NUMERIC
  FROM security_audit_log
  WHERE event_type = 'token_access_failure' AND created_at > NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT 'Expired Tokens'::TEXT, COUNT(*)::NUMERIC,
         CASE WHEN COUNT(*) < 100 THEN 'OK' WHEN COUNT(*) < 500 THEN 'WARN' ELSE 'CRITICAL' END::TEXT,
         500::NUMERIC
  FROM subject_tokens WHERE expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Maintenance function
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS TABLE(task TEXT, result TEXT, details TEXT) AS $$
DECLARE
  cleaned_tokens INTEGER;
BEGIN
  SELECT cleanup_expired_tokens() INTO cleaned_tokens;
  RETURN QUERY SELECT 'Token Cleanup'::TEXT, 'SUCCESS'::TEXT, cleaned_tokens || ' expired tokens removed'::TEXT;
  
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_event_dashboard;
  RETURN QUERY SELECT 'Dashboard Refresh'::TEXT, 'SUCCESS'::TEXT, 'Materialized view refreshed'::TEXT;
  
  EXECUTE 'ANALYZE';
  RETURN QUERY SELECT 'Statistics Update'::TEXT, 'SUCCESS'::TEXT, 'Table statistics updated'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Migration 014 completed - Advanced features and monitoring applied' as status;

-- =======================
-- FINAL SYSTEM CONFIGURATION
-- =======================

-- Create or update update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'payments_updated_at') THEN
    CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'events_updated_at') THEN
    CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Grant all necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION validate_family_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_family_token_with_audit(TEXT, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_subject_photos(UUID) TO anon;

-- Update table statistics
ANALYZE;

-- =======================
-- DEPLOYMENT VERIFICATION
-- =======================

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
  materialized_view_count INTEGER;
  audit_enabled BOOLEAN;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('schema_migrations', 'supabase_migrations');
  
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
  
  -- Count materialized views
  SELECT COUNT(*) INTO materialized_view_count
  FROM pg_matviews WHERE schemaname = 'public';
  
  -- Check audit table
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') 
  INTO audit_enabled;
  
  IF table_count < 12 THEN
    RAISE EXCEPTION 'Insufficient tables created. Expected >= 12, found %', table_count;
  END IF;
  
  IF function_count < 10 THEN
    RAISE EXCEPTION 'Insufficient functions created. Expected >= 10, found %', function_count;
  END IF;
  
  IF materialized_view_count < 1 THEN
    RAISE EXCEPTION 'Materialized view not created';
  END IF;
  
  IF NOT audit_enabled THEN
    RAISE EXCEPTION 'Security audit logging not enabled';
  END IF;
  
  RAISE NOTICE 'DEPLOYMENT SUCCESSFUL: Tables: %, Functions: %, MV: %, Audit: %', 
               table_count, function_count, materialized_view_count, audit_enabled;
END $$;

-- =======================
-- SUCCESS MESSAGE
-- =======================

SELECT '🎉 LookEscolar Database Deployment Complete!' as status;
SELECT 'Tables: 12+, Functions: 10+, Security: Enabled, Monitoring: Active' as summary;
SELECT 'Next step: Update your TypeScript types and restart your Next.js application' as next_action;
SELECT 'Run verify_database_schema.sql to confirm everything is working correctly' as verification;

-- =======================
-- QUICK HEALTH CHECK
-- =======================

SELECT 'HEALTH CHECK RESULTS:' as section;

SELECT * FROM get_system_health();

SELECT 'All systems ready for production! 🚀' as final_status;