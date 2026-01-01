-- Common Queries for Store Configuration System
-- Quick reference for frequently used operations
-- Date: 2025-12-26

-- =============================================================================
-- CONFIGURATION QUERIES
-- =============================================================================

-- 1. Get global tenant configuration
SELECT * FROM public.get_store_config(
  'your-tenant-id',
  NULL
);

-- 2. Get folder configuration (with automatic fallback to global)
SELECT * FROM public.get_store_config(
  'your-tenant-id',
  'your-folder-id'
);

-- 3. Check if folder has specific configuration (no fallback)
SELECT *
FROM public.store_configurations
WHERE tenant_id = 'your-tenant-id'
  AND folder_id = 'your-folder-id';

-- 4. List all configurations for a tenant
SELECT
  COALESCE(f.name, 'GLOBAL DEFAULT') as scope,
  sc.template,
  sc.color_scheme,
  sc.created_at,
  sc.updated_at
FROM public.store_configurations sc
LEFT JOIN public.folders f ON sc.folder_id = f.id
WHERE sc.tenant_id = 'your-tenant-id'
ORDER BY f.name NULLS FIRST;

-- 5. Get configuration with brand colors expanded
SELECT
  sc.id,
  sc.template,
  sc.color_scheme,
  sc.brand_colors->>'primary' as primary_color,
  sc.brand_colors->>'secondary' as secondary_color,
  sc.brand_colors->>'accent' as accent_color,
  sc.welcome_message
FROM public.store_configurations sc
WHERE sc.tenant_id = 'your-tenant-id'
  AND sc.folder_id IS NULL;

-- 6. Get grid settings as individual columns
SELECT
  sc.id,
  sc.template,
  (sc.grid_settings->>'columns')::INTEGER as grid_columns,
  (sc.grid_settings->>'gap')::INTEGER as grid_gap,
  sc.grid_settings->>'aspectRatio' as aspect_ratio,
  sc.grid_settings->>'hoverEffect' as hover_effect,
  (sc.grid_settings->>'showCaptions')::BOOLEAN as show_captions
FROM public.store_configurations sc
WHERE sc.tenant_id = 'your-tenant-id';

-- =============================================================================
-- PRODUCT QUERIES
-- =============================================================================

-- 7. Get all active products for tenant
SELECT * FROM public.get_active_products(
  'your-tenant-id',
  true,  -- include packages
  true   -- include singles
);

-- 8. Get only package products
SELECT * FROM public.get_active_products(
  'your-tenant-id',
  true,  -- include packages
  false  -- exclude singles
);

-- 9. Get only individual (non-package) products
SELECT * FROM public.get_active_products(
  'your-tenant-id',
  false, -- exclude packages
  true   -- include singles
);

-- 10. Get products with formatted pricing and discount
SELECT
  p.id,
  p.name,
  p.price / 100.0 as price_display,
  p.original_price / 100.0 as original_price_display,
  CASE
    WHEN p.original_price IS NOT NULL AND p.original_price > p.price
    THEN ROUND((1 - (p.price::FLOAT / p.original_price::FLOAT)) * 100, 0)
    ELSE 0
  END as discount_percent,
  p.photo_count,
  p.is_package,
  p.features,
  p.sort_order
FROM public.products p
WHERE p.tenant_id = 'your-tenant-id'
  AND p.active = true
ORDER BY p.sort_order ASC;

-- 11. Get featured/recommended products
SELECT
  p.name,
  p.price / 100.0 as price,
  p.features,
  p.metadata->>'recommended' as is_recommended
FROM public.products p
WHERE p.tenant_id = 'your-tenant-id'
  AND p.active = true
  AND (p.metadata->>'recommended')::BOOLEAN = true
ORDER BY p.sort_order;

-- 12. Get products by type (from metadata)
SELECT
  p.name,
  p.price / 100.0 as price,
  p.metadata->>'type' as product_type,
  p.metadata->>'resolution' as resolution
