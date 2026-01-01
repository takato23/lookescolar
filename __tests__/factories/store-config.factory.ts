import type { StoreConfig, StoreProduct } from '@/lib/validations/store-config';

/**
 * Test Data Factories for Store Configuration
 * Provides reusable factories for creating test data
 */

/**
 * Create a valid store product for testing
 */
export function createTestProduct(overrides?: Partial<StoreProduct>): StoreProduct {
  const defaults: StoreProduct = {
    id: `product-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Test Product',
    type: 'digital',
    enabled: true,
    price: 1500,
    description: 'Test product description',
    options: {
      formats: ['JPG', 'PNG'],
      quality: 'premium',
    },
  };

  return { ...defaults, ...overrides };
}

/**
 * Create multiple test products
 */
export function createTestProducts(count: number, baseOverrides?: Partial<StoreProduct>): StoreProduct[] {
  return Array.from({ length: count }, (_, i) =>
    createTestProduct({
      ...baseOverrides,
      id: `product-${i}`,
      name: `Product ${i + 1}`,
      price: 1000 + i * 500,
    })
  );
}

/**
 * Create a complete store config for testing
 */
export function createTestStoreConfig(overrides?: Partial<StoreConfig>): StoreConfig {
  const defaults: StoreConfig = {
    enabled: true,
    template: 'pixieset',
    currency: 'ARS',
    tax_rate: 0,
    shipping_enabled: true,
    shipping_price: 50000,
    payment_methods: ['mercadopago'],
    products: [createTestProduct()],
    logo_url: 'https://example.com/logo.png',
    banner_url: '',
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#3b82f6',
      background: '#f9fafb',
      surface: '#ffffff',
      text: '#111827',
      text_secondary: '#6b7280',
    },
    texts: {
      hero_title: 'Galería Fotográfica',
      hero_subtitle: 'Encuentra tus mejores momentos escolares',
      footer_text: '© 2024 LookEscolar - Fotografía Escolar',
      contact_email: 'test@example.com',
      contact_phone: '+54911234567',
      terms_url: 'https://example.com/terms',
      privacy_url: 'https://example.com/privacy',
    },
  };

  return {
    ...defaults,
    ...overrides,
    products: overrides?.products || defaults.products,
  };
}

/**
 * Create minimal valid config (for validation tests)
 */
export function createMinimalStoreConfig(): StoreConfig {
  return {
    enabled: false,
    template: 'pixieset',
    currency: 'ARS',
    tax_rate: 0,
    shipping_enabled: true,
    shipping_price: 0,
    payment_methods: ['mercadopago'],
    products: [
      {
        id: 'minimal-product',
        name: 'Minimal Product',
        type: 'digital',
        enabled: true,
        price: 1000,
      },
    ],
  };
}

/**
 * Create config with specific template
 */
export function createTemplateConfig(
  template: StoreConfig['template']
): StoreConfig {
  return createTestStoreConfig({ template });
}

/**
 * Create config with multiple products
 */
export function createConfigWithProducts(
  productCount: number,
  productOverrides?: Partial<StoreProduct>
): StoreConfig {
  return createTestStoreConfig({
    products: createTestProducts(productCount, productOverrides),
  });
}

/**
 * Create config with specific currency
 */
export function createCurrencyConfig(
  currency: StoreConfig['currency']
): StoreConfig {
  return createTestStoreConfig({ currency });
}

/**
 * Create config with custom colors
 */
export function createColoredConfig(colors: Partial<StoreConfig['colors']>): StoreConfig {
  const baseConfig = createTestStoreConfig();
  return {
    ...baseConfig,
    colors: {
      ...baseConfig.colors!,
      ...colors,
    },
  };
}

/**
 * Create config for a specific event
 */
export function createEventStoreConfig(eventId: string, overrides?: Partial<StoreConfig>): StoreConfig {
  return createTestStoreConfig({
    ...overrides,
    texts: {
      hero_title: `Event ${eventId} Gallery`,
      hero_subtitle: 'Event-specific configuration',
      footer_text: `© 2024 Event ${eventId}`,
      contact_email: `event-${eventId}@example.com`,
      contact_phone: '',
      terms_url: '',
      privacy_url: '',
      ...overrides?.texts,
    },
  });
}

/**
 * Create invalid config (for validation testing)
 */
export function createInvalidStoreConfig(invalidField: string): Partial<StoreConfig> {
  const base = createTestStoreConfig();

  switch (invalidField) {
    case 'empty_products':
      return { ...base, products: [] };
    case 'negative_price':
      return {
        ...base,
        products: [createTestProduct({ price: -500 })],
      };
    case 'invalid_currency':
      return { ...base, currency: 'INVALID' as any };
    case 'negative_tax':
      return { ...base, tax_rate: -10 };
    case 'invalid_template':
      return { ...base, template: 'invalid-template' as any };
    case 'too_many_products':
      return { ...base, products: createTestProducts(51) };
    case 'invalid_color':
      return {
        ...base,
        colors: {
          ...base.colors!,
          primary: 'not-a-color',
        },
      };
    default:
      return base;
  }
}

/**
 * Create product with invalid data
 */
export function createInvalidProduct(invalidField: string): Partial<StoreProduct> {
  const base = createTestProduct();

  switch (invalidField) {
    case 'empty_name':
      return { ...base, name: '' };
    case 'invalid_type':
      return { ...base, type: 'invalid' as any };
    case 'negative_price':
      return { ...base, price: -100 };
    case 'invalid_id':
      return { ...base, id: 'invalid id with spaces!' };
    case 'too_long_name':
      return { ...base, name: 'A'.repeat(101) };
    case 'too_long_description':
      return { ...base, description: 'A'.repeat(501) };
    case 'too_many_sizes':
      return {
        ...base,
        options: {
          sizes: Array.from({ length: 11 }, (_, i) => `size-${i}`),
        },
      };
    default:
      return base;
  }
}

/**
 * Database row factory - converts UI config to DB format
 */
export function createStoreSettingsRow(eventId: string | null, config: StoreConfig) {
  return {
    id: crypto.randomUUID(),
    event_id: eventId,
    enabled: config.enabled,
    template: config.template,
    currency: config.currency,
    products: JSON.stringify(config.products),
    colors: JSON.stringify(config.colors || {}),
    texts: JSON.stringify(config.texts || {}),
    theme_customization: JSON.stringify({}),
    payment_methods: JSON.stringify(
      config.payment_methods.reduce((acc, method) => {
        acc[method] = { enabled: true, name: method };
        return acc;
      }, {} as Record<string, any>)
    ),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Create photo product row for database
 */
export function createPhotoProductRow(categoryId: string, overrides?: any) {
  return {
    id: crypto.randomUUID(),
    category_id: categoryId,
    name: 'Test Photo Product',
    description: 'Test product description',
    type: 'print',
    finish: 'glossy',
    paper_quality: 'premium',
    width_cm: 10,
    height_cm: 15,
    base_price: 1500,
    is_active: true,
    is_featured: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create product category row
 */
export function createProductCategoryRow(overrides?: any) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Category',
    description: 'Test category description',
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create combo package row
 */
export function createComboPackageRow(overrides?: any) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Combo',
    description: 'Test combo package',
    min_photos: 5,
    max_photos: 10,
    allows_duplicates: false,
    pricing_type: 'fixed',
    base_price: 5000,
    is_active: true,
    is_featured: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create event row for testing
 */
export function createEventRow(overrides?: any) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Event',
    school: 'Test School',
    school_name: 'Test School',
    date: '2024-12-01',
    status: 'active',
    public_gallery_enabled: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Preset configurations for common test scenarios
 */
export const PRESET_CONFIGS = {
  minimal: createMinimalStoreConfig(),
  full: createTestStoreConfig(),
  disabled: createTestStoreConfig({ enabled: false }),
  withManyProducts: createConfigWithProducts(10),
  usd: createCurrencyConfig('USD'),
  eur: createCurrencyConfig('EUR'),
  pixieset: createTemplateConfig('pixieset'),
  editorial: createTemplateConfig('editorial'),
  studioDark: createTemplateConfig('studio-dark'),
};

/**
 * Preset products for common scenarios
 */
export const PRESET_PRODUCTS = {
  digitalPhoto: createTestProduct({
    id: 'digital-photo',
    name: 'Foto Digital',
    type: 'digital',
    price: 1500,
  }),
  physicalPrint: createTestProduct({
    id: 'physical-print',
    name: 'Impresión 10x15',
    type: 'physical',
    price: 3000,
  }),
  premiumPrint: createTestProduct({
    id: 'premium-print',
    name: 'Impresión Premium 20x30',
    type: 'physical',
    price: 5000,
    options: {
      sizes: ['20x30'],
      quality: 'premium',
    },
  }),
  disabled: createTestProduct({
    id: 'disabled-product',
    name: 'Disabled Product',
    enabled: false,
  }),
};
