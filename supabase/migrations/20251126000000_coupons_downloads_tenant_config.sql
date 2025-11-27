-- Migration: Add coupons, downloads, email_logs, and tenant configuration columns
-- Date: 2025-11-26
-- Description: Implements digital download system, coupon/discount system, and email tracking

BEGIN;

-- =============================================================================
-- 1. COUPONS SYSTEM
-- =============================================================================

-- Coupon type enum
DO $$ BEGIN
  CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_shipping');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  type coupon_type NOT NULL DEFAULT 'percentage',
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
  min_purchase_cents INTEGER DEFAULT 0 CHECK (min_purchase_cents >= 0),
  max_discount_cents INTEGER DEFAULT NULL, -- NULL = unlimited
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  uses_count INTEGER DEFAULT 0 CHECK (uses_count >= 0),
  max_uses_per_user INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL = never expires
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  applies_to_digital BOOLEAN DEFAULT true,
  applies_to_physical BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_coupon_code_per_tenant UNIQUE (tenant_id, code)
);

-- Coupon usage tracking
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.unified_orders(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  user_identifier VARCHAR(255), -- Can be email, phone, or token
  discount_applied_cents INTEGER NOT NULL CHECK (discount_applied_cents >= 0),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for coupons
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON public.coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(tenant_id, code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(tenant_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON public.coupon_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage(user_identifier);

-- =============================================================================
-- 2. DIGITAL DOWNLOADS SYSTEM
-- =============================================================================

-- Downloads table for tracking digital purchases
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.unified_orders(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  download_count INTEGER DEFAULT 0 CHECK (download_count >= 0),
  max_downloads INTEGER DEFAULT 3 CHECK (max_downloads > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  first_downloaded_at TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ,
  ip_addresses TEXT[] DEFAULT '{}', -- Track IPs for abuse prevention
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for downloads
CREATE INDEX IF NOT EXISTS idx_downloads_tenant ON public.downloads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_downloads_token ON public.downloads(token);
CREATE INDEX IF NOT EXISTS idx_downloads_order ON public.downloads(order_id);
CREATE INDEX IF NOT EXISTS idx_downloads_photo ON public.downloads(photo_id);
CREATE INDEX IF NOT EXISTS idx_downloads_expires ON public.downloads(expires_at) WHERE download_count < max_downloads;

-- =============================================================================
-- 3. EMAIL LOGS SYSTEM
-- =============================================================================

-- Email status enum
DO $$ BEGIN
  CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed', 'bounced', 'delivered', 'opened', 'clicked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Email logs for tracking all sent emails (idempotency)
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.unified_orders(id) ON DELETE SET NULL,
  email_type VARCHAR(50) NOT NULL, -- 'order_confirmation', 'order_ready', 'download_ready', etc.
  to_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  status email_status DEFAULT 'pending',
  provider_message_id VARCHAR(255), -- ID from Resend/SendGrid
  idempotency_key VARCHAR(255) UNIQUE, -- Prevents duplicate sends
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON public.email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_order ON public.email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON public.email_logs(email_type, status);
CREATE INDEX IF NOT EXISTS idx_email_logs_idempotency ON public.email_logs(idempotency_key);

-- =============================================================================
-- 4. TENANT CONFIGURATION COLUMNS
-- =============================================================================

-- Add product configuration to tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS product_config JSONB DEFAULT '{
  "physical_enabled": true,
  "digital_enabled": false,
  "digital_price_base_cents": 0,
  "digital_packages": [],
  "download_limit": 3,
  "download_expiry_hours": 48
}'::JSONB;

-- Add email configuration to tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS email_config JSONB DEFAULT '{
  "provider": "resend",
  "api_key": "",
  "from_email": "",
  "from_name": "",
  "reply_to": "",
  "templates": {
    "order_confirmation": { "enabled": true, "subject_template": "Confirmación de pedido #{{order_number}}" },
    "order_ready": { "enabled": true, "subject_template": "Tu pedido #{{order_number}} está listo" },
    "download_ready": { "enabled": true, "subject_template": "Tus fotos digitales están listas para descargar" }
  }
}'::JSONB;

-- Add branding configuration for emails
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{
  "logo_url": "",
  "primary_color": "#3B82F6",
  "secondary_color": "#1E40AF",
  "footer_text": "",
  "social_links": {}
}'::JSONB;

-- =============================================================================
-- 5. ORDER ENHANCEMENTS
-- =============================================================================

-- Add coupon and download tracking to orders
ALTER TABLE public.unified_orders
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_discount_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_digital_items BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS digital_delivery_status VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS digital_delivery_sent_at TIMESTAMPTZ;

-- Index for orders with digital items
CREATE INDEX IF NOT EXISTS idx_orders_digital ON public.unified_orders(has_digital_items)
WHERE has_digital_items = true;

-- =============================================================================
-- 6. RLS POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.coupons
  FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.coupon_usage
  FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.downloads
  FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.email_logs
  FOR ALL TO service_role USING (true);

-- Tenant scoped access for authenticated users
CREATE POLICY "Tenant scoped access" ON public.coupons
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_admin_user())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin_user());

CREATE POLICY "Tenant scoped access" ON public.coupon_usage
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_admin_user())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin_user());

