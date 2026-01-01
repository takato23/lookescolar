-- Migration: Store Configuration System
-- Date: 2025-12-26
-- Description: Implements flexible store configuration system with multi-tenant support
-- Includes store_configurations table for template/design settings and products table for pricing

BEGIN;

-- =============================================================================
-- 1. STORE CONFIGURATIONS TABLE
-- =============================================================================
-- Stores visual/design configuration for stores at tenant or folder level
-- NULL folder_id = global tenant configuration (default for all folders)
-- Non-NULL folder_id = folder-specific configuration (overrides tenant default)

CREATE TABLE IF NOT EXISTS public.store_configurations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant isolation
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Folder reference (NULL = global tenant config, NOT NULL = folder-specific)
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,

  -- Template selection
  template VARCHAR(50) NOT NULL DEFAULT 'pixieset'
    CHECK (template IN ('pixieset', 'modern-minimal', 'studio-dark', 'premium', 'editorial')),

  -- Visual design settings
  cover_style VARCHAR(50) DEFAULT 'minimal'
    CHECK (cover_style IN ('minimal', 'split', 'fullscreen', 'editorial', 'classic')),

  typography_style VARCHAR(50) DEFAULT 'modern'
    CHECK (typography_style IN ('modern', 'classic', 'editorial', 'minimal', 'bold')),

  color_scheme VARCHAR(50) DEFAULT 'neutral'
    CHECK (color_scheme IN ('neutral', 'warm', 'cool', 'vibrant', 'monochrome', 'custom')),

  -- Grid and layout configuration
  grid_settings JSONB DEFAULT '{
    "columns": 3,
    "gap": 16,
    "aspectRatio": "auto",
    "hoverEffect": "zoom",
    "showCaptions": false
  }'::JSONB,

  -- Branding assets
  logo_url TEXT,

  -- Brand colors (hex codes)
  brand_colors JSONB DEFAULT '{
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#0066CC"
  }'::JSONB,

  -- Custom messaging
  welcome_message TEXT,

  -- Advanced customization (use sparingly)
  custom_css TEXT,

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraints using partial indexes
-- Only one global config per tenant (where folder_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_configurations_unique_global
  ON public.store_configurations(tenant_id)
  WHERE folder_id IS NULL;

-- Only one config per tenant+folder combination (where folder_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_configurations_unique_folder
  ON public.store_configurations(tenant_id, folder_id)
  WHERE folder_id IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_configurations_tenant
  ON public.store_configurations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_configurations_tenant_folder
  ON public.store_configurations(tenant_id, folder_id);

CREATE INDEX IF NOT EXISTS idx_store_configurations_template
  ON public.store_configurations(template)
  WHERE folder_id IS NULL; -- Global configs by template

-- Comments for documentation
COMMENT ON TABLE public.store_configurations IS
  'Store visual configuration at tenant (folder_id=NULL) or folder level. Folder configs override tenant defaults. Uniqueness enforced via partial indexes.';

COMMENT ON COLUMN public.store_configurations.folder_id IS
  'NULL = global tenant configuration, NOT NULL = folder-specific override. Uniqueness: one global per tenant, one config per tenant+folder.';

COMMENT ON COLUMN public.store_configurations.grid_settings IS
  'JSON object with columns, gap, aspectRatio, hoverEffect, showCaptions';

COMMENT ON COLUMN public.store_configurations.brand_colors IS
  'JSON object with primary, secondary, accent hex color codes';

COMMENT ON COLUMN public.store_configurations.custom_css IS
  'Advanced: Custom CSS overrides. Use sparingly for performance reasons.';

-- =============================================================================
-- 2. PRODUCTS TABLE
-- =============================================================================
-- Product catalog for tenant (digital downloads, prints, packages, etc.)

CREATE TABLE IF NOT EXISTS public.products (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant isolation
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Product information
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Pricing (all amounts in centavos/cents)
  price INTEGER NOT NULL CHECK (price >= 0),
  original_price INTEGER CHECK (original_price IS NULL OR original_price >= price),

  -- Product type and configuration
  photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0),
  is_package BOOLEAN NOT NULL DEFAULT false,

  -- Product features (flexible array)
  features JSONB DEFAULT '[]'::JSONB,

  -- Display and ordering
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata for extensibility (product type, dimensions, etc.)
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT products_name_length CHECK (length(trim(name)) >= 2),
  CONSTRAINT products_price_positive CHECK (price >= 0),
  CONSTRAINT products_photo_count_valid CHECK (
    (is_package = true AND photo_count > 0) OR
    (is_package = false AND photo_count >= 0)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_tenant
  ON public.products(tenant_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_active
  ON public.products(tenant_id, active)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_tenant_package
  ON public.products(tenant_id, is_package)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_tenant_sort
  ON public.products(tenant_id, sort_order, active);

-- Comments for documentation
COMMENT ON TABLE public.products IS
  'Product catalog for tenant. Supports digital downloads, prints, packages, and custom products.';

COMMENT ON COLUMN public.products.price IS
  'Price in centavos/cents (e.g., 1500 = $15.00 ARS/USD)';

COMMENT ON COLUMN public.products.original_price IS
  'Original price before discount. Show strikethrough if > price. NULL = no discount.';

COMMENT ON COLUMN public.products.photo_count IS
  'Number of photos included. 0 = unlimited or N/A, >0 = specific count for packages.';

COMMENT ON COLUMN public.products.is_package IS
  'true = package/bundle with multiple photos, false = individual product (single photo, print, etc.)';

COMMENT ON COLUMN public.products.features IS
  'JSON array of feature strings, e.g., ["Alta resolución", "Sin marca de agua", "Descarga ilimitada"]';

COMMENT ON COLUMN public.products.metadata IS
  'Extensible JSON for product-specific data: type, dimensions, format, delivery_time, etc.';

-- =============================================================================
-- 3. TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Trigger for store_configurations.updated_at
DROP TRIGGER IF EXISTS store_configurations_set_updated_at ON public.store_configurations;
CREATE TRIGGER store_configurations_set_updated_at
  BEFORE UPDATE ON public.store_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for products.updated_at
DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE public.store_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Service role has full access (API endpoints handle validation)
CREATE POLICY "Service role full access to store_configurations"
  ON public.store_configurations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to products"
  ON public.products
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Optional: Add read-only policy for authenticated users (if needed for client-side rendering)
-- Uncomment if you want to allow direct client reads (not recommended for admin data)
-- CREATE POLICY "Authenticated users can read store_configurations"
--   ON public.store_configurations
--   FOR SELECT
--   USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can read active products"
--   ON public.products
--   FOR SELECT
--   USING (auth.role() = 'authenticated' AND active = true);

COMMENT ON POLICY "Service role full access to store_configurations"
  ON public.store_configurations IS
  'Security: All access through API with service role. API validates tenant context and permissions.';

COMMENT ON POLICY "Service role full access to products"
  ON public.products IS
  'Security: All access through API with service role. API validates tenant context and permissions.';

-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

-- Get store configuration for a folder (with fallback to tenant default)
CREATE OR REPLACE FUNCTION public.get_store_config(
  p_tenant_id UUID,
  p_folder_id UUID DEFAULT NULL
)
RETURNS SETOF public.store_configurations AS $$
BEGIN
  -- First try folder-specific config
  IF p_folder_id IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM public.store_configurations
    WHERE tenant_id = p_tenant_id
      AND folder_id = p_folder_id
    LIMIT 1;

    -- If found, return it
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Fallback to global tenant config
  RETURN QUERY
  SELECT * FROM public.store_configurations
  WHERE tenant_id = p_tenant_id
    AND folder_id IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_store_config(UUID, UUID) IS
  'Get store configuration for folder with fallback to tenant default. Returns folder config if exists, else tenant global config.';

-- Get active products for a tenant (ordered by sort_order)
CREATE OR REPLACE FUNCTION public.get_active_products(
  p_tenant_id UUID,
  p_include_packages BOOLEAN DEFAULT true,
  p_include_singles BOOLEAN DEFAULT true
)
RETURNS SETOF public.products AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.products
  WHERE tenant_id = p_tenant_id
    AND active = true
    AND (
      (is_package = true AND p_include_packages = true) OR
      (is_package = false AND p_include_singles = true)
    )
  ORDER BY sort_order ASC, created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_active_products(UUID, BOOLEAN, BOOLEAN) IS
  'Get active products for tenant, optionally filtered by package/single type. Ordered by sort_order.';

-- =============================================================================
-- 6. DEVELOPMENT TEST DATA
-- =============================================================================
-- Insert test configurations and products for the default tenant
-- These can be used for local development and testing

-- Insert global tenant configuration (default template)
INSERT INTO public.store_configurations (
  tenant_id,
  folder_id,
  template,
  cover_style,
  typography_style,
  color_scheme,
  grid_settings,
  brand_colors,
  welcome_message
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- default tenant
  NULL, -- global config
  'pixieset',
  'minimal',
  'modern',
  'neutral',
  '{
    "columns": 3,
    "gap": 16,
    "aspectRatio": "auto",
    "hoverEffect": "zoom",
    "showCaptions": false
  }'::JSONB,
  '{
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#0066CC"
  }'::JSONB,
  'Bienvenido a tu galería de fotos escolares. Selecciona tus favoritas y elige el paquete que más te guste.'
)
ON CONFLICT (tenant_id) WHERE folder_id IS NULL
DO UPDATE SET
  template = EXCLUDED.template,
  updated_at = NOW();

-- Insert sample products for default tenant
INSERT INTO public.products (
  tenant_id,
  name,
  description,
  price,
  original_price,
  photo_count,
  is_package,
  features,
  sort_order,
  active,
  metadata
) VALUES
  -- Individual photo download
  (
    '00000000-0000-0000-0000-000000000000',
    'Foto Digital Individual',
    'Descarga digital de alta resolución de una foto',
    1500, -- $15.00
    NULL,
    1,
    false,
    '["Alta resolución (4K)", "Sin marca de agua", "3 descargas permitidas", "Válido por 30 días"]'::JSONB,
    10,
    true,
    '{"type": "digital", "format": "jpg", "resolution": "4K", "max_downloads": 3, "validity_days": 30}'::JSONB
  ),

  -- Package: 5 photos
  (
    '00000000-0000-0000-0000-000000000000',
    'Paquete 5 Fotos',
    'Descarga digital de 5 fotos de tu elección',
    6000, -- $60.00
    7500, -- original $75.00 (20% discount)
    5,
    true,
    '["5 fotos digitales", "Alta resolución (4K)", "Sin marca de agua", "Descargas ilimitadas", "Válido por 90 días"]'::JSONB,
    20,
    true,
    '{"type": "digital", "format": "jpg", "resolution": "4K", "max_downloads": -1, "validity_days": 90}'::JSONB
  ),

  -- Package: 10 photos (best value)
  (
    '00000000-0000-0000-0000-000000000000',
    'Paquete 10 Fotos',
    'Descarga digital de 10 fotos de tu elección - ¡Más popular!',
    10000, -- $100.00
    15000, -- original $150.00 (33% discount)
    10,
    true,
    '["10 fotos digitales", "Alta resolución (4K)", "Sin marca de agua", "Descargas ilimitadas", "Válido por 90 días", "¡MEJOR VALOR!"]'::JSONB,
    30,
    true,
    '{"type": "digital", "format": "jpg", "resolution": "4K", "max_downloads": -1, "validity_days": 90, "recommended": true}'::JSONB
  ),

  -- Package: All photos
  (
    '00000000-0000-0000-0000-000000000000',
    'Paquete Completo',
    'Todas las fotos de tu galería',
    20000, -- $200.00
    NULL,
    0, -- unlimited/all
    true,
    '["Todas las fotos", "Alta resolución (4K)", "Sin marca de agua", "Descargas ilimitadas", "Válido por 1 año", "Incluye futuras fotos"]'::JSONB,
    40,
    true,
    '{"type": "digital", "format": "jpg", "resolution": "4K", "max_downloads": -1, "validity_days": 365, "includes_future": true}'::JSONB
  ),

  -- Physical print (example)
  (
    '00000000-0000-0000-0000-000000000000',
    'Impresión 10x15cm',
    'Impresión física de 1 foto en papel fotográfico profesional',
    800, -- $8.00
    NULL,
    1,
    false,
    '["Papel fotográfico premium", "Acabado brillante o mate", "Envío a domicilio", "3-5 días hábiles"]'::JSONB,
    50,
    true,
    '{"type": "physical", "format": "print", "size": "10x15", "paper_quality": "premium", "delivery_days": "3-5"}'::JSONB
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 7. VERIFICATION QUERIES
-- =============================================================================
-- Run these queries to verify the migration worked correctly

-- Verify store_configurations table structure
DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM public.store_configurations;
  RAISE NOTICE 'Store configurations created: %', config_count;
END $$;

-- Verify products table structure
DO $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count FROM public.products WHERE active = true;
  RAISE NOTICE 'Active products created: %', product_count;
END $$;

-- Verify RLS is enabled
DO $$
DECLARE
  config_rls BOOLEAN;
  products_rls BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO config_rls
  FROM pg_class
  WHERE relname = 'store_configurations';

  SELECT relrowsecurity INTO products_rls
  FROM pg_class
  WHERE relname = 'products';

  RAISE NOTICE 'RLS enabled on store_configurations: %', config_rls;
  RAISE NOTICE 'RLS enabled on products: %', products_rls;
END $$;

-- Verify helper functions exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_store_config'
  ) THEN
    RAISE NOTICE 'Helper function get_store_config created successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_active_products'
  ) THEN
    RAISE NOTICE 'Helper function get_active_products created successfully';
  END IF;
END $$;

-- Test queries (uncomment to run manually)
-- SELECT * FROM public.get_store_config('00000000-0000-0000-0000-000000000000', NULL);
-- SELECT * FROM public.get_active_products('00000000-0000-0000-0000-000000000000', true, true);

COMMIT;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Summary:
-- ✅ Created store_configurations table with tenant/folder isolation
-- ✅ Created products table with flexible product catalog
-- ✅ Added indexes for performance optimization
-- ✅ Configured RLS policies for security
-- ✅ Created helper functions for common queries
-- ✅ Inserted development test data
-- ✅ Added verification queries
--
-- Next steps:
-- 1. Run: npm run db:migrate (to apply migration)
-- 2. Run: npm run db:types (to regenerate TypeScript types)
-- 3. Test with: SELECT * FROM public.store_configurations;
-- 4. Test with: SELECT * FROM public.products WHERE active = true;
