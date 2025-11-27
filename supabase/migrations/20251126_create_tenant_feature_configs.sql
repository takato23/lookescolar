-- =============================================================================
-- MIGRATION: Create tenant_feature_configs table
-- Purpose: Store feature flags and configurations per tenant
-- =============================================================================

-- Create the tenant_feature_configs table
CREATE TABLE IF NOT EXISTS public.tenant_feature_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Feature flags for store functionality
  coupons_enabled BOOLEAN DEFAULT true,
  digital_downloads_enabled BOOLEAN DEFAULT false,
  email_notifications_enabled BOOLEAN DEFAULT true,
  invoice_generation_enabled BOOLEAN DEFAULT true,
  receipt_generation_enabled BOOLEAN DEFAULT true,
  store_preview_enabled BOOLEAN DEFAULT true,

  -- Checkout options
  whatsapp_checkout_enabled BOOLEAN DEFAULT false,
  mercadopago_enabled BOOLEAN DEFAULT true,
  cash_payment_enabled BOOLEAN DEFAULT false,

  -- Gallery features
  watermark_enabled BOOLEAN DEFAULT true,
  qr_tagging_enabled BOOLEAN DEFAULT true,
  bulk_download_enabled BOOLEAN DEFAULT false,

  -- Advanced features
  analytics_enabled BOOLEAN DEFAULT false,
  custom_branding_enabled BOOLEAN DEFAULT false,
  multi_currency_enabled BOOLEAN DEFAULT false,

  -- Default values and limits
  default_coupon_expiry_days INTEGER DEFAULT 30,
  max_photos_per_order INTEGER DEFAULT 100,
  max_digital_download_size_mb INTEGER DEFAULT 50,
  download_link_expiry_hours INTEGER DEFAULT 48,

  -- Email settings
  email_from_name TEXT DEFAULT 'LookEscolar',
  email_reply_to TEXT,

  -- Additional JSON config for extensibility
  extra_config JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT tenant_feature_configs_tenant_unique UNIQUE (tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_feature_configs_tenant_id
  ON tenant_feature_configs(tenant_id);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_tenant_feature_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenant_feature_configs_updated ON tenant_feature_configs;
CREATE TRIGGER trigger_tenant_feature_configs_updated
  BEFORE UPDATE ON tenant_feature_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_feature_configs_timestamp();

-- RLS Policies
ALTER TABLE tenant_feature_configs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all_tenant_feature_configs" ON tenant_feature_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their tenant's config
CREATE POLICY "authenticated_read_tenant_feature_configs" ON tenant_feature_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON tenant_feature_configs TO service_role;
GRANT SELECT ON tenant_feature_configs TO authenticated;
GRANT EXECUTE ON FUNCTION update_tenant_feature_configs_timestamp() TO service_role;

-- Insert default config for existing tenants
INSERT INTO tenant_feature_configs (tenant_id)
SELECT DISTINCT tenant_id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE tenant_feature_configs IS 'Feature flags and configuration per tenant for enabling/disabling store features';
