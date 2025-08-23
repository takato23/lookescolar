-- Migration: Create share access log table for security monitoring
-- Date: 2024-01-15
-- Purpose: Track access attempts to share tokens for security and analytics

-- Create share_access_log table
CREATE TABLE share_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_reason TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add indexes for performance
  CONSTRAINT share_access_log_token_check CHECK (char_length(token) = 64)
);

-- Create indexes for efficient querying
CREATE INDEX idx_share_access_log_token ON share_access_log(token);
CREATE INDEX idx_share_access_log_ip_timestamp ON share_access_log(ip_address, timestamp);
CREATE INDEX idx_share_access_log_timestamp ON share_access_log(timestamp);
CREATE INDEX idx_share_access_log_success_timestamp ON share_access_log(success, timestamp) WHERE success = false;

-- Add RLS (Row Level Security)
ALTER TABLE share_access_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access share access logs
CREATE POLICY "Service role can manage share access logs" ON share_access_log
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: No public access to logs
CREATE POLICY "No public access to share access logs" ON share_access_log
  FOR ALL 
  TO public
  USING (false);

-- Create function to clean up old access logs automatically
CREATE OR REPLACE FUNCTION cleanup_old_share_access_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete access logs older than 30 days
  DELETE FROM share_access_log 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up old share access logs older than 30 days';
END;
$$;

-- Create a trigger to automatically clean up logs daily
-- Note: This requires pg_cron extension to be enabled
-- For now, we'll create the function and it can be called manually or via a scheduled job

-- Add comment for documentation
COMMENT ON TABLE share_access_log IS 'Logs access attempts to share tokens for security monitoring and analytics';
COMMENT ON COLUMN share_access_log.token IS 'The share token that was accessed (64-character hex string)';
COMMENT ON COLUMN share_access_log.ip_address IS 'IP address of the client attempting access';
COMMENT ON COLUMN share_access_log.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN share_access_log.success IS 'Whether the access attempt was successful';
COMMENT ON COLUMN share_access_log.error_reason IS 'Reason for failed access attempt';
COMMENT ON COLUMN share_access_log.timestamp IS 'When the access attempt occurred';

-- Update the share_tokens table to add security-related metadata
ALTER TABLE share_tokens 
ADD COLUMN IF NOT EXISTS security_metadata JSONB DEFAULT '{}';

-- Add index for security metadata queries
CREATE INDEX IF NOT EXISTS idx_share_tokens_security_metadata ON share_tokens USING GIN (security_metadata);

-- Add comment
COMMENT ON COLUMN share_tokens.security_metadata IS 'Security-related metadata including revocation info, suspicious activity flags, etc.';

-- Create view for share token analytics (accessible by service role only)
CREATE OR REPLACE VIEW share_token_analytics AS
SELECT 
  st.id,
  st.token,
  st.event_id,
  st.share_type,
  st.created_at,
  st.expires_at,
  st.max_views,
  st.view_count,
  st.allow_download,
  st.allow_comments,
  COALESCE(access_stats.total_accesses, 0) as total_access_attempts,
  COALESCE(access_stats.successful_accesses, 0) as successful_accesses,
  COALESCE(access_stats.failed_accesses, 0) as failed_accesses,
  COALESCE(access_stats.unique_ips, 0) as unique_ip_addresses,
  access_stats.last_access_time,
  access_stats.first_access_time,
  CASE 
    WHEN access_stats.total_accesses > 0 
    THEN ROUND((access_stats.successful_accesses::numeric / access_stats.total_accesses::numeric) * 100, 2)
    ELSE 0 
  END as success_rate_percentage
FROM share_tokens st
LEFT JOIN (
  SELECT 
    token,
    COUNT(*) as total_accesses,
    COUNT(*) FILTER (WHERE success = true) as successful_accesses,
    COUNT(*) FILTER (WHERE success = false) as failed_accesses,
    COUNT(DISTINCT ip_address) as unique_ips,
    MAX(timestamp) as last_access_time,
    MIN(timestamp) as first_access_time
  FROM share_access_log
  GROUP BY token
) access_stats ON st.token = access_stats.token;

-- Add RLS to the analytics view
ALTER VIEW share_token_analytics SET (security_invoker = true);

-- Grant access to the view for service role
GRANT SELECT ON share_token_analytics TO service_role;

-- Create function to get suspicious activity report
CREATE OR REPLACE FUNCTION get_suspicious_share_activity(
  hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
  ip_address INET,
  failed_attempts BIGINT,
  unique_tokens_accessed BIGINT,
  first_attempt TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    sal.ip_address,
    COUNT(*) FILTER (WHERE success = false) as failed_attempts,
    COUNT(DISTINCT sal.token) as unique_tokens_accessed,
    MIN(sal.timestamp) as first_attempt,
    MAX(sal.timestamp) as last_attempt
  FROM share_access_log sal
  WHERE sal.timestamp > NOW() - INTERVAL '1 hour' * hours_back
    AND sal.success = false
  GROUP BY sal.ip_address
  HAVING COUNT(*) FILTER (WHERE success = false) > 10  -- More than 10 failed attempts
  ORDER BY failed_attempts DESC;
$$;

-- Create function to revoke share token with audit trail
CREATE OR REPLACE FUNCTION revoke_share_token(
  token_id UUID,
  revoke_reason TEXT DEFAULT 'Manual revocation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_exists BOOLEAN;
BEGIN
  -- Check if token exists
  SELECT EXISTS(SELECT 1 FROM share_tokens WHERE id = token_id) INTO token_exists;
  
  IF NOT token_exists THEN
    RAISE EXCEPTION 'Share token not found with id: %', token_id;
  END IF;
  
  -- Update the token to expire immediately and add revocation metadata
  UPDATE share_tokens 
  SET 
    expires_at = NOW(),
    security_metadata = security_metadata || jsonb_build_object(
      'revoked', true,
      'revoked_at', NOW()::text,
      'revoked_reason', revoke_reason,
      'revoked_by', 'system'
    )
  WHERE id = token_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_old_share_access_logs() TO service_role;
GRANT EXECUTE ON FUNCTION get_suspicious_share_activity(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION revoke_share_token(UUID, TEXT) TO service_role;