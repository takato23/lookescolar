import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient, setupMocks } from '../../test-utils';
import { productCatalogService } from '@/lib/services/product-catalog';
import type {
  ProductCategory,
  PhotoProduct,
  ComboPackage,
  ProductFilters,
} from '@/lib/types/products';

// Setup mocks
setupMocks();

describe('Product Catalog Service - Unit Tests', () => {
  let supabase: ReturnType<typeof createTestClient>;
  let testCategoryId: string;
  let testProductId: string;
  let testComboId: string;
  let testEventId: string;

  beforeEach(async () => {
    supabase = createTestClient();
    testCategoryId = crypto.randomUUID();
    testProductId = crypto.randomUUID();
    testComboId = crypto.randomUUID();
    testEventId = crypto.randomUUID();

    // Create test category
    await supabase.from('product_categories').insert({
      id: testCategoryId,
      name: 'Test Category',
      description: 'Test category for photos',
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

    // Create test event
    await supabase.from('events').insert({
      id: testEventId,
      name: 'Test Event',
      school: 'Test School',
      school_name: 'Test School',
      date: '2024-12-01',
      status: 'active',
    });
  });

  afterEach(async () => {
    // Cleanup in reverse order
    await supabase.from('event_product_pricing').delete().eq('event_id', testEventId);
    await supabase.from('combo_package_items').delete().eq('combo_id', testComboId);
    await supabase.from('combo_packages').delete().eq('id', testComboId);
    await supabase.from('photo_products').delete().eq('id', testProductId);
    await supabase.from('product_categories').delete().eq('id', testCategoryId);
    await supabase.from('events').delete().eq('id', testEventId);
  });

  describe('Product CRUD Operations', () => {
    test('should create product successfully', async () => {
      const newProduct = {
        category_id: testCategoryId,
        name: 'New Product',
        description: 'New product description',
        type: 'digital' as const,
        base_price: 2000,
        is_active: true,
      };

      const result = await productCatalogService.createProduct(newProduct);

      expect(result).toBeDefined();
      expect(result.name).toBe('New Product');
      expect(result.base_price).toBe(2000);
      expect(result.category).toBeDefined();

      // Cleanup
      await supabase.from('photo_products').delete().eq('id', result.id);
    });

    test('should get product by ID', async () => {
      const result = await productCatalogService.getProductById(testProductId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testProductId);
      expect(result?.name).toBe('Test Product');
      expect(result?.category).toBeDefined();
    });

    test('should update product successfully', async () => {
      const updates = {
        name: 'Updated Product',
        base_price: 2500,
        is_featured: true,
      };

      const result = await productCatalogService.updateProduct(testProductId, updates);

      expect(result.name).toBe('Updated Product');
      expect(result.base_price).toBe(2500);
      expect(result.is_featured).toBe(true);
    });

    test('should return null for non-existent product', async () => {
      const nonExistentId = crypto.randomUUID();
      const result = await productCatalogService.getProductById(nonExistentId);

      expect(result).toBeNull();
    });
  });

  describe('Product Filtering', () => {
    test('should get only active products when requested', async () => {
      // Create inactive product
      const inactiveId = crypto.randomUUID();
      await supabase.from('photo_products').insert({
        id: inactiveId,
        category_id: testCategoryId,
        name: 'Inactive Product',
        type: 'print',
        base_price: 1000,
        is_active: false,
        sort_order: 1,
      });

      const filters: ProductFilters = { is_active: true };
      const results = await productCatalogService.getPhotoProducts(filters);

      expect(results.every((p) => p.is_active)).toBe(true);
      expect(results.find((p) => p.id === inactiveId)).toBeUndefined();

      // Cleanup
      await supabase.from('photo_products').delete().eq('id', inactiveId);
    });

    test('should filter by category', async () => {
      const filters: ProductFilters = { category_ids: [testCategoryId] };
      const results = await productCatalogService.getPhotoProducts(filters);

      expect(results.every((p) => p.category_id === testCategoryId)).toBe(true);
    });

    test('should filter by type', async () => {
      const filters: ProductFilters = { types: ['print'] };
      const results = await productCatalogService.getPhotoProducts(filters);

      expect(results.every((p) => p.type === 'print')).toBe(true);
    });

    test('should filter by price range', async () => {
      const filters: ProductFilters = {
        price_range: { min: 1000, max: 2000 },
      };
      const results = await productCatalogService.getPhotoProducts(filters);

      expect(results.every((p) => p.base_price >= 1000 && p.base_price <= 2000)).toBe(true);
    });

    test('should filter by featured status', async () => {
      // Update product to featured
      await supabase
        .from('photo_products')
        .update({ is_featured: true })
        .eq('id', testProductId);

      const filters: ProductFilters = { is_featured: true };
      const results = await productCatalogService.getPhotoProducts(filters);

      expect(results.every((p) => p.is_featured)).toBe(true);
    });

    test('should filter by multiple criteria', async () => {
      const filters: ProductFilters = {
        category_ids: [testCategoryId],
        types: ['print'],
        price_range: { min: 1000, max: 2000 },
        is_active: true,
      };

      const results = await productCatalogService.getPhotoProducts(filters);

      results.forEach((p) => {
        expect(p.category_id).toBe(testCategoryId);
        expect(p.type).toBe('print');
        expect(p.base_price).toBeGreaterThanOrEqual(1000);
        expect(p.base_price).toBeLessThanOrEqual(2000);
        expect(p.is_active).toBe(true);
      });
    });
  });

  describe('Combo Package Operations', () => {
    test('should create combo package with items', async () => {
      const comboData = {
        name: 'Test Combo',
        description: 'Test combo package',
        min_photos: 5,
        max_photos: 10,
        allows_duplicates: false,
        pricing_type: 'fixed' as const,
        base_price: 5000,
        is_featured: true,
        items: [
          {
            product_id: testProductId,
            quantity: 5,
            is_required: true,
          },
        ],
      };

      const result = await productCatalogService.createCombo(comboData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Combo');
      expect(result.base_price).toBe(5000);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].product_id).toBe(testProductId);

      // Store for cleanup
      testComboId = result.id;
    });

    test('should get combo by ID with items', async () => {
      // Create combo first
      const comboData = {
        name: 'Get Test Combo',
        description: 'Combo for retrieval test',
        min_photos: 3,
        max_photos: 6,
        pricing_type: 'fixed' as const,
        base_price: 3000,
        items: [{ product_id: testProductId, quantity: 3 }],
      };

      const created = await productCatalogService.createCombo(comboData);
      testComboId = created.id;

      // Get it back
      const result = await productCatalogService.getComboById(testComboId);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Get Test Combo');
      expect(result?.items).toHaveLength(1);
    });

    test('should get only active combo packages', async () => {
      // Create active combo
      const activeCombo = await productCatalogService.createCombo({
        name: 'Active Combo',
        min_photos: 1,
        max_photos: 5,
        pricing_type: 'fixed',
        base_price: 1000,
        is_active: true,
      });

      // Create inactive combo
      const inactiveId = crypto.randomUUID();
      await supabase.from('combo_packages').insert({
        id: inactiveId,
        name: 'Inactive Combo',
        min_photos: 1,
        max_photos: 5,
        pricing_type: 'fixed',
        base_price: 1000,
        is_active: false,
        sort_order: 0,
      });

      const results = await productCatalogService.getComboPackages(false);

      expect(results.every((c) => c.is_active)).toBe(true);
      expect(results.find((c) => c.id === inactiveId)).toBeUndefined();

      // Cleanup
      await supabase.from('combo_packages').delete().eq('id', activeCombo.id);
      await supabase.from('combo_packages').delete().eq('id', inactiveId);
    });
  });

  describe('Product Validation', () => {
    test('should validate price is positive integer', async () => {
      const invalidProduct = {
        category_id: testCategoryId,
        name: 'Invalid Price',
        type: 'digital' as const,
        base_price: -500, // Negative price
      };

      await expect(
        productCatalogService.createProduct(invalidProduct as any)
      ).rejects.toThrow();
    });

    test('should validate required fields', async () => {
      const incompleteProduct = {
        category_id: testCategoryId,
        // Missing name
        type: 'digital' as const,
        base_price: 1000,
      };

      await expect(
        productCatalogService.createProduct(incompleteProduct as any)
      ).rejects.toThrow();
    });

    test('should handle features array properly', async () => {
      const productWithFeatures = {
        category_id: testCategoryId,
        name: 'Featured Product',
        type: 'digital' as const,
        base_price: 2000,
        is_featured: true,
      };

      const result = await productCatalogService.createProduct(productWithFeatures);
      expect(result.is_featured).toBe(true);

      // Cleanup
      await supabase.from('photo_products').delete().eq('id', result.id);
    });
  });

  describe('Product Ordering', () => {
    test('should reorder products correctly', async () => {
      // Create multiple products
      const product1Id = crypto.randomUUID();
      const product2Id = crypto.randomUUID();

      await supabase.from('photo_products').insert([
        {
          id: product1Id,
          category_id: testCategoryId,
          name: 'Product 1',
          type: 'print',
          base_price: 1000,
          sort_order: 0,
          is_active: true,
        },
        {
          id: product2Id,
          category_id: testCategoryId,
          name: 'Product 2',
          type: 'print',
          base_price: 2000,
          sort_order: 10,
          is_active: true,
        },
      ]);

      // Update sort order
      await supabase
        .from('photo_products')
        .update({ sort_order: 5 })
        .eq('id', product1Id);

      await supabase
        .from('photo_products')
        .update({ sort_order: 0 })
        .eq('id', product2Id);

      // Verify order
      const results = await productCatalogService.getPhotoProducts({
        category_ids: [testCategoryId],
      });

      expect(results[0].id).toBe(testProductId); // sort_order: 0
      expect(results[1].id).toBe(product2Id); // sort_order: 0 (tied)
      expect(results[2].id).toBe(product1Id); // sort_order: 5

      // Cleanup
      await supabase.from('photo_products').delete().in('id', [product1Id, product2Id]);
    });

    test('should assign next sort_order automatically', async () => {
      const newProduct = await productCatalogService.createProduct({
        category_id: testCategoryId,
        name: 'Auto-ordered Product',
        type: 'digital',
        base_price: 1500,
      });

      expect(newProduct.sort_order).toBeGreaterThan(0);

      // Cleanup
      await supabase.from('photo_products').delete().eq('id', newProduct.id);
    });
  });

  describe('Event-Specific Pricing', () => {
    test('should set event-specific pricing', async () => {
      const result = await productCatalogService.setEventPricing(
        testEventId,
        testProductId,
        null,
        2500 // Override price
      );

      expect(result).toBeDefined();
      expect(result.event_id).toBe(testEventId);
      expect(result.product_id).toBe(testProductId);
      expect(result.override_price).toBe(2500);
    });

    test('should get event-specific pricing', async () => {
      // Set pricing first
      await productCatalogService.setEventPricing(
        testEventId,
        testProductId,
        null,
        2500
      );

      const results = await productCatalogService.getEventPricing(testEventId);

      expect(results).toHaveLength(1);
      expect(results[0].event_id).toBe(testEventId);
      expect(results[0].override_price).toBe(2500);
    });

    test('should update existing event pricing with upsert', async () => {
      // Set initial pricing
      await productCatalogService.setEventPricing(
        testEventId,
        testProductId,
        null,
        2000
      );

      // Update pricing (upsert)
      await productCatalogService.setEventPricing(
        testEventId,
        testProductId,
        null,
        3000
      );

      const results = await productCatalogService.getEventPricing(testEventId);

      expect(results).toHaveLength(1); // Should not duplicate
      expect(results[0].override_price).toBe(3000);
    });
  });

  describe('Search and Discovery', () => {
    test('should search products by name', async () => {
      const results = await productCatalogService.searchCatalog('Test Product');

      expect(results.products.length).toBeGreaterThan(0);
      expect(results.products.some((p) => p.name.includes('Test Product'))).toBe(true);
    });

    test('should search products by description', async () => {
      const results = await productCatalogService.searchCatalog('Test product description');

      expect(results.products.some((p) => p.description?.includes('description'))).toBe(
        true
      );
    });

    test('should get featured items', async () => {
      // Update product to featured
      await supabase
        .from('photo_products')
        .update({ is_featured: true })
        .eq('id', testProductId);

      const results = await productCatalogService.getFeaturedItems();

      expect(results.products.some((p) => p.id === testProductId)).toBe(true);
    });

    test('should get product recommendations', async () => {
      const results = await productCatalogService.getProductRecommendations(
        testEventId,
        6
      );

      expect(results).toBeDefined();
      expect(results.popular_products).toBeDefined();
      expect(results.featured_combos).toBeDefined();
      expect(results.popular_products.length + results.featured_combos.length).toBeLessThanOrEqual(6);
    });
  });

  describe('Category Management', () => {
    test('should get product categories', async () => {
      const categories = await productCatalogService.getProductCategories();

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.some((c) => c.id === testCategoryId)).toBe(true);
    });

    test('should filter active categories only', async () => {
      // Create inactive category
      const inactiveId = crypto.randomUUID();
      await supabase.from('product_categories').insert({
        id: inactiveId,
        name: 'Inactive Category',
        is_active: false,
        sort_order: 10,
      });

      const categories = await productCatalogService.getProductCategories(false);

      expect(categories.every((c) => c.is_active)).toBe(true);
      expect(categories.find((c) => c.id === inactiveId)).toBeUndefined();

      // Cleanup
      await supabase.from('product_categories').delete().eq('id', inactiveId);
    });

    test('should order categories by sort_order', async () => {
      const categories = await productCatalogService.getProductCategories();

      for (let i = 1; i < categories.length; i++) {
        expect(categories[i].sort_order).toBeGreaterThanOrEqual(
          categories[i - 1].sort_order
        );
      }
    });
  });

  describe('Complete Catalog Loading', () => {
    test('should load complete product catalog', async () => {
      const catalog = await productCatalogService.getProductCatalog();

      expect(catalog).toBeDefined();
      expect(catalog.categories).toBeDefined();
      expect(catalog.products).toBeDefined();
      expect(catalog.combos).toBeDefined();
      expect(Array.isArray(catalog.categories)).toBe(true);
      expect(Array.isArray(catalog.products)).toBe(true);
      expect(Array.isArray(catalog.combos)).toBe(true);
    });

    test('should load catalog with event pricing', async () => {
      // Set event pricing
      await productCatalogService.setEventPricing(
        testEventId,
        testProductId,
        null,
        2500
      );

      const catalog = await productCatalogService.getProductCatalog(testEventId);

      expect(catalog.event_pricing).toBeDefined();
      expect(catalog.event_pricing?.length).toBeGreaterThan(0);
    });
  });
});
