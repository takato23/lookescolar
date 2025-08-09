import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/family/checkout/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/mercadopago/mercadopago.service', () => ({
  createPaymentPreference: vi.fn(),
  validateSinglePendingOrder: vi.fn(),
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
    }),
  })),
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(),
  },
}));

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
};

const { createServiceClient } = await import('@/lib/supabase/server');
const { createPaymentPreference, validateSinglePendingOrder } = await import('@/lib/mercadopago/mercadopago.service');

describe('Family Checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any);
    vi.mocked(validateSinglePendingOrder).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const createValidCheckoutRequest = (overrides = {}) => {
    const validRequest = {
      token: 'valid-token-20-characters',
      contactInfo: {
        name: 'Juan Perez',
        email: 'juan@example.com',
        phone: '+54911234567',
      },
      items: [
        {
          photoId: crypto.randomUUID(),
          priceType: 'base',
          quantity: 2,
        },
      ],
      ...overrides,
    };

    return {
      json: vi.fn().mockResolvedValue(validRequest),
      headers: {
        get: vi.fn().mockImplementation((header: string) => {
          if (header === 'x-forwarded-for') return '127.0.0.1';
          return null;
        }),
      },
      ip: '127.0.0.1',
    } as unknown as NextRequest;
  };

  it('should create checkout successfully with valid data', async () => {
    // Arrange
    const subjectId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const photoId = crypto.randomUUID();
    const priceListId = crypto.randomUUID();
    const priceListItemId = crypto.randomUUID();

    const request = createValidCheckoutRequest({
      items: [{ photoId, priceType: 'base', quantity: 1 }],
    });

    // Mock token validation
    mockSupabase.single
      .mockResolvedValueOnce({
        data: {
          subject_id: subjectId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          subjects: {
            id: subjectId,
            event_id: eventId,
            first_name: 'Juan',
            last_name: 'Perez',
            type: 'student',
            events: {
              id: eventId,
              name: 'Evento Test',
              school_name: 'Escuela Test',
              status: 'active',
            },
          },
        },
      })
      // Mock photo validation
      .mockResolvedValueOnce({
        data: [{ id: photoId, filename: 'photo1.jpg' }],
      })
      // Mock price list
      .mockResolvedValueOnce({
        data: {
          id: priceListId,
          price_list_items: [
            {
              id: priceListItemId,
              label: 'Foto Base',
              type: 'base',
              price_cents: 1000,
            },
          ],
        },
      });

    // Mock order creation
    mockSupabase.insert.mockResolvedValueOnce({ error: null });
    mockSupabase.update.mockResolvedValueOnce({ error: null });

    // Mock MP preference creation
    vi.mocked(createPaymentPreference).mockResolvedValue({
      id: 'mp-preference-id',
      init_point: 'https://mp.com/init_point',
      sandbox_init_point: 'https://mp.com/sandbox_init_point',
    });

    // Act
    const response = await POST(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody).toMatchObject({
      success: true,
      orderId: expect.any(String),
      preferenceId: 'mp-preference-id',
      redirectUrl: 'https://mp.com/sandbox_init_point',
      total: 10, // 1000 cents = 10 pesos
      currency: 'ARS',
    });

    expect(createPaymentPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: expect.any(String),
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
      })
    );
  });

  it('should reject request with invalid token', async () => {
    // Arrange
    const request = createValidCheckoutRequest({
      token: 'short-token', // Invalid token
    });

    // Act
    const response = await POST(request);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseBody).toMatchObject({
      error: 'Invalid checkout data',
      details: expect.arrayContaining([
        expect.stringContaining('token: Token inválido'),
      ]),
    });
  });
});