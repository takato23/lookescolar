import { sanitizeInput, StoreConfig, StoreProduct, validateStoreConfig } from '@/lib/validations/store-config';

type RawDbProducts = Record<string, any> | Array<any> | null | undefined;
type RawPaymentMethods = Record<string, any> | Array<string> | null | undefined;

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function coercePrice(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return 0;
}

function coerceBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'yes', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'no', 'disabled'].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeProductId(value: unknown, fallback = 'producto'): string {
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (cleaned.length > 0) {
      return cleaned;
    }
  }
  return fallback;
}

function sanitizeProductText(value: string): string {
  return sanitizeInput(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

const BASE_PRODUCTS: StoreProduct[] = [
  {
    id: 'opcionA',
    name: 'Opción A',
    type: 'physical',
    enabled: true,
    price: 200000,
    description:
      'Carpeta impresa con diseño personalizado (20x30) Que contiene: 1 foto INDIVIDUAL (15x21)+ 4 fotos 4x5 (de la misma que la individual elegida) + foto grupal (15x21)',
    options: {
      sizes: ['20x30', '15x21', '4x5'],
      formats: ['Carpeta Personalizada'],
      quality: 'premium'
    }
  },
  {
    id: 'opcionB',
    name: 'Opción B',
    type: 'physical',
    enabled: true,
    price: 250000,
    description:
      'Carpeta impresa con diseño personalizado (20x30) Que contiene: 2 fotos INDIVIDUALES (15x21) + 8 fotos 4x5 (de las mismas que las individuales elegidas) + foto grupal (15x21)',
    options: {
      sizes: ['20x30', '15x21', '4x5'],
      formats: ['Carpeta Personalizada'],
      quality: 'premium'
    }
  },
  {
    id: 'copy_4x5',
    name: '4x5 cm (4 fotitos)',
    type: 'physical',
    enabled: true,
    price: 60000,
    description: 'Set de 4 fotos de la misma imagen en tamaño 4x5 cm',
    options: {
      sizes: ['4x5'],
      formats: ['Set de 4'],
      quality: 'standard'
    }
  },
  {
    id: 'copy_10x15',
    name: '10x15 cm',
    type: 'physical',
    enabled: true,
    price: 80000,
    description: 'Foto individual de 10x15 cm',
    options: {
      sizes: ['10x15'],
      formats: ['Impreso'],
      quality: 'standard'
    }
  },
  {
    id: 'copy_13x18',
    name: '13x18 cm',
    type: 'physical',
    enabled: true,
    price: 100000,
    description: 'Foto individual de 13x18 cm',
    options: {
      sizes: ['13x18'],
      formats: ['Impreso'],
      quality: 'standard'
    }
  },
  {
    id: 'copy_15x21',
    name: '15x21 cm',
    type: 'physical',
    enabled: true,
    price: 120000,
    description: 'Foto individual de 15x21 cm',
    options: {
      sizes: ['15x21'],
      formats: ['Impreso'],
      quality: 'standard'
    }
  },
  {
    id: 'copy_20x30',
    name: '20x30 cm',
    type: 'physical',
    enabled: true,
    price: 200000,
    description: 'Foto individual de 20x30 cm',
    options: {
      sizes: ['20x30'],
      formats: ['Impreso'],
      quality: 'premium'
    }
  }
];

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function getDefaultConfig(): StoreConfig {
  return {
    enabled: false,
    currency: 'ARS',
    tax_rate: 0,
    shipping_enabled: true,
    shipping_price: 50000,
    payment_methods: ['mercadopago'],
    products: deepClone(BASE_PRODUCTS)
  };
}

function normalizeProductFromEntry(id: string, product: any): StoreProduct {
  const fallbackId = normalizeProductId(id);
  const rawName =
    product?.name ?? product?.title ?? product?.label ?? fallbackId;
  const safeName = sanitizeProductText(String(rawName)) || fallbackId;
  const descriptionSource = product?.description ?? product?.details ?? '';
  const safeDescription = sanitizeInput(String(descriptionSource));
  const productType =
    typeof product?.type === 'string' && product.type.toLowerCase() === 'digital'
      ? 'digital'
      : 'physical';

  const rawOptions = product?.features ?? product?.options;
  let options: StoreProduct['options'] | undefined;
  if (isPlainObject(rawOptions)) {
    const sizes = Array.isArray(rawOptions.sizes)
      ? rawOptions.sizes
          .map((size: any) => sanitizeProductText(String(size || '')))
          .filter(Boolean)
      : undefined;
    const formats = Array.isArray(rawOptions.formats)
      ? rawOptions.formats
          .map((format: any) => sanitizeProductText(String(format || '')))
          .filter(Boolean)
      : undefined;
    const quality = typeof rawOptions.quality === 'string'
      ? (rawOptions.quality.toLowerCase() === 'premium'
          ? 'premium'
          : rawOptions.quality.toLowerCase() === 'standard'
          ? 'standard'
          : undefined)
      : undefined;

    if ((sizes && sizes.length) || (formats && formats.length) || quality) {
      options = { sizes, formats, quality };
    }
  }

  return {
    id: fallbackId,
    name: safeName,
    type: productType,
    enabled: coerceBoolean(product?.enabled, true),
    price: coercePrice(product?.price),
    description: safeDescription || undefined,
    options
  };
}

function convertArrayProducts(raw: any[]): StoreProduct[] {
  return raw
    .map((product, index) => {
      if (!isPlainObject(product)) {
        return null;
      }
      const productId = normalizeProductId(product.id, `producto_${index}`);
      return normalizeProductFromEntry(productId, product);
    })
    .filter((product): product is StoreProduct => Boolean(product?.id));
}

function convertMapProducts(raw: Record<string, any>): StoreProduct[] {
  const products: StoreProduct[] = [];

  Object.entries(raw).forEach(([id, value]) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      products.push(...convertArrayProducts(value));
      return;
    }

    if (Array.isArray((value as any).items)) {
      products.push(...convertArrayProducts((value as any).items));
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    const productId = normalizeProductId(value.id, normalizeProductId(id));
    products.push(normalizeProductFromEntry(productId, value));
  });

  return products;
}

function convertPaymentMethods(raw: RawPaymentMethods): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((method): method is string => typeof method === 'string');
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([_, value]) => {
        if (typeof value === 'boolean') return value;
        if (value && typeof value === 'object') {
          return value.enabled !== false;
        }
        return true;
      })
      .map(([method]) => method);
  }

  return ['mercadopago'];
}

