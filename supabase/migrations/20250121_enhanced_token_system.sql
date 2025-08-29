-- ============================================================
-- Migration: Enhanced Family Token System
-- Purpose: Implement advanced token management with family access and distribution tracking
-- Author: Backend API Developer
-- Date: 2025-01-21
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE enhanced_tokens TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS enhanced_tokens (
  -- Core token data
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'student_access'
    CHECK (type IN ('student_access', 'family_access', 'group_access', 'event_access', 'temporary_access')),
  
  -- Expiry and status
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Relations
  student_ids UUID[] DEFAULT '{}',
  family_email TEXT,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Metadata and configuration
  metadata JSONB DEFAULT '{}',
  access_rules JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CREATE INDEXES for optimal performance
-- ============================================================

-- Primary token lookup (most critical)
CREATE INDEX idx_enhanced_tokens_token_active 
  ON enhanced_tokens(token) 
  WHERE is_active = true AND expires_at > NOW();

-- Token type and expiry queries
CREATE INDEX idx_enhanced_tokens_type_expires 
  ON enhanced_tokens(type, expires_at) 
  WHERE is_active = true;

-- Family email lookups
CREATE INDEX idx_enhanced_tokens_family_email 
  ON enhanced_tokens(family_email, event_id) 
  WHERE is_active = true AND family_email IS NOT NULL;

-- Event-based token queries
CREATE INDEX idx_enhanced_tokens_event_type 
  ON enhanced_tokens(event_id, type) 
  WHERE is_active = true;

-- Student ID array searches (for family tokens)
CREATE INDEX idx_enhanced_tokens_student_ids 
  ON enhanced_tokens USING GIN(student_ids);

-- Expiry monitoring for rotation
CREATE INDEX idx_enhanced_tokens_expiring 
  ON enhanced_tokens(expires_at) 
  WHERE is_active = true;

-- Metadata searches
CREATE INDEX idx_enhanced_tokens_metadata 
  ON enhanced_tokens USING GIN(metadata);

-- ============================================================
-- 3. CREATE token_distribution_log TABLE for tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS token_distribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES enhanced_tokens(id) ON DELETE CASCADE,
  
  -- Distribution details
  distribution_method TEXT NOT NULL 
    CHECK (distribution_method IN ('email', 'whatsapp', 'sms', 'print', 'direct', 'qr_code')),
  recipient_contact TEXT, -- email, phone, etc.
  distributed_by TEXT, -- admin user ID or system
  
  -- Status tracking
  status TEXT DEFAULT 'sent'
    CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'failed', 'bounced')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  status_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for distribution tracking
CREATE INDEX idx_distribution_log_token_status 
  ON token_distribution_log(token_id, status);

CREATE INDEX idx_distribution_log_method_date 
  ON token_distribution_log(distribution_method, distributed_at);

-- ============================================================
-- 4. CREATE token_access_log TABLE for security monitoring
-- ============================================================

CREATE TABLE IF NOT EXISTS token_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES enhanced_tokens(id) ON DELETE CASCADE,
  
  -- Access details
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  -- Geographic data (optional)
  country TEXT,
  city TEXT,
  
  -- Result
  access_granted BOOLEAN DEFAULT true,
  deny_reason TEXT,
  
  -- Performance metrics
  response_time_ms INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for access monitoring
CREATE INDEX idx_token_access_log_token_date 
  ON token_access_log(token_id, accessed_at);

CREATE INDEX idx_token_access_log_ip_date 
  ON token_access_log(ip_address, accessed_at);

CREATE INDEX idx_token_access_log_device_fingerprint 
  ON token_access_log(device_fingerprint) 
  WHERE device_fingerprint IS NOT NULL;

-- ============================================================
-- 5. CREATE token_rotation_history TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS token_rotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Old and new token references
  old_token_id UUID, -- References enhanced_tokens, but don't cascade delete
  new_token_id UUID REFERENCES enhanced_tokens(id) ON DELETE CASCADE,
  
  -- Rotation details
  rotation_reason TEXT NOT NULL 
    CHECK (rotation_reason IN ('expiry_warning', 'security_breach', 'admin_request', 'scheduled_rotation', 'user_request')),
  rotated_by TEXT, -- admin user ID or 'system'
  
  -- Notification tracking
  family_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  
  -- Timestamps
  rotated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rotation history
CREATE INDEX idx_rotation_history_new_token 
  ON token_rotation_history(new_token_id);

CREATE INDEX idx_rotation_history_rotation_date 
  ON token_rotation_history(rotated_at);

-- ============================================================
-- 6. CREATE FUNCTIONS for token management
-- ============================================================