FROM public.products p
WHERE p.tenant_id = 'your-tenant-id'
  AND p.active = true
  AND p.metadata->>'type' = 'digital'
ORDER BY p.price ASC;

-- 13. Get product price range for tenant
SELECT
  MIN(price / 100.0) as min_price,
  MAX(price / 100.0) as max_price,
  AVG(price / 100.0) as avg_price,
  COUNT(*) as product_count
FROM public.products
WHERE tenant_id = 'your-tenant-id'
  AND active = true;

-- 14. Get best value packages (highest discount)
SELECT
  p.name,
  p.price / 100.0 as current_price,
  p.original_price / 100.0 as was_price,
  ROUND((1 - (p.price::FLOAT / p.original_price::FLOAT)) * 100, 0) as discount_percent,
  (p.original_price - p.price) / 100.0 as savings
FROM public.products p
WHERE p.tenant_id = 'your-tenant-id'
  AND p.active = true
  AND p.is_package = true
  AND p.original_price IS NOT NULL
ORDER BY (p.original_price - p.price) DESC
LIMIT 3;

-- =============================================================================
-- INSERT OPERATIONS
-- =============================================================================

-- 15. Create global tenant configuration
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
  'your-tenant-id',
  NULL, -- global config
  'pixieset',
  'minimal',
  'modern',
  'neutral',
  '{"columns": 3, "gap": 16, "aspectRatio": "auto", "hoverEffect": "zoom", "showCaptions": false}'::JSONB,
  '{"primary": "#000000", "secondary": "#666666", "accent": "#0066CC"}'::JSONB,
  'Welcome to our school photo gallery!'
)
ON CONFLICT (tenant_id) WHERE folder_id IS NULL
DO UPDATE SET
  template = EXCLUDED.template,
  color_scheme = EXCLUDED.color_scheme,
  updated_at = NOW();

-- 16. Create folder-specific configuration
INSERT INTO public.store_configurations (
  tenant_id,
  folder_id,
  template,
  cover_style,
  brand_colors,
  welcome_message
) VALUES (
  'your-tenant-id',
  'your-folder-id',
  'modern-minimal',
  'fullscreen',
  '{"primary": "#FF6B35", "secondary": "#F7931E", "accent": "#C9184A"}'::JSONB,
  'Special event photos - Class of 2025'
)
ON CONFLICT (tenant_id, folder_id) WHERE folder_id IS NOT NULL
DO UPDATE SET
  template = EXCLUDED.template,
  cover_style = EXCLUDED.cover_style,
  brand_colors = EXCLUDED.brand_colors,
  welcome_message = EXCLUDED.welcome_message,
  updated_at = NOW();

-- 17. Create individual product
INSERT INTO public.products (
  tenant_id,
  name,
  description,
  price,
  photo_count,
  is_package,
  features,
  sort_order,
  metadata
) VALUES (
  'your-tenant-id',
  'Digital Photo Download',
  'High resolution digital photo',
  1500, -- $15.00
  1,
  false,
  '["4K Resolution", "No Watermark", "3 Downloads", "Valid 30 Days"]'::JSONB,
  10,
  '{"type": "digital", "format": "jpg", "resolution": "4K", "max_downloads": 3, "validity_days": 30}'::JSONB
);

-- 18. Create package product with discount
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
  metadata
) VALUES (
  'your-tenant-id',
  '10 Photo Package',
  'Best value - 10 digital photos',
  10000,  -- $100.00
  15000,  -- was $150.00
  10,
  true,
  '["10 Digital Photos", "4K Resolution", "Unlimited Downloads", "90 Day Access"]'::JSONB,
  20,
  '{"type": "digital", "format": "jpg", "resolution": "4K", "max_downloads": -1, "validity_days": 90, "recommended": true}'::JSONB
);

