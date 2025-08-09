-- Migration: Add egress metrics tracking table
-- Implements CLAUDE.md monitoring requirements for bandwidth usage

-- Create egress metrics table
CREATE TABLE IF NOT EXISTS egress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  operation VARCHAR(50) NOT NULL CHECK (operation IN (
    'photo_view', 'photo_download', 'qr_pdf', 'admin_export', 'preview_generation'
  )),
  bytes_served BIGINT NOT NULL CHECK (bytes_served >= 0),
  client_ip INET,
  user_agent TEXT,
  token_hash VARCHAR(20), -- Hashed token for privacy
  cache_hit BOOLEAN DEFAULT FALSE,
  cost_center VARCHAR(20) DEFAULT 'system' CHECK (cost_center IN ('family', 'admin', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT egress_metrics_bytes_reasonable CHECK (bytes_served < 10737418240) -- 10GB max per request
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_egress_metrics_created_at ON egress_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_event_id ON egress_metrics(event_id);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_operation ON egress_metrics(operation);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_daily ON egress_metrics(date_trunc('day', created_at));
CREATE INDEX IF NOT EXISTS idx_egress_metrics_monthly ON egress_metrics(date_trunc('month', created_at));

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_egress_metrics_event_date ON egress_metrics(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_egress_metrics_operation_date ON egress_metrics(operation, created_at DESC);

-- Enable Row Level Security
ALTER TABLE egress_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access egress metrics
CREATE POLICY "Service role only access" ON egress_metrics
  FOR ALL
  TO service_role
  USING (true);

-- Create function to aggregate daily egress
CREATE OR REPLACE FUNCTION get_daily_egress_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_bytes BIGINT,
  total_requests BIGINT,
  cache_hit_rate NUMERIC,
  top_operations JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      operation,
      SUM(bytes_served) as bytes,
      COUNT(*) as requests,
      SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits
    FROM egress_metrics 
    WHERE DATE(created_at) = target_date
    GROUP BY operation
  ),
  totals AS (
    SELECT 
      SUM(bytes) as total_bytes,
      SUM(requests) as total_requests,
      CASE 
        WHEN SUM(requests) > 0 
        THEN ROUND((SUM(cache_hits)::NUMERIC / SUM(requests)) * 100, 2)
        ELSE 0 
      END as cache_hit_rate
    FROM daily_stats
  )
  SELECT 
    t.total_bytes,
    t.total_requests,
    t.cache_hit_rate,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'operation', ds.operation,
          'bytes', ds.bytes,
          'requests', ds.requests,
          'percentage', CASE 
            WHEN t.total_bytes > 0 
            THEN ROUND((ds.bytes::NUMERIC / t.total_bytes) * 100, 2)
            ELSE 0 
          END
        ) ORDER BY ds.bytes DESC
      ) FILTER (WHERE ds.operation IS NOT NULL),
      '[]'::jsonb
    ) as top_operations
  FROM totals t
  LEFT JOIN daily_stats ds ON true
  GROUP BY t.total_bytes, t.total_requests, t.cache_hit_rate;
END;
$$ LANGUAGE plpgsql;

-- Create function to get event egress summary
CREATE OR REPLACE FUNCTION get_event_egress_summary(target_event_id UUID)
RETURNS TABLE(
  total_bytes BIGINT,
  total_requests BIGINT,
  cache_hit_rate NUMERIC,
  operations JSONB,
  daily_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH event_stats AS (
    SELECT 
      operation,
      DATE(created_at) as date,
      SUM(bytes_served) as bytes,
      COUNT(*) as requests,
      SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits
    FROM egress_metrics 
    WHERE event_id = target_event_id
    GROUP BY operation, DATE(created_at)
  ),
  operation_totals AS (
    SELECT 
      operation,
      SUM(bytes) as total_bytes,
      SUM(requests) as total_requests
    FROM event_stats
    GROUP BY operation
  ),
  daily_totals AS (
    SELECT 
      date,
      SUM(bytes) as daily_bytes,
      SUM(requests) as daily_requests
    FROM event_stats
    GROUP BY date
  ),
  grand_totals AS (
    SELECT 
      SUM(bytes) as total_bytes,
      SUM(requests) as total_requests,
      CASE 
        WHEN SUM(requests) > 0 
        THEN ROUND((SUM(cache_hits)::NUMERIC / SUM(requests)) * 100, 2)
        ELSE 0 
      END as cache_hit_rate
    FROM event_stats
  )
  SELECT 
    gt.total_bytes,
    gt.total_requests,
    gt.cache_hit_rate,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'operation', operation,
          'bytes', total_bytes,
          'requests', total_requests,
          'percentage', CASE 
            WHEN gt.total_bytes > 0 
            THEN ROUND((total_bytes::NUMERIC / gt.total_bytes) * 100, 2)
            ELSE 0 
          END
        ) ORDER BY total_bytes DESC
      ) FROM operation_totals),
      '[]'::jsonb
    ) as operations,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'date', date,
          'bytes', daily_bytes,
          'requests', daily_requests
        ) ORDER BY date
      ) FROM daily_totals),
      '[]'::jsonb
    ) as daily_breakdown
  FROM grand_totals gt;
