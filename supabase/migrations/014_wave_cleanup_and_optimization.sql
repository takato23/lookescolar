-- ============================================================
-- Migration 014: Wave Cleanup and Advanced Optimizations
-- Final wave to ensure enterprise-grade database performance
-- ============================================================

BEGIN;

-- =======================
-- WAVE 1: ADVANCED PERFORMANCE OPTIMIZATIONS
-- =======================

-- Create materialized view for dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_event_dashboard AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.school,
  e.date,
  e.active,
  e.created_at,
  COUNT(DISTINCT s.id) as total_subjects,
  COUNT(DISTINCT p.id) as total_photos,
  COUNT(DISTINCT ps.photo_id) as tagged_photos,
  COUNT(DISTINCT p.id) - COUNT(DISTINCT ps.photo_id) as untagged_photos,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'approved' THEN o.id END) as approved_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as delivered_orders,
  COALESCE(SUM(DISTINCT CASE 
    WHEN o.status IN ('approved', 'delivered') THEN calculate_order_total(o.id) 
    ELSE 0 
  END), 0) as total_revenue_cents,
  MAX(p.created_at) as latest_photo_upload,
  MAX(o.created_at) as latest_order
FROM events e
LEFT JOIN subjects s ON e.id = s.event_id
LEFT JOIN photos p ON e.id = p.event_id AND p.approved = true
LEFT JOIN photo_subjects ps ON p.id = ps.photo_id
LEFT JOIN orders o ON s.id = o.subject_id
GROUP BY e.id, e.name, e.school, e.date, e.active, e.created_at;

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_event_dashboard_event_id 
  ON mv_event_dashboard(event_id);

-- Create function to refresh dashboard data
CREATE OR REPLACE FUNCTION refresh_event_dashboard()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_event_dashboard;
  RAISE LOG 'Event dashboard materialized view refreshed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- WAVE 2: ADVANCED INDEXING STRATEGIES
-- =======================

-- Expression indexes for common computed queries
CREATE INDEX IF NOT EXISTS idx_subjects_display_name 
  ON subjects(
    CASE 
      WHEN type = 'student' THEN first_name || COALESCE(' ' || last_name, '')
      WHEN type = 'couple' THEN first_name || COALESCE(' ' || last_name, '') || ' & ' || 
                                couple_first_name || COALESCE(' ' || couple_last_name, '')
      WHEN type = 'family' THEN COALESCE(family_name, first_name || ' Family')
    END
  );

-- Covering indexes to avoid table lookups
CREATE INDEX IF NOT EXISTS idx_photos_gallery_covering 
  ON photos(event_id, approved, created_at DESC)
  INCLUDE (id, storage_path, width, height)
  WHERE approved = true;

-- Partial indexes for hot data
CREATE INDEX IF NOT EXISTS idx_orders_recent_active 
  ON orders(status, created_at DESC)
  WHERE created_at > (NOW() - INTERVAL '30 days')
    AND status != 'delivered';

-- Function-based index for token expiration
CREATE INDEX IF NOT EXISTS idx_subject_tokens_days_until_expiry 
  ON subject_tokens(EXTRACT(days FROM expires_at - NOW()))
  WHERE expires_at > NOW();

-- =======================
-- WAVE 3: ADVANCED SECURITY ENHANCEMENTS
-- =======================

