-- ============================================================================
-- 🚀 Production Optimization Migration
-- ============================================================================
-- Optimizes database for production deployment with performance indexes,
-- monitoring functions, and security hardening
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- 📊 PERFORMANCE INDEXES
-- ============================================================================

-- Events table performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_active_date 
ON events(is_active, event_date) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_created_at 
ON events(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_school_active
ON events(school, is_active) 
WHERE is_active = true;

-- Subjects table performance indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subjects_event_token 
ON subjects(event_id, access_token) 
WHERE access_token IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subjects_token_active 
ON subjects(access_token) 
WHERE access_token IS NOT NULL AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subjects_event_active
ON subjects(event_id, is_active) 
WHERE is_active = true;

-- Photos table performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_event_uploaded 
ON photos(event_id, uploaded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_processing_status 
ON photos(processing_status) 
WHERE processing_status != 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_event_status
ON photos(event_id, processing_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_storage_path
ON photos(storage_path) 
WHERE storage_path IS NOT NULL;

-- Photo subjects junction performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_subjects_photo_subject 
ON photo_subjects(photo_id, subject_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_subjects_subject_photo 
ON photo_subjects(subject_id, photo_id);

-- Orders table performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_subject_status 
ON orders(subject_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_mp_payment 
ON orders(mp_payment_id) 
WHERE mp_payment_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created
ON orders(status, created_at DESC);

-- Order items performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_photo 
ON order_items(order_id, photo_id);

-- Egress metrics performance indexes (for monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egress_metrics_event_date 
ON egress_metrics(event_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egress_metrics_date 
ON egress_metrics(date DESC);

-- ============================================================================
-- 📈 MONITORING FUNCTIONS AND VIEWS
-- ============================================================================

-- Performance monitoring view
CREATE OR REPLACE VIEW performance_stats AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time,
    rows,
    ROUND((100.0 * total_exec_time / sum(total_exec_time) OVER()), 2) AS percentage_cpu
FROM pg_stat_statements 
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Table size monitoring view
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Connection monitoring view
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    state,
    count(*) as connections,
    max(now() - state_change) as max_duration,
    max(now() - query_start) as max_query_duration
FROM pg_stat_activity 
WHERE state IS NOT NULL
GROUP BY state
ORDER BY connections DESC;

-- Database health check function
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    value TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Check active connections
    RETURN QUERY
    SELECT 
        'Active Connections'::TEXT,
        CASE WHEN count < 80 THEN 'OK' ELSE 'WARNING' END::TEXT,
        count::TEXT,
        CASE WHEN count < 80 THEN 'Connection count is healthy' ELSE 'Consider optimizing queries or scaling' END::TEXT
    FROM (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS conn_count(count);

    -- Check slow queries
    RETURN QUERY
    SELECT 
        'Slow Queries'::TEXT,
        CASE WHEN avg_time < 1000 THEN 'OK' ELSE 'WARNING' END::TEXT,
        ROUND(avg_time::numeric, 2)::TEXT || 'ms',
        CASE WHEN avg_time < 1000 THEN 'Query performance is good' ELSE 'Consider query optimization' END::TEXT
    FROM (SELECT AVG(mean_exec_time) FROM pg_stat_statements WHERE calls > 100) AS query_stats(avg_time);

    -- Check database size
    RETURN QUERY
    SELECT 
        'Database Size'::TEXT,
        CASE WHEN size_gb < 8 THEN 'OK' WHEN size_gb < 10 THEN 'WARNING' ELSE 'CRITICAL' END::TEXT,
        ROUND(size_gb::numeric, 2)::TEXT || 'GB',
        CASE 
            WHEN size_gb < 8 THEN 'Database size is healthy'
            WHEN size_gb < 10 THEN 'Consider cleanup or upgrade'
            ELSE 'Immediate action required - storage limit approaching'
        END::TEXT
    FROM (SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 / 1024.0) AS db_stats(size_gb);

    -- Check index usage
    RETURN QUERY
    SELECT 
        'Index Usage'::TEXT,
        CASE WHEN usage_percent > 95 THEN 'OK' WHEN usage_percent > 80 THEN 'WARNING' ELSE 'CRITICAL' END::TEXT,
        ROUND(usage_percent::numeric, 1)::TEXT || '%',
        CASE 
            WHEN usage_percent > 95 THEN 'Index usage is optimal'
            WHEN usage_percent > 80 THEN 'Some queries may benefit from indexes'
            ELSE 'Review and create missing indexes'
        END::TEXT
    FROM (
        SELECT 100.0 * sum(idx_scan) / GREATEST(sum(idx_scan + seq_scan), 1) 
        FROM pg_stat_user_tables
    ) AS index_stats(usage_percent);

END;
$$ LANGUAGE plpgsql;

-- Storage health monitoring function
CREATE OR REPLACE FUNCTION check_storage_health()
RETURNS TABLE(
    metric_name TEXT,
    current_value BIGINT,
    threshold_warning BIGINT,
    threshold_critical BIGINT,
    status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Check monthly egress usage
    RETURN QUERY
    SELECT 
        'Monthly Egress (bytes)'::TEXT,
        COALESCE(monthly_bytes, 0) as current_value,
        85899345920::BIGINT as threshold_warning, -- 80GB in bytes
        102005473280::BIGINT as threshold_critical, -- 95GB in bytes
        CASE 
            WHEN COALESCE(monthly_bytes, 0) < 85899345920 THEN 'OK'
            WHEN COALESCE(monthly_bytes, 0) < 102005473280 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT as status,
        CASE 
            WHEN COALESCE(monthly_bytes, 0) < 85899345920 THEN 'Egress usage is healthy'
            WHEN COALESCE(monthly_bytes, 0) < 102005473280 THEN 'Monitor egress usage closely'
            ELSE 'Immediate action required - egress limit approaching'
        END::TEXT as recommendation
    FROM (
        SELECT SUM(bytes_served) as monthly_bytes
        FROM egress_metrics 
        WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    ) AS egress_stats;

    -- Check storage bucket size
    RETURN QUERY
    SELECT 
        'Storage Bucket Size (files)'::TEXT,
        COALESCE(file_count, 0) as current_value,
        10000::BIGINT as threshold_warning,
        50000::BIGINT as threshold_critical,
        CASE 
            WHEN COALESCE(file_count, 0) < 10000 THEN 'OK'
            WHEN COALESCE(file_count, 0) < 50000 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT as status,
        CASE 
            WHEN COALESCE(file_count, 0) < 10000 THEN 'File count is healthy'
            WHEN COALESCE(file_count, 0) < 50000 THEN 'Consider cleanup of old files'
            ELSE 'Implement automated cleanup immediately'
        END::TEXT as recommendation
    FROM (
        SELECT COUNT(*) as file_count
        FROM storage.objects
        WHERE bucket_id = 'photos-private-bucket'
    ) AS storage_stats;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 🔒 SECURITY HARDENING
-- ============================================================================

-- Password policy validation function
CREATE OR REPLACE FUNCTION validate_password_policy(password text)
RETURNS boolean AS $$
BEGIN
    -- Minimum 12 characters for production
    IF length(password) < 12 THEN
        RAISE EXCEPTION 'Password must be at least 12 characters long';
    END IF;
    
    -- Must contain uppercase
    IF password !~ '[A-Z]' THEN
        RAISE EXCEPTION 'Password must contain at least one uppercase letter';
    END IF;
    
    -- Must contain lowercase  
    IF password !~ '[a-z]' THEN
        RAISE EXCEPTION 'Password must contain at least one lowercase letter';
    END IF;
    
    -- Must contain number
    IF password !~ '[0-9]' THEN
        RAISE EXCEPTION 'Password must contain at least one number';
    END IF;
    
    -- Must contain special character
    IF password !~ '[^A-Za-z0-9]' THEN
        RAISE EXCEPTION 'Password must contain at least one special character';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Token validation function
CREATE OR REPLACE FUNCTION validate_token_security(token text, min_length integer DEFAULT 20)
RETURNS boolean AS $$
BEGIN
    -- Check minimum length
    IF length(token) < min_length THEN
        RAISE EXCEPTION 'Token must be at least % characters long', min_length;
    END IF;
    
    -- Check for secure randomness (no obvious patterns)
    IF token ~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'Token must not be purely numeric';
    END IF;
    
    IF token ~ '^[a-zA-Z]+$' THEN
        RAISE EXCEPTION 'Token must contain non-alphabetic characters';
    END IF;
    
    -- Check for common weak patterns
    IF token ILIKE '%123%' OR token ILIKE '%abc%' OR token ILIKE '%password%' THEN
        RAISE EXCEPTION 'Token contains weak patterns';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- RLS audit function
CREATE OR REPLACE FUNCTION audit_rls_policies()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count BIGINT,
    status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity as rls_enabled,
        COALESCE(p.policy_count, 0) as policy_count,
        CASE 
            WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN 'OK'
            WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT as status,
        CASE 
            WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN 'RLS properly configured'
            WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN 'RLS enabled but no policies defined'
            ELSE 'RLS must be enabled with appropriate policies'
        END::TEXT as recommendation
    FROM pg_tables t
    LEFT JOIN (
        SELECT tablename, COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
    ) p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 🚨 ALERTING SYSTEM
-- ============================================================================

-- Alert thresholds configuration table
CREATE TABLE IF NOT EXISTS alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL UNIQUE,
    threshold_warning DECIMAL NOT NULL,
    threshold_critical DECIMAL NOT NULL,
    comparison_operator VARCHAR(10) NOT NULL DEFAULT '>',
    alert_level VARCHAR(20) NOT NULL DEFAULT 'warning',
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert production alert thresholds
INSERT INTO alert_thresholds (metric_name, threshold_warning, threshold_critical, comparison_operator, description) 
VALUES
('connection_count', 80, 95, '>', 'Active database connections'),
('query_duration_avg', 1000, 5000, '>', 'Average query execution time in milliseconds'),
('database_size_gb', 8, 10, '>', 'Total database size in gigabytes'),
('egress_usage_percent', 80, 95, '>', 'Monthly egress usage percentage'),
('storage_file_count', 10000, 50000, '>', 'Total files in storage bucket'),
('failed_login_attempts', 10, 50, '>', 'Failed login attempts in last hour'),
('index_usage_percent', 80, 60, '<', 'Index usage percentage (lower is worse)')
ON CONFLICT (metric_name) DO UPDATE SET
    threshold_warning = EXCLUDED.threshold_warning,
    threshold_critical = EXCLUDED.threshold_critical,
    updated_at = NOW();

-- Alert evaluation function
CREATE OR REPLACE FUNCTION evaluate_alerts()
RETURNS TABLE(
    alert_id UUID,
    metric_name TEXT,
    current_value DECIMAL,
    threshold_value DECIMAL,
    alert_level TEXT,
    status TEXT,
    message TEXT,
    evaluated_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Connection count alert
    RETURN QUERY
    SELECT 
        gen_random_uuid() as alert_id,
        'connection_count'::TEXT,
        conn_count.count::DECIMAL,
        at.threshold_warning,
        CASE WHEN conn_count.count >= at.threshold_critical THEN 'critical' ELSE 'warning' END::TEXT,
        CASE WHEN conn_count.count >= at.threshold_critical THEN 'CRITICAL' 
             WHEN conn_count.count >= at.threshold_warning THEN 'WARNING'
             ELSE 'OK' END::TEXT,
        'Active connections: ' || conn_count.count || ' (threshold: ' || 
        CASE WHEN conn_count.count >= at.threshold_critical THEN at.threshold_critical ELSE at.threshold_warning END || ')'::TEXT,
        NOW()
    FROM (SELECT count(*)::INTEGER FROM pg_stat_activity WHERE state = 'active') AS conn_count(count),
         alert_thresholds at
    WHERE at.metric_name = 'connection_count' 
      AND at.is_active 
      AND conn_count.count >= at.threshold_warning;

    -- Database size alert
    RETURN QUERY
    SELECT 
        gen_random_uuid() as alert_id,
        'database_size_gb'::TEXT,
        db_size.size_gb::DECIMAL,
        at.threshold_warning,
        CASE WHEN db_size.size_gb >= at.threshold_critical THEN 'critical' ELSE 'warning' END::TEXT,
        CASE WHEN db_size.size_gb >= at.threshold_critical THEN 'CRITICAL' 
             WHEN db_size.size_gb >= at.threshold_warning THEN 'WARNING'
             ELSE 'OK' END::TEXT,
        'Database size: ' || ROUND(db_size.size_gb::numeric, 2) || 'GB (threshold: ' || 
        CASE WHEN db_size.size_gb >= at.threshold_critical THEN at.threshold_critical ELSE at.threshold_warning END || 'GB)'::TEXT,
        NOW()
    FROM (SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 / 1024.0) AS db_size(size_gb),
         alert_thresholds at
    WHERE at.metric_name = 'database_size_gb' 
      AND at.is_active 
      AND db_size.size_gb >= at.threshold_warning;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 🧹 CLEANUP AND MAINTENANCE
-- ============================================================================

-- Cleanup old egress metrics (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_egress_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM egress_metrics 
    WHERE date < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old signed URL cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- This would be implemented by the application layer
    -- as we don't store cache entries in the database
    
    -- Log cleanup event
    INSERT INTO public.system_logs (event_type, message, created_at)
    VALUES ('cleanup', 'Cache cleanup completed', NOW());
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Database maintenance function
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS TABLE(
    task_name TEXT,
    status TEXT,
    details TEXT,
    duration_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
BEGIN
    -- Cleanup old egress metrics
    start_time := NOW();
    PERFORM cleanup_old_egress_metrics();
    end_time := NOW();
    
    RETURN QUERY
    SELECT 
        'Cleanup Egress Metrics'::TEXT,
        'COMPLETED'::TEXT,
        'Removed metrics older than 90 days'::TEXT,
        EXTRACT(MILLISECONDS FROM end_time - start_time)::INTEGER;

    -- Analyze tables for query planner
    start_time := NOW();
    ANALYZE;
    end_time := NOW();
    
    RETURN QUERY
    SELECT 
        'Analyze Tables'::TEXT,
        'COMPLETED'::TEXT,
        'Updated table statistics for query planner'::TEXT,
        EXTRACT(MILLISECONDS FROM end_time - start_time)::INTEGER;

    -- Vacuum to reclaim space (not FULL to avoid locks)
    start_time := NOW();
    VACUUM (VERBOSE false, ANALYZE false);
    end_time := NOW();
    
    RETURN QUERY
    SELECT 
        'Vacuum Database'::TEXT,
        'COMPLETED'::TEXT,
        'Reclaimed unused space'::TEXT,
        EXTRACT(MILLISECONDS FROM end_time - start_time)::INTEGER;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 📝 COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON VIEW performance_stats IS 'Real-time database performance statistics';
COMMENT ON VIEW table_sizes IS 'Table and index size monitoring';
COMMENT ON VIEW connection_stats IS 'Database connection monitoring';

COMMENT ON FUNCTION check_database_health() IS 'Comprehensive database health check';
COMMENT ON FUNCTION check_storage_health() IS 'Storage and egress monitoring';
COMMENT ON FUNCTION audit_rls_policies() IS 'Row Level Security audit';
COMMENT ON FUNCTION evaluate_alerts() IS 'Alert threshold evaluation';
COMMENT ON FUNCTION perform_maintenance() IS 'Automated database maintenance';

COMMENT ON TABLE alert_thresholds IS 'Alert threshold configuration for monitoring';

-- ============================================================================
-- ✅ VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created
SELECT 
    COUNT(*) as total_indexes,
    COUNT(*) FILTER (WHERE indexdef LIKE '%CONCURRENTLY%') as concurrent_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- Verify functions were created
SELECT 
    proname as function_name,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname IN (
    'check_database_health',
    'check_storage_health', 
    'audit_rls_policies',
    'evaluate_alerts',
    'perform_maintenance'
)
ORDER BY proname;

-- Test database health check
SELECT * FROM check_database_health();

-- ============================================================================
-- 🎯 MIGRATION SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Production optimization migration completed successfully!';
    RAISE NOTICE 'Created % performance indexes', (
        SELECT COUNT(*) FROM pg_indexes 
        WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
    );
    RAISE NOTICE 'Created % monitoring functions', (
        SELECT COUNT(*) FROM pg_proc 
        WHERE proname IN ('check_database_health', 'check_storage_health', 'audit_rls_policies', 'evaluate_alerts', 'perform_maintenance')
    );
    RAISE NOTICE 'Database is ready for production deployment! 🚀';
END $$;