import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createPaymentPreference,
  getPaymentInfo,
  processWebhookNotification,
  verifyWebhookSignature,
  validateSinglePendingOrder,
  MP_STATUS_MAPPING,
} from '@/lib/mercadopago/mercadopago.service';
import crypto from 'crypto';

// Mock MercadoPago SDK
vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(),
  Preference: vi.fn(),
  Payment: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(),
}));

const { MercadoPagoConfig, Preference, Payment } = await import('mercadopago');
const { createServerSupabaseServiceClient } = await import('@/lib/supabase/server');

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn(),
};

describe('MercadoPago Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MP_ACCESS_TOKEN = 'test-access-token';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.example.com';
    
    vi.mocked(createServerSupabaseServiceClient).mockReturnValue(mockSupabase as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.MP_ACCESS_TOKEN;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  describe('createPaymentPreference', () => {
    it('should create preference successfully', async () => {
      // Arrange
      const orderId = crypto.randomUUID();
      const params = {
        orderId,
        items: [
          {
            title: 'Foto Base - photo1.jpg',
            quantity: 1,
            unit_price: 10,
          },
        ],
        payer: {
          name: 'Juan Perez',
          email: 'juan@example.com',
          phone: '+54911234567',
        },
      };

      const mockPreferenceInstance = {
        create: vi.fn().mockResolvedValue({
          id: 'preference-id-123',
          init_point: 'https://mp.com/init_point',
          sandbox_init_point: 'https://mp.com/sandbox_init_point',
        }),
      };

      vi.mocked(Preference).mockReturnValue(mockPreferenceInstance as any);

      // Act
      const result = await createPaymentPreference(params);

      // Assert
      expect(result).toEqual({
        id: 'preference-id-123',
        init_point: 'https://mp.com/init_point',
        sandbox_init_point: 'https://mp.com/sandbox_init_point',
      });

      expect(mockPreferenceInstance.create).toHaveBeenCalledWith({
        body: expect.objectContaining({
          items: params.items,
          payer: {
            name: params.payer.name,
            email: params.payer.email,
            phone: { number: params.payer.phone },
          },
          back_urls: {
            success: 'https://test.example.com/f/success',
            failure: 'https://test.example.com/f/error',
            pending: 'https://test.example.com/f/pending',
          },
          auto_return: 'approved',
          external_reference: orderId,
          notification_url: 'https://test.example.com/api/payments/webhook',
          metadata: {
            order_id: orderId,
            created_at: expect.any(String),
          },
          expires: true,
          expiration_date_from: expect.any(String),
          expiration_date_to: expect.any(String),
          statement_descriptor: 'LOOK ESCOLAR',
        }),
      });
    });

    it('should retry on failure and succeed on second attempt', async () => {
      // Arrange
      const params = {
        orderId: crypto.randomUUID(),
        items: [{ title: 'Test Item', quantity: 1, unit_price: 10 }],
        payer: { name: 'Test', email: 'test@test.com' },
      };

      const mockPreferenceInstance = {
        create: vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            id: 'preference-id-123',
            init_point: 'https://mp.com/init_point',
            sandbox_init_point: 'https://mp.com/sandbox_init_point',
          }),
      };

      vi.mocked(Preference).mockReturnValue(mockPreferenceInstance as any);

      // Act
      const result = await createPaymentPreference(params);

      // Assert
      expect(result.id).toBe('preference-id-123');
      expect(mockPreferenceInstance.create).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      // Arrange
      const params = {
        orderId: crypto.randomUUID(),
        items: [{ title: 'Test Item', quantity: 1, unit_price: 10 }],
        payer: { name: 'Test', email: 'test@test.com' },
      };

      const mockPreferenceInstance = {
        create: vi.fn().mockRejectedValue(new Error('Persistent error')),
      };

      vi.mocked(Preference).mockReturnValue(mockPreferenceInstance as any);

      // Act & Assert
      await expect(createPaymentPreference(params)).rejects.toThrow(
        'Error al crear preferencia de pago después de reintentos'
      );
      expect(mockPreferenceInstance.create).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should throw error when MP_ACCESS_TOKEN is missing', async () => {
      // Arrange
      delete process.env.MP_ACCESS_TOKEN;
      
      const params = {
        orderId: crypto.randomUUID(),
        items: [{ title: 'Test Item', quantity: 1, unit_price: 10 }],
        payer: { name: 'Test', email: 'test@test.com' },
      };

      // Act & Assert
      await expect(createPaymentPreference(params)).rejects.toThrow(
        'MP_ACCESS_TOKEN no configurado'
      );
    });
  });
});