# 🚀 Supabase Production Setup Guide

Complete guide for configuring Supabase for production deployment of LookEscolar.

## 📋 Pre-Production Checklist

### 1. Database Schema Deployment
```bash
# Apply all migrations to production database
supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"

# Verify schema deployment
supabase db diff --db-url "postgresql://postgres:[password]@[host]:5432/postgres"
```

### 2. Row Level Security (RLS) Verification
```sql
-- Verify all tables have RLS enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- List all RLS policies
SELECT 
    t.tablename, 
    p.policyname, 
    p.cmd,
    p.roles,
    CASE WHEN p.policyname IS NOT NULL THEN '✅' ELSE '❌' END as has_policy
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename, p.policyname;
```

### 3. Storage Bucket Configuration

#### Create Private Storage Bucket
```sql
-- Create private photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos-private-bucket', 
    'photos-private-bucket', 
    false, 
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/tiff']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];

-- Create storage policies for private bucket
CREATE POLICY "Admin can upload photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'photos-private-bucket' AND auth.role() = 'service_role');

CREATE POLICY "Service role can read photos" ON storage.objects
FOR SELECT USING (bucket_id = 'photos-private-bucket' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete photos" ON storage.objects
FOR DELETE USING (bucket_id = 'photos-private-bucket' AND auth.role() = 'service_role');
```

### 4. Database Performance Optimization

#### Essential Indexes
```sql
-- Events table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_active_date 
ON events(is_active, event_date) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_created_at 
ON events(created_at DESC);

-- Subjects table indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subjects_event_token 
ON subjects(event_id, access_token) WHERE access_token IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subjects_token_active 
ON subjects(access_token) WHERE access_token IS NOT NULL AND is_active = true;

-- Photos table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_event_uploaded 
ON photos(event_id, uploaded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_processing_status 
ON photos(processing_status) WHERE processing_status != 'completed';

-- Photo subjects junction indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_subjects_photo_subject 
ON photo_subjects(photo_id, subject_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_subjects_subject_photo 
ON photo_subjects(subject_id, photo_id);

-- Orders table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_subject_status 
ON orders(subject_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_mp_payment 
ON orders(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- Order items indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_photo 
ON order_items(order_id, photo_id);

-- Egress metrics indexes (for monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egress_metrics_event_date 
ON egress_metrics(event_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_egress_metrics_date 
ON egress_metrics(date DESC);
```

#### Database Configuration Tuning
```sql
-- Connection settings
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Memory settings  
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Checkpoint settings
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';

-- Query planner settings
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Apply configuration (requires restart)
SELECT pg_reload_conf();
```

### 5. Security Hardening

#### Enable Audit Logging
```sql
-- Enable row-level security audit
ALTER SYSTEM SET log_statement = 'mod';  -- Log all modifications
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a ';

-- Track function calls
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries

-- Enable connection logging
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

SELECT pg_reload_conf();
```

#### Password Policy Enforcement
```sql
-- Set strong password requirements
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

-- Create password policy function
CREATE OR REPLACE FUNCTION validate_password_policy(password text)
RETURNS boolean AS $$
BEGIN
    -- Minimum 12 characters
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
```

### 6. Backup and Recovery Setup

#### Automated Backup Configuration
```sql
-- Create backup user with minimal privileges
CREATE USER backup_user WITH PASSWORD 'secure_backup_password';
GRANT CONNECT ON DATABASE postgres TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup_user;

-- Create backup retention policy
CREATE TABLE IF NOT EXISTS backup_retention (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_date DATE NOT NULL,
    backup_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    retention_days INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to clean old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS void AS $$
BEGIN
    DELETE FROM backup_retention 
    WHERE backup_date < NOW() - INTERVAL '1 day' * retention_days;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-backups', '0 2 * * *', 'SELECT cleanup_old_backups();');
```

### 7. Monitoring and Alerting Setup

#### Performance Monitoring
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitoring views
CREATE OR REPLACE VIEW performance_stats AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time,
    rows
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC;

-- Create table size monitoring
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Create connection monitoring
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    state,
    count(*) as connections,
    max(now() - state_change) as max_duration
FROM pg_stat_activity 
WHERE state IS NOT NULL
GROUP BY state;
```

#### Alert Thresholds
```sql
-- Create alert configuration table
CREATE TABLE IF NOT EXISTS alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    threshold_value DECIMAL NOT NULL,
    comparison_operator VARCHAR(10) NOT NULL, -- '>', '<', '>=', '<=', '='
    alert_level VARCHAR(20) NOT NULL, -- 'warning', 'critical'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default alert thresholds
