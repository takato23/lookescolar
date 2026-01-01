-- Migration: Store Configuration System (Clean Version - Drops existing products table)
-- Date: 2025-12-26
-- Description: Recreates products table with new schema. ⚠️ DELETES EXISTING PRODUCT DATA

BEGIN;

-- =============================================================================
-- WARNING: This migration will DELETE all existing products data
-- =============================================================================
-- Use this only if you don't have important data in the products table
-- Or if you want to start fresh with the new schema

-- =============================================================================
-- 1. DROP EXISTING PRODUCTS TABLE
-- =============================================================================
DROP TABLE IF EXISTS public.products CASCADE;

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

-- Unique constraints
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

-- =============================================================================
-- 3. PRODUCTS TABLE (NEW)
-- =============================================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  price INTEGER NOT NULL CHECK (price >= 0),
  original_price INTEGER CHECK (original_price IS NULL OR original_price >= price),

  photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0),
  is_package BOOLEAN NOT NULL DEFAULT false,

  features JSONB DEFAULT '[]'::JSONB,

  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,

  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_name_length CHECK (length(trim(name)) >= 2),
  CONSTRAINT products_price_positive CHECK (price >= 0),
  CONSTRAINT products_photo_count_valid CHECK (
    (is_package = true AND photo_count > 0) OR
    (is_package = false AND photo_count >= 0)
  )
);

-- Indexes
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

-- =============================================================================
-- 4. TRIGGERS
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
-- 5. ROW LEVEL SECURITY
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
-- 6. HELPER FUNCTIONS
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
    AND ((is_package = true AND p_include_packages = true) OR
         (is_package = false AND p_include_singles = true))
  ORDER BY sort_order ASC, created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- 7. TEST DATA
-- =============================================================================

INSERT INTO public.store_configurations (
  tenant_id, folder_id, template, welcome_message
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  NULL,
  'pixieset',
  'Bienvenido a tu galería de fotos escolares'
) ON CONFLICT DO NOTHING;

INSERT INTO public.products (
  tenant_id, name, description, price, original_price, photo_count,
  is_package, features, sort_order, active
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Foto Digital Individual',
   'Descarga digital de alta resolución', 1500, NULL, 1, false,
   '["Alta resolución", "Sin marca de agua", "3 descargas"]'::JSONB, 10, true),
  ('00000000-0000-0000-0000-000000000000', 'Paquete 5 Fotos',
   'Pack de 5 fotos digitales', 6000, 7500, 5, true,
   '["5 fotos", "Alta resolución", "Descargas ilimitadas"]'::JSONB, 20, true),
  ('00000000-0000-0000-0000-000000000000', 'Paquete 10 Fotos',
   'Pack de 10 fotos - ¡Mejor valor!', 10000, 15000, 10, true,
   '["10 fotos", "Alta resolución", "¡MEJOR VALOR!"]'::JSONB, 30, true),
  ('00000000-0000-0000-0000-000000000000', 'Paquete Completo',
   'Todas las fotos de tu galería', 20000, NULL, 0, true,
   '["Todas las fotos", "Válido por 1 año"]'::JSONB, 40, true);

COMMIT;

-- Verification
DO $$
DECLARE
  config_count INTEGER;
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM public.store_configurations;
  SELECT COUNT(*) INTO product_count FROM public.products;
  RAISE NOTICE '✅ Clean migration completed';
  RAISE NOTICE '   - Configurations: %', config_count;
  RAISE NOTICE '   - Products: %', product_count;
END $$;
