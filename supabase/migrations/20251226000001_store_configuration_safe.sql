-- Migration: Store Configuration System (Safe Version)
-- Date: 2025-12-26
-- Description: Safely migrates existing products table and adds store_configurations

BEGIN;

-- =============================================================================
-- 1. STORE CONFIGURATIONS TABLE (NEW)
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

-- =============================================================================
-- 2. PRODUCTS TABLE MIGRATION (SAFE)
-- =============================================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'active'
  ) THEN
    ALTER TABLE public.products ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE 'Added column: active';
  END IF;

  -- Add sort_order column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column: sort_order';
  END IF;

  -- Add is_package column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'is_package'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_package BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Added column: is_package';
  END IF;

  -- Add photo_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'photo_count'
  ) THEN
    ALTER TABLE public.products ADD COLUMN photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0);
    RAISE NOTICE 'Added column: photo_count';
  END IF;

  -- Add original_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'original_price'
  ) THEN
    ALTER TABLE public.products ADD COLUMN original_price INTEGER;
    RAISE NOTICE 'Added column: original_price';
  END IF;

  -- Add features column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'features'
  ) THEN
    ALTER TABLE public.products ADD COLUMN features JSONB DEFAULT '[]'::JSONB;
    RAISE NOTICE 'Added column: features';
  END IF;

  -- Add metadata column if doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.products ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
    RAISE NOTICE 'Added column: metadata';
  END IF;

  RAISE NOTICE 'Products table migration completed successfully';
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
  -- Add original_price constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_original_price_check'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_original_price_check
    CHECK (original_price IS NULL OR original_price >= price);
  END IF;

  -- Add photo_count valid constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_photo_count_valid'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_photo_count_valid
    CHECK (
      (is_package = true AND photo_count > 0) OR
      (is_package = false AND photo_count >= 0)
    );
  END IF;
END $$;

-- Create indexes for products
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

-- Drop existing policies if they exist
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
    WHERE tenant_id = p_tenant_id
      AND folder_id = p_folder_id
    LIMIT 1;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT * FROM public.store_configurations
  WHERE tenant_id = p_tenant_id
    AND folder_id IS NULL
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
    AND (
      (is_package = true AND p_include_packages = true) OR
      (is_package = false AND p_include_singles = true)
    )
  ORDER BY sort_order ASC, created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- 6. TEST DATA (only if no products exist)
-- =============================================================================

DO $$
DECLARE
  product_count INTEGER;
  config_count INTEGER;
BEGIN
  -- Check if store config already exists
  SELECT COUNT(*) INTO config_count
  FROM public.store_configurations
  WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

  IF config_count = 0 THEN
    INSERT INTO public.store_configurations (
      tenant_id, folder_id, template, cover_style, typography_style,
      color_scheme, grid_settings, brand_colors, welcome_message
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      NULL,
      'pixieset',
      'minimal',
      'modern',
      'neutral',
      '{"columns": 3, "gap": 16, "aspectRatio": "auto", "hoverEffect": "zoom", "showCaptions": false}'::JSONB,
      '{"primary": "#000000", "secondary": "#666666", "accent": "#0066CC"}'::JSONB,
      'Bienvenido a tu galería de fotos escolares.'
    );
    RAISE NOTICE 'Test store configuration created';
  END IF;

  -- Check if products already exist
  SELECT COUNT(*) INTO product_count FROM public.products;

  IF product_count = 0 THEN
    INSERT INTO public.products (
      tenant_id, name, description, price, original_price, photo_count,
      is_package, features, sort_order, active, metadata
    ) VALUES
      ('00000000-0000-0000-0000-000000000000', 'Foto Digital Individual',
       'Descarga digital de alta resolución', 1500, NULL, 1, false,
       '["Alta resolución", "Sin marca de agua"]'::JSONB, 10, true, '{}'::JSONB),
      ('00000000-0000-0000-0000-000000000000', 'Paquete 5 Fotos',
       'Pack de 5 fotos digitales', 6000, 7500, 5, true,
       '["5 fotos", "Alta resolución"]'::JSONB, 20, true, '{}'::JSONB);

    RAISE NOTICE 'Test products created';
  ELSE
    RAISE NOTICE 'Products already exist, skipping test data';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  config_count INTEGER;
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM public.store_configurations;
  SELECT COUNT(*) INTO product_count FROM public.products;

  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '   - Store configurations: %', config_count;
  RAISE NOTICE '   - Products: %', product_count;
END $$;
