import { createClient } from '@supabase/supabase-js';
import { vi, expect } from 'vitest';

// Test database client
export const createTestClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Setup test data for family checkout tests
 */
export async function setupTestData() {
  const supabase = createTestClient();
  const testIds = {
    eventId: crypto.randomUUID(),
    subjectId: crypto.randomUUID(),
    otherSubjectId: crypto.randomUUID(),
    priceListId: crypto.randomUUID(),
    priceItemId: crypto.randomUUID(),
    photoIds: [crypto.randomUUID(), crypto.randomUUID()],
    otherSubjectPhotoId: crypto.randomUUID(),
    validToken: generateSecureToken(25),
    expiredToken: generateSecureToken(25),
    basePrice: 1500, // 15 pesos in cents
  };

  // Create event
  await supabase.from('events').insert({
    id: testIds.eventId,
    name: 'Test Event',
    school: 'Test School',
    school_name: 'Test School',
    date: '2024-12-01',
    status: 'active',
    public_gallery_enabled: true,
  });

  // Create subjects
  await supabase.from('subjects').insert([
    {
      id: testIds.subjectId,
      event_id: testIds.eventId,
      type: 'student',
      first_name: 'Test',
      last_name: 'Student',
      public_visible: false,
    },
    {
      id: testIds.otherSubjectId,
      event_id: testIds.eventId,
      type: 'student',
      first_name: 'Other',
      last_name: 'Student',
      public_visible: false,
    },
  ]);

  // Create tokens
  await supabase.from('subject_tokens').insert([
    {
      subject_id: testIds.subjectId,
      token: testIds.validToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    },
    {
      subject_id: testIds.subjectId,
      token: testIds.expiredToken,
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    },
  ]);

  // Create price list
  await supabase.from('price_lists').insert({
    id: testIds.priceListId,
    event_id: testIds.eventId,
  });

  // Create price list items
  await supabase.from('price_list_items').insert([
    {
      id: testIds.priceItemId,
      price_list_id: testIds.priceListId,
      label: 'Base Photo',
      type: 'base',
      price_cents: testIds.basePrice,
    },
  ]);

  // Create photos
  await supabase.from('photos').insert([
    {
      id: testIds.photoIds[0],
      event_id: testIds.eventId,
      subject_id: testIds.subjectId,
      storage_path: '/test/photo1.jpg',
      filename: 'photo1.jpg',
      approved: true,
    },
    {
      id: testIds.photoIds[1],
      event_id: testIds.eventId,
      subject_id: testIds.subjectId,
      storage_path: '/test/photo2.jpg',
      filename: 'photo2.jpg',
      approved: true,
    },
    {
      id: testIds.otherSubjectPhotoId,
      event_id: testIds.eventId,
      subject_id: testIds.otherSubjectId,
      storage_path: '/test/other.jpg',
      filename: 'other.jpg',
      approved: true,
    },
  ]);

  return testIds;
}

/**
 * Setup test data for public checkout tests
 */
export async function setupPublicTestData(eventId: string) {
  const supabase = createTestClient();
  const publicData = {
    eventId,
    publicSubjectId: crypto.randomUUID(),
    privateSubjectId: crypto.randomUUID(),
    publicPhotoIds: [crypto.randomUUID(), crypto.randomUUID()],
    privatePhotoId: crypto.randomUUID(),
    basePrice: 1500, // 15 pesos in cents
  };

  // Ensure event has public gallery enabled
  await supabase
    .from('events')
    .update({
      public_gallery_enabled: true,
      status: 'active',
    })
    .eq('id', eventId);

  // Create subjects with different visibility
  await supabase.from('subjects').insert([
    {
      id: publicData.publicSubjectId,
      event_id: eventId,
      type: 'student',
      first_name: 'Public',
      last_name: 'Student',
      public_visible: true,
    },
    {
      id: publicData.privateSubjectId,
      event_id: eventId,
      type: 'student',
      first_name: 'Private',
      last_name: 'Student',
      public_visible: false,
    },
  ]);

  // Create photos with different visibility
  await supabase.from('photos').insert([
    {
      id: publicData.publicPhotoIds[0],
      event_id: eventId,
      subject_id: publicData.publicSubjectId,
      storage_path: '/test/public1.jpg',
      filename: 'public1.jpg',
      approved: true,
    },
    {
      id: publicData.publicPhotoIds[1],
      event_id: eventId,
      subject_id: publicData.publicSubjectId,
      storage_path: '/test/public2.jpg',
      filename: 'public2.jpg',
      approved: true,
    },
    {
      id: publicData.privatePhotoId,
      event_id: eventId,
      subject_id: publicData.privateSubjectId, // Subject with public_visible = false
      storage_path: '/test/private.jpg',
      filename: 'private.jpg',
      approved: true,
    },
  ]);

  return publicData;
}

/**
 * Cleanup test data
 */
