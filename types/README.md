# TypeScript Type Definitions

Comprehensive type system for LookEscolar store configuration and product catalog.

## Overview

This directory contains all TypeScript type definitions for the LookEscolar application, organized by domain:

- **`store-config.ts`** - Store configuration and design system types
- **`product.ts`** - Product catalog types (products, combos, pricing)
- **`template.ts`** - Template component props and customization types
- **`api.ts`** - API request/response types
- **`database.ts`** - Auto-generated Supabase database types
- **`index.ts`** - Central export point for all types

## Usage

### Importing Types

Always import from the central index for consistency:

```typescript
import type { StoreConfig, PhotoProduct, BaseTemplateProps } from '@/types';
```

### Type Hierarchies

#### Store Configuration

```typescript
StoreConfig                    // Complete store configuration
├── DesignConfig              // Design system configuration
│   ├── CoverSettings
│   ├── TypographySettings
│   ├── ColorSettings
│   ├── GridSettings
│   └── AppSettings
├── BrandColors               // Color palette
├── StoreTexts                // Content/copy
├── StoreProduct[]            // Simple product definitions
└── PaymentMethod[]           // Payment options
```

#### Product Catalog

```typescript
ProductCatalog
├── ProductCategory[]         // Product categories
├── PhotoProduct[]            // Individual products
│   ├── Physical products (print)
│   └── Digital products
└── ComboPackage[]            // Combo/package deals
    └── ComboPackageItem[]    // Products in combo
```

#### Template Props

```typescript
BaseTemplateProps             // Required by all templates
├── config: StoreConfig
├── photos: Photo[]
├── subject: Subject
├── token: string
└── products: (PhotoProduct | ComboPackage)[]
```

## Type Categories

### 1. Store Configuration Types

#### Main Types

- **`StoreConfig`** - Complete store configuration
- **`NewStoreConfig`** - For creating new store configs (omits ID, timestamps)
- **`UpdateStoreConfig`** - For updating configs (all fields optional)

#### Design System Types

```typescript
type TemplateType = 'pixieset' | 'premium-store' | 'modern-minimal' | ...;
type CoverStyle = 'center' | 'joy' | 'left' | 'novel' | ...;
type TypographyStyle = 'sans' | 'serif' | 'modern' | ...;
type ColorScheme = 'light' | 'gold' | 'rose' | 'terracotta' | ...;
```

#### Structured Configs

```typescript
interface BrandColors {
  primary: string;       // Hex color
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  text_secondary: string;
}

interface GridSettings {
  style: 'vertical' | 'horizontal';
  thumb: 'regular' | 'large';
  spacing: 'regular' | 'wide';
  nav: 'classic' | 'minimal';
}
```

### 2. Product Types

#### Categories

```typescript
interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;           // Lucide icon name
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Photo Products

```typescript
interface PhotoProduct {
  id: string;
  category_id: string;
  name: string;
  type: 'print' | 'digital' | 'package' | 'combo';

  // Physical specs (for print products)
  width_cm?: number;
  height_cm?: number;
  finish?: 'matte' | 'glossy' | 'canvas' | 'metallic' | 'wood';
  paper_quality?: 'standard' | 'premium' | 'professional';

  // Pricing
  base_price: number;      // cents
  cost_price?: number;     // cents