CREATE POLICY "Tenant scoped access" ON public.downloads
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_admin_user())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin_user());

CREATE POLICY "Tenant scoped access" ON public.email_logs
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_admin_user())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin_user());

-- Public read access for coupon validation (by code)
CREATE POLICY "Public can validate coupons" ON public.coupons
  FOR SELECT TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Public can access their downloads by token
CREATE POLICY "Public can access downloads by token" ON public.downloads
  FOR SELECT TO anon
  USING (expires_at > NOW() AND download_count < max_downloads);

-- =============================================================================
-- 7. HELPER FUNCTIONS
-- =============================================================================

-- Function to validate and apply a coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_tenant_id UUID,
  p_code VARCHAR(50),
  p_subtotal_cents INTEGER,
  p_user_identifier VARCHAR(255) DEFAULT NULL,
  p_has_digital BOOLEAN DEFAULT false,
  p_has_physical BOOLEAN DEFAULT true
)
RETURNS TABLE (
  valid BOOLEAN,
  coupon_id UUID,
  coupon_type coupon_type,
  discount_cents INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_coupon RECORD;
  v_user_usage_count INTEGER;
  v_discount INTEGER;
BEGIN
  -- Find active coupon
  SELECT * INTO v_coupon
  FROM public.coupons c
  WHERE c.tenant_id = p_tenant_id
    AND UPPER(c.code) = UPPER(p_code)
    AND c.is_active = true
    AND (c.valid_from IS NULL OR c.valid_from <= NOW())
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND (c.max_uses IS NULL OR c.uses_count < c.max_uses);

  IF v_coupon IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::coupon_type, 0, 'Cupón no válido o expirado'::TEXT;
    RETURN;
  END IF;

  -- Check product type applicability
  IF p_has_digital AND NOT v_coupon.applies_to_digital THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::coupon_type, 0, 'Este cupón no aplica a productos digitales'::TEXT;
    RETURN;
  END IF;

  IF p_has_physical AND NOT v_coupon.applies_to_physical THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::coupon_type, 0, 'Este cupón no aplica a productos físicos'::TEXT;
    RETURN;
  END IF;

  -- Check minimum purchase
  IF p_subtotal_cents < v_coupon.min_purchase_cents THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::coupon_type, 0,
      format('Compra mínima requerida: $%s', (v_coupon.min_purchase_cents / 100.0)::TEXT)::TEXT;
    RETURN;
  END IF;

  -- Check per-user usage limit
  IF p_user_identifier IS NOT NULL AND v_coupon.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.coupon_usage cu
    WHERE cu.coupon_id = v_coupon.id
      AND cu.user_identifier = p_user_identifier;

    IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::coupon_type, 0, 'Ya has usado este cupón el máximo de veces permitido'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate discount
  CASE v_coupon.type
    WHEN 'percentage' THEN
      v_discount := FLOOR(p_subtotal_cents * (v_coupon.value / 100.0));
    WHEN 'fixed' THEN
      v_discount := FLOOR(v_coupon.value * 100); -- Convert to cents
    WHEN 'free_shipping' THEN
      v_discount := 0; -- Shipping handled separately
  END CASE;

  -- Apply max discount cap if set
  IF v_coupon.max_discount_cents IS NOT NULL AND v_discount > v_coupon.max_discount_cents THEN
    v_discount := v_coupon.max_discount_cents;
  END IF;

  -- Ensure discount doesn't exceed subtotal
  IF v_discount > p_subtotal_cents THEN
    v_discount := p_subtotal_cents;
  END IF;

  RETURN QUERY SELECT true, v_coupon.id, v_coupon.type, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure download token
CREATE OR REPLACE FUNCTION public.generate_download_token()
RETURNS VARCHAR(64) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..64 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create download entries for an order
CREATE OR REPLACE FUNCTION public.create_order_downloads(
  p_order_id UUID,
  p_tenant_id UUID,
  p_expiry_hours INTEGER DEFAULT 48,
  p_max_downloads INTEGER DEFAULT 3
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_photo_id UUID;
  v_token VARCHAR(64);
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_expires_at := NOW() + (p_expiry_hours || ' hours')::INTERVAL;

  -- Create download entry for each photo in the order that is digital
  FOR v_photo_id IN
    SELECT DISTINCT oi.photo_id
    FROM public.order_items oi
    JOIN public.unified_orders o ON o.id = oi.order_id
    WHERE oi.order_id = p_order_id
      AND o.has_digital_items = true
      AND oi.photo_id IS NOT NULL
  LOOP
    -- Generate unique token
    LOOP
      v_token := public.generate_download_token();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.downloads WHERE token = v_token);
    END LOOP;

    -- Insert download record
    INSERT INTO public.downloads (
      tenant_id, order_id, photo_id, token, max_downloads, expires_at
    ) VALUES (
      p_tenant_id, p_order_id, v_photo_id, v_token, p_max_downloads, v_expires_at
    );

    v_count := v_count + 1;
  END LOOP;

  -- Update order digital delivery status
  UPDATE public.unified_orders
  SET digital_delivery_status = 'ready',
      has_digital_items = true
  WHERE id = p_order_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a download
CREATE OR REPLACE FUNCTION public.record_download(
  p_token VARCHAR(64),
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  photo_storage_path TEXT,
  remaining_downloads INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_download RECORD;
  v_photo RECORD;
BEGIN
  -- Find and lock the download record
  SELECT d.*, p.storage_path, p.tenant_id as photo_tenant_id
  INTO v_download
  FROM public.downloads d
  JOIN public.photos p ON p.id = d.photo_id
  WHERE d.token = p_token
  FOR UPDATE;

  IF v_download IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 0, 'Token de descarga inválido'::TEXT;
    RETURN;
  END IF;

  IF v_download.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::TEXT, 0, 'El enlace de descarga ha expirado'::TEXT;
    RETURN;
  END IF;

  IF v_download.download_count >= v_download.max_downloads THEN
    RETURN QUERY SELECT false, NULL::TEXT, 0, 'Has alcanzado el límite de descargas'::TEXT;
    RETURN;
  END IF;

  -- Update download record
  UPDATE public.downloads
  SET download_count = download_count + 1,
      first_downloaded_at = COALESCE(first_downloaded_at, NOW()),
      last_downloaded_at = NOW(),
      ip_addresses = CASE
        WHEN p_ip_address IS NOT NULL AND NOT (p_ip_address = ANY(ip_addresses))
        THEN array_append(ip_addresses, p_ip_address)
        ELSE ip_addresses
      END,
      user_agent = COALESCE(p_user_agent, user_agent)
  WHERE id = v_download.id;

  RETURN QUERY SELECT
    true,
    v_download.storage_path,
    (v_download.max_downloads - v_download.download_count - 1),
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. TRIGGERS
-- =============================================================================

-- Update updated_at on coupons
CREATE TRIGGER coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Increment coupon uses_count when usage is recorded
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.coupons
  SET uses_count = uses_count + 1
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coupon_usage_increment
  AFTER INSERT ON public.coupon_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_coupon_usage();

COMMIT;
