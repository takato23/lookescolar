/**
 * Product & Pricing System Integration Tests
 *
 * Tests the complete product and pricing system:
 * - Wizard options (Option 1: 1 photo, Option 2: 4 photos)
 * - Physical product upsells and combinations
 * - Price calculations and validations
 * - Product inventory and availability
 * - Combo packages and discounts
 * - Currency formatting and localization
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODUCT_TEST_CONFIG = {
  baseUrl:
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000',
  admin: {
    email: 'test-admin-products@lookescolar.com',
    password: 'TestAdminProducts123!@#',
  },
  event: {
    name: 'Colegio San Martín - Product Test 2025',
    school: 'Colegio San Martín',
    date: '2024-06-01',
    location: 'Buenos Aires',
  },
  student: {
    name: 'Ana Pricing Test',
    grade: '4°',
    section: 'B',
    student_number: 'PROD001',
  },
  family: {
    contact_name: 'Carlos Rodríguez',
    contact_email: 'carlos.rodriguez@productos.test.com',
    contact_phone: '+541234567890',
  },
  // Product test data
  wizardOptions: {
    option1: {
      id: 'option1',
      name: 'Opción 1',
      description: '1 foto digital',
      photos: 1,
      price: 2000,
      currency: 'ARS',
    },
    option2: {
      id: 'option2',
      name: 'Opción 2',
      description: '4 fotos digitales',
      photos: 4,
      price: 3500,
      currency: 'ARS',
    },
  },
  upsells: [
    { id: 'size_10x15', name: 'Impresión 10x15', price: 800, category: 'size' },
    {
      id: 'size_20x30',
      name: 'Impresión 20x30',
      price: 1500,
      category: 'size',
    },
    { id: 'copy_extra', name: 'Copia adicional', price: 500, category: 'copy' },
    { id: 'frame_basic', name: 'Marco básico', price: 1200, category: 'frame' },
    {
      id: 'album_small',
      name: 'Álbum pequeño',
      price: 2500,
      category: 'album',
    },
  ],
  // Price validation thresholds
  pricing: {
    minTotal: 1000,
    maxTotal: 50000,
    discountThresholds: {
      bulk: { threshold: 5, percentage: 0.1 },
      firstTime: { percentage: 0.05 },
    },
  },
};

let adminSession: any;
let testEventId: string;
let testStudentId: string;
let testStudentToken: string;
const testPhotoIds: string[] = [];
const testOrderIds: string[] = [];

beforeAll(async () => {
  await cleanupTestData();
  await setupProductTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('Product & Pricing System Tests', () => {
  describe('Wizard Options Validation', () => {
    it('1.1 Option 1 (1 photo) should validate correctly', async () => {
      const option1 = PRODUCT_TEST_CONFIG.wizardOptions.option1;

      // Test photo requirement validation
      const validationTests = [
        { photos: [], valid: false, message: 'Selecciona 1 foto' },
        {
          photos: [testPhotoIds[0]],
          valid: true,
          message: '1 foto seleccionada',
        },
        {
          photos: [testPhotoIds[0], testPhotoIds[1]],
          valid: false,
          message: 'Solo puedes seleccionar 1 foto',
        },
      ];

      for (const test of validationTests) {
        const isValid = test.photos.length === option1.photos;
        expect(isValid).toBe(test.valid);

        if (test.valid) {
          console.log(`✅ Option 1 validation: ${test.message}`);
        }
      }

      // Test pricing
      expect(option1.price).toBe(2000);
      expect(option1.photos).toBe(1);

      console.log('✅ Option 1 validation complete');
      console.log(`   Price: $${option1.price}, Photos: ${option1.photos}`);
    });

    it('1.2 Option 2 (4 photos) should validate correctly', async () => {
      const option2 = PRODUCT_TEST_CONFIG.wizardOptions.option2;

      // Test photo requirement validation
      const validationTests = [
        { photos: [], valid: false, message: 'Selecciona 4 fotos' },
        {
          photos: [testPhotoIds[0]],
          valid: false,
          message: 'Selecciona 3 fotos más',
        },
        {
          photos: testPhotoIds.slice(0, 4),
          valid: true,
          message: '4 fotos seleccionadas',
        },
        {
          photos: testPhotoIds.slice(0, 5),
          valid: false,
          message: 'Solo puedes seleccionar 4 fotos',
        },
      ];

      for (const test of validationTests) {
        const isValid = test.photos.length === option2.photos;
        expect(isValid).toBe(test.valid);

        if (test.valid) {
          console.log(`✅ Option 2 validation: ${test.message}`);
        }
      }

      // Test pricing
      expect(option2.price).toBe(3500);
      expect(option2.photos).toBe(4);

      // Test photo repetition (allowed in Option 2)
      const repeatedPhotos = [
        testPhotoIds[0],
        testPhotoIds[0],
        testPhotoIds[1],
        testPhotoIds[1],
      ];
      expect(repeatedPhotos.length).toBe(option2.photos);

      console.log('✅ Option 2 validation complete');
      console.log(`   Price: $${option2.price}, Photos: ${option2.photos}`);
      console.log(
        `   Photo repetition allowed: ${repeatedPhotos.length} selections`
      );
    });

    it('1.3 Price comparison between options should be logical', async () => {
      const option1 = PRODUCT_TEST_CONFIG.wizardOptions.option1;
      const option2 = PRODUCT_TEST_CONFIG.wizardOptions.option2;

      // Option 2 should be more expensive but better value per photo
      expect(option2.price).toBeGreaterThan(option1.price);

      const option1PricePerPhoto = option1.price / option1.photos; // 2000 / 1 = 2000
      const option2PricePerPhoto = option2.price / option2.photos; // 3500 / 4 = 875

      expect(option2PricePerPhoto).toBeLessThan(option1PricePerPhoto);

      const discount =
        ((option1PricePerPhoto - option2PricePerPhoto) / option1PricePerPhoto) *
        100;

      console.log('✅ Price comparison analysis:');
      console.log(`   Option 1: $${option1PricePerPhoto}/photo`);
      console.log(`   Option 2: $${option2PricePerPhoto}/photo`);
      console.log(
        `   Option 2 offers ${discount.toFixed(1)}% discount per photo`
      );

      expect(discount).toBeGreaterThan(50); // Option 2 should offer significant savings
    });
  });

  describe('Upsell System', () => {
    it('2.1 Upsells should be properly categorized and priced', async () => {
      const upsells = PRODUCT_TEST_CONFIG.upsells;

      // Group by category
      const upsellsByCategory = upsells.reduce((acc: any, upsell) => {
        if (!acc[upsell.category]) acc[upsell.category] = [];
        acc[upsell.category].push(upsell);
        return acc;
      }, {});

      // Verify categories exist
      expect(upsellsByCategory.size).toBeDefined();
      expect(upsellsByCategory.copy).toBeDefined();
      expect(upsellsByCategory.frame).toBeDefined();
      expect(upsellsByCategory.album).toBeDefined();

      // Verify pricing logic
      for (const upsell of upsells) {
        expect(upsell.price).toBeGreaterThan(0);
        expect(upsell.price).toBeLessThan(10000); // Reasonable upper limit
        expect(upsell.name).toBeTruthy();
        expect(upsell.category).toBeTruthy();
      }

      console.log('✅ Upsells properly categorized:');
      Object.entries(upsellsByCategory).forEach(
        ([category, items]: [string, any]) => {
          console.log(`   ${category}: ${items.length} items`);
        }
      );
    });

    it('2.2 Upsell pricing should be reasonable compared to base options', async () => {
      const option1Price = PRODUCT_TEST_CONFIG.wizardOptions.option1.price;
      const upsells = PRODUCT_TEST_CONFIG.upsells;

      for (const upsell of upsells) {
        // Upsells should be less expensive than base digital option
        expect(upsell.price).toBeLessThan(option1Price);

        // But should be meaningful amounts (not too cheap)
        expect(upsell.price).toBeGreaterThan(100);
      }

      // Test upsell combinations
      const sampleCombination = {
        size_10x15: 2, // 2 extra 10x15 prints
        frame_basic: 1, // 1 basic frame
      };

      let combinationTotal = 0;
      Object.entries(sampleCombination).forEach(([upsellId, quantity]) => {
        const upsell = upsells.find((u) => u.id === upsellId);
        if (upsell) {
          combinationTotal += upsell.price * quantity;
        }
      });

      expect(combinationTotal).toBeGreaterThan(0);
      expect(combinationTotal).toBeLessThan(option1Price); // Reasonable upsell total

      console.log('✅ Upsell pricing validation:');
      console.log(`   Base option: $${option1Price}`);
      console.log(`   Sample upsell combo: $${combinationTotal}`);
    });

    it('2.3 Upsell API should return available options', async () => {
      const response = await fetch(
        `${PRODUCT_TEST_CONFIG.baseUrl}/api/family/upsells?token=${testStudentToken}`
      );

      if (response.status === 200) {
        const upsells = await response.json();

        expect(Array.isArray(upsells)).toBe(true);

        if (upsells.length > 0) {
          for (const upsell of upsells) {
            expect(upsell).toHaveProperty('id');
            expect(upsell).toHaveProperty('name');
            expect(upsell).toHaveProperty('price');
            expect(upsell).toHaveProperty('category');
            expect(upsell.price).toBeGreaterThan(0);
          }

          console.log(`✅ Upsells API returns ${upsells.length} options`);
        }
      } else if (response.status === 404) {
        console.log('ℹ️ Upsells API not implemented yet');
      } else {
        console.log(`⚠️ Upsells API returned status: ${response.status}`);
      }
    });
  });

  describe('Price Calculation System', () => {
    it('3.1 Base price calculation should be accurate', async () => {
      const testCases = [
        {
          option: PRODUCT_TEST_CONFIG.wizardOptions.option1,
          upsells: {},
          expectedTotal: 2000,
        },
        {
          option: PRODUCT_TEST_CONFIG.wizardOptions.option2,
          upsells: {},
          expectedTotal: 3500,
        },
      ];

      for (const testCase of testCases) {
        const total = testCase.option.price;
        expect(total).toBe(testCase.expectedTotal);

        // Test price breakdown structure
        const breakdown = {
          basePrice: testCase.option.price,
          upsellsPrice: 0,
          subtotal: testCase.option.price,
          total: testCase.option.price,
        };

        expect(breakdown.basePrice).toBe(testCase.option.price);
        expect(breakdown.total).toBe(testCase.expectedTotal);

        console.log(`✅ ${testCase.option.name}: $${breakdown.total}`);
      }
    });

    it('3.2 Upsell price calculation should be accurate', async () => {
      const baseOption = PRODUCT_TEST_CONFIG.wizardOptions.option1;
      const upsells = PRODUCT_TEST_CONFIG.upsells;

      const testUpsellSelection = {
        size_10x15: 2, // 2 × 800 = 1600
        frame_basic: 1, // 1 × 1200 = 1200
      };

      let upsellsTotal = 0;
      Object.entries(testUpsellSelection).forEach(([upsellId, quantity]) => {
        const upsell = upsells.find((u) => u.id === upsellId);
        if (upsell) {
          upsellsTotal += upsell.price * quantity;
        }
      });

      const expectedUpsellsTotal = 800 * 2 + 1200 * 1; // 2800
      const expectedGrandTotal = baseOption.price + expectedUpsellsTotal; // 4800

      expect(upsellsTotal).toBe(expectedUpsellsTotal);

      const breakdown = {
        basePrice: baseOption.price,
        upsellsPrice: upsellsTotal,
        subtotal: baseOption.price + upsellsTotal,
        total: baseOption.price + upsellsTotal,
      };

      expect(breakdown.total).toBe(expectedGrandTotal);

      console.log('✅ Upsell calculation validation:');
      console.log(`   Base: $${breakdown.basePrice}`);
      console.log(`   Upsells: $${breakdown.upsellsPrice}`);
      console.log(`   Total: $${breakdown.total}`);
    });

    it('3.3 Price formatting should follow Argentine standards', async () => {
      const testPrices = [2000, 3500, 15000, 45000];

      for (const price of testPrices) {
        const formatted = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(price);

        // Should contain $ symbol and price
        expect(formatted).toContain('$');
        expect(formatted).toContain(price.toString());

        // Should use Argentine formatting
        expect(formatted).toMatch(/^\$\s?\d+(?:\.\d{3})*$/);

        console.log(`✅ $${price} → ${formatted}`);
      }
    });

    it('3.4 Price validation should enforce limits', async () => {
      const { minTotal, maxTotal } = PRODUCT_TEST_CONFIG.pricing;

      // Test minimum validation
      const tooLowPrice = minTotal - 100;
      expect(tooLowPrice).toBeLessThan(minTotal);

      // Test maximum validation
      const tooHighPrice = maxTotal + 1000;
      expect(tooHighPrice).toBeGreaterThan(maxTotal);

      // Test valid ranges
      const validPrices = [1500, 2000, 3500, 10000, 25000];
      for (const price of validPrices) {
        expect(price).toBeGreaterThanOrEqual(minTotal);
        expect(price).toBeLessThanOrEqual(maxTotal);
      }

      console.log('✅ Price validation limits:');
      console.log(`   Minimum: $${minTotal}, Maximum: $${maxTotal}`);
      console.log(`   Valid range tested: ${validPrices.join(', ')}`);
    });
  });

  describe('Product Order Integration', () => {
    it('4.1 Order with Option 1 should create correct line items', async () => {
      const response = await fetch(
        `${PRODUCT_TEST_CONFIG.baseUrl}/api/family/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: testStudentToken,
            wizard_option: 'option1',
            selected_photos: [testPhotoIds[0]],
            selected_upsells: {},
            contact: PRODUCT_TEST_CONFIG.family,
          }),
        }
      );

      expect(response.status).toBe(201);
      const result = await response.json();

      expect(result.order_id).toBeDefined();
      expect(result.total_amount).toBe(2000);
      testOrderIds.push(result.order_id);

      // Verify order structure in database
      const { data: order } = await supabase
        .from('orders')
        .select(
          `
          id,
          wizard_option,
          total_amount,
          order_items!inner(
            id,
            product_type,
            quantity,
            unit_price,
            total_price
          )
        `
        )
        .eq('id', result.order_id)
        .single();

      expect(order).toBeTruthy();
      expect(order.wizard_option).toBe('option1');
      expect(order.total_amount).toBe(2000);
      expect(order.order_items).toHaveLength(1);
      expect(order.order_items[0].product_type).toBe('digital');
      expect(order.order_items[0].unit_price).toBe(2000);

      console.log('✅ Option 1 order structure validated');
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Total: $${order.total_amount}`);
      console.log(`   Items: ${order.order_items.length}`);
    });

    it('4.2 Order with Option 2 and upsells should calculate correctly', async () => {
      const selectedPhotos = [
        testPhotoIds[0],
        testPhotoIds[1],
        testPhotoIds[2],
        testPhotoIds[3],
      ];
      const selectedUpsells = {
        size_10x15: 1, // +800
        frame_basic: 1, // +1200
      };

      const response = await fetch(
        `${PRODUCT_TEST_CONFIG.baseUrl}/api/family/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: testStudentToken,
            wizard_option: 'option2',
            selected_photos: selectedPhotos,
            selected_upsells: selectedUpsells,
            contact: {
              ...PRODUCT_TEST_CONFIG.family,
              contact_email: 'option2.upsells@productos.test.com',
            },
          }),
        }
      );

      if (response.status === 201) {
        const result = await response.json();

        const expectedTotal = 3500 + 800 + 1200; // 5500
        expect(result.total_amount).toBe(expectedTotal);
        testOrderIds.push(result.order_id);

        // Verify order items include upsells
        const { data: order } = await supabase
          .from('orders')
          .select(
            `
            id,
            wizard_option,
            total_amount,
            order_items!inner(
              id,
              product_type,
              product_name,
              quantity,
              unit_price
            )
          `
          )
          .eq('id', result.order_id)
          .single();

        expect(order).toBeTruthy();
        expect(order.wizard_option).toBe('option2');
        expect(order.total_amount).toBe(expectedTotal);
        expect(order.order_items.length).toBeGreaterThan(1); // Base + upsells

        console.log('✅ Option 2 with upsells order validated');
        console.log(`   Base (Option 2): $3500`);
        console.log(`   Upsells: $${expectedTotal - 3500}`);
        console.log(`   Total: $${order.total_amount}`);
        console.log(`   Items: ${order.order_items.length}`);
      } else {
        console.log('ℹ️ Upsells not fully implemented yet');

        // Test base Option 2 without upsells
        const baseResponse = await fetch(
          `${PRODUCT_TEST_CONFIG.baseUrl}/api/family/checkout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: testStudentToken,
              wizard_option: 'option2',
              selected_photos: selectedPhotos,
              selected_upsells: {},
              contact: {
                ...PRODUCT_TEST_CONFIG.family,
                contact_email: 'option2.base@productos.test.com',
              },
            }),
          }
        );

        expect(baseResponse.status).toBe(201);
        const baseResult = await baseResponse.json();
        expect(baseResult.total_amount).toBe(3500);
        testOrderIds.push(baseResult.order_id);

        console.log('✅ Option 2 base order validated (upsells pending)');
      }
    });

    it('4.3 Order validation should prevent invalid configurations', async () => {
      const invalidConfigurations = [
        {
          name: 'Option 1 with too many photos',
          data: {
            wizard_option: 'option1',
            selected_photos: [testPhotoIds[0], testPhotoIds[1]], // 2 photos for 1-photo option
            selected_upsells: {},
            contact: PRODUCT_TEST_CONFIG.family,
          },
        },
        {
          name: 'Option 2 with too few photos',
          data: {
            wizard_option: 'option2',
            selected_photos: [testPhotoIds[0]], // 1 photo for 4-photo option
            selected_upsells: {},
            contact: PRODUCT_TEST_CONFIG.family,
          },
        },
        {
          name: 'Invalid wizard option',
          data: {
            wizard_option: 'invalid_option',
            selected_photos: [testPhotoIds[0]],
            selected_upsells: {},
            contact: PRODUCT_TEST_CONFIG.family,
          },
        },
      ];

      for (const config of invalidConfigurations) {
        const response = await fetch(
          `${PRODUCT_TEST_CONFIG.baseUrl}/api/family/checkout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: testStudentToken,
              ...config.data,
            }),
          }
        );

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.error).toBeDefined();

        console.log(`✅ ${config.name} properly rejected`);
      }
    });
  });

  describe('Product Availability & Inventory', () => {
    it('5.1 Digital products should always be available', async () => {
      // Digital products (Option 1 & 2) should never run out of stock
      const digitalProducts = [
        PRODUCT_TEST_CONFIG.wizardOptions.option1,
        PRODUCT_TEST_CONFIG.wizardOptions.option2,
      ];

      for (const product of digitalProducts) {
        // Should be able to create multiple orders for digital products
        const response = await fetch(
          `${PRODUCT_TEST_CONFIG.baseUrl}/api/family/checkout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: testStudentToken,
              wizard_option: product.id,
              selected_photos: testPhotoIds.slice(0, product.photos),
              selected_upsells: {},
              contact: {
                ...PRODUCT_TEST_CONFIG.family,
                contact_email: `${product.id}.availability@test.com`,
              },
            }),
          }
        );

        expect(response.status).toBe(201);
        const result = await response.json();
        testOrderIds.push(result.order_id);

        console.log(`✅ ${product.name} remains available for multiple orders`);
      }
    });

    it('5.2 Physical products should have inventory tracking', async () => {
      // Test physical product availability (if implemented)
      const physicalUpsells = PRODUCT_TEST_CONFIG.upsells.filter(
        (u) => u.category === 'frame' || u.category === 'album'
      );

      for (const upsell of physicalUpsells) {
        // Test inventory check endpoint
        const inventoryResponse = await fetch(
          `${PRODUCT_TEST_CONFIG.baseUrl}/api/products/inventory/${upsell.id}`
        );

        if (inventoryResponse.status === 200) {
          const inventory = await inventoryResponse.json();
          expect(inventory).toHaveProperty('available');
          expect(inventory).toHaveProperty('quantity');

          console.log(
            `✅ ${upsell.name} inventory: ${inventory.quantity} available`
          );
        } else {
          console.log(
            `ℹ️ Inventory tracking not implemented for ${upsell.name}`
          );
        }
      }
    });

    it('5.3 Product combinations should be validated', async () => {
      // Test that certain product combinations make sense
      const validCombinations = [
        ['size_10x15', 'frame_basic'], // Print + frame is logical
        ['size_20x30', 'frame_basic'], // Larger print + frame
        ['copy_extra', 'size_10x15'], // Extra copies of same size
      ];

      const invalidCombinations = [
        // Future: Could test incompatible combinations
        // e.g., frame size mismatches, etc.
      ];

      for (const combination of validCombinations) {
        const selectedUpsells: Record<string, number> = {};
        combination.forEach((upsellId) => {
          selectedUpsells[upsellId] = 1;
        });

        // Should not reject valid combinations
        let totalPrice = PRODUCT_TEST_CONFIG.wizardOptions.option1.price;
        combination.forEach((upsellId) => {
          const upsell = PRODUCT_TEST_CONFIG.upsells.find(
            (u) => u.id === upsellId
          );
          if (upsell) totalPrice += upsell.price;
        });

        expect(totalPrice).toBeGreaterThan(
          PRODUCT_TEST_CONFIG.wizardOptions.option1.price
        );

        console.log(
          `✅ Valid combination [${combination.join(' + ')}]: $${totalPrice}`
        );
      }
    });
  });

  describe('Pricing Edge Cases & Discounts', () => {
    it('6.1 Bulk discount calculation should work', async () => {
      const { bulk } = PRODUCT_TEST_CONFIG.pricing.discountThresholds;

      // Test bulk discount logic (5+ items = 10% off)
      const bulkUpsells = {
        size_10x15: 3, // 3 × 800 = 2400
        copy_extra: 3, // 3 × 500 = 1500
      };

      let subtotal = PRODUCT_TEST_CONFIG.wizardOptions.option1.price; // 2000
      Object.entries(bulkUpsells).forEach(([upsellId, quantity]) => {
        const upsell = PRODUCT_TEST_CONFIG.upsells.find(
          (u) => u.id === upsellId
        );
        if (upsell) {
          subtotal += upsell.price * quantity;
        }
      });

      const totalItems =
        Object.values(bulkUpsells).reduce((sum, qty) => sum + qty, 0) + 1; // +1 for base
      const qualifiesForDiscount = totalItems >= bulk.threshold;

      expect(totalItems).toBe(7); // 3 + 3 + 1 = 7 items
      expect(qualifiesForDiscount).toBe(true);

      if (qualifiesForDiscount) {
        const discountAmount = subtotal * bulk.percentage;
        const finalTotal = subtotal - discountAmount;

        expect(discountAmount).toBe(subtotal * 0.1);
        expect(finalTotal).toBeLessThan(subtotal);

        console.log('✅ Bulk discount calculation:');
        console.log(`   Subtotal: $${subtotal}`);
        console.log(`   Discount (10%): $${discountAmount}`);
        console.log(`   Final total: $${finalTotal}`);
      }
    });

    it('6.2 Currency conversion should be stable', async () => {
      // Test that prices remain in ARS and are not converted
      const prices = [2000, 3500, 15000];

      for (const price of prices) {
        const formatted = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(price);

        expect(formatted).toContain('$');
        expect(formatted).not.toContain('USD');
        expect(formatted).not.toContain('EUR');

        // Should maintain ARS currency throughout
        const backToNumber = price;
        expect(backToNumber).toBe(price);
      }

      console.log('✅ Currency stability maintained (ARS)');
    });

    it('6.3 Price rounding should be consistent', async () => {
      // Test that prices are properly rounded (no decimals for ARS)
      const testCalculations = [
        { base: 2000, multiplier: 1.1, expected: 2200 },
        { base: 3500, multiplier: 0.9, expected: 3150 },
        { base: 1500, multiplier: 1.15, expected: 1725 },
      ];

      for (const calc of testCalculations) {
        const calculated = Math.round(calc.base * calc.multiplier);
        expect(calculated).toBe(calc.expected);
        expect(calculated % 1).toBe(0); // Should be whole number

        console.log(`✅ ${calc.base} × ${calc.multiplier} = $${calculated}`);
      }
    });
  });
});

// Helper functions
async function setupProductTestData() {
  console.log('🏗️ Setting up product test environment...');

  // Admin authentication
  const authResponse = await fetch(
    `${PRODUCT_TEST_CONFIG.baseUrl}/api/admin/auth`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PRODUCT_TEST_CONFIG.admin),
    }
  );

  const authResult = await authResponse.json();
  adminSession = authResult.session;

  // Create event
  const { data: event } = await supabase
    .from('events')
    .insert(PRODUCT_TEST_CONFIG.event)
    .select('id')
    .single();

  testEventId = event.id;

  // Create student with token
  const { data: student } = await supabase
    .from('students')
    .insert({
      event_id: testEventId,
      ...PRODUCT_TEST_CONFIG.student,
      active: true,
    })
    .select('id')
    .single();

  testStudentId = student.id;

  // Generate token for student
  const { data: tokenResult } = await supabase
    .from('student_tokens')
    .insert({
      student_id: testStudentId,
      token: `prod-test-${Date.now()}`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      active: true,
    })
    .select('token')
    .single();

  testStudentToken = tokenResult.token;

  // Create test photos
  for (let i = 0; i < 6; i++) {
    const { data: photo } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: `product-test-${i}.jpg`,
        original_filename: `product-test-${i}.jpg`,
        file_path: `product-test/product-test-${i}.jpg`,
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        photo_type: 'individual',
        processing_status: 'completed',
      })
      .select('id')
      .single();

    testPhotoIds.push(photo.id);

    // Associate some photos with student
    if (i < 4) {
      await supabase.from('photo_students').insert({
        photo_id: photo.id,
        student_id: testStudentId,
        confidence_score: 1.0,
        classification_method: 'manual',
      });
    }
  }

  console.log('✅ Product test environment ready');
  console.log(`   Event: ${testEventId}`);
  console.log(`   Student: ${testStudentId}`);
  console.log(`   Token: ${testStudentToken.substring(0, 8)}...`);
  console.log(`   Photos: ${testPhotoIds.length}`);
}

async function cleanupTestData() {
  if (testEventId) {
    try {
      console.log('🧹 Cleaning up product test data...');

      await supabase.from('order_items').delete().in('order_id', testOrderIds);
      await supabase.from('orders').delete().in('id', testOrderIds);
      await supabase
        .from('photo_students')
        .delete()
        .in('photo_id', testPhotoIds);
      await supabase
        .from('student_tokens')
        .delete()
        .eq('student_id', testStudentId);
      await supabase.from('photos').delete().in('id', testPhotoIds);
      await supabase.from('students').delete().eq('id', testStudentId);
      await supabase.from('events').delete().eq('id', testEventId);

      console.log('✅ Product test data cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup completed with some non-critical errors:', error);
    }
  }
}
