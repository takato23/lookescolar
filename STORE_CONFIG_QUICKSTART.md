# Store Configuration System - Quick Start Guide

5-minute guide to get the store configuration system up and running.

## Step 1: Apply Migration (2 minutes)

```bash
cd /Users/santiagobalosky/LookEscolar-2

# Apply the migration
npm run db:migrate

# Regenerate TypeScript types
npm run db:types
```

**Expected Output**:
```
✅ Store configurations created: 1
✅ Active products created: 5
✅ All tests passed successfully!
```

## Step 2: Verify Installation (1 minute)

**Quick Test (Node.js)**:
```javascript
// test-store-config.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  // Test 1: Get store config
  const { data: config } = await supabase
    .rpc('get_store_config', {
      p_tenant_id: '00000000-0000-0000-0000-000000000000',
      p_folder_id: null
    })
    .single();
  console.log('✅ Config:', config.template, config.color_scheme);

  // Test 2: Get products
  const { data: products } = await supabase
    .rpc('get_active_products', {
      p_tenant_id: '00000000-0000-0000-0000-000000000000',
      p_include_packages: true,
      p_include_singles: true
    });
  console.log('✅ Products:', products.length, 'active products');
}

test();
```

**Run Test**:
```bash
node test-store-config.js
```

## Step 3: Create Your First Configuration (2 minutes)

### Option A: Use SQL (Supabase Dashboard)

Navigate to Supabase Dashboard → SQL Editor, paste and run:

```sql
-- Create global configuration for your tenant
INSERT INTO public.store_configurations (
  tenant_id,
  folder_id,
  template,
  color_scheme,
  welcome_message,
  brand_colors
) VALUES (
  'your-tenant-id-here', -- Replace with actual tenant ID
  NULL, -- global config
  'pixieset',
  'warm',
  'Welcome to our school photo gallery!',
  '{"primary": "#FF6B35", "secondary": "#F7931E", "accent": "#C9184A"}'::JSONB
)
ON CONFLICT (tenant_id) WHERE folder_id IS NULL
DO UPDATE SET
  template = EXCLUDED.template,
  color_scheme = EXCLUDED.color_scheme,
  welcome_message = EXCLUDED.welcome_message,
  brand_colors = EXCLUDED.brand_colors,
  updated_at = NOW();
```

### Option B: Use API Route (Recommended)

Create API route:

```typescript
// app/api/admin/store/config/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  const body = await request.json();

  const supabase = createClient();

  const { data, error } = await supabase
    .from('store_configurations')
    .upsert({
      tenant_id: tenantId,
      folder_id: null, // global config
      ...body
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data });
}
```

Test with curl:
```bash
curl -X POST http://localhost:3000/api/admin/store/config \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -d '{
    "template": "pixieset",
    "color_scheme": "warm",
    "welcome_message": "Welcome to our gallery!"
  }'
```

## Step 4: Add Products

### Quick Setup: Use Pre-Made Products

The migration already includes 5 sample products for the default tenant:
- Individual Photo ($15)
- 5-Photo Package ($60, was $75)
- 10-Photo Package ($100, was $150) ⭐
- Complete Package ($200)
- Print 10x15cm ($8)

### Custom Products: Add Your Own

**SQL Method**:
```sql
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
  active
) VALUES (
  'your-tenant-id',
  'Premium Package 20 Fotos',
  'Mejor oferta - 20 fotos digitales',
  15000, -- $150.00
  20000, -- was $200.00
  20,
  true,
  '["20 Fotos Digitales", "4K Resolution", "Descargas Ilimitadas", "Acceso 1 Año"]'::JSONB,
  10,
  true
);
```

**API Route Method**:
```typescript
// app/api/admin/products/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  const body = await request.json();

  const supabase = createClient();

  const { data, error } = await supabase
    .from('products')
    .insert({
      tenant_id: tenantId,
      ...body
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
```

## Step 5: Display in Your App

