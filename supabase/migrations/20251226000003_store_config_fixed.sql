-- Migration: Store Configuration System (Fixed Version)
-- Date: 2025-12-26
-- Description: Safely handles existing products table with proper column order

BEGIN;

-- =============================================================================
-- 1. INSPECT AND MIGRATE PRODUCTS TABLE
-- =============================================================================

-- First, let's see if products table exists and create a backup
DO $$
DECLARE
  table_exists BOOLEAN;
  product_count INTEGER := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT COUNT(*) INTO product_count FROM public.products;
    RAISE NOTICE 'Found existing products table with % rows', product_count;

    -- Create backup table
    DROP TABLE IF EXISTS acapublic.products_backup_20251226;
    CREATE TABLE public.products_backup_20251226 AS SELECT * FROM public.products;
    RAISE NOTICE 'Created backup: products_backup_20251226';
  ELSE
    RAISE NOTICE 'No existing products table found';
  END IF;
END $$;

-- Drop and recreate products table with correct structure
DROP TABLE IF EXISTS public.products CASCADE;

CREATE TABLE public.products (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant isolation
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Product information
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Pricing (all amounts in centavos/cents)
  price INTEGER NOT NULL DEFAULT 0,
  original_price INTEGER,

  -- Product type and configuration
  photo_count INTEGER DEFAULT 0,
  is_package BOOLEAN NOT NULL DEFAULT false,

  -- Product features (flexible array)
  features JSONB DEFAULT '[]'::JSONB,

  -- Display and ordering
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add constraints after table is created
ALTER TABLE public.products
  ADD CONSTRAINT products_name_length CHECK (length(trim(name)) >= 2);

ALTER TABLE public.products
  ADD CONSTRAINT products_price_positive CHECK (price >= 0);

ALTER TABLE public.products
  ADD CONSTRAINT products_original_price_check
  CHECK (original_price IS NULL OR original_price >= price);

-- Note: photo_count = 0 can mean "unlimited" or "all photos" for packages
ALTER TABLE public.products
  ADD CONSTRAINT products_photo_count_positive CHECK (photo_count >= 0);

-- Create indexes for products
CREATE INDEX idx_products_tenant
  ON public.products(tenant_id);

CREATE INDEX idx_products_tenant_active
  ON public.products(tenant_id, active)
  WHERE active = true;

CREATE INDEX idx_products_tenant_package
  ON public.products(tenant_id, is_package)
  WHERE active = true;

CREATE INDEX idx_products_tenant_sort
  ON public.products(tenant_id, sort_order, active);

-- Comments for documentation
COMMENT ON TABLE public.products IS
  'Product catalog for tenant. Supports digital downloads, prints, packages, and custom products.';

COMMENT ON COLUMN public.products.price IS
  'Price in centavos/cents (e.g., 1500 = $15.00 ARS/USD)';

COMMENT ON COLUMN public.products.original_price IS
  'Original price before discount. Show strikethrough if > price. NULL = no discount.';

COMMENT ON COLUMN public.products.photo_count IS
  'Number of photos included. 0 = unlimited/all photos (common for "complete package"), >0 = specific count.';

COMMENT ON COLUMN public.products.is_package IS
  'true = package/bundle with multiple photos, false = individual product (single photo, print, etc.)';

COMMENT ON COLUMN public.products.features IS
  'JSON array of feature strings, e.g., ["Alta resolución", "Sin marca de agua"]';

COMMENT ON COLUMN public.products.metadata IS
  'Extensible JSON for product-specific data: type, dimensions, format, delivery_time, etc.';

-- =============================================================================
-- 2. STORE CONFIGURATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,

  template VARCHAR(50) NOT NULL DEFAULT 'pixieset'
    CHECK (template IN ('pixieset', 'modern-minimal', 'studio-dark', 'premium', 'editorial')),

  cover_style VARCHAR(50) DEFAULT 'minimal'
    CHECK (cover_style IN ('minimal', 'split', 'fullscreen', 'editorial', 'classic')),

  typography_style VARCHAR(50) DEFAULT 'modern'
    CHECK (typography_style IN ('modern', 'classic', 'editorial', 'minimal', 'bold')),

  color_scheme VARCHAR(50) DEFAULT 'neutral'
    CHECK (color_scheme IN ('neutral', 'warm', 'cool', 'vibrant', 'monochrome', 'custom')),

  grid_settings JSONB DEFAULT '{
    "columns": 3,
    "gap": 16,
    "aspectRatio": "auto",
    "hoverEffect": "zoom",
    "showCaptions": false
  }'::JSONB,

  logo_url TEXT,

  brand_colors JSONB DEFAULT '{
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#0066CC"
  }'::JSONB,

  welcome_message TEXT,
  custom_css TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraints using partial indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_configurations_unique_global
  ON public.store_configurations(tenant_id)
  WHERE folder_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_configurations_unique_folder
  ON public.store_configurations(tenant_id, folder_id)
  WHERE folder_id IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_store_configurations_tenant
  ON public.store_configurations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_configurations_tenant_folder
  ON public.store_configurations(tenant_id, folder_id);

CREATE INDEX IF NOT EXISTS idx_store_configurations_template
  ON public.store_configurations(template)
  WHERE folder_id IS NULL;

-- Comments
COMMENT ON TABLE public.store_configurations IS
  'Store visual configuration at tenant (folder_id=NULL) or folder level. Uniqueness enforced via partial indexes.';

