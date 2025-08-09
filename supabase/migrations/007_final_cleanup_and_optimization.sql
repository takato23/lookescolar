-- Final cleanup and optimization migration
-- This migration ensures data consistency and optimal performance

-- STEP 1: Add any missing indexes that weren't created yet
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_subjects_created_at ON photo_subjects(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at) WHERE delivered_at IS NOT NULL;

-- STEP 2: Add composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_subject_status_created 
  ON orders(subject_id, status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_event_approved_created 
  ON photos(event_id, approved, created_at) WHERE approved = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subject_tokens_expires_token 
  ON subject_tokens(expires_at, token) WHERE expires_at > NOW();

-- STEP 3: Add constraints for data integrity
ALTER TABLE payments 
  ADD CONSTRAINT check_amount_positive 
  CHECK (amount_cents > 0);

ALTER TABLE price_list_items 
  ADD CONSTRAINT check_sort_order_non_negative 
  CHECK (sort_order >= 0);

-- STEP 4: Create materialized view for dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.school,
  e.date as event_date,
  COUNT(DISTINCT s.id) as total_subjects,
  COUNT(DISTINCT p.id) as total_photos,
  COUNT(DISTINCT p.id) FILTER (WHERE p.approved = true) as approved_photos,
  COUNT(DISTINCT ps.photo_id) as tagged_photos,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'approved') as approved_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as delivered_orders,
  COALESCE(SUM(pli.price_cents * oi.quantity) FILTER (WHERE o.status IN ('approved', 'delivered')), 0) as total_revenue_cents,
  MAX(p.created_at) as last_photo_uploaded,
  MAX(o.created_at) as last_order_created,
  e.updated_at as last_event_update
FROM events e
LEFT JOIN subjects s ON e.id = s.event_id
LEFT JOIN photos p ON e.id = p.event_id
LEFT JOIN photo_subjects ps ON p.id = ps.photo_id
LEFT JOIN orders o ON s.id = o.subject_id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN price_list_items pli ON oi.price_list_item_id = pli.id
WHERE e.active = true
GROUP BY e.id, e.name, e.school, e.date, e.updated_at;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_event_id ON dashboard_stats(event_id);

-- STEP 5: Function to refresh dashboard stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Create notification triggers for real-time updates
CREATE OR REPLACE FUNCTION notify_photo_upload()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('photo_uploaded', json_build_object(
    'photo_id', NEW.id,
    'event_id', NEW.event_id,
    'approved', NEW.approved
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM pg_notify('order_status_changed', json_build_object(
      'order_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'subject_id', NEW.subject_id
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply notification triggers
DROP TRIGGER IF EXISTS photo_upload_notify ON photos;
CREATE TRIGGER photo_upload_notify
  AFTER INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION notify_photo_upload();

DROP TRIGGER IF EXISTS order_status_notify ON orders;
CREATE TRIGGER order_status_notify
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- STEP 7: Optimize existing functions with better error handling
CREATE OR REPLACE FUNCTION validate_token_access(input_token TEXT)
RETURNS UUID AS $$
DECLARE
  subject_uuid UUID;
BEGIN
  -- Input validation
  IF input_token IS NULL OR length(input_token) < 20 THEN
    RAISE EXCEPTION 'Token inválido: debe tener al menos 20 caracteres';
  END IF;
  
  -- Check if token exists and is not expired
  SELECT st.subject_id INTO subject_uuid
  FROM subject_tokens st
  JOIN subjects s ON st.subject_id = s.id
  JOIN events e ON s.event_id = e.id
  WHERE st.token = input_token 
    AND st.expires_at > NOW()
    AND e.active = true;
  
  IF subject_uuid IS NULL THEN
    RAISE EXCEPTION 'Token inválido o expirado';
  END IF;
  
  RETURN subject_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 8: Create comprehensive audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  user_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_operation ON audit_logs(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- STEP 9: Generic audit function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 10: Apply audit triggers to critical tables (optional, can be enabled per table)
-- Uncomment to enable auditing on specific tables:

-- CREATE TRIGGER orders_audit_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON orders
--   FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- CREATE TRIGGER payments_audit_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON payments
--   FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- STEP 11: Create health check function
CREATE OR REPLACE FUNCTION system_health_check()
RETURNS TABLE(
  component TEXT,
  status TEXT,
  details TEXT,
  last_check TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'database'::TEXT as component,
    'healthy'::TEXT as status,
    'All tables accessible'::TEXT as details,
    NOW() as last_check
  WHERE EXISTS (SELECT 1 FROM events LIMIT 1);
  
  RETURN QUERY
  SELECT 
    'rls_policies'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END,
    'RLS policies: ' || COUNT(*)::TEXT,
    NOW()
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  RETURN QUERY
  SELECT 
    'expired_tokens'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'healthy' ELSE 'attention' END,
    'Expired tokens: ' || COUNT(*)::TEXT,
    NOW()
  FROM subject_tokens 
  WHERE expires_at < NOW();
  
  RETURN QUERY
  SELECT 
    'pending_orders'::TEXT,
    'info'::TEXT,
    'Pending orders: ' || COUNT(*)::TEXT,
    NOW()
  FROM orders 
  WHERE status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 12: Performance optimization settings
-- Set reasonable work_mem for operations
-- These are session-level settings, adjust postgresql.conf for permanent changes
-- SELECT set_config('work_mem', '32MB', false);
-- SELECT set_config('random_page_cost', '1.1', false); -- For SSD storage

-- STEP 13: Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all critical table changes';
COMMENT ON MATERIALIZED VIEW dashboard_stats IS 'Pre-computed dashboard statistics for performance';
COMMENT ON FUNCTION system_health_check() IS 'System health monitoring function for ops dashboards';
COMMENT ON FUNCTION notify_photo_upload() IS 'Real-time notification trigger for photo uploads';
COMMENT ON FUNCTION notify_order_status_change() IS 'Real-time notification trigger for order status changes';

-- STEP 14: Final integrity check
DO $$
BEGIN
  -- Verify all tables have RLS enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables t 
    LEFT JOIN pg_class c ON c.relname = t.tablename 
    WHERE t.schemaname = 'public' 
    AND NOT c.relrowsecurity
  ) THEN
    RAISE WARNING 'Some tables do not have RLS enabled. Check configuration.';
  END IF;
  
  -- Verify all critical indexes exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subject_tokens_token_expires') THEN
    RAISE WARNING 'Critical index missing: idx_subject_tokens_token_expires';
  END IF;
  
  RAISE NOTICE 'Database optimization completed successfully';
END $$;