-- Test and Verification Script for Store Configuration System
-- Date: 2025-12-26
-- Run this after applying the main migration to verify everything works correctly

BEGIN;

-- =============================================================================
-- TEST SCENARIOS
-- =============================================================================

-- Create a test tenant for comprehensive testing
INSERT INTO public.tenants (id, slug, name, primary_domain)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test-school',
  'Test School',
  'test.lookescolar.com'
)
ON CONFLICT (id) DO NOTHING;

-- Create test folders for the test tenant
INSERT INTO public.folders (id, tenant_id, name, parent_id, path)
VALUES
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'Evento Primaria 2025',
    NULL,
    'evento-primaria-2025'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Graduación Secundaria',
    NULL,
    'graduacion-secundaria'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST 1: Global Tenant Configuration
-- =============================================================================

-- Insert global configuration for test tenant
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
  '11111111-1111-1111-1111-111111111111',
  NULL, -- global config
  'modern-minimal',
  'split',
  'modern',
  'warm',
  '{
    "columns": 4,
    "gap": 20,
    "aspectRatio": "square",
    "hoverEffect": "slide",
    "showCaptions": true
  }'::JSONB,
  '{
    "primary": "#FF6B35",
    "secondary": "#F7931E",
    "accent": "#C9184A"
  }'::JSONB,
  'Bienvenido a nuestra galería escolar personalizada'
)
ON CONFLICT (tenant_id) WHERE folder_id IS NULL
DO NOTHING;

-- =============================================================================
-- TEST 2: Folder-Specific Configuration (Override)
-- =============================================================================

-- Insert folder-specific config for "Evento Primaria 2025"
INSERT INTO public.store_configurations (
  tenant_id,
  folder_id,
  template,
  cover_style,
  typography_style,
  color_scheme,
  grid_settings,
  brand_colors,
  welcome_message,
  custom_css
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  'pixieset', -- different from global
  'fullscreen',
  'editorial',
  'vibrant',
  '{
    "columns": 3,
    "gap": 16,
    "aspectRatio": "auto",
    "hoverEffect": "zoom",
    "showCaptions": false
  }'::JSONB,
  '{
    "primary": "#1E88E5",
    "secondary": "#43A047",
    "accent": "#FDD835"
  }'::JSONB,
  'Evento Primaria 2025 - Recuerdos inolvidables',
  '.gallery-grid { border-radius: 12px; }'
)
ON CONFLICT (tenant_id, folder_id) WHERE folder_id IS NOT NULL
DO NOTHING;