COMMENT ON COLUMN public.store_configurations.folder_id IS
  'NULL = global tenant configuration, NOT NULL = folder-specific override. Uniqueness: one global per tenant, one config per tenant+folder.';

-- =============================================================================
-- 3. TRIGGERS FOR UPDATED_AT
-- =============================================================================

DROP TRIGGER IF EXISTS store_configurations_set_updated_at ON public.store_configurations;
CREATE TRIGGER store_configurations_set_updated_at
  BEFORE UPDATE ON public.store_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.store_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to store_configurations" ON public.store_configurations;
DROP POLICY IF EXISTS "Service role full access to products" ON public.products;

CREATE POLICY "Service role full access to store_configurations"
  ON public.store_configurations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to products"
  ON public.products
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_store_config(
  p_tenant_id UUID,
  p_folder_id UUID DEFAULT NULL
)
RETURNS SETOF public.store_configurations AS $$
BEGIN
  IF p_folder_id IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM public.store_configurations
    WHERE tenant_id = p_tenant_id AND folder_id = p_folder_id
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT * FROM public.store_configurations
  WHERE tenant_id = p_tenant_id AND folder_id IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_store_config(UUID, UUID) IS
  'Get store configuration for folder with fallback to tenant default.';

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
  'Get active products for tenant, ordered by sort_order.';

-- =============================================================================
-- 6. TEST DATA (OPTIONAL - only if tenant exists)
-- =============================================================================

DO $$
DECLARE
  first_tenant_id UUID;
  tenant_count INTEGER;
BEGIN
  -- Check if any tenants exist
  SELECT COUNT(*) INTO tenant_count FROM public.tenants;

  IF tenant_count = 0 THEN
    RAISE NOTICE 'No tenants found - skipping test data insertion';
    RAISE NOTICE 'Create a tenant first, then run:';
    RAISE NOTICE '  INSERT INTO store_configurations (tenant_id, template, welcome_message)';
    RAISE NOTICE '  VALUES (your_tenant_id, ''pixieset'', ''Welcome message'');';
    RETURN;
  END IF;

  -- Get the first tenant ID
  SELECT id INTO first_tenant_id FROM public.tenants LIMIT 1;
  RAISE NOTICE 'Using tenant ID: %', first_tenant_id;

  -- Insert global tenant configuration
  INSERT INTO public.store_configurations (
    tenant_id, folder_id, template, cover_style, typography_style,
    color_scheme, welcome_message
  ) VALUES (
    first_tenant_id,
    NULL,
    'pixieset',
    'minimal',
    'modern',
    'neutral',
    'Bienvenido a tu galería de fotos escolares. Selecciona tus favoritas.'
  ) ON CONFLICT DO NOTHING;

  -- Insert sample products
  INSERT INTO public.products (
    tenant_id, name, description, price, original_price, photo_count,
    is_package, features, sort_order, active, metadata
  ) VALUES
    -- Individual photo
    (
      first_tenant_id,
      'Foto Digital Individual',
      'Descarga digital de alta resolución de una foto',
      1500,
      NULL,
      1,
      false,
      '["Alta resolución (4K)", "Sin marca de agua", "3 descargas", "Válido 30 días"]'::JSONB,
      10,
      true,
      '{"type": "digital", "format": "jpg", "resolution": "4K"}'::JSONB
    ),
    -- Package: 5 photos
    (
      first_tenant_id,
      'Paquete 5 Fotos',
      'Descarga digital de 5 fotos de tu elección',
      6000,
      7500,
      5,
      true,
      '["5 fotos digitales", "Alta resolución", "Descargas ilimitadas", "Válido 90 días"]'::JSONB,
      20,
      true,
      '{"type": "digital", "format": "jpg"}'::JSONB
    ),
    -- Package: 10 photos
    (
      first_tenant_id,
      'Paquete 10 Fotos',
      'Pack de 10 fotos - ¡Más popular!',
      10000,
      15000,
      10,
      true,
      '["10 fotos", "Alta resolución", "¡MEJOR VALOR!", "Válido 90 días"]'::JSONB,
      30,
      true,
      '{"type": "digital", "recommended": true}'::JSONB
    ),
    -- Package: All photos
    (
      first_tenant_id,
      'Paquete Completo',
      'Todas las fotos de tu galería',
      20000,
      NULL,
      0,
      true,
      '["Todas las fotos", "Descargas ilimitadas", "Válido 1 año"]'::JSONB,
      40,
      true,
      '{"type": "digital", "validity_days": 365}'::JSONB
    )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test data inserted successfully for tenant: %', first_tenant_id;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  config_count INTEGER;
  product_count INTEGER;
  backup_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO config_count FROM public.store_configurations;
  SELECT COUNT(*) INTO product_count FROM public.products;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products_backup_20251226'
  ) INTO backup_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Store configurations: %', config_count;
  RAISE NOTICE 'Active products: %', product_count;

  IF backup_exists THEN
    RAISE NOTICE 'Backup created: products_backup_20251226';
    RAISE NOTICE 'To restore: DROP TABLE products; ALTER TABLE products_backup_20251226 RENAME TO products;';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: npm run db:types';
  RAISE NOTICE '2. Verify: SELECT * FROM products;';
  RAISE NOTICE '3. Test: SELECT * FROM get_active_products(''00000000-0000-0000-0000-000000000000'');';
  RAISE NOTICE '========================================';
END $$;