export async function cleanupTestData(testIds: any) {
  const supabase = createTestClient();

  // Delete in correct order to respect foreign keys
  if (testIds.eventId) {
    // Delete photos first
    await supabase.from('photos').delete().eq('event_id', testIds.eventId);

    // Delete orders and related items
    const { data: orderIds } = await supabase
      .from('orders')
      .select('id')
      .eq('event_id', testIds.eventId);

    if (orderIds && orderIds.length > 0) {
      await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds.map(o => o.id));
    }
    await supabase.from('orders').delete().eq('event_id', testIds.eventId);

    // Delete subject tokens
    const { data: subjectIds } = await supabase
      .from('subjects')
      .select('id')
      .eq('event_id', testIds.eventId);

    if (subjectIds && subjectIds.length > 0) {
      await supabase
        .from('subject_tokens')
        .delete()
        .in('subject_id', subjectIds.map(s => s.id));
    }

    // Delete subjects
    await supabase.from('subjects').delete().eq('event_id', testIds.eventId);

    // Delete price list items and price lists
    const { data: priceLists } = await supabase
      .from('price_lists')
      .select('id')
      .eq('event_id', testIds.eventId);

    if (priceLists && priceLists.length > 0) {
      await supabase
        .from('price_list_items')
        .delete()
        .in('price_list_id', priceLists.map(p => p.id));
    }
    await supabase.from('price_lists').delete().eq('event_id', testIds.eventId);

    // Delete event last
    await supabase.from('events').delete().eq('id', testIds.eventId);
  }

  // Clean up individual IDs if provided
  const cleanupPromises = [];

  if (testIds.photoIds) {
    cleanupPromises.push(
      supabase.from('photos').delete().in('id', testIds.photoIds)
    );
  }

  if (testIds.publicPhotoIds) {
    cleanupPromises.push(
      supabase.from('photos').delete().in('id', testIds.publicPhotoIds)
    );
  }

  if (testIds.otherSubjectPhotoId) {
    cleanupPromises.push(
      supabase.from('photos').delete().eq('id', testIds.otherSubjectPhotoId)
    );
  }

  if (testIds.privatePhotoId) {
    cleanupPromises.push(
      supabase.from('photos').delete().eq('id', testIds.privatePhotoId)
    );
  }

  await Promise.allSettled(cleanupPromises);
}

/**
 * Generate secure token for testing (mimics database function)
 */
function generateSecureToken(length: number = 20): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Mock Mercado Pago functions for testing
 */
export const mockMP = {
  createPaymentPreference: vi.fn().mockResolvedValue({
    id: 'mock-preference-id',
    init_point:
      'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=mock',
    sandbox_init_point:
      'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=mock',
  }),

  verifyWebhookSignature: vi.fn().mockReturnValue(true),

  processWebhookNotification: vi.fn().mockResolvedValue({
    success: true,
    message: 'Payment processed successfully',
  }),
};

/**
 * Mock Redis for rate limiting in tests
 */
export const mockRedis = {
  limit: vi.fn().mockResolvedValue({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  }),
};

/**
 * Setup mocks for integration tests
 */
export function setupMocks() {
  // Mock crypto.randomUUID if not available
  if (typeof crypto === 'undefined' || !crypto.randomUUID) {
    global.crypto = {
      ...global.crypto,
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }
        );
      },
    };
  }

  // Mock environment variables
  // Mock environment variables only if not present
  if (!process.env.MP_ACCESS_TOKEN) process.env.MP_ACCESS_TOKEN = 'TEST-mock-access-token';
  if (!process.env.MP_WEBHOOK_SECRET) process.env.MP_WEBHOOK_SECRET = 'test-webhook-secret';

  // Use NEXT_PUBLIC_SUPABASE_URL as SUPABASE_URL if not set
  if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'http://localhost:54321';
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  if (!process.env.NEXT_PUBLIC_BASE_URL) process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

  return {
    mockMP,
    mockRedis,
  };
}

/**
 * Create a valid order for testing webhook functionality
 */
export async function createTestOrder(subjectId?: string, eventId?: string) {
  const supabase = createTestClient();
  const orderId = crypto.randomUUID();

  await supabase.from('orders').insert({
    id: orderId,
    subject_id: subjectId || null,
    event_id: eventId || null,
    contact_name: 'Test Customer',
    contact_email: 'test@example.com',
    status: 'pending',
    is_public_order: !subjectId,
    created_by: subjectId ? 'family_checkout' : 'public_checkout',
    total_amount_cents: 1500,
  });

  return orderId;
}

/**
 * Assert response structure for checkout APIs
 */
export function assertSuccessfulCheckoutResponse(data: any) {
  expect(data).toMatchObject({
    success: true,
    orderId: expect.any(String),
    preferenceId: expect.any(String),
    redirectUrl: expect.any(String),
    total: expect.any(Number),
    currency: 'ARS',
    items: expect.any(Array),
    event: expect.objectContaining({
      name: expect.any(String),
    }),
  });

  expect(data.items.length).toBeGreaterThan(0);
  expect(data.total).toBeGreaterThan(0);
  expect(data.redirectUrl).toMatch(/mercadopago/);
}

/**
 * Assert error response structure
 */
export function assertErrorResponse(
  data: any,
  expectedStatus: number,
  errorMessage?: string
) {
  expect(data).toMatchObject({
    error: expect.any(String),
  });

  if (errorMessage) {
    expect(data.error).toContain(errorMessage);
  }
}