-- =============================================================================
-- UPDATE OPERATIONS
-- =============================================================================

-- 19. Update global tenant configuration
UPDATE public.store_configurations
SET
  template = 'modern-minimal',
  color_scheme = 'warm',
  brand_colors = '{"primary": "#FF6B35", "secondary": "#F7931E", "accent": "#C9184A"}'::JSONB,
  welcome_message = 'Updated welcome message'
WHERE tenant_id = 'your-tenant-id'
  AND folder_id IS NULL;

-- 20. Update folder-specific configuration
UPDATE public.store_configurations
SET
  cover_style = 'split',
  grid_settings = '{"columns": 4, "gap": 20, "aspectRatio": "square", "hoverEffect": "slide", "showCaptions": true}'::JSONB
WHERE tenant_id = 'your-tenant-id'
  AND folder_id = 'your-folder-id';

-- 21. Update product pricing
UPDATE public.products
SET
  price = 1200,          -- new price
  original_price = 1500, -- show discount
  sort_order = 15
WHERE id = 'product-id';

-- 22. Activate/deactivate product
UPDATE public.products
SET active = false -- or true to activate
WHERE id = 'product-id';

-- 23. Reorder products
UPDATE public.products
SET sort_order = CASE id
  WHEN 'product-1-id' THEN 10
  WHEN 'product-2-id' THEN 20
  WHEN 'product-3-id' THEN 30
END
WHERE id IN ('product-1-id', 'product-2-id', 'product-3-id');

-- 24. Bulk update product features
UPDATE public.products
SET features = features || '["New Feature"]'::JSONB
WHERE tenant_id = 'your-tenant-id'
  AND is_package = true;

-- =============================================================================
-- DELETE OPERATIONS
-- =============================================================================

-- 25. Delete folder-specific configuration (fallback to global)
DELETE FROM public.store_configurations
WHERE tenant_id = 'your-tenant-id'
  AND folder_id = 'your-folder-id';

-- 26. Soft delete product (deactivate instead of delete)
UPDATE public.products
SET active = false
WHERE id = 'product-id';

-- 27. Hard delete product (permanent)
DELETE FROM public.products
WHERE id = 'product-id';

-- =============================================================================
-- ANALYTICS & REPORTING
-- =============================================================================

-- 28. Configuration usage report
SELECT
  t.name as tenant_name,
  COUNT(DISTINCT sc.id) as config_count,
  COUNT(DISTINCT sc.id) FILTER (WHERE sc.folder_id IS NULL) as global_configs,
  COUNT(DISTINCT sc.id) FILTER (WHERE sc.folder_id IS NOT NULL) as folder_configs,
  sc.template,
  COUNT(*) as usage_count
FROM public.tenants t
LEFT JOIN public.store_configurations sc ON t.id = sc.tenant_id
GROUP BY t.id, t.name, sc.template
ORDER BY usage_count DESC;

-- 29. Product catalog summary by tenant
SELECT
  t.name as tenant_name,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE p.active = true) as active_products,
  COUNT(*) FILTER (WHERE p.is_package = true) as packages,
  COUNT(*) FILTER (WHERE p.is_package = false) as singles,
  MIN(p.price / 100.0) as min_price,
  MAX(p.price / 100.0) as max_price,
  AVG(p.price / 100.0) as avg_price
FROM public.tenants t
LEFT JOIN public.products p ON t.id = p.tenant_id
GROUP BY t.id, t.name
ORDER BY active_products DESC;

-- 30. Template popularity report
SELECT
  sc.template,
  COUNT(*) as usage_count,
  COUNT(DISTINCT sc.tenant_id) as tenant_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as usage_percent
FROM public.store_configurations sc
GROUP BY sc.template
ORDER BY usage_count DESC;

-- =============================================================================
-- MAINTENANCE & CLEANUP
-- =============================================================================

-- 31. Find orphaned folder configurations (folder deleted but config remains)
SELECT
  sc.id,
  sc.tenant_id,
  sc.folder_id,
  sc.template
FROM public.store_configurations sc
WHERE sc.folder_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.folders f
    WHERE f.id = sc.folder_id
  );

-- 32. Find inactive products older than 90 days
SELECT
  p.id,
  p.name,
  p.updated_at,
  AGE(NOW(), p.updated_at) as days_inactive
FROM public.products p
WHERE p.active = false
  AND p.updated_at < NOW() - INTERVAL '90 days'
ORDER BY p.updated_at ASC;

-- 33. Reset sort order for products
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY sort_order, created_at) * 10 as new_sort_order
  FROM public.products
  WHERE tenant_id = 'your-tenant-id'
)
UPDATE public.products p
SET sort_order = n.new_sort_order
FROM numbered n
WHERE p.id = n.id;

-- 34. Audit configuration changes (requires audit table - future enhancement)
-- SELECT
--   audit.timestamp,
--   audit.user_id,
--   audit.operation,
--   audit.old_values->>'template' as old_template,
--   audit.new_values->>'template' as new_template
-- FROM audit_log audit
-- WHERE audit.table_name = 'store_configurations'
--   AND audit.record_id = 'config-id'
-- ORDER BY audit.timestamp DESC;

-- =============================================================================
-- DEVELOPMENT & TESTING
-- =============================================================================

-- 35. Create complete test setup for a tenant
BEGIN;

-- Insert tenant
INSERT INTO public.tenants (id, slug, name)
VALUES ('test-tenant-id', 'test-school', 'Test School')
ON CONFLICT (id) DO NOTHING;

-- Insert global config
INSERT INTO public.store_configurations (
  tenant_id, folder_id, template, color_scheme
) VALUES (
  'test-tenant-id', NULL, 'pixieset', 'neutral'
) ON CONFLICT (tenant_id) WHERE folder_id IS NULL DO NOTHING;

-- Insert test products
INSERT INTO public.products (tenant_id, name, price, is_package, sort_order)
VALUES
  ('test-tenant-id', 'Test Product 1', 1000, false, 10),
  ('test-tenant-id', 'Test Package', 5000, true, 20);

COMMIT;

-- 36. Clean up test data
BEGIN;

DELETE FROM public.products WHERE tenant_id = 'test-tenant-id';
DELETE FROM public.store_configurations WHERE tenant_id = 'test-tenant-id';
DELETE FROM public.tenants WHERE id = 'test-tenant-id';

COMMIT;

-- =============================================================================
-- PERFORMANCE MONITORING
-- =============================================================================

-- 37. Check index usage for store_configurations
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'store_configurations'
ORDER BY idx_scan DESC;

-- 38. Check table size and bloat
SELECT
  pg_size_pretty(pg_total_relation_size('public.store_configurations')) as total_size,
  pg_size_pretty(pg_relation_size('public.store_configurations')) as table_size,
  pg_size_pretty(pg_total_relation_size('public.store_configurations') - pg_relation_size('public.store_configurations')) as indexes_size;

SELECT
  pg_size_pretty(pg_total_relation_size('public.products')) as total_size,
  pg_size_pretty(pg_relation_size('public.products')) as table_size,
  pg_size_pretty(pg_total_relation_size('public.products') - pg_relation_size('public.products')) as indexes_size;

-- 39. Query performance analysis
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.get_store_config(
  'your-tenant-id',
  'your-folder-id'
);

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.get_active_products(
  'your-tenant-id',
  true,
  true
);

-- 40. Cache hit ratio (should be >99% for frequently accessed data)
SELECT
  'store_configurations' as table_name,
  heap_blks_read as disk_reads,
  heap_blks_hit as cache_hits,
  ROUND(heap_blks_hit * 100.0 / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) as cache_hit_ratio
FROM pg_statio_user_tables
WHERE relname = 'store_configurations';
