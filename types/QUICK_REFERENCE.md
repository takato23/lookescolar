# Type System Quick Reference

Fast reference guide for common type operations in LookEscolar.

## Import Patterns

```typescript
// ✅ Always use type-only imports from central index
import type { StoreConfig, PhotoProduct, BaseTemplateProps } from '@/types';

// ✅ Import type guards and utilities as values
import { isPhysicalProduct, formatProductSize } from '@/types';

// ✅ Import validation schemas
import { validatePhotoProduct } from '@/lib/validations/product';
```

## Common Types

### Store Configuration

```typescript
import type { StoreConfig, TemplateType, BrandColors } from '@/types';
import { DEFAULT_BRAND_COLORS } from '@/types';

// Full configuration
const config: StoreConfig = { /* ... */ };

// Template selection
const template: TemplateType = 'pixieset';

// Brand colors
const colors: BrandColors = DEFAULT_BRAND_COLORS;
```

### Products

```typescript
import type { PhotoProduct, ComboPackage, ProductCategory } from '@/types';

// Individual product
const product: PhotoProduct = {
  id: 'uuid',
  category_id: 'cat-1',
  name: 'Foto 10x15cm',
  type: 'print',
  width_cm: 10,
  height_cm: 15,
  base_price: 800,
  // ... other fields
};

// Combo package
const combo: ComboPackage = {
  id: 'uuid',
  name: 'Combo Familiar',
  min_photos: 3,
  max_photos: 3,
  pricing_type: 'fixed',
  base_price: 6500,
  // ... other fields
};
```

### API Requests/Responses

```typescript
import type {
  StoreConfigResponse,
  ProductResponse,
  CreateProductRequest
} from '@/types';

// Fetch config
const response: StoreConfigResponse = await fetch('/api/store-config')
  .then(r => r.json());

// Create product
const request: CreateProductRequest = {
  category_id: 'cat-1',
  name: 'New Product',
  type: 'print',
  width_cm: 10,
  height_cm: 15,
  base_price: 1000
};
```

## Type Guards

```typescript
import {
  isPhysicalProduct,
  isDigitalProduct,
  isTemplateType
} from '@/types';

// Check if physical product
if (isPhysicalProduct(product)) {
  // product.width_cm and product.height_cm are available
  console.log(`${product.width_cm}×${product.height_cm}cm`);
}

// Check if digital product
if (isDigitalProduct(product)) {
  // digital product logic
}

// Validate template type
if (isTemplateType(value)) {
  // value is TemplateType
}
```

## Validation

```typescript
import {
  validatePhotoProduct,
  validateComboPackage,
  validateStoreConfig
} from '@/lib/validations/product';

// Validate and parse product
try {
  const product = validatePhotoProduct(userInput);
  // product is typed as PhotoProduct
} catch (error) {
  // Validation error with detailed messages
  console.error(error.message);
}

// Validate combo
const combo = validateComboPackage(userInput);

// Validate store config
const config = validateStoreConfig(userInput);
```

## Utility Functions

```typescript
import {
  formatProductSize,
  formatProductSpecs,
  calculateComboPrice,
  calculateMargin
} from '@/types';

// Format product size
const size = formatProductSize(product);
// Returns: "10×15cm" or "Digital"

// Format complete specs
const specs = formatProductSpecs(product);
// Returns: "10×15cm • glossy • premium"

// Calculate combo price
const price = calculateComboPrice(combo, photoCount);
// Returns: price in cents based on pricing_type

// Calculate profit margin
const margin = calculateMargin(product);
// Returns: margin percentage or null
```

## Constants

```typescript
import {
  DEFAULT_BRAND_COLORS,
  DEFAULT_STORE_TEXTS,
  SUPPORTED_CURRENCIES,
  PRODUCT_CONSTANTS,
  COMMON_PHOTO_SIZES
} from '@/types';

// Default values
const colors = DEFAULT_BRAND_COLORS;
const texts = DEFAULT_STORE_TEXTS;

// Supported currencies
SUPPORTED_CURRENCIES.forEach(currency => {
  console.log(currency); // 'ARS', 'USD', etc.
});

// Product limits
PRODUCT_CONSTANTS.MAX_PHOTOS_PER_ORDER;      // 50
PRODUCT_CONSTANTS.MIN_PRICE_CENTS;           // 100 ($1)
PRODUCT_CONSTANTS.MAX_PRICE_CENTS;           // 1000000 ($10,000)

// Common sizes
COMMON_PHOTO_SIZES.forEach(({ width, height, label }) => {
  console.log(`${label}: ${width}×${height}cm`);
});
```