export function convertDbToUiConfig(dbConfig: Record<string, any> | null | undefined): StoreConfig {
  if (!dbConfig) {
    return getDefaultConfig();
  }

  const productsField: RawDbProducts = dbConfig.products;
  const uiProducts = Array.isArray(productsField)
    ? convertArrayProducts(productsField)
    : convertMapProducts(productsField || {});

  const config: StoreConfig = {
    enabled: dbConfig.enabled ?? false,
    products: uiProducts.length > 0 ? uiProducts : getDefaultConfig().products,
    currency: (dbConfig.currency ?? 'ARS') as StoreConfig['currency'],
    tax_rate: typeof dbConfig.tax_rate === 'number' ? dbConfig.tax_rate : Number(dbConfig.tax_rate) || 0,
    shipping_enabled: dbConfig.shipping_enabled !== false,
    shipping_price:
      typeof dbConfig.shipping_price === 'number'
        ? dbConfig.shipping_price
        : Number(dbConfig.shipping_price) || 50000,
    payment_methods: convertPaymentMethods(dbConfig.payment_methods)
  };

  return validateStoreConfig(config);
}

export function convertUiToDbConfig(uiConfig: StoreConfig, eventId?: string | null): Record<string, any> {
  const validated = validateStoreConfig(uiConfig);

  const products = validated.products.reduce<Record<string, any>>((acc, product) => {
    acc[product.id] = {
      name: product.name,
      description: product.description,
      price: product.price,
      enabled: product.enabled,
      type: product.type === 'physical' ? 'package' : product.type,
      features: product.options ?? {}
    };
    return acc;
  }, {});

  const paymentMethods = validated.payment_methods.reduce<Record<string, any>>((acc, method) => {
    acc[method] = {
      enabled: true,
      name: method === 'mercadopago' ? 'MercadoPago' : method,
      description: `Pago con ${method}`
    };
    return acc;
  }, {});

  return {
    event_id: eventId ?? null,
    enabled: validated.enabled,
    currency: validated.currency,
    tax_rate: validated.tax_rate,
    shipping_enabled: validated.shipping_enabled,
    shipping_price: validated.shipping_price,
    products,
    payment_methods: paymentMethods,
    updated_at: new Date().toISOString()
  };
}

export function cloneConfig(config: StoreConfig): StoreConfig {
  return deepClone(config);
}

export function mergeWithDefaults(config: Partial<StoreConfig> | undefined | null): StoreConfig {
  if (!config) return getDefaultConfig();
  const base = getDefaultConfig();
  return {
    ...base,
    ...config,
    products: config.products && config.products.length > 0 ? deepClone(config.products) : deepClone(base.products)
  };
}
