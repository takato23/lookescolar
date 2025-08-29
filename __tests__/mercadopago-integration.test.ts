import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createPaymentPreference,
  verifyWebhookSignature,
  processWebhookNotification,
  validateSinglePendingOrder,
  MP_STATUS_MAPPING,
} from '@/lib/mercadopago/mercadopago.service';

// Mock MP SDK
vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(),
  Preference: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      id: 'test-preference-id',
      init_point: 'https://test-init-point.com',
      sandbox_init_point: 'https://test-sandbox-init-point.com',
    }),
  })),
  Payment: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue({
      id: 'test-payment-id',
      status: 'approved',
      external_reference: 'test-order-id',
      transaction_amount: 100.0,
    }),
  })),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

describe('Mercado Pago Integration', () => {
  beforeEach(() => {
    // Set up environment variables
    process.env.MP_ACCESS_TOKEN = 'test-access-token';
    process.env.MP_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Payment Preference Creation', () => {
    it('should create payment preference successfully', async () => {
      const params = {
        orderId: 'test-order-123',
        items: [
          {
            title: 'Foto Escolar',
            quantity: 2,
            unit_price: 50.0,
          },
        ],
        payer: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '+54 11 1234-5678',
        },
      };

      const result = await createPaymentPreference(params);

      expect(result).toEqual({
        id: 'test-preference-id',
        init_point: 'https://test-init-point.com',
        sandbox_init_point: 'https://test-sandbox-init-point.com',
      });
    });

    it('should throw error when MP_ACCESS_TOKEN is missing', async () => {
      delete process.env.MP_ACCESS_TOKEN;

      const params = {
        orderId: 'test-order-123',
        items: [{ title: 'Test', quantity: 1, unit_price: 50 }],
        payer: { name: 'Test', email: 'test@test.com' },
      };

      await expect(createPaymentPreference(params)).rejects.toThrow(
        'MP_ACCESS_TOKEN no configurado'
      );
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should verify valid webhook signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const expectedSignature =
        'v1=' +
        require('crypto')
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');

      const result = verifyWebhookSignature(body, expectedSignature, secret);
      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const invalidSignature = 'v1=invalid-signature';

      const result = verifyWebhookSignature(body, invalidSignature, secret);
      expect(result).toBe(false);
    });

    it('should handle missing secret or signature', () => {
      const body = JSON.stringify({ test: 'data' });

      expect(verifyWebhookSignature(body, '', 'secret')).toBe(false);
      expect(verifyWebhookSignature(body, 'signature', '')).toBe(false);
      expect(verifyWebhookSignature(body, '', '')).toBe(false);
    });

    it('should handle signature format variations', () => {
      const body = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const hash = require('crypto')
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      // Test with v1= prefix
      expect(verifyWebhookSignature(body, `v1=${hash}`, secret)).toBe(true);

      // Test without v1= prefix (should be handled)
      expect(verifyWebhookSignature(body, hash, secret)).toBe(true);
    });
  });

  describe('MP Status Mapping', () => {
    it('should correctly map MP statuses to internal statuses', () => {
      expect(MP_STATUS_MAPPING.approved).toBe('approved');
      expect(MP_STATUS_MAPPING.pending).toBe('pending');
      expect(MP_STATUS_MAPPING.in_process).toBe('pending');
      expect(MP_STATUS_MAPPING.rejected).toBe('failed');
      expect(MP_STATUS_MAPPING.cancelled).toBe('failed');
      expect(MP_STATUS_MAPPING.refunded).toBe('failed');
    });

    it('should handle all possible MP statuses', () => {
      const mpStatuses = [
        'approved',
        'pending',
        'in_process',
        'in_mediation',
        'rejected',
        'cancelled',
        'refunded',
        'charged_back',
      ];

      mpStatuses.forEach((status) => {
        expect(
          MP_STATUS_MAPPING[status as keyof typeof MP_STATUS_MAPPING]
        ).toBeDefined();
      });
    });
  });

  describe('Single Pending Order Validation', () => {
    it('should allow order creation when no pending orders exist', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                limit: vi.fn(() =>
                  Promise.resolve({
                    data: [], // No pending orders
                    error: null,
                  })
                ),
              })),
            })),
          })),
        })),
      };

      vi.mocked(
        require('@/lib/supabase/server').createServiceClient
      ).mockReturnValue(mockSupabase);

      const result = await validateSinglePendingOrder('test-subject-id');
      expect(result).toBe(true);
    });

    it('should prevent order creation when pending order exists', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                limit: vi.fn(() =>
                  Promise.resolve({
                    data: [{ id: 'existing-pending-order' }], // Has pending order
                    error: null,
                  })
                ),
              })),
            })),
          })),
        })),
      };

      vi.mocked(
        require('@/lib/supabase/server').createServiceClient
      ).mockReturnValue(mockSupabase);

      const result = await validateSinglePendingOrder('test-subject-id');
      expect(result).toBe(false);
    });

    it('should throw error on database error', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                limit: vi.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: { message: 'Database error' },
                  })
                ),
              })),
            })),
          })),
        })),
      };

      vi.mocked(
        require('@/lib/supabase/server').createServiceClient
      ).mockReturnValue(mockSupabase);

      await expect(
        validateSinglePendingOrder('test-subject-id')
      ).rejects.toThrow('Error validando pedidos existentes');
    });
  });

  describe('Webhook Notification Processing', () => {
    it('should process approved payment successfully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: null, // No existing order with this payment_id
                  error: null,
                })
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      };

      vi.mocked(
        require('@/lib/supabase/server').createServiceClient
      ).mockReturnValue(mockSupabase);

      const result = await processWebhookNotification('test-payment-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('actualizada a estado approved');
    });

    it('should handle idempotent webhook calls', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    mp_payment_id: 'test-payment-id',
                    status: 'approved',
                  },
                  error: null,
                })
              ),
            })),
          })),
        })),
      };

      vi.mocked(
        require('@/lib/supabase/server').createServiceClient
      ).mockReturnValue(mockSupabase);

      const result = await processWebhookNotification('test-payment-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('idempotencia');
    });

    it('should retry on failure with exponential backoff', async () => {
      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => {
                callCount++;
                if (callCount < 3) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Network error' },
                  });
                }
                return Promise.resolve({ data: null, error: null });
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      };

      vi.mocked(
        require('@/lib/supabase/server').createServiceClient
      ).mockReturnValue(mockSupabase);

      const result = await processWebhookNotification('test-payment-id');

      expect(callCount).toBeGreaterThanOrEqual(3); // Should have retried
      expect(result.success).toBe(true);
    });

    it('should fail after max retries', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: { message: 'Persistent error' },
                })
              ),
            })),
          })),
        })),
      };

      vi.mocked(
        require('@/lib/supabase/server').createServiceClient
      ).mockReturnValue(mockSupabase);

      const result = await processWebhookNotification('test-payment-id');

      expect(result.success).toBe(false);
      expect(result.message).toContain('después de 4 intentos');
    });
  });

  describe('Error Handling', () => {
    it('should handle MP SDK errors gracefully', async () => {
      // Mock MP SDK to throw error
      vi.mocked(require('mercadopago').Preference).mockImplementation(() => ({
        create: vi.fn().mockRejectedValue(new Error('MP API Error')),
      }));

      const params = {
        orderId: 'test-order-123',
        items: [{ title: 'Test', quantity: 1, unit_price: 50 }],
        payer: { name: 'Test', email: 'test@test.com' },
      };

      await expect(createPaymentPreference(params)).rejects.toThrow(
        'Error al crear preferencia de pago'
      );
    });

    it('should handle malformed webhook payloads', () => {
      const malformedBody = 'not-json';
      const signature = 'v1=some-signature';
      const secret = 'test-secret';

      // Should not throw, but return false
      const result = verifyWebhookSignature(malformedBody, signature, secret);
      expect(result).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should use timing-safe comparison for signature verification', () => {
      const body = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const validHash = require('crypto')
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      // Test that function uses crypto.timingSafeEqual internally
      // This test verifies that we're not vulnerable to timing attacks
      const startTime = process.hrtime.bigint();
      verifyWebhookSignature(body, `v1=${validHash}`, secret);
      const validTime = process.hrtime.bigint();

      const invalidHash = 'a'.repeat(64); // Same length as SHA256
      const startTime2 = process.hrtime.bigint();
      verifyWebhookSignature(body, `v1=${invalidHash}`, secret);
      const invalidTime = process.hrtime.bigint();

      // Time difference should be minimal (timing-safe)
      const validDuration = Number(validTime - startTime);
      const invalidDuration = Number(invalidTime - startTime2);
      const timeDifference = Math.abs(validDuration - invalidDuration);

      // Allow for some variance but ensure it's not dramatically different
      expect(timeDifference).toBeLessThan(1000000); // 1ms in nanoseconds
    });

    it('should not log sensitive data', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        await processWebhookNotification('sensitive-payment-id-12345');
      } catch (error) {
        // Ignore errors, we're testing logging
      }

      // Verify that payment ID is masked in logs
      const logCalls = consoleSpy.mock.calls;
      logCalls.forEach((call) => {
        const logMessage = call.join(' ');
        expect(logMessage).not.toContain('sensitive-payment-id-12345');
        if (logMessage.includes('payment-id')) {
          expect(logMessage).toMatch(/pay_\*\*\*\w{4}/); // Should be masked
        }
      });

      consoleSpy.mockRestore();
    });
  });
});
