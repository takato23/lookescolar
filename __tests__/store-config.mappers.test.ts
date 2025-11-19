import { describe, expect, it } from 'vitest';
import { convertDbToUiConfig, getDefaultConfig } from '@/lib/services/store-config.mappers';

describe('store-config.mappers', () => {
  it('skips legacy product containers and falls back to defaults when empty', () => {
    const result = convertDbToUiConfig({
      enabled: true,
      currency: 'ARS',
      tax_rate: 0,
      shipping_enabled: true,
      shipping_price: 0,
      payment_methods: { mercadopago: { enabled: true } },
      products: {
        packages: [],
        alacarte: []
      }
    });

    const defaults = getDefaultConfig();
    expect(result.products.length).toBe(defaults.products.length);
  });

  it('flattens nested legacy arrays into valid products', () => {
    const result = convertDbToUiConfig({
      enabled: true,
      currency: 'ARS',
      tax_rate: 0,
      shipping_enabled: true,
      shipping_price: 1200,
      payment_methods: { mercadopago: { enabled: true } },
      products: {
        packages: [
          {
            id: 'combo-1',
            name: 'Combo 1',
            type: 'package',
            price: '150000',
            enabled: true,
            features: {
              sizes: ['20x30'],
              formats: ['impreso'],
              quality: 'premium'
            }
          }
        ],
        extras: {
          items: [
            {
              name: 'Digital',
              type: 'digital',
              price: 50000,
              enabled: false
            }
          ]
        }
      }
    });

    const combo = result.products.find((product) => product.id === 'combo-1');
    expect(combo).toBeDefined();
    expect(combo?.type).toBe('physical');

    const digital = result.products.find((product) => product.name === 'Digital');
    expect(digital).toBeDefined();
    expect(digital?.type).toBe('digital');
    expect(digital?.enabled).toBe(false);
  });
});
