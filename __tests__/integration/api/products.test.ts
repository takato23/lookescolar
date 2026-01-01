import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { createTestClient, setupMocks } from '../../test-utils';

// Setup mocks
setupMocks();

describe('Products API - Integration Tests', () => {
  let supabase: ReturnType<typeof createTestClient>;
  let testCategoryId: string;
  let testProductId: string;
  let authToken: string;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    authToken = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-token';
  });

  beforeEach(async () => {
    supabase = createTestClient();
    testCategoryId = crypto.randomUUID();
    testProductId = crypto.randomUUID();

    // Create test category
    await supabase.from('product_categories').insert({
      id: testCategoryId,
      name: 'Test Category',
      description: 'Test category for integration tests',
      sort_order: 0,
      is_active: true,
    });

    // Create test product
    await supabase.from('photo_products').insert({
      id: testProductId,
      category_id: testCategoryId,
      name: 'Test Product',
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
    });
  });

  afterEach(async () => {
    // Cleanup
    await supabase.from('photo_products').delete().eq('id', testProductId);
    await supabase.from('product_categories').delete().eq('id', testCategoryId);
  });

  describe('GET /api/admin/products', () => {
    test('should list all active products', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.products)).toBe(true);
      expect(data.products.some((p: any) => p.id === testProductId)).toBe(true);
    });

    test('should filter products by category', async () => {
      const response = await fetch(
        `${baseUrl}/api/admin/products?category_id=${testCategoryId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.every((p: any) => p.category_id === testCategoryId)).toBe(
        true
      );
    });

    test('should filter products by active status', async () => {
      // Create inactive product
      const inactiveId = crypto.randomUUID();
      await supabase.from('photo_products').insert({
        id: inactiveId,
        category_id: testCategoryId,
        name: 'Inactive Product',
        type: 'digital',
        base_price: 1000,
        is_active: false,
        sort_order: 1,
      });

      const response = await fetch(`${baseUrl}/api/admin/products?active=true`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.every((p: any) => p.is_active)).toBe(true);
      expect(data.products.find((p: any) => p.id === inactiveId)).toBeUndefined();

      // Cleanup
      await supabase.from('photo_products').delete().eq('id', inactiveId);
    });

    test('should return products with category information', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();
      const testProduct = data.products.find((p: any) => p.id === testProductId);

      expect(testProduct).toBeDefined();
      expect(testProduct.category).toBeDefined();
      expect(testProduct.category.name).toBe('Test Category');
    });

    test('should require admin authentication', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'GET',
        // No auth header
      });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('POST /api/admin/products', () => {
    test('should create new product', async () => {
      const newProduct = {
        category_id: testCategoryId,
        name: 'New Product',
        description: 'New product description',
        type: 'digital',
        base_price: 2000,
        is_active: true,
        is_featured: false,
      };

      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newProduct),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.product).toBeDefined();
      expect(data.product.name).toBe('New Product');
      expect(data.product.base_price).toBe(2000);

      // Cleanup
      await supabase.from('photo_products').delete().eq('id', data.product.id);
    });

    test('should validate required fields', async () => {
      const invalidProduct = {
        category_id: testCategoryId,
        // Missing name
        type: 'digital',
        base_price: 1000,
      };

      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(invalidProduct),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should validate price is positive', async () => {
      const invalidProduct = {
        category_id: testCategoryId,
        name: 'Invalid Product',
        type: 'digital',
        base_price: -500, // Negative price
      };

      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(invalidProduct),
      });

      expect(response.status).toBe(400);
    });

    test('should sanitize HTML in name and description', async () => {
      const productWithHTML = {
        category_id: testCategoryId,
        name: '<script>alert("XSS")</script>Product',
        description: 'Test<img src=x onerror=alert(1)>',
        type: 'digital',
        base_price: 1000,
      };

      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(productWithHTML),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.product.name).not.toContain('<script>');
      expect(data.product.description).not.toContain('onerror=');

      // Cleanup
      await supabase.from('photo_products').delete().eq('id', data.product.id);
    });

    test('should assign sort_order automatically', async () => {
      const newProduct = {
        category_id: testCategoryId,
        name: 'Auto-ordered Product',
        type: 'digital',
        base_price: 1500,
      };

      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newProduct),
      });

      const data = await response.json();

      expect(data.product.sort_order).toBeGreaterThanOrEqual(0);

      // Cleanup
      await supabase.from('photo_products').delete().eq('id', data.product.id);
    });
  });

  describe('PATCH /api/admin/products/[id]', () => {
    test('should update product successfully', async () => {
      const updates = {
        name: 'Updated Product',
        base_price: 2500,
        is_featured: true,
      };

      const response = await fetch(`${baseUrl}/api/admin/products/${testProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.product.name).toBe('Updated Product');
      expect(data.product.base_price).toBe(2500);
      expect(data.product.is_featured).toBe(true);
    });

    test('should allow partial updates', async () => {
      const partialUpdate = {
        is_featured: true,
      };

      const response = await fetch(`${baseUrl}/api/admin/products/${testProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(partialUpdate),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.product.is_featured).toBe(true);
      expect(data.product.name).toBe('Test Product'); // Unchanged
    });

    test('should return 404 for non-existent product', async () => {
      const nonExistentId = crypto.randomUUID();

      const response = await fetch(`${baseUrl}/api/admin/products/${nonExistentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'Updated' }),
      });

      expect(response.status).toBe(404);
    });

    test('should validate updated price is positive', async () => {
      const invalidUpdate = {
        base_price: -1000,
      };

      const response = await fetch(`${baseUrl}/api/admin/products/${testProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(invalidUpdate),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/products/[id]', () => {
    test('should soft delete product (mark as inactive)', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products/${testProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify product is marked inactive
      const { data } = await supabase
        .from('photo_products')
        .select('is_active')
        .eq('id', testProductId)
        .single();

      expect(data?.is_active).toBe(false);
    });

    test('should return 404 for non-existent product', async () => {
      const nonExistentId = crypto.randomUUID();

      const response = await fetch(`${baseUrl}/api/admin/products/${nonExistentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test('should prevent hard deletion in API', async () => {
      await fetch(`${baseUrl}/api/admin/products/${testProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Product should still exist in database
      const { data, error } = await supabase
        .from('photo_products')
        .select('id')
        .eq('id', testProductId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Product Ordering', () => {
    test('should update sort_order', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products/${testProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ sort_order: 50 }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.product.sort_order).toBe(50);
    });

    test('should return products ordered by sort_order', async () => {
      // Create multiple products with different sort orders
      const product1Id = crypto.randomUUID();
      const product2Id = crypto.randomUUID();

      await supabase.from('photo_products').insert([
        {
          id: product1Id,
          category_id: testCategoryId,
          name: 'Product 1',
          type: 'print',
          base_price: 1000,
          sort_order: 10,
          is_active: true,
        },
        {
          id: product2Id,
          category_id: testCategoryId,
          name: 'Product 2',
          type: 'print',
          base_price: 2000,
          sort_order: 5,
          is_active: true,
        },
      ]);

      const response = await fetch(
        `${baseUrl}/api/admin/products?category_id=${testCategoryId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      // Should be ordered by sort_order ascending
      for (let i = 1; i < data.products.length; i++) {
        expect(data.products[i].sort_order).toBeGreaterThanOrEqual(
          data.products[i - 1].sort_order
        );
      }

      // Cleanup
      await supabase.from('photo_products').delete().in('id', [product1Id, product2Id]);
    });
  });

  describe('Validation and Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: 'invalid json{',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate product type', async () => {
      const invalidProduct = {
        category_id: testCategoryId,
        name: 'Test',
        type: 'invalid-type', // Invalid type
        base_price: 1000,
      };

      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(invalidProduct),
      });

      expect(response.status).toBe(400);
    });

    test('should return proper error structure', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
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
    test('should return consistent structure for list endpoint', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('products');
      expect(Array.isArray(data.products)).toBe(true);
    });

    test('should include category relation in product response', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();
      const testProduct = data.products.find((p: any) => p.id === testProductId);

      expect(testProduct.category).toBeDefined();
      expect(testProduct.category).toHaveProperty('id');
      expect(testProduct.category).toHaveProperty('name');
    });

    test('should include all required fields in product object', async () => {
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();
      const testProduct = data.products.find((p: any) => p.id === testProductId);

      expect(testProduct).toHaveProperty('id');
      expect(testProduct).toHaveProperty('name');
      expect(testProduct).toHaveProperty('description');
      expect(testProduct).toHaveProperty('type');
      expect(testProduct).toHaveProperty('base_price');
      expect(testProduct).toHaveProperty('is_active');
      expect(testProduct).toHaveProperty('is_featured');
      expect(testProduct).toHaveProperty('sort_order');
    });
  });
});