-- Create audit log table for security monitoring
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

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for audit log (admin and service role only)
CREATE POLICY "Admin and service can access audit log" ON security_audit_log
  FOR ALL TO authenticated, service_role
  USING (true);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type_created 
  ON security_audit_log(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_subject_created 
  ON security_audit_log(subject_id, created_at DESC)
  WHERE subject_id IS NOT NULL;

-- Enhanced token validation with audit logging
CREATE OR REPLACE FUNCTION validate_family_token_with_audit(
  token_value TEXT,
  client_ip INET DEFAULT NULL,
  user_agent_string TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
  token_length INTEGER;
BEGIN
  -- Input validation
  IF token_value IS NULL THEN
    INSERT INTO security_audit_log (event_type, event_data, ip_address, user_agent)
    VALUES ('token_access_failure', '{"reason": "null_token"}'::jsonb, client_ip, user_agent_string);
    RETURN NULL;
  END IF;
  
  token_length := LENGTH(token_value);
  
  -- Token security: minimum 20 characters
  IF token_length < 20 THEN
    INSERT INTO security_audit_log (event_type, event_data, ip_address, user_agent)
    VALUES ('token_access_failure', 
            jsonb_build_object('reason', 'insufficient_length', 'length', token_length),
            client_ip, user_agent_string);
    RETURN NULL;
  END IF;
  
  -- Find valid token
  SELECT st.subject_id INTO subject_uuid
  FROM subject_tokens st
  WHERE st.token = token_value
    AND st.expires_at > NOW()
  LIMIT 1;
  
  -- Log access attempt
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

-- =======================
-- WAVE 4: DATA INTEGRITY AND VALIDATION
-- =======================

-- Create function to validate data consistency
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check for orphaned photo subjects
  RETURN QUERY
  SELECT 
    'Orphaned Photo Subjects'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Found ' || COUNT(*) || ' photo subjects with missing photos or subjects'::TEXT
  FROM photo_subjects ps
  LEFT JOIN photos p ON ps.photo_id = p.id
  LEFT JOIN subjects s ON ps.subject_id = s.id
  WHERE p.id IS NULL OR s.id IS NULL;
  
  -- Check for orders without items
  RETURN QUERY
  SELECT 
    'Orders Without Items'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
    'Found ' || COUNT(*) || ' orders without order items'::TEXT
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE oi.id IS NULL;
  
  -- Check for expired tokens still in use
  RETURN QUERY
  SELECT 
    'Expired Tokens'::TEXT,
    'INFO'::TEXT,
    'Found ' || COUNT(*) || ' expired tokens (cleanup recommended)'::TEXT
  FROM subject_tokens
  WHERE expires_at <= NOW();
  
  -- Check for photos without storage paths
  RETURN QUERY
  SELECT 
    'Photos Without Storage'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Found ' || COUNT(*) || ' photos with empty storage paths'::TEXT
  FROM photos
  WHERE storage_path IS NULL OR storage_path = '';
  
  -- Check for price list items with zero/negative prices
  RETURN QUERY
  SELECT 
    'Invalid Prices'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Found ' || COUNT(*) || ' price list items with invalid prices'::TEXT
  FROM price_list_items
  WHERE price_cents <= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- WAVE 5: ADVANCED BACKUP AND RECOVERY FUNCTIONS
-- =======================

-- Function to create data export for backup
CREATE OR REPLACE FUNCTION export_event_data(event_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'event', to_jsonb(e),
    'subjects', (
      SELECT jsonb_agg(to_jsonb(s))
      FROM subjects s 
      WHERE s.event_id = event_uuid
    ),
    'subject_tokens', (
      SELECT jsonb_agg(to_jsonb(st))
      FROM subject_tokens st
      JOIN subjects s ON st.subject_id = s.id
      WHERE s.event_id = event_uuid
    ),
    'photos', (
      SELECT jsonb_agg(to_jsonb(p))
      FROM photos p
      WHERE p.event_id = event_uuid
    ),
    'photo_subjects', (
      SELECT jsonb_agg(to_jsonb(ps))
      FROM photo_subjects ps
      JOIN photos p ON ps.photo_id = p.id
      WHERE p.event_id = event_uuid
    ),
    'price_lists', (
      SELECT jsonb_agg(jsonb_build_object(
        'price_list', to_jsonb(pl),
        'items', (
          SELECT jsonb_agg(to_jsonb(pli))
          FROM price_list_items pli
          WHERE pli.price_list_id = pl.id
        )
      ))
      FROM price_lists pl
      WHERE pl.event_id = event_uuid
    ),
    'orders', (
      SELECT jsonb_agg(jsonb_build_object(
        'order', to_jsonb(o),
        'items', (
          SELECT jsonb_agg(to_jsonb(oi))
          FROM order_items oi
          WHERE oi.order_id = o.id
        ),
        'payments', (
          SELECT jsonb_agg(to_jsonb(pay))
          FROM payments pay
          WHERE pay.order_id = o.id
        )
      ))
      FROM orders o
      JOIN subjects s ON o.subject_id = s.id
      WHERE s.event_id = event_uuid
    ),
    'export_timestamp', NOW(),
    'export_version', '1.0'
  ) INTO result
  FROM events e
  WHERE e.id = event_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- WAVE 6: MONITORING AND ALERTING FUNCTIONS
-- =======================

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE(
  metric_name TEXT,
  metric_value NUMERIC,
  status TEXT,
  threshold NUMERIC
) AS $$
BEGIN
  -- Database connections
  RETURN QUERY
  SELECT 
    'Active Connections'::TEXT,
    COUNT(*)::NUMERIC,
    CASE WHEN COUNT(*) < 50 THEN 'OK' WHEN COUNT(*) < 80 THEN 'WARN' ELSE 'CRITICAL' END::TEXT,
    80::NUMERIC
  FROM pg_stat_activity
  WHERE state = 'active';
  
  -- Table sizes
  RETURN QUERY
  SELECT 
    'Total DB Size (MB)'::TEXT,
    ROUND((pg_database_size(current_database()) / 1024.0 / 1024.0)::NUMERIC, 2),
    CASE 
      WHEN pg_database_size(current_database()) < 1024*1024*1024 THEN 'OK'
      WHEN pg_database_size(current_database()) < 5*1024*1024*1024 THEN 'WARN'
      ELSE 'CRITICAL'
    END::TEXT,
    5120::NUMERIC; -- 5GB threshold
  
  -- Recent errors (from audit log if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
    RETURN QUERY
    SELECT 
      'Failed Token Access (24h)'::TEXT,
      COUNT(*)::NUMERIC,
      CASE WHEN COUNT(*) < 10 THEN 'OK' WHEN COUNT(*) < 50 THEN 'WARN' ELSE 'CRITICAL' END::TEXT,
      50::NUMERIC
    FROM security_audit_log
    WHERE event_type = 'token_access_failure'
      AND created_at > NOW() - INTERVAL '24 hours';
  END IF;
  
  -- Expired tokens
  RETURN QUERY
  SELECT 
    'Expired Tokens'::TEXT,
    COUNT(*)::NUMERIC,
    CASE WHEN COUNT(*) < 100 THEN 'OK' WHEN COUNT(*) < 500 THEN 'WARN' ELSE 'CRITICAL' END::TEXT,
    500::NUMERIC
  FROM subject_tokens
  WHERE expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- WAVE 7: FINAL OPTIMIZATIONS AND CLEANUP
-- =======================

-- Update all table statistics
ANALYZE;

-- Create maintenance function to be run periodically
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS TABLE(
  task TEXT,
  result TEXT,
  details TEXT
) AS $$
DECLARE
  cleaned_tokens INTEGER;
BEGIN
  -- Clean up expired tokens
  SELECT cleanup_expired_tokens() INTO cleaned_tokens;
  RETURN QUERY SELECT 'Token Cleanup'::TEXT, 'SUCCESS'::TEXT, cleaned_tokens || ' expired tokens removed'::TEXT;
  
  -- Refresh materialized views
  BEGIN
    PERFORM refresh_event_dashboard();
    RETURN QUERY SELECT 'Dashboard Refresh'::TEXT, 'SUCCESS'::TEXT, 'Materialized view refreshed'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Dashboard Refresh'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;
  
  -- Update statistics
  EXECUTE 'ANALYZE';
  RETURN QUERY SELECT 'Statistics Update'::TEXT, 'SUCCESS'::TEXT, 'Table statistics updated'::TEXT;
  
  -- Vacuum cleanup (non-blocking)
  EXECUTE 'VACUUM (ANALYZE)';
  RETURN QUERY SELECT 'Vacuum'::TEXT, 'SUCCESS'::TEXT, 'Database maintenance completed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION refresh_event_dashboard() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION validate_family_token_with_audit(TEXT, INET, TEXT) TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_data_integrity() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION export_event_data(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_system_health() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION perform_maintenance() TO service_role, authenticated;

-- =======================
-- FINAL VALIDATION
-- =======================

DO $$
DECLARE
  function_count INTEGER;
  materialized_view_count INTEGER;
  audit_table_exists BOOLEAN;
BEGIN
  -- Check function count
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_name IN (
      'validate_family_token_with_audit',
      'refresh_event_dashboard',
      'validate_data_integrity',
      'export_event_data',
      'get_system_health',
      'perform_maintenance'
    );
  
  -- Check materialized view
  SELECT COUNT(*) INTO materialized_view_count
  FROM pg_matviews
  WHERE schemaname = 'public'
    AND matviewname = 'mv_event_dashboard';
  
  -- Check audit table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'security_audit_log'
  ) INTO audit_table_exists;
  
  IF function_count < 6 THEN
    RAISE EXCEPTION 'Missing advanced functions. Expected 6, found %', function_count;
  END IF;
  
  IF materialized_view_count < 1 THEN
    RAISE EXCEPTION 'Dashboard materialized view not created';
  END IF;
  
  IF NOT audit_table_exists THEN
    RAISE EXCEPTION 'Security audit log table not created';
  END IF;
  
  RAISE NOTICE 'Wave cleanup completed successfully. Functions: %, Materialized views: %, Audit enabled: %', 
               function_count, materialized_view_count, audit_table_exists;
END $$;

COMMIT;

-- =======================
-- MAINTENANCE SCHEDULE RECOMMENDATIONS
-- =======================

/*
Set up these periodic maintenance tasks in your production environment:

1. Daily (automated):
   SELECT * FROM perform_maintenance();

2. Weekly (monitoring):
   SELECT * FROM get_system_health();
   SELECT * FROM validate_data_integrity();

3. Monthly (backup):
   SELECT export_event_data('event-uuid-here');

4. As needed (manual):
   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_event_dashboard;
   SELECT cleanup_expired_tokens();

5. Security monitoring (daily):
   SELECT * FROM security_audit_log 
   WHERE created_at > NOW() - INTERVAL '24 hours' 
     AND event_type = 'token_access_failure'
   ORDER BY created_at DESC;
*/