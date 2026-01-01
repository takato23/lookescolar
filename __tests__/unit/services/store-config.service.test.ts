import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestClient, setupMocks } from '../../test-utils';
import {
  fetchStoreConfig,
  saveStoreConfig,
  validateProductStructure,
  getTotalEnabledProducts,
  getTotalValue,
  getActiveProducts,
  getDefaultConfig,
} from '@/lib/services/store-config.service';
import type { StoreConfig } from '@/lib/validations/store-config';

// Setup mocks
setupMocks();

describe('Store Config Service - Unit Tests', () => {
  let supabase: ReturnType<typeof createTestClient>;
  let testEventId: string;
  let testConfig: StoreConfig;

  beforeEach(async () => {
    supabase = createTestClient();
    testEventId = crypto.randomUUID();

    // Create test event
    await supabase.from('events').insert({
      id: testEventId,
      name: 'Test Event',
      school: 'Test School',
      school_name: 'Test School',
      date: '2024-12-01',
      status: 'active',
    });

    // Default test config
    testConfig = {
      enabled: true,
      template: 'pixieset',
      currency: 'ARS',
      tax_rate: 0,
      shipping_enabled: true,
      shipping_price: 50000,
      payment_methods: ['mercadopago'],
      products: [
        {
          id: 'digital-photo',
          name: 'Foto Digital',
          type: 'digital',
          enabled: true,
          price: 1500,
          description: 'Foto digital en alta resolución',
          options: {
            formats: ['JPG', 'PNG'],
            quality: 'premium',
          },
        },
      ],
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
        hero_subtitle: 'Encuentra tus mejores momentos',
        footer_text: '© 2024 Test School',
        contact_email: 'test@example.com',
        contact_phone: '+54911234567',
        terms_url: 'https://example.com/terms',
        privacy_url: 'https://example.com/privacy',
      },
    };
  });

  afterEach(async () => {
    // Cleanup
    await supabase.from('store_settings').delete().eq('event_id', testEventId);
    await supabase.from('events').delete().eq('id', testEventId);
  });

  describe('CRUD Operations', () => {
    test('should create store config successfully', async () => {
      const result = await saveStoreConfig(testEventId, testConfig);

      expect(result).toBeDefined();
      expect(result.enabled).toBe(true);
      expect(result.template).toBe('pixieset');
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Foto Digital');
    });

    test('should get store config by event_id', async () => {
      // Create config first
      await saveStoreConfig(testEventId, testConfig);

      // Fetch it
      const result = await fetchStoreConfig(testEventId);

      expect(result).toBeDefined();
      expect(result.enabled).toBe(true);
      expect(result.products).toHaveLength(1);
    });

    test('should update existing store config', async () => {
      // Create initial config
      await saveStoreConfig(testEventId, testConfig);

      // Update config
      const updatedConfig = {
        ...testConfig,
        enabled: false,
        products: [
          ...testConfig.products,
          {
            id: 'physical-print',
            name: 'Impresión 10x15',
            type: 'physical' as const,
            enabled: true,
            price: 3000,
            description: 'Impresión física',
          },
        ],
      };

      const result = await saveStoreConfig(testEventId, updatedConfig);

      expect(result.enabled).toBe(false);
      expect(result.products).toHaveLength(2);
      expect(result.products[1].name).toBe('Impresión 10x15');
    });

    test('should return default config when none exists', async () => {
      const nonExistentEventId = crypto.randomUUID();

      // Create event
      await supabase.from('events').insert({
        id: nonExistentEventId,
        name: 'New Event',
        school: 'New School',
        school_name: 'New School',
        date: '2024-12-01',
        status: 'active',
      });

      const result = await fetchStoreConfig(nonExistentEventId);

      expect(result).toBeDefined();
      expect(result.enabled).toBe(false); // Default value

      // Cleanup
      await supabase.from('events').delete().eq('id', nonExistentEventId);
    });

    test('should handle null event_id for global config', async () => {
      const defaultConfig = getDefaultConfig();
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.template).toBe('pixieset');
      expect(defaultConfig.currency).toBe('ARS');
    });
  });

  describe('Validation', () => {
    test('should validate template type', () => {
      const validTemplates = [
        'pixieset',
        'editorial',
        'minimal',
        'modern-minimal',
        'studio-dark',
      ];

      validTemplates.forEach((template) => {
        const config = { ...testConfig, template: template as any };
        expect(() => saveStoreConfig(testEventId, config)).not.toThrow();
      });
    });

    test('should validate brand colors format', async () => {
      const validConfig = {
        ...testConfig,
        colors: {
          primary: '#FF5733',
          secondary: '#33FF57',
          accent: '#3357FF',
          background: '#FFFFFF',
          surface: '#F0F0F0',
          text: '#000000',
          text_secondary: '#666666',
        },
      };

      const result = await saveStoreConfig(testEventId, validConfig);
      expect(result.colors?.primary).toBe('#FF5733');
    });

    test('should reject invalid color schemes', async () => {
      const invalidConfig = {
        ...testConfig,
        colors: {
          ...testConfig.colors!,
          primary: 'invalid-color', // Invalid hex
        },
      };

      await expect(saveStoreConfig(testEventId, invalidConfig as any)).rejects.toThrow();
    });

    test('should validate product structure', () => {
      const validProduct = {
        id: 'test-product',
        name: 'Test Product',
        type: 'digital',
        enabled: true,
        price: 1000,
        description: 'Test description',
      };

      const result = validateProductStructure(validProduct);
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Product');
    });

    test('should reject invalid product structure', () => {
      const invalidProduct = {
        id: 'test',
        name: '', // Empty name
        type: 'invalid', // Invalid type
        price: -100, // Negative price
      };

      expect(() => validateProductStructure(invalidProduct)).toThrow();
    });

    test('should validate price is positive integer', () => {
      const productWithNegativePrice = {
        id: 'negative-price',
        name: 'Test',
        type: 'digital',
        price: -500,
      };

      expect(() => validateProductStructure(productWithNegativePrice)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty products array', async () => {
      const configWithNoProducts = {
        ...testConfig,
        products: [],
      };

      // Should fail validation - at least one product required
      await expect(saveStoreConfig(testEventId, configWithNoProducts as any)).rejects.toThrow();
    });

    test('should handle maximum products limit', async () => {
      const manyProducts = Array.from({ length: 51 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        type: 'digital' as const,
        enabled: true,
        price: 1000,
      }));

      const configWithManyProducts = {
        ...testConfig,
        products: manyProducts,
      };

      // Should fail validation - max 50 products
      await expect(
        saveStoreConfig(testEventId, configWithManyProducts as any)
      ).rejects.toThrow();
    });

    test('should sanitize dangerous HTML in text fields', async () => {
      const configWithDangerousHTML = {
        ...testConfig,
        texts: {
          ...testConfig.texts!,
          hero_title: '<script>alert("XSS")</script>Gallery',
          footer_text: 'Footer<img src=x onerror=alert(1)>',
        },
      };

      const result = await saveStoreConfig(testEventId, configWithDangerousHTML);

      // HTML should be stripped/sanitized
      expect(result.texts?.hero_title).not.toContain('<script>');
      expect(result.texts?.footer_text).not.toContain('onerror=');
    });

    test('should handle unicode characters in text fields', async () => {
      const configWithUnicode = {
        ...testConfig,
        texts: {
          ...testConfig.texts!,
          hero_title: 'Galería 📸 Fotográfica',
          hero_subtitle: 'Momentos únicos ✨',
        },
      };

      const result = await saveStoreConfig(testEventId, configWithUnicode);
      expect(result.texts?.hero_title).toContain('📸');
    });

    test('should handle long text fields within limits', async () => {
      const longTitle = 'A'.repeat(100); // Max length
      const tooLongTitle = 'A'.repeat(101); // Over limit

      const validConfig = {
        ...testConfig,
        texts: {
          ...testConfig.texts!,
          hero_title: longTitle,
        },
      };

      const invalidConfig = {
        ...testConfig,
        texts: {
          ...testConfig.texts!,
          hero_title: tooLongTitle,
        },
      };

      await expect(saveStoreConfig(testEventId, validConfig)).resolves.toBeDefined();
      await expect(saveStoreConfig(testEventId, invalidConfig as any)).rejects.toThrow();
    });
  });

  describe('Helper Functions', () => {
    test('should calculate total enabled products', () => {
      const config = {
        ...testConfig,
        products: [
          { ...testConfig.products[0], enabled: true },
          { id: 'p2', name: 'P2', type: 'digital' as const, enabled: false, price: 2000 },
          { id: 'p3', name: 'P3', type: 'digital' as const, enabled: true, price: 3000 },
        ],
      };

      const total = getTotalEnabledProducts(config);
      expect(total).toBe(2);
    });

    test('should calculate total value of enabled products', () => {
      const config = {
        ...testConfig,
        products: [
          { ...testConfig.products[0], price: 1500, enabled: true },
          { id: 'p2', name: 'P2', type: 'digital' as const, enabled: false, price: 2000 },
          { id: 'p3', name: 'P3', type: 'digital' as const, enabled: true, price: 3500 },
        ],
      };

      const total = getTotalValue(config);
      expect(total).toBe(5000); // 1500 + 3500
    });

    test('should get only active products', () => {
      const config = {
        ...testConfig,
        products: [
          { ...testConfig.products[0], enabled: true },
          { id: 'p2', name: 'P2', type: 'digital' as const, enabled: false, price: 2000 },
          { id: 'p3', name: 'P3', type: 'digital' as const, enabled: true, price: 3000 },
        ],
      };

      const active = getActiveProducts(config);
      expect(active).toHaveLength(2);
      expect(active.every((p) => p.enabled)).toBe(true);
    });

    test('should handle empty active products', () => {
      const config = {
        ...testConfig,
        products: [
          { ...testConfig.products[0], enabled: false },
        ],
      };

      const active = getActiveProducts(config);
      expect(active).toHaveLength(0);
    });
  });

  describe('Currency and Pricing', () => {
    test('should support multiple currencies', async () => {
      const currencies = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'PEN', 'COP', 'MXN'];

      for (const currency of currencies) {
        const config = { ...testConfig, currency: currency as any };
        const result = await saveStoreConfig(testEventId, config);
        expect(result.currency).toBe(currency);
      }
    });

    test('should reject invalid currency', async () => {
      const configWithInvalidCurrency = {
        ...testConfig,
        currency: 'INVALID',
      };

      await expect(
        saveStoreConfig(testEventId, configWithInvalidCurrency as any)
      ).rejects.toThrow();
    });

    test('should validate tax_rate range', async () => {
      const validTaxRates = [0, 10.5, 21, 50, 100];
      const invalidTaxRates = [-5, 150];

      for (const rate of validTaxRates) {
        const config = { ...testConfig, tax_rate: rate };
        await expect(saveStoreConfig(testEventId, config)).resolves.toBeDefined();
      }

      for (const rate of invalidTaxRates) {
        const config = { ...testConfig, tax_rate: rate };
        await expect(saveStoreConfig(testEventId, config as any)).rejects.toThrow();
      }
    });

    test('should validate shipping_price is positive', async () => {
      const validConfig = { ...testConfig, shipping_price: 5000 };
      const invalidConfig = { ...testConfig, shipping_price: -1000 };

      await expect(saveStoreConfig(testEventId, validConfig)).resolves.toBeDefined();
      await expect(saveStoreConfig(testEventId, invalidConfig as any)).rejects.toThrow();
    });
  });

  describe('Product Options', () => {
    test('should handle product with multiple format options', () => {
      const product = {
        id: 'multi-format',
        name: 'Multi-Format Photo',
        type: 'digital' as const,
        enabled: true,
        price: 2000,
        options: {
          formats: ['JPG', 'PNG', 'TIFF', 'RAW'],
          quality: 'premium' as const,
        },
      };

      const validated = validateProductStructure(product);
      expect(validated.options?.formats).toHaveLength(4);
    });

    test('should handle product with size options', () => {
      const product = {
        id: 'sized-print',
        name: 'Sized Print',
        type: 'physical' as const,
        enabled: true,
        price: 3000,
        options: {
          sizes: ['10x15', '13x18', '20x30'],
        },
      };

      const validated = validateProductStructure(product);
      expect(validated.options?.sizes).toHaveLength(3);
    });

    test('should limit maximum options', () => {
      const tooManySizes = Array.from({ length: 11 }, (_, i) => `size-${i}`);
      const product = {
        id: 'too-many-options',
        name: 'Test',
        type: 'physical' as const,
        price: 1000,
        options: {
          sizes: tooManySizes,
        },
      };

      expect(() => validateProductStructure(product)).toThrow();
    });
  });
});