  // Display
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;

  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

#### Combo Packages

```typescript
interface ComboPackage {
  id: string;
  name: string;
  description?: string;

  // Configuration
  min_photos: number;
  max_photos?: number | null;  // null = unlimited
  allows_duplicates: boolean;

  // Pricing
  pricing_type: 'fixed' | 'per_photo' | 'tiered';
  base_price: number;          // cents
  price_per_photo?: number;    // cents (for per_photo pricing)

  // Display
  image_url?: string;
  badge_text?: string;         // e.g., "POPULAR", "BEST VALUE"
  badge_color?: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;

  items?: ComboPackageItem[];  // Included products
  created_at: string;
  updated_at: string;
}
```

### 3. Template Types

#### Base Props

```typescript
interface BaseTemplateProps {
  config: StoreConfig;
  photos: Photo[];
  subject: Subject;
  token: string;
  products: (PhotoProduct | ComboPackage)[];
  onBack?: () => void;
}
```

#### Template-Specific Props

```typescript
interface PixiesetTemplateProps extends BaseTemplateProps {
  template: 'pixieset';
  packageMode?: boolean;
  showPhotoCount?: boolean;
}

interface PremiumStoreTemplateProps extends BaseTemplateProps {
  template: 'premium-store';
  luxuryMode?: boolean;
  showRecommendations?: boolean;
}
```

### 4. API Types

#### Generic Response

```typescript
type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};
```

#### Specific Responses

```typescript
type StoreConfigResponse = ApiResponse<StoreConfig>;
type ProductResponse = ApiResponse<PhotoProduct>;
type ProductsResponse = ApiResponse<PhotoProduct[]>;
type ComboPackageResponse = ApiResponse<ComboPackage>;
type PriceCalculationResponse = ApiResponse<PriceCalculation>;
```

#### Request Types

```typescript
interface CreateProductRequest {
  category_id: string;
  name: string;
  type: 'print' | 'digital' | 'package' | 'combo';
  width_cm?: number;
  height_cm?: number;
  base_price: number;
  // ... other fields
}

interface CalculatePriceRequest {
  event_id: string;
  selections: Array<{
    photo_id: string;
    product_id?: string;
    combo_id?: string;
    quantity: number;
  }>;
  applyDiscounts?: boolean;
  promoCode?: string;
}
```

## Type Guards

Use type guards for runtime type checking:

```typescript
import { isTemplateType, isPhysicalProduct, isDigitalProduct } from '@/types';

if (isTemplateType(value)) {
  // value is TemplateType
}

if (isPhysicalProduct(product)) {
  // product has width_cm, height_cm
  console.log(`${product.width_cm}×${product.height_cm}cm`);
}
```

## Utility Functions

### Product Utilities

```typescript
import { formatProductSize, formatProductSpecs, calculateComboPrice } from '@/types';

// Format product size
const size = formatProductSize(product); // "10×15cm" or "Digital"

// Format complete specs
const specs = formatProductSpecs(product); // "10×15cm • glossy • premium"

// Calculate combo price
const price = calculateComboPrice(combo, photoCount);
```

## Validation

### Zod Schemas

All types have corresponding Zod schemas for runtime validation:

**Store Config**: `/lib/validations/store-config.ts`
```typescript
import { StoreConfigSchema, validateStoreConfig } from '@/lib/validations/store-config';

const validated = validateStoreConfig(input);
```

**Products**: `/lib/validations/product.ts`
```typescript
import {
  PhotoProductSchema,
  ComboPackageSchema,
  validatePhotoProduct,
  validateComboPackage
} from '@/lib/validations/product';

const product = validatePhotoProduct(input);
const combo = validateComboPackage(input);
```

## Constants

### Store Config Constants

```typescript
import { DEFAULT_BRAND_COLORS, DEFAULT_STORE_TEXTS, SUPPORTED_CURRENCIES } from '@/types';

// Default brand colors
const colors = DEFAULT_BRAND_COLORS;

// Supported currencies
const currencies = SUPPORTED_CURRENCIES; // ['ARS', 'USD', 'EUR', ...]
```

### Product Constants

```typescript
import { PRODUCT_CONSTANTS, COMMON_PHOTO_SIZES } from '@/types';

// Validation limits
PRODUCT_CONSTANTS.MAX_PHOTOS_PER_ORDER      // 50
PRODUCT_CONSTANTS.MIN_PRICE_CENTS           // 100 ($1)
PRODUCT_CONSTANTS.MAX_PRICE_CENTS           // 1000000 ($10,000)

// Common sizes
COMMON_PHOTO_SIZES.forEach(({ width, height, label }) => {
  console.log(`${label}: ${width}×${height}cm`);
});
```

## Database Alignment

All types align with the Supabase database schema:

- **`store_settings`** table → `StoreConfig` type
- **`product_categories`** table → `ProductCategory` type
- **`photo_products`** table → `PhotoProduct` type
- **`combo_packages`** table → `ComboPackage` type
- **`event_product_pricing`** table → `EventProductPricing` type

Database types are auto-generated via:
```bash
npm run db:types
```

## Best Practices

### 1. Always Use Type Imports

```typescript
// ✅ Good - type-only import
import type { StoreConfig } from '@/types';

// ❌ Avoid - value import when only using types
import { StoreConfig } from '@/types';
```

### 2. Use Partial Types for Updates

```typescript
// ✅ Good - use update type
const updates: UpdateStoreConfig = { enabled: true };

// ❌ Avoid - partial of full type
const updates: Partial<StoreConfig> = { enabled: true };
```

### 3. Validate User Input

```typescript
// ✅ Good - validate before using
const product = validatePhotoProduct(userInput);

// ❌ Avoid - trust user input
const product = userInput as PhotoProduct;
```

### 4. Use Type Guards

```typescript
// ✅ Good - runtime type checking
if (isPhysicalProduct(product)) {
  console.log(product.width_cm);
}

// ❌ Avoid - unsafe type assertion
const physical = product as PhysicalProduct;
```

## Migration Guide

### From Legacy Types

If migrating from legacy type definitions:

```typescript
// OLD (lib/types/unified-store.ts)
import { ProductOption } from '@/lib/types/unified-store';

// NEW (types/product.ts)
import type { PhotoProduct } from '@/types';
```

### From Database Types

```typescript
// OLD (direct database import)
import type { Database } from '@/types/database';
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

// NEW (typed interface)
import type { StoreConfig } from '@/types';
```

## File Organization

```
types/
├── README.md              # This file
├── index.ts               # Central export point
├── store-config.ts        # Store configuration types
├── product.ts             # Product catalog types
├── template.ts            # Template component types
├── api.ts                 # API request/response types
└── database.ts            # Auto-generated database types (DO NOT EDIT)
```

## Related Files

- **Validation Schemas**: `/lib/validations/`
- **Database Migrations**: `/supabase/migrations/`
- **Type Generation**: `npm run db:types`

## Contributing

When adding new types:

1. **Match Database Schema**: Ensure types align with database structure
2. **Add Validation**: Create corresponding Zod schema in `/lib/validations/`
3. **Export from Index**: Add exports to `/types/index.ts`
4. **Document**: Add JSDoc comments and examples
5. **Add Type Guards**: Create type guards for runtime checking
6. **Write Tests**: Add tests for validators and type guards
