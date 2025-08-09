-- ============================================================
-- Migration 020: Payment Settings Table
-- Creates table to store payment gateway configurations
-- ============================================================

BEGIN;

-- Create payment settings table
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  public_key TEXT,
  access_token TEXT, -- Will be encrypted in production
  webhook_secret TEXT, -- Will be encrypted in production
  additional_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),
  
  -- Ensure only one active configuration per provider
  CONSTRAINT unique_active_provider UNIQUE (provider, is_active) WHERE is_active = true
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_settings_provider ON payment_settings(provider, is_active);

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access
CREATE POLICY "Service role has full access to payment_settings" ON payment_settings
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_payment_settings_updated_at
  BEFORE UPDATE ON payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_settings_updated_at();

-- Insert default sandbox configuration (optional)
-- This will use environment variables if no DB config exists
INSERT INTO payment_settings (
  provider,
  environment,
  public_key,
  access_token,
  webhook_secret,
  additional_config,
  is_active
) VALUES (
  'mercadopago',
  'sandbox',
  NULL, -- Will use env var NEXT_PUBLIC_MP_PUBLIC_KEY
  NULL, -- Will use env var MP_ACCESS_TOKEN
  NULL, -- Will use env var MP_WEBHOOK_SECRET
  '{"auto_return": "approved", "binary_mode": true}',
  true
) ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE payment_settings IS 'Stores payment gateway configurations (credentials should be encrypted in production)';
COMMENT ON COLUMN payment_settings.access_token IS 'Encrypted access token - handle with care';
COMMENT ON COLUMN payment_settings.webhook_secret IS 'Encrypted webhook secret - handle with care';

COMMIT;