-- =============================================================================
-- TEST 3: Products for Test Tenant
-- =============================================================================

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
  -- Test product 1: Digital single
  (
    '11111111-1111-1111-1111-111111111111',
    'Foto Digital Premium',
    'Una foto digital de máxima calidad',
    2000,
    NULL,
    1,
    false,
    '["Resolución 6K", "Sin marca de agua", "Descarga inmediata"]'::JSONB,
    10,
    true,
    '{"type": "digital", "resolution": "6K"}'::JSONB
  ),

  -- Test product 2: Package with discount
  (
    '11111111-1111-1111-1111-111111111111',
    'Paquete Especial 3 Fotos',
    'Tres fotos digitales con descuento',
    5000,
    6000, -- 16% discount
    3,
    true,
    '["3 fotos digitales", "Alta calidad", "Ahorra 1000$"]'::JSONB,
    20,
    true,
    '{"type": "digital", "discount_percent": 16}'::JSONB
  ),

  -- Test product 3: Inactive product (should not appear in queries)
  (
    '11111111-1111-1111-1111-111111111111',
    'Paquete Antiguo',
    'Producto descontinuado',
    10000,
    NULL,
    10,
    true,
    '["Descontinuado"]'::JSONB,
    100,
    false, -- INACTIVE
    '{"deprecated": true}'::JSONB
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION TESTS
-- =============================================================================

-- TEST 1: Verify global config retrieval
DO $$
DECLARE
  config_record RECORD;
BEGIN
  -- Get global config for test tenant
  SELECT * INTO config_record
  FROM public.get_store_config('11111111-1111-1111-1111-111111111111', NULL);

  IF config_record IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: Global config not found for test tenant';
  END IF;

  IF config_record.template != 'modern-minimal' THEN
    RAISE EXCEPTION 'TEST FAILED: Expected template "modern-minimal", got "%"', config_record.template;
  END IF;

  RAISE NOTICE '✅ TEST PASSED: Global config retrieval works correctly';
END $$;

-- TEST 2: Verify folder-specific config override
DO $$
DECLARE
  config_record RECORD;
BEGIN
  -- Get folder-specific config (should override global)
  SELECT * INTO config_record
  FROM public.get_store_config(
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221'
  );

  IF config_record IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: Folder config not found';
  END IF;

  IF config_record.template != 'pixieset' THEN
    RAISE EXCEPTION 'TEST FAILED: Expected folder template "pixieset", got "%"', config_record.template;
  END IF;

  IF config_record.folder_id IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: Expected folder_id to be set, got NULL (fallback to global)';
  END IF;

  RAISE NOTICE '✅ TEST PASSED: Folder-specific config override works correctly';
END $$;

-- TEST 3: Verify fallback to global when folder config doesn't exist
DO $$
DECLARE
  config_record RECORD;
BEGIN
  -- Get config for folder without specific config (should fallback to global)
  SELECT * INTO config_record
  FROM public.get_store_config(
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222' -- Graduación Secundaria (no specific config)
  );

  IF config_record IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: Config not found (should fallback to global)';
  END IF;

  IF config_record.template != 'modern-minimal' THEN
    RAISE EXCEPTION 'TEST FAILED: Expected global template "modern-minimal", got "%"', config_record.template;
  END IF;

  IF config_record.folder_id IS NOT NULL THEN
    RAISE EXCEPTION 'TEST FAILED: Expected folder_id to be NULL (global fallback), got %', config_record.folder_id;
  END IF;

  RAISE NOTICE '✅ TEST PASSED: Fallback to global config works correctly';
END $$;

-- TEST 4: Verify active products retrieval
DO $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count
  FROM public.get_active_products('11111111-1111-1111-1111-111111111111', true, true);

  IF product_count != 2 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 2 active products, got %', product_count;
  END IF;

  RAISE NOTICE '✅ TEST PASSED: Active products retrieval works (% products)', product_count;
END $$;

-- TEST 5: Verify package filtering
DO $$
DECLARE
  package_count INTEGER;
  single_count INTEGER;
BEGIN
  -- Only packages
  SELECT COUNT(*) INTO package_count
  FROM public.get_active_products('11111111-1111-1111-1111-111111111111', true, false);

  -- Only singles
  SELECT COUNT(*) INTO single_count
  FROM public.get_active_products('11111111-1111-1111-1111-111111111111', false, true);

  IF package_count != 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 1 package, got %', package_count;
  END IF;

  IF single_count != 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected 1 single product, got %', single_count;
  END IF;

  RAISE NOTICE '✅ TEST PASSED: Package/single filtering works correctly';
END $$;

-- TEST 6: Verify tenant isolation
DO $$
DECLARE
  wrong_tenant_config RECORD;
  wrong_tenant_products INTEGER;
BEGIN
  -- Try to get config from different tenant
  SELECT * INTO wrong_tenant_config
  FROM public.get_store_config('00000000-0000-0000-0000-000000000000', NULL);

  -- Should get default tenant config, not test tenant
  IF wrong_tenant_config IS NOT NULL AND wrong_tenant_config.template = 'modern-minimal' THEN
    RAISE EXCEPTION 'TEST FAILED: Tenant isolation broken - got test tenant config';
  END IF;

  -- Try to get products from default tenant (should not see test tenant products)
  SELECT COUNT(*) INTO wrong_tenant_products
  FROM public.get_active_products('00000000-0000-0000-0000-000000000000', true, true)
  WHERE name = 'Foto Digital Premium';

  IF wrong_tenant_products > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Tenant isolation broken - saw test tenant products';
  END IF;

  RAISE NOTICE '✅ TEST PASSED: Tenant isolation works correctly';
END $$;

-- TEST 7: Verify UNIQUE constraints
DO $$
DECLARE
  duplicate_error BOOLEAN := false;
BEGIN
  -- Try to insert duplicate global config (should fail)
  BEGIN
    INSERT INTO public.store_configurations (tenant_id, folder_id, template)
    VALUES ('11111111-1111-1111-1111-111111111111', NULL, 'pixieset');
  EXCEPTION
    WHEN unique_violation THEN
      duplicate_error := true;
  END;

  IF NOT duplicate_error THEN
    RAISE EXCEPTION 'TEST FAILED: UNIQUE constraint not working for global config';
  END IF;

  RAISE NOTICE '✅ TEST PASSED: UNIQUE constraints working correctly';
END $$;

-- TEST 8: Verify CHECK constraints
DO $$
DECLARE
  constraint_error BOOLEAN := false;
BEGIN
  -- Try to insert product with negative price (should fail)
  BEGIN
    INSERT INTO public.products (tenant_id, name, price, is_package)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Invalid Product', -100, false);
  EXCEPTION
    WHEN check_violation THEN
      constraint_error := true;
  END;

  IF NOT constraint_error THEN
    RAISE EXCEPTION 'TEST FAILED: CHECK constraint not working for price';
  END IF;

  RAISE NOTICE '✅ TEST PASSED: CHECK constraints working correctly';
END $$;

-- TEST 9: Verify updated_at trigger
DO $$
DECLARE
  before_update TIMESTAMPTZ;
  after_update TIMESTAMPTZ;
BEGIN
  -- Get current updated_at
  SELECT updated_at INTO before_update
  FROM public.store_configurations
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND folder_id IS NULL;

  -- Wait a moment
  PERFORM pg_sleep(0.1);

  -- Update the record
  UPDATE public.store_configurations
  SET welcome_message = 'Updated message'
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND folder_id IS NULL;

  -- Get new updated_at
  SELECT updated_at INTO after_update
  FROM public.store_configurations
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND folder_id IS NULL;

  IF after_update <= before_update THEN
    RAISE EXCEPTION 'TEST FAILED: updated_at trigger not working';
  END IF;

  RAISE NOTICE '✅ TEST PASSED: updated_at trigger working correctly';
END $$;

-- TEST 10: Verify RLS policies are enabled
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

  IF NOT config_rls THEN
    RAISE EXCEPTION 'TEST FAILED: RLS not enabled on store_configurations';
  END IF;

  IF NOT products_rls THEN
    RAISE EXCEPTION 'TEST FAILED: RLS not enabled on products';
  END IF;

  RAISE NOTICE '✅ TEST PASSED: RLS enabled on all tables';
END $$;

-- =============================================================================
-- PERFORMANCE TESTS
-- =============================================================================

-- Test index usage for store_configurations
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.store_configurations
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Test index usage for products
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.products
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  AND active = true
ORDER BY sort_order;

-- =============================================================================
-- SUMMARY REPORT
-- =============================================================================

DO $$
DECLARE
  total_configs INTEGER;
  total_products INTEGER;
  active_products INTEGER;
  global_configs INTEGER;
  folder_configs INTEGER;
BEGIN
  -- Count store configurations
  SELECT COUNT(*) INTO total_configs FROM public.store_configurations;
  SELECT COUNT(*) INTO global_configs FROM public.store_configurations WHERE folder_id IS NULL;
  SELECT COUNT(*) INTO folder_configs FROM public.store_configurations WHERE folder_id IS NOT NULL;

  -- Count products
  SELECT COUNT(*) INTO total_products FROM public.products;
  SELECT COUNT(*) INTO active_products FROM public.products WHERE active = true;

  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'MIGRATION VERIFICATION COMPLETE';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Store Configurations:';
  RAISE NOTICE '  Total: %', total_configs;
  RAISE NOTICE '  Global (tenant defaults): %', global_configs;
  RAISE NOTICE '  Folder-specific: %', folder_configs;
  RAISE NOTICE '';
  RAISE NOTICE 'Products:';
  RAISE NOTICE '  Total: %', total_products;
  RAISE NOTICE '  Active: %', active_products;
  RAISE NOTICE '  Inactive: %', (total_products - active_products);
  RAISE NOTICE '';
  RAISE NOTICE '✅ All tests passed successfully!';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =============================================================================
-- MANUAL VERIFICATION QUERIES
-- =============================================================================
-- Run these manually to inspect the data

-- View all store configurations
-- SELECT
--   sc.id,
--   t.name as tenant_name,
--   COALESCE(f.name, 'GLOBAL DEFAULT') as folder_name,
--   sc.template,
--   sc.color_scheme,
--   sc.created_at
-- FROM public.store_configurations sc
-- JOIN public.tenants t ON sc.tenant_id = t.id
-- LEFT JOIN public.folders f ON sc.folder_id = f.id
-- ORDER BY t.name, f.name NULLS FIRST;

-- View all products with pricing
-- SELECT
--   t.name as tenant_name,
--   p.name as product_name,
--   p.price / 100.0 as price_display,
--   CASE
--     WHEN p.original_price IS NOT NULL
--     THEN ROUND((1 - (p.price::FLOAT / p.original_price::FLOAT)) * 100, 0) || '%'
--     ELSE 'No discount'
--   END as discount,
--   p.is_package,
--   p.photo_count,
--   p.active,
--   p.sort_order
-- FROM public.products p
-- JOIN public.tenants t ON p.tenant_id = t.id
-- ORDER BY t.name, p.sort_order, p.name;

-- Test helper function directly
-- SELECT * FROM public.get_store_config(
--   '11111111-1111-1111-1111-111111111111',
--   '22222222-2222-2222-2222-222222222221'
-- );

-- Test products retrieval
-- SELECT
--   name,
--   price / 100.0 as price,
--   is_package,
--   photo_count,
--   features
-- FROM public.get_active_products(
--   '11111111-1111-1111-1111-111111111111',
--   true, -- include packages
--   true  -- include singles
-- );
