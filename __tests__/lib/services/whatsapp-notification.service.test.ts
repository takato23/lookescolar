import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizePhoneNumber,
  whatsappNotificationService,
} from '@/lib/services/whatsapp-notification.service';

describe('normalizePhoneNumber', () => {
  it('returns null for empty input', () => {
    expect(normalizePhoneNumber(undefined)).toBeNull();
    expect(normalizePhoneNumber(null)).toBeNull();
    expect(normalizePhoneNumber('')).toBeNull();
  });

  it('keeps numbers with plus sign intact', () => {
    expect(normalizePhoneNumber('+549110001111')).toBe('+549110001111');
  });

  it('converts numbers with leading zeros using default country code', () => {
    expect(normalizePhoneNumber('011 0001-1111', '54')).toBe('+541100011111');
  });

  it('converts numbers with 00 prefix to international format', () => {
    expect(normalizePhoneNumber('00549110001111')).toBe('+549110001111');
  });
});

describe('WhatsAppNotificationService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('skips execution when automation is disabled', async () => {
    process.env.WHATSAPP_AUTOMATION_ENABLED = 'false';
    process.env.META_WHATSAPP_TOKEN = 'token';
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone_id';

    const supabaseMock = {
      from: vi.fn(),
    } as any;

    await whatsappNotificationService.handleOrderPaid({
      supabase: supabaseMock,
      orderId: 'order-1',
      orderSource: 'orders',
    });

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