END;
$$ LANGUAGE plpgsql;

-- Create function for monthly egress summary
CREATE OR REPLACE FUNCTION get_monthly_egress_summary(target_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE)
RETURNS TABLE(
  total_bytes BIGINT,
  total_requests BIGINT,
  cache_hit_rate NUMERIC,
  daily_breakdown JSONB,
  event_breakdown JSONB,
  operation_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT 
      DATE(created_at) as date,
      event_id,
      operation,
      bytes_served,
      cache_hit
    FROM egress_metrics 
    WHERE date_trunc('month', created_at) = date_trunc('month', target_month::timestamptz)
  ),
  daily_stats AS (
    SELECT 
      date,
      SUM(bytes_served) as bytes,
      COUNT(*) as requests
    FROM monthly_data
    GROUP BY date
  ),
  event_stats AS (
    SELECT 
      COALESCE(event_id::TEXT, 'no-event') as event_id,
      SUM(bytes_served) as bytes,
      COUNT(*) as requests
    FROM monthly_data
    GROUP BY event_id
  ),
  operation_stats AS (
    SELECT 
      operation,
      SUM(bytes_served) as bytes,
      COUNT(*) as requests,
      SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits
    FROM monthly_data
    GROUP BY operation
  ),
  totals AS (
    SELECT 
      SUM(bytes_served) as total_bytes,
      COUNT(*) as total_requests,
      CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND((SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 2)
        ELSE 0 
      END as cache_hit_rate
    FROM monthly_data
  )
  SELECT 
    t.total_bytes,
    t.total_requests,
    t.cache_hit_rate,
    COALESCE((SELECT jsonb_agg(
      jsonb_build_object(
        'date', date,
        'bytes', bytes,
        'requests', requests
      ) ORDER BY date
    ) FROM daily_stats), '[]'::jsonb) as daily_breakdown,
    COALESCE((SELECT jsonb_agg(
      jsonb_build_object(
        'event_id', event_id,
        'bytes', bytes,
        'requests', requests
      ) ORDER BY bytes DESC
    ) FROM event_stats), '[]'::jsonb) as event_breakdown,
    COALESCE((SELECT jsonb_agg(
      jsonb_build_object(
        'operation', operation,
        'bytes', bytes,
        'requests', requests,
        'cache_hit_rate', CASE 
          WHEN requests > 0 
          THEN ROUND((cache_hits::NUMERIC / requests) * 100, 2)
          ELSE 0 
        END
      ) ORDER BY bytes DESC
    ) FROM operation_stats), '[]'::jsonb) as operation_breakdown
  FROM totals t;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION get_daily_egress_summary(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_event_egress_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_monthly_egress_summary(DATE) TO service_role;

-- Create view for recent egress metrics (last 7 days)
CREATE OR REPLACE VIEW recent_egress_summary AS
SELECT 
  DATE(created_at) as date,
  operation,
  cost_center,
  SUM(bytes_served) as total_bytes,
  COUNT(*) as total_requests,
  ROUND(AVG(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100, 2) as cache_hit_rate,
  COUNT(DISTINCT event_id) as unique_events
FROM egress_metrics 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), operation, cost_center
ORDER BY date DESC, total_bytes DESC;

-- Grant select on view to service role
GRANT SELECT ON recent_egress_summary TO service_role;

-- Add comment to table
COMMENT ON TABLE egress_metrics IS 'Tracks bandwidth usage and data transfer for monitoring and alerting according to CLAUDE.md requirements';
COMMENT ON COLUMN egress_metrics.bytes_served IS 'Number of bytes transferred to client';
COMMENT ON COLUMN egress_metrics.cache_hit IS 'Whether this request was served from cache';
COMMENT ON COLUMN egress_metrics.cost_center IS 'Which part of the system generated the egress';
COMMENT ON COLUMN egress_metrics.token_hash IS 'Hashed token for privacy-safe tracking';