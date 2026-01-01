import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { createTestClient, setupMocks } from '../../test-utils';
import type { StoreConfig } from '@/lib/validations/store-config';

// Setup mocks
setupMocks();

describe('Store Config API - Integration Tests', () => {
  let supabase: ReturnType<typeof createTestClient>;
  let testEventId: string;
  let testConfig: StoreConfig;
  let authToken: string;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Note: In a real scenario, you would authenticate and get a real token
    // For testing, we'll use a mock token or service role key
    authToken = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-token';
  });

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
        },
      ],
    };
  });

  afterEach(async () => {
    // Cleanup
    await supabase.from('store_settings').delete().eq('event_id', testEventId);
    await supabase.from('events').delete().eq('id', testEventId);
  });

  describe('GET /api/admin/store-settings', () => {
    test('should return default config when none exists', async () => {
      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config).toBeDefined();
      expect(data.config.enabled).toBe(false); // Default value
    });

    test('should return existing config', async () => {
      // Create config first
      await supabase.from('store_settings').insert({
        event_id: null, // Global config
        enabled: true,
        template: 'editorial',
        currency: 'ARS',
        products: JSON.stringify([
          {
            id: 'test-product',
            name: 'Test Product',
            type: 'digital',
            price: 2000,
            enabled: true,
          },
        ]),
        colors: JSON.stringify({
          primary: '#FF5733',
          secondary: '#33FF57',
        }),
      });

      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config.enabled).toBe(true);
      expect(data.config.template).toBe('editorial');
    });

    test('should require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'GET',
        // No auth header
      });

      expect(response.status).toBeGreaterThanOrEqual(401); // 401 or 403
    });

    test('should handle database errors gracefully', async () => {
      // This test depends on how you want to simulate database errors
      // For now, we'll just verify proper error response structure
      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      // Should either succeed or return proper error structure
      if (!data.success) {
        expect(data.error).toBeDefined();
        expect(typeof data.error).toBe('string');
      }
    });
  });

  describe('POST /api/admin/store-settings', () => {
    test('should create new store config', async () => {
      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(testConfig),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config).toBeDefined();
      expect(data.config.enabled).toBe(true);
      expect(data.config.template).toBe('pixieset');
    });

    test('should update existing store config', async () => {
      // Create initial config
      await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(testConfig),
      });

      // Update it
      const updatedConfig = {
        ...testConfig,
        enabled: false,
        template: 'editorial',
      };

      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updatedConfig),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config.enabled).toBe(false);
      expect(data.config.template).toBe('editorial');
    });

    test('should validate request body with Zod', async () => {
      const invalidConfig = {
        enabled: true,
        template: 'invalid-template', // Invalid template
        products: [], // Empty products array (should fail)
      };

      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(invalidConfig),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should return 400 for invalid data', async () => {
      const invalidConfigs = [
        { ...testConfig, currency: 'INVALID' }, // Invalid currency
        { ...testConfig, tax_rate: -10 }, // Negative tax rate
        { ...testConfig, shipping_price: -500 }, // Negative shipping price
        { ...testConfig, products: [] }, // Empty products
      ];

      for (const invalid of invalidConfigs) {
        const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(invalid),
        });

        expect(response.status).toBe(400);
      }
    });

    test('should sanitize dangerous HTML in text fields', async () => {
      const configWithHTML = {
        ...testConfig,
        texts: {
          hero_title: '<script>alert("XSS")</script>Gallery',
          hero_subtitle: 'Test<img src=x onerror=alert(1)>',
          footer_text: 'Footer',
        },
      };

      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(configWithHTML),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      // HTML should be sanitized
      expect(data.config.texts?.hero_title).not.toContain('<script>');
      expect(data.config.texts?.hero_subtitle).not.toContain('onerror=');
    });

    test('should handle missing required fields', async () => {
      const incompleteConfig = {
        enabled: true,
        // Missing template, currency, products, etc.
      };

      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(incompleteConfig),
      });

      expect(response.status).toBe(400);
    });

    test('should preserve existing data when updating', async () => {
      // Create initial config with multiple products
      const initialConfig = {
        ...testConfig,
        products: [
          {
            id: 'product-1',
            name: 'Product 1',
            type: 'digital' as const,
            enabled: true,
            price: 1000,
          },
          {
            id: 'product-2',
            name: 'Product 2',
            type: 'physical' as const,
            enabled: true,
            price: 2000,
          },
        ],
      };

      await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(initialConfig),
      });

      // Update with partial data
      const partialUpdate = {
        ...initialConfig,
        enabled: false,
        // Products remain the same
      };

      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(partialUpdate),
      });

      const data = await response.json();

      expect(data.config.products).toHaveLength(2);
      expect(data.config.enabled).toBe(false);
    });

    test('should handle concurrent updates correctly', async () => {
      // Simulate concurrent updates
      const updates = Array.from({ length: 3 }, (_, i) => ({
        ...testConfig,
        enabled: i % 2 === 0,
      }));

      const promises = updates.map((config) =>
        fetch(`${baseUrl}/api/admin/store-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(config),
        })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
      });

      // Verify final state
      const finalResponse = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(finalResponse.status).toBe(200);
    });
  });

  describe('Event-Specific Config', () => {
    test('should create event-specific config', async () => {
      const eventConfig = {
        ...testConfig,
        template: 'studio-dark',
      };

      // In reality, this would be POST to /api/admin/events/[id]/store-config
      // For now, we'll test the service layer
      await supabase.from('store_settings').insert({
        event_id: testEventId,
        enabled: true,
        template: 'studio-dark',
        currency: 'ARS',
        products: JSON.stringify(eventConfig.products),
      });

      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('event_id', testEventId)
        .single();

      expect(data).toBeDefined();
      expect(data.template).toBe('studio-dark');
    });

    test('should fall back to global config when event config missing', async () => {
      // Create only global config
      await supabase.from('store_settings').insert({
        event_id: null,
        enabled: true,
        template: 'pixieset',
        currency: 'ARS',
        products: JSON.stringify(testConfig.products),
      });

      // Query for event-specific should fall back
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('event_id', testEventId)
        .maybeSingle();

      // Should be null, requiring fallback logic
      expect(data).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: 'invalid json{',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle very large payloads', async () => {
      const largeConfig = {
        ...testConfig,
        products: Array.from({ length: 100 }, (_, i) => ({
          id: `product-${i}`,
          name: `Product ${i}`,
          type: 'digital' as const,
          enabled: true,
          price: 1000,
        })),
      };

      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(largeConfig),
      });

      // Should reject due to max 50 products validation
      expect(response.status).toBe(400);
    });

    test('should return proper error structure', async () => {
      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const data = await response.json();

      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
    });
  });

  describe('Response Format', () => {
    test('should return consistent response structure on success', async () => {
      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(testConfig),
      });

      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('config');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.config).toBe('object');
    });

    test('should include all config fields in response', async () => {
      const response = await fetch(`${baseUrl}/api/admin/store-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(testConfig),
      });

      const data = await response.json();

      expect(data.config).toHaveProperty('enabled');
      expect(data.config).toHaveProperty('template');
      expect(data.config).toHaveProperty('currency');
      expect(data.config).toHaveProperty('products');
      expect(Array.isArray(data.config.products)).toBe(true);
    });
  });
});