INSERT INTO alert_thresholds (metric_name, threshold_value, comparison_operator, alert_level) VALUES
('connection_count', 80, '>', 'warning'),
('connection_count', 95, '>', 'critical'),
('query_duration_avg', 1000, '>', 'warning'), -- milliseconds
('query_duration_avg', 5000, '>', 'critical'),
('database_size_gb', 8, '>', 'warning'),
('database_size_gb', 10, '>', 'critical'),
('egress_usage_percent', 80, '>', 'warning'),
('egress_usage_percent', 95, '>', 'critical');
```

### 8. Production Environment Variables

#### Required Supabase Configuration
```bash
# Supabase Production URLs
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# Service Role Key (CRITICAL - Keep Secure)
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Database Direct Connection (for migrations and admin tasks)
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres

# Storage Configuration
STORAGE_BUCKET=photos-private-bucket
SIGNED_URL_EXPIRY_MINUTES=60
```

## 🔧 Production Deployment Steps

### Step 1: Schema Migration
```bash
# 1. Export local schema
supabase db dump --schema-only > schema.sql

# 2. Apply to production
psql "postgresql://postgres:password@db.your-project.supabase.co:5432/postgres" < schema.sql

# 3. Run specific migrations
supabase db push --db-url "postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"
```

### Step 2: Storage Setup
```bash
# Create storage bucket via Supabase Dashboard or SQL
# Ensure bucket is PRIVATE and configure appropriate policies
```

### Step 3: Performance Verification
```sql
-- Verify indexes are created
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
    tablename, 
    policyname, 
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify backup user
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb 
FROM pg_roles 
WHERE rolname = 'backup_user';
```

### Step 4: Security Verification
```sql
-- Check all tables have RLS enabled
SELECT COUNT(*) as tables_without_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
    SELECT tablename FROM pg_policies WHERE schemaname = 'public'
);

-- Verify storage bucket privacy
SELECT name, public FROM storage.buckets WHERE name = 'photos-private-bucket';

-- Check admin user setup
SELECT email, confirmed_at, created_at 
FROM auth.users 
WHERE email LIKE '%admin%' OR email LIKE '%melisa%';
```

## 🚨 Critical Production Checklist

### Before Go-Live
- [ ] All migrations applied successfully
- [ ] RLS enabled on ALL tables
- [ ] Storage bucket is PRIVATE
- [ ] Admin user created and confirmed
- [ ] All indexes created and optimized
- [ ] Backup strategy configured
- [ ] Monitoring and alerting setup
- [ ] Connection limits configured
- [ ] SSL/TLS certificates valid
- [ ] Environment variables secured

### Post-Deployment Monitoring
- [ ] Database connections < 80% of limit
- [ ] Query performance < 200ms average
- [ ] Storage egress tracking active
- [ ] RLS policies preventing unauthorized access
- [ ] Backup jobs running successfully
- [ ] Alert thresholds configured
- [ ] Performance metrics baseline established

## 🛟 Emergency Procedures

### High Connection Count
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Kill long-running queries (if safe)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND now() - state_change > interval '10 minutes'
AND query NOT LIKE '%pg_stat_activity%';
```

### Storage Egress Limit Approaching
```sql
-- Check current month egress
SELECT 
    DATE_TRUNC('month', date) as month,
    SUM(bytes_served) / 1024 / 1024 / 1024 as gb_served,
    COUNT(*) as requests
FROM egress_metrics 
WHERE date >= DATE_TRUNC('month', NOW())
GROUP BY DATE_TRUNC('month', date);

-- Temporarily increase signed URL expiry to reduce requests
UPDATE storage.buckets 
SET file_size_limit = 5242880 -- Reduce to 5MB temporarily
WHERE name = 'photos-private-bucket';
```

### RLS Policy Testing
```sql
-- Test RLS as anonymous user
SET ROLE anon;
SELECT * FROM events; -- Should return no rows or only public events

-- Test RLS as authenticated user  
SET ROLE authenticated;
SELECT * FROM subjects WHERE access_token = 'test-token'; -- Should return only matching records

-- Reset to superuser
RESET ROLE;
```

This production setup guide ensures your Supabase database is optimized, secure, and ready for production workloads.