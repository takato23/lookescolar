import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/payments/webhook/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock dependencies
vi.mock('@/lib/mercadopago/mercadopago.service', () => ({
  verifyWebhookSignature: vi.fn(),
  processWebhookNotification: vi.fn(),
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(),
  },
}));

const { verifyWebhookSignature, processWebhookNotification } = await import('@/lib/mercadopago/mercadopago.service');

describe('Webhook API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MP_WEBHOOK_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should process valid payment webhook successfully', async () => {
    // Arrange
    const paymentId = '123456789';
    const webhookBody = {
      id: 12345,
      live_mode: false,
      type: 'payment',
      date_created: new Date().toISOString(),
      application_id: 1234567890,
      user_id: 123456,
      version: 1,
      api_version: 'v1',
      action: 'payment.created',
      data: {
        id: paymentId,
      },
    };

    const bodyText = JSON.stringify(webhookBody);
    const signature = 'v1=test-signature';
    const requestId = 'test-request-id';

    // Mock request
    const request = {
      headers: {
        get: vi.fn().mockImplementation((header: string) => {
          if (header === 'x-signature') return signature;
          if (header === 'x-request-id') return requestId;
          return null;
        }),
      },
      text: vi.fn().mockResolvedValue(bodyText),
    } as unknown as NextRequest;

    // Mock functions
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    vi.mocked(processWebhookNotification).mockResolvedValue({
      success: true,
      message: 'Payment processed successfully',
    });

    // Act
    const response = await POST(request);
    const responseBody = await response.text();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody).toBe('OK');
    expect(verifyWebhookSignature).toHaveBeenCalledWith(
      bodyText,
      signature,
      'test-secret-key'
    );
    expect(processWebhookNotification).toHaveBeenCalledWith(paymentId);
  });

  it('should reject webhook with invalid signature', async () => {
    // Arrange
    const webhookBody = {
      id: 12345,
      live_mode: false,
      type: 'payment',
      date_created: new Date().toISOString(),
      application_id: 1234567890,
      user_id: 123456,
      version: 1,
      api_version: 'v1',
      action: 'payment.created',
      data: { id: '123456789' },
    };

    const bodyText = JSON.stringify(webhookBody);
    const signature = 'v1=invalid-signature';
    const requestId = 'test-request-id';

    const request = {
      headers: {
        get: vi.fn().mockImplementation((header: string) => {
          if (header === 'x-signature') return signature;
          if (header === 'x-request-id') return requestId;
          return null;
        }),
      },
      text: vi.fn().mockResolvedValue(bodyText),
    } as unknown as NextRequest;

    // Mock invalid signature
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(401);
    expect(processWebhookNotification).not.toHaveBeenCalled();
  });

  it('should ignore non-payment webhooks', async () => {
    // Arrange
    const webhookBody = {
      id: 12345,
      live_mode: false,
      type: 'merchant_order', // Non-payment type
      date_created: new Date().toISOString(),
      application_id: 1234567890,
      user_id: 123456,
      version: 1,
      api_version: 'v1',
      action: 'merchant_order.created',
      data: { id: '123456789' },
    };

    const bodyText = JSON.stringify(webhookBody);
    const signature = 'v1=test-signature';
    const requestId = 'test-request-id';

    const request = {
      headers: {
        get: vi.fn().mockImplementation((header: string) => {
          if (header === 'x-signature') return signature;
          if (header === 'x-request-id') return requestId;
          return null;
        }),
      },
      text: vi.fn().mockResolvedValue(bodyText),
    } as unknown as NextRequest;

    vi.mocked(verifyWebhookSignature).mockReturnValue(true);

    // Act
    const response = await POST(request);
    const responseBody = await response.text();

    // Assert
    expect(response.status).toBe(200);
    expect(responseBody).toBe('OK');
    expect(processWebhookNotification).not.toHaveBeenCalled();
  });
});