-- Function to increment usage count atomically
CREATE OR REPLACE FUNCTION increment_usage_count(token_value TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE enhanced_tokens 
    SET usage_count = usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE token = token_value
    RETURNING usage_count INTO new_count;
    
    RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate expired tokens
CREATE OR REPLACE FUNCTION deactivate_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deactivated_count INTEGER;
BEGIN
    UPDATE enhanced_tokens 
    SET is_active = false,
        updated_at = NOW()
    WHERE is_active = true 
    AND expires_at <= NOW()
    RETURNING COUNT(*) INTO deactivated_count;
    
    RETURN COALESCE(deactivated_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get family token statistics
CREATE OR REPLACE FUNCTION get_family_token_stats(p_event_id UUID DEFAULT NULL)
RETURNS TABLE(
    token_type TEXT,
    total_count BIGINT,
    active_count BIGINT,
    expired_count BIGINT,
    expiring_soon_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        et.type::TEXT as token_type,
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE et.is_active = true AND et.expires_at > NOW())::BIGINT as active_count,
        COUNT(*) FILTER (WHERE et.expires_at <= NOW())::BIGINT as expired_count,
        COUNT(*) FILTER (WHERE et.is_active = true AND et.expires_at <= NOW() + INTERVAL '7 days')::BIGINT as expiring_soon_count
    FROM enhanced_tokens et
    WHERE (p_event_id IS NULL OR et.event_id = p_event_id)
    GROUP BY et.type
    ORDER BY et.type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. CREATE RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE enhanced_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_distribution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_rotation_history ENABLE ROW LEVEL SECURITY;

-- Admin-only access to enhanced_tokens
CREATE POLICY enhanced_tokens_admin_all 
  ON enhanced_tokens FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

-- Service role access (for API endpoints)
CREATE POLICY enhanced_tokens_service_all 
  ON enhanced_tokens FOR ALL 
  TO service_role 
  USING (true);

-- Token validation access (read-only for token validation)
CREATE POLICY enhanced_tokens_validation_read 
  ON enhanced_tokens FOR SELECT 
  TO anon
  USING (is_active = true AND expires_at > NOW());

-- Similar policies for related tables
CREATE POLICY token_distribution_admin_all 
  ON token_distribution_log FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

CREATE POLICY token_access_admin_all 
  ON token_access_log FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

CREATE POLICY token_rotation_admin_all 
  ON token_rotation_history FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

-- Service role access for all tables
CREATE POLICY token_distribution_service_all 
  ON token_distribution_log FOR ALL 
  TO service_role 
  USING (true);

CREATE POLICY token_access_service_all 
  ON token_access_log FOR ALL 
  TO service_role 
  USING (true);

CREATE POLICY token_rotation_service_all 
  ON token_rotation_history FOR ALL 
  TO service_role 
  USING (true);

-- ============================================================
-- 8. CREATE TRIGGERS for automatic updates
-- ============================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enhanced_tokens_updated_at
    BEFORE UPDATE ON enhanced_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger to log token access
CREATE OR REPLACE FUNCTION log_token_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log when last_used_at is updated (indicating actual access)
    IF OLD.last_used_at IS DISTINCT FROM NEW.last_used_at THEN
        INSERT INTO token_access_log (token_id, accessed_at, access_granted)
        VALUES (NEW.id, NEW.last_used_at, true);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enhanced_tokens_access_log
    AFTER UPDATE ON enhanced_tokens
    FOR EACH ROW
    EXECUTE FUNCTION log_token_access();

-- ============================================================
-- 9. MIGRATE EXISTING DATA (if needed)
-- ============================================================

-- Migrate existing subject_tokens to enhanced_tokens for backward compatibility
INSERT INTO enhanced_tokens (token, type, expires_at, student_ids, event_id, is_active, created_at)
SELECT 
    st.token,
    'student_access'::TEXT,
    st.expires_at,
    ARRAY[st.subject_id]::UUID[],
    s.event_id,
    (st.expires_at > NOW()) as is_active,
    COALESCE(st.created_at, NOW())
FROM subject_tokens st
JOIN subjects s ON s.id = st.subject_id
WHERE NOT EXISTS (
    SELECT 1 FROM enhanced_tokens et 
    WHERE et.token = st.token
)
ON CONFLICT (token) DO NOTHING;

-- ============================================================
-- 10. CREATE SCHEDULED JOBS (comments for manual setup)
-- ============================================================

-- Note: These would need to be set up manually using pg_cron or similar
-- 
-- Daily cleanup of expired tokens:
-- SELECT cron.schedule('deactivate-expired-tokens', '0 2 * * *', 'SELECT deactivate_expired_tokens();');
--
-- Weekly token rotation check:
-- SELECT cron.schedule('check-expiring-tokens', '0 9 * * 1', 'SELECT get_family_token_stats();');

COMMIT;

-- ============================================================
-- Post-migration verification queries
-- ============================================================

-- Verify table creation
SELECT 
    schemaname, 
    tablename, 
    hasindexes, 
    hasrules, 
    hastriggers 
FROM pg_tables 
WHERE tablename IN ('enhanced_tokens', 'token_distribution_log', 'token_access_log', 'token_rotation_history');

-- Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename LIKE '%token%' 
ORDER BY tablename, indexname;

-- Verify functions
SELECT 
    proname, 
    prosrc 
FROM pg_proc 
WHERE proname IN ('increment_usage_count', 'deactivate_expired_tokens', 'get_family_token_stats');

-- Test data migration count
SELECT 
    'subject_tokens' as source_table, 
    COUNT(*) as count 
FROM subject_tokens
UNION ALL
SELECT 
    'enhanced_tokens' as source_table, 
    COUNT(*) as count 
FROM enhanced_tokens
WHERE type = 'student_access';