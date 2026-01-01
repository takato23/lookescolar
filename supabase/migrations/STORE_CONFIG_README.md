# Store Configuration System - Database Schema

This document describes the database schema for LookEscolar's flexible store configuration system, implemented in migrations `20251226000000_store_configuration_system.sql` and `20251226000001_store_configuration_tests.sql`.

## Overview

The store configuration system provides:
- **Multi-tenant support**: Each tenant can have unique store configurations
- **Hierarchical configuration**: Global tenant defaults with folder-level overrides
- **Flexible product catalog**: Support for digital downloads, prints, packages, and custom products
- **Security-first design**: Row Level Security (RLS) enabled with service role access
- **Performance optimized**: Strategic indexes for common query patterns

## Architecture

### Configuration Hierarchy

```
Tenant (Global Default)
  ├── Folder 1 (Optional Override)
  ├── Folder 2 (Uses Global Default)
  └── Folder 3 (Optional Override)
```

**Resolution Logic**:
1. Check if folder-specific configuration exists
2. If yes, use folder configuration
3. If no, fallback to global tenant configuration

## Tables

### 1. `store_configurations`

Stores visual and design configuration for stores at tenant or folder level.

**Schema**:
```sql
store_configurations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants,
  folder_id UUID NULLABLE REFERENCES folders,
  template VARCHAR(50) DEFAULT 'pixieset',
  cover_style VARCHAR(50),
  typography_style VARCHAR(50),
  color_scheme VARCHAR(50),
  grid_settings JSONB,
  logo_url TEXT,
  brand_colors JSONB,
  welcome_message TEXT,
  custom_css TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Key Constraints**:
- `UNIQUE (tenant_id)` WHERE `folder_id IS NULL` - One global config per tenant
- `UNIQUE (tenant_id, folder_id)` WHERE `folder_id IS NOT NULL` - One config per folder

**Template Options**:
- `pixieset` - Modern, clean gallery layout (default)
- `modern-minimal` - Minimalist design with large images
- `studio-dark` - Dark theme for professional photography
- `premium` - Premium editorial-style layout
- `editorial` - Magazine-style grid layout

**Cover Styles**:
- `minimal` - Simple cover with title
- `split` - Split-screen design
- `fullscreen` - Full-bleed hero image
- `editorial` - Magazine-style cover
- `classic` - Traditional layout

**Color Schemes**:
- `neutral` - Grayscale and neutral tones
- `warm` - Warm orange/red palette
- `cool` - Blue/green palette
- `vibrant` - Bold, saturated colors
- `monochrome` - Black and white
- `custom` - Use brand_colors

**JSONB Fields**:

`grid_settings`:
```json
{
  "columns": 3,
  "gap": 16,
  "aspectRatio": "auto",
  "hoverEffect": "zoom",
  "showCaptions": false
}
```

`brand_colors`:
```json
{
  "primary": "#000000",
  "secondary": "#666666",
  "accent": "#0066CC"
}
```

### 2. `products`

Product catalog for tenant (digital downloads, prints, packages, etc.)

**Schema**:
```sql
products (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  original_price INTEGER,
  photo_count INTEGER DEFAULT 0,
  is_package BOOLEAN DEFAULT false,
  features JSONB,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Pricing**:
- All prices stored in **centavos/cents** (e.g., `1500` = $15.00)
- `price`: Current selling price
- `original_price`: Optional original price for showing discounts
- Discount calculation: `(1 - price/original_price) * 100`

**Product Types**:
- **Individual Photo** (`is_package = false`, `photo_count = 1`)
- **Photo Package** (`is_package = true`, `photo_count > 0`)
- **All Photos** (`is_package = true`, `photo_count = 0` for unlimited)
- **Physical Products** (prints, albums, etc.)

**JSONB Fields**:

`features` (array of strings):
```json
[
  "Alta resolución (4K)",
  "Sin marca de agua",
  "3 descargas permitidas",
  "Válido por 30 días"
]
```

`metadata` (flexible object):
```json
{
  "type": "digital",
  "format": "jpg",
  "resolution": "4K",
  "max_downloads": 3,
  "validity_days": 30,
  "recommended": true
}
```

## Indexes

**Performance Optimizations**:

```sql
-- Store Configurations
idx_store_configurations_tenant (tenant_id)
idx_store_configurations_tenant_folder (tenant_id, folder_id)
idx_store_configurations_template (template) WHERE folder_id IS NULL

-- Products
idx_products_tenant (tenant_id)
idx_products_tenant_active (tenant_id, active) WHERE active = true
idx_products_tenant_package (tenant_id, is_package) WHERE active = true
idx_products_tenant_sort (tenant_id, sort_order, active)
```

## Helper Functions

### `get_store_config(tenant_id, folder_id)`

Get store configuration for a folder with automatic fallback to tenant default.

**Usage**:
```sql
-- Get folder-specific config (or tenant default if not found)
SELECT * FROM get_store_config(
  '00000000-0000-0000-0000-000000000000',
  'folder-uuid-here'
);

-- Get global tenant config explicitly
SELECT * FROM get_store_config(
  '00000000-0000-0000-0000-000000000000',
  NULL
);
```

**Returns**: Single `store_configurations` row

**Logic**:
1. If `folder_id` provided, try to find folder-specific config
2. If found, return it
3. Otherwise, fallback to global tenant config (`folder_id IS NULL`)

### `get_active_products(tenant_id, include_packages, include_singles)`

Get active products for a tenant, optionally filtered by type.

**Usage**:
```sql
-- Get all active products
SELECT * FROM get_active_products(
  '00000000-0000-0000-0000-000000000000',
  true,  -- include packages
  true   -- include singles
);

-- Get only packages
SELECT * FROM get_active_products(
  '00000000-0000-0000-0000-000000000000',
  true,  -- include packages
  false  -- exclude singles
);

-- Get only individual products
SELECT * FROM get_active_products(
  '00000000-0000-0000-0000-000000000000',
  false, -- exclude packages
  true   -- include singles
);
```

**Returns**: Multiple `products` rows, ordered by `sort_order ASC`

## Row Level Security (RLS)

Both tables have RLS enabled with **service role only access**.

**Why Service Role Only?**
- All client access goes through API routes
- API routes validate tenant context and permissions
- Prevents direct database access from clients
- Enforces business logic and validation layers

**Policies**:
```sql
-- Service role has full access
CREATE POLICY "Service role full access to store_configurations"
  ON store_configurations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to products"
  ON products FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

## Migration Application

### Step 1: Apply Migration

```bash
npm run db:migrate
```

This applies:
1. `20251226000000_store_configuration_system.sql` - Creates tables, indexes, functions
2. `20251226000001_store_configuration_tests.sql` - Runs verification tests

### Step 2: Generate TypeScript Types

```bash
npm run db:types
```

This regenerates TypeScript types from the updated schema.

### Step 3: Verify Migration

Check migration output for test results:

```
✅ TEST PASSED: Global config retrieval works correctly
✅ TEST PASSED: Folder-specific config override works correctly
✅ TEST PASSED: Fallback to global config works correctly
✅ TEST PASSED: Active products retrieval works
✅ TEST PASSED: Package/single filtering works correctly
✅ TEST PASSED: Tenant isolation works correctly
✅ TEST PASSED: UNIQUE constraints working correctly
✅ TEST PASSED: CHECK constraints working correctly
✅ TEST PASSED: updated_at trigger working correctly
✅ TEST PASSED: RLS enabled on all tables
```

### Step 4: Manual Verification (Optional)

```sql
-- View all configurations
SELECT
  sc.id,
  t.name as tenant_name,
  COALESCE(f.name, 'GLOBAL DEFAULT') as folder_name,
  sc.template,
  sc.color_scheme
FROM store_configurations sc
JOIN tenants t ON sc.tenant_id = t.id
LEFT JOIN folders f ON sc.folder_id = f.id;

-- View all active products
SELECT
  t.name as tenant_name,
  p.name as product_name,
  p.price / 100.0 as price,
  p.is_package,
  p.active
FROM products p
JOIN tenants t ON p.tenant_id = t.id
WHERE p.active = true
ORDER BY t.name, p.sort_order;
```

## Usage Examples

### Example 1: Create Global Tenant Configuration

```sql
INSERT INTO store_configurations (
  tenant_id,
  folder_id,
  template,
  color_scheme,
  welcome_message
) VALUES (
  'your-tenant-id',
  NULL, -- global config
  'pixieset',
  'warm',
  'Welcome to our school photo gallery!'
);
```

### Example 2: Create Folder-Specific Override

```sql
INSERT INTO store_configurations (
  tenant_id,
  folder_id,
  template,
  cover_style,
  brand_colors
) VALUES (
  'your-tenant-id',
  'your-folder-id',
  'modern-minimal',
  'fullscreen',
  '{"primary": "#FF6B35", "secondary": "#F7931E", "accent": "#C9184A"}'::JSONB
);
```

### Example 3: Create Product - Individual Photo

```sql
INSERT INTO products (
  tenant_id,
  name,
  description,
  price,
  photo_count,
  is_package,
  features,
  sort_order
) VALUES (
  'your-tenant-id',
  'Digital Photo',
  'High resolution digital download',
  1500, -- $15.00
  1,
  false,
  '["4K Resolution", "No Watermark", "3 Downloads"]'::JSONB,
  10
);
```

### Example 4: Create Product - Photo Package with Discount

```sql
INSERT INTO products (
  tenant_id,
  name,
  description,
  price,
  original_price,
  photo_count,
  is_package,
  features,
  sort_order
) VALUES (
  'your-tenant-id',
  '10 Photo Package',
  'Best value package',
  10000,  -- $100.00
  15000,  -- was $150.00 (33% discount)
  10,
  true,
  '["10 Digital Photos", "4K Resolution", "Unlimited Downloads", "90 Day Access"]'::JSONB,
  20
);
```

### Example 5: Retrieve Configuration in API Route

```typescript
// Get store config for a folder (with fallback to tenant default)
const { data: config } = await supabase
  .rpc('get_store_config', {
    p_tenant_id: tenantId,
    p_folder_id: folderId || null
  })
  .single();

console.log(config.template); // 'pixieset'
console.log(config.brand_colors); // { primary: "#000000", ... }
```

### Example 6: Retrieve Products in API Route

```typescript
// Get all active products
const { data: products } = await supabase
  .rpc('get_active_products', {
    p_tenant_id: tenantId,
    p_include_packages: true,
    p_include_singles: true
  });

// Display products with pricing
products.forEach(product => {
  const price = product.price / 100;
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  console.log(`${product.name}: $${price} (${discount}% off)`);
});
```

## Test Data

The migration includes comprehensive test data for development:

**Default Tenant** (`00000000-0000-0000-0000-000000000000`):
- 1 global configuration (Pixieset template)
- 5 sample products (1 single, 3 packages, 1 print)

**Test Tenant** (`11111111-1111-1111-1111-111111111111`):
- 1 global configuration (Modern Minimal template)
- 1 folder-specific configuration (Pixieset override)
- 3 test products (2 active, 1 inactive)

## Common Queries

### Get Configuration with Fallback

```sql
-- Automatically handles folder config or global fallback
SELECT * FROM get_store_config(
  'tenant-id',
  'folder-id'
);
```

### Get Only Packages

```sql
SELECT * FROM get_active_products(
  'tenant-id',
  true,  -- include packages
  false  -- exclude singles
)
WHERE photo_count >= 5; -- 5+ photos only
```

### Calculate Discount Percentage

```sql
SELECT
  name,
  price / 100.0 as current_price,
  original_price / 100.0 as original_price,
  ROUND((1 - (price::FLOAT / NULLIF(original_price, 0)::FLOAT)) * 100, 0) as discount_percent
FROM products
WHERE original_price IS NOT NULL
  AND active = true;
```

### Update Configuration

```sql
UPDATE store_configurations
SET
  template = 'modern-minimal',
  color_scheme = 'vibrant',
  brand_colors = '{"primary": "#FF6B35", "secondary": "#F7931E"}'::JSONB
WHERE tenant_id = 'your-tenant-id'
  AND folder_id IS NULL; -- update global config
```

## Troubleshooting

### Migration Fails with "relation already exists"

The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to re-run. However, if you see errors:

```bash
# Reset database (⚠️ destructive!)
npm run db:reset

# Or manually drop tables
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS store_configurations CASCADE;

# Then re-run migration
npm run db:migrate
```

### TypeScript Types Not Updated

```bash
# Regenerate types
npm run db:types

# Verify types file
cat types/database.ts | grep -A 10 "store_configurations"
```

### RLS Blocking Queries

Ensure you're using the **service role key** (not anon key) in API routes:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ← Service role key
);
```

### Performance Issues

Check if indexes are being used:

```sql
EXPLAIN ANALYZE
SELECT * FROM store_configurations
WHERE tenant_id = 'your-tenant-id';
```

Look for "Index Scan" in the output. If you see "Seq Scan", indexes may not be working.

## Security Considerations

1. **Never expose service role key** to clients
2. **Always validate tenant context** in API routes before queries
3. **Use prepared statements** to prevent SQL injection
4. **Sanitize custom_css** before rendering (XSS risk)
5. **Rate limit** product/config endpoints to prevent abuse
6. **Validate price ranges** to prevent extreme values
7. **Audit log** changes to pricing and configurations

## Performance Best Practices

1. **Cache configurations** - They change infrequently
2. **Preload products** - Fetch once per page load
3. **Use helper functions** - Optimized with proper indexes
4. **Avoid custom_css** - Performance overhead, use template options
5. **Batch queries** - Fetch config + products in parallel
6. **Monitor query performance** - Use EXPLAIN ANALYZE

## Future Enhancements

Potential additions for future migrations:

- **A/B Testing**: Variant configurations for split testing
- **Scheduling**: Time-based configuration switches
- **Themes**: Pre-built theme bundles
- **Analytics**: Track configuration performance
- **Versioning**: Configuration history and rollback
- **Product Categories**: Group products by type
- **Inventory**: Track product availability
- **Bundles**: Dynamic product combinations

## Support

For issues or questions:
1. Check verification test output for specific failures
2. Review EXPLAIN ANALYZE for performance issues
3. Verify RLS policies with `SELECT * FROM pg_policies WHERE tablename = 'store_configurations'`
4. Check foreign key constraints are satisfied
5. Ensure tenant and folder IDs exist in parent tables