## Partial Types

```typescript
import type { UpdateStoreConfig, UpdatePhotoProduct } from '@/types';

// Update operations (all fields optional)
const updates: UpdateStoreConfig = {
  enabled: true,
  template: 'premium-store'
};

// Product updates
const productUpdates: UpdatePhotoProduct = {
  base_price: 1200,
  is_featured: true
};
```

## Template Props

```typescript
import type { BaseTemplateProps, PixiesetTemplateProps } from '@/types';

// Base props (required by all templates)
function MyTemplate({
  config,
  photos,
  subject,
  token,
  products,
  onBack
}: BaseTemplateProps) {
  return <div>{/* ... */}</div>;
}

// Template-specific props
function PixiesetTemplate(props: PixiesetTemplateProps) {
  const { config, photos, packageMode } = props;
  return <div>{/* ... */}</div>;
}
```

## Common Patterns

### Creating New Entity

```typescript
import type { NewPhotoProduct, NewComboPackage } from '@/types';

// New product (omits id, timestamps)
const newProduct: NewPhotoProduct = {
  category_id: 'cat-1',
  name: 'New Product',
  type: 'print',
  width_cm: 10,
  height_cm: 15,
  base_price: 1000,
  sort_order: 0,
  is_active: true,
  is_featured: false
};

// New combo
const newCombo: NewComboPackage = {
  name: 'New Combo',
  min_photos: 1,
  pricing_type: 'fixed',
  base_price: 2500,
  allows_duplicates: true,
  sort_order: 0,
  is_active: true,
  is_featured: false
};
```

### Error Handling

```typescript
import type { ApiResponse } from '@/types';

// Handle API response
async function fetchConfig() {
  const response: ApiResponse<StoreConfig> = await fetch('/api/store-config')
    .then(r => r.json());

  if (response.error) {
    console.error(response.error);
    return null;
  }

  return response.data;
}
```

### Type Narrowing

```typescript
import type { PhotoProduct } from '@/types';
import { isPhysicalProduct } from '@/types';

function processProduct(product: PhotoProduct) {
  if (isPhysicalProduct(product)) {
    // TypeScript knows product has width_cm, height_cm
    return `Physical: ${product.width_cm}×${product.height_cm}cm`;
  } else {
    // Digital product
    return 'Digital product';
  }
}
```

## Cheat Sheet

| Need | Import | Example |
|------|--------|---------|
| Store config type | `import type { StoreConfig } from '@/types'` | `const config: StoreConfig = ...` |
| Product type | `import type { PhotoProduct } from '@/types'` | `const product: PhotoProduct = ...` |
| Type guard | `import { isPhysicalProduct } from '@/types'` | `if (isPhysicalProduct(p)) ...` |
| Validation | `import { validatePhotoProduct } from '@/lib/validations/product'` | `const p = validatePhotoProduct(input)` |
| Utility | `import { formatProductSize } from '@/types'` | `const size = formatProductSize(p)` |
| Constants | `import { PRODUCT_CONSTANTS } from '@/types'` | `PRODUCT_CONSTANTS.MAX_PRICE_CENTS` |
| API types | `import type { ProductResponse } from '@/types'` | `const res: ProductResponse = ...` |
| Template props | `import type { BaseTemplateProps } from '@/types'` | `function Template(props: BaseTemplateProps)` |

## Common Errors

### Error: Cannot find module '@/types'

**Solution**: Check tsconfig.json has correct path mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Error: Type 'X' is not assignable to type 'Y'

**Solution**: Use validation to ensure data matches expected type:
```typescript
const validated = validatePhotoProduct(data);
```

### Error: Property 'width_cm' does not exist

**Solution**: Use type guard to narrow type:
```typescript
if (isPhysicalProduct(product)) {
  // Now product.width_cm exists
}
```

## Best Practices

1. **Always validate user input** - Use Zod schemas
2. **Use type guards** - Don't use type assertions
3. **Import from central index** - `from '@/types'` not individual files
4. **Use type-only imports** - `import type` for better tree-shaking
5. **Leverage utility functions** - Don't duplicate logic
6. **Use Partial types for updates** - `UpdateStoreConfig` not `Partial<StoreConfig>`
7. **Check constants first** - Use provided defaults before creating new ones

## Help

- **Full documentation**: `/types/README.md`
- **Validation schemas**: `/lib/validations/`
- **Type definitions**: `/types/*.ts`
- **Examples**: See TYPES_IMPLEMENTATION_SUMMARY.md
