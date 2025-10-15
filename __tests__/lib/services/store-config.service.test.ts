/**
 * 🧪 Tests unitarios para store-config.service
 * Verifica validación, transformación y operaciones de servicio
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  convertDbToUiConfig,
  convertUiToDbConfig,
  validateProductStructure,
  getTotalEnabledProducts,
  getTotalValue,
  getActiveProducts,
  getDefaultConfig
} from '@/lib/services/store-config.service';

describe('StoreConfigService', () => {
  describe('convertDbToUiConfig', () => {
    it('debe convertir configuración de DB a UI correctamente', () => {
      const dbConfig = {
        enabled: true,
        currency: 'USD',
        tax_rate: 10,
        shipping_enabled: true,
        shipping_price: 50000,
        products: {
          'opcionA': {
            name: 'Opción A',
            type: 'package',
            enabled: true,
            price: 200000,
            description: 'Test description',
            features: { sizes: ['20x30'] }
          }
        },
        payment_methods: { mercadopago: true }
      };

      const result = convertDbToUiConfig(dbConfig);

      expect(result.enabled).toBe(true);
      expect(result.currency).toBe('USD');
      expect(result.tax_rate).toBe(10);
      expect(result.shipping_enabled).toBe(true);
      expect(result.shipping_price).toBe(50000);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe('opcionA');
      expect(result.products[0].name).toBe('Opción A');
      expect(result.products[0].type).toBe('physical');
      expect(result.products[0].enabled).toBe(true);
      expect(result.products[0].price).toBe(200000);
      expect(result.products[0].description).toBe('Test description');
      expect(result.payment_methods).toEqual(['mercadopago']);
    });

    it('debe manejar configuración vacía', () => {
      const result = convertDbToUiConfig({});

      expect(result.enabled).toBe(false);
      expect(result.currency).toBe('ARS');
      expect(result.products).toEqual([]);
    });
  });

  describe('convertUiToDbConfig', () => {
    it('debe convertir configuración de UI a DB correctamente', () => {
      const uiConfig = {
        enabled: true,
        currency: 'ARS' as const,
        tax_rate: 21,
        shipping_enabled: true,
        shipping_price: 100000,
        payment_methods: ['mercadopago', 'cash'] as const,
        products: [
          {
            id: 'opcionA',
            name: 'Opción A',
            type: 'physical' as const,
            enabled: true,
            price: 200000,
            description: 'Test description',
            options: { sizes: ['20x30'] }
          }
        ]
      };

      const result = convertUiToDbConfig(uiConfig);

      expect(result.enabled).toBe(true);
      expect(result.currency).toBe('ARS');
      expect(result.products?.opcionA).toBeDefined();
      expect(result.products?.opcionA.name).toBe('Opción A');
      expect(result.products?.opcionA.type).toBe('package');
      expect(result.products?.opcionA.price).toBe(200000);
      expect(result.payment_methods?.mercadopago).toBeDefined();
      expect(result.payment_methods?.cash).toBeDefined();
    });
  });

  describe('validateProductStructure', () => {
    it('debe validar producto válido', () => {
      const validProduct = {
        id: 'test-product',
        name: 'Producto de Test',
        type: 'physical' as const,
        enabled: true,
        price: 100000,
        description: 'Descripción de test'
      };

      const result = validateProductStructure(validProduct);
      expect(result.id).toBe('test-product');
      expect(result.name).toBe('Producto de Test');
    });

    it('debe rechazar producto inválido', () => {
      const invalidProduct = {
        name: '', // nombre requerido
        type: 'invalid-type' as any,
        price: -100 // precio negativo
      };

      expect(() => validateProductStructure(invalidProduct)).toThrow();
    });
  });

  describe('getTotalEnabledProducts', () => {
    it('debe contar productos habilitados correctamente', () => {
      const config = {
        products: [
          { enabled: true },
          { enabled: false },
          { enabled: true },
          { enabled: true }
        ]
      };

      const result = getTotalEnabledProducts(config as any);
      expect(result).toBe(3);
    });
  });

  describe('getTotalValue', () => {
    it('debe calcular valor total de productos habilitados', () => {
      const config = {
        products: [
          { enabled: true, price: 100000 },
          { enabled: false, price: 200000 },
          { enabled: true, price: 150000 },
          { enabled: true, price: 50000 }
        ]
      };

      const result = getTotalValue(config as any);
      expect(result).toBe(300000); // 100000 + 150000 + 50000
    });
  });

  describe('getActiveProducts', () => {
    it('debe filtrar productos habilitados', () => {
      const config = {
        products: [
          { id: '1', enabled: true, name: 'Producto 1' },
          { id: '2', enabled: false, name: 'Producto 2' },
          { id: '3', enabled: true, name: 'Producto 3' }
        ]
      };

      const result = getActiveProducts(config as any);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });
  });

  describe('getDefaultConfig', () => {
    it('debe retornar configuración por defecto válida', () => {
      const config = getDefaultConfig();

      expect(config.enabled).toBe(false);
      expect(config.currency).toBe('ARS');
      expect(config.products).toHaveLength(7); // productos por defecto
      expect(config.products[0].id).toBe('opcionA');
    });
  });
});