### Basic Product List Component

```typescript
// components/store/ProductGrid.tsx
'use client';

import { useQuery } from '@tanstack/react-query';

export function ProductGrid({ tenantId }: { tenantId: string }) {
  const { data: products = [] } = useQuery({
    queryKey: ['products', tenantId],
    queryFn: async () => {
      const response = await fetch('/api/store/products', {
        headers: { 'x-tenant-id': tenantId }
      });
      const { products } = await response.json();
      return products;
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {products.map((product: any) => (
        <div key={product.id} className="border rounded-lg p-6 hover:shadow-lg transition">
          {/* Badge for packages */}
          {product.is_package && (
            <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mb-4">
              Paquete
            </div>
          )}

          {/* Product name */}
          <h3 className="text-xl font-bold mb-2">{product.name}</h3>
          <p className="text-gray-600 mb-4">{product.description}</p>

          {/* Pricing */}
          <div className="mb-4">
            <span className="text-3xl font-bold">${(product.price / 100).toFixed(2)}</span>
            {product.original_price && (
              <>
                <span className="ml-2 text-gray-400 line-through">
                  ${(product.original_price / 100).toFixed(2)}
                </span>
                <span className="ml-2 text-green-600 font-semibold">
                  {Math.round((1 - product.price / product.original_price) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-2 mb-6">
            {product.features.map((feature: string, i: number) => (
              <li key={i} className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Seleccionar
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Use in Page

```typescript
// app/store-unified/[token]/page.tsx
import { ProductGrid } from '@/components/store/ProductGrid';

export default function StorePage({ params }: { params: { token: string } }) {
  const tenantId = 'your-tenant-id'; // Get from token validation

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Selecciona tu Paquete</h1>
      <ProductGrid tenantId={tenantId} />
    </div>
  );
}
```

## Common Tasks

### Change Template
```sql
UPDATE store_configurations
SET template = 'modern-minimal'
WHERE tenant_id = 'your-tenant-id' AND folder_id IS NULL;
```

### Update Pricing
```sql
UPDATE products
SET price = 12000, original_price = 16000
WHERE id = 'product-id';
```

### Add Discount
```sql
UPDATE products
SET original_price = price, price = price * 0.8 -- 20% off
WHERE tenant_id = 'your-tenant-id' AND is_package = true;
```

### Deactivate Product
```sql
UPDATE products
SET active = false
WHERE id = 'product-id';
```

## Troubleshooting

**Migration fails?**
- Check Supabase connection
- Ensure `tenants` and `folders` tables exist
- Review error message for specific issue

**Products not showing?**
- Check `active = true`
- Verify tenant_id matches
- Check RLS policies (use service role key)

**Config not loading?**
- Ensure tenant has global config (folder_id IS NULL)
- Use helper function `get_store_config()`
- Check for typos in tenant_id

## Next Steps

1. **Customize Templates**: Modify templates in your components
2. **Add More Products**: Create packages specific to your needs
3. **Test Checkout Flow**: Integrate with payment system
4. **Add Analytics**: Track which products sell best
5. **Create Admin UI**: Build interface to manage configs/products

## Reference

- **Main Migration**: `supabase/migrations/20251226000000_store_configuration_system.sql`
- **Tests**: `supabase/migrations/20251226000001_store_configuration_tests.sql`
- **Full Docs**: `supabase/migrations/STORE_CONFIG_README.md`
- **Query Examples**: `supabase/migrations/store_config_common_queries.sql`
- **Summary**: `MIGRATION_SUMMARY_STORE_CONFIG.md`

## Support

Need help? Check these files:
- **Common Queries**: 40 ready-to-use SQL examples
- **README**: Complete documentation with examples
- **Tests**: See what's being validated
- **Summary**: Architecture overview

---

**Time to Production**: ~10 minutes
**Difficulty**: Easy
**Requirements**: Supabase, PostgreSQL 15+
