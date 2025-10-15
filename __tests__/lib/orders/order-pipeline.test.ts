import { describe, it, expect, beforeEach, vi } from 'vitest';

const supabaseMock = { from: vi.fn() } as any;
const catalogMock = { getCatalogForEvent: vi.fn() };
const createPreferenceMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(() => Promise.resolve(supabaseMock)),
}));

vi.mock('@/lib/services/catalog.service', () => ({
  catalogService: catalogMock,
}));

vi.mock('@/lib/payments/mercadopago', () => ({
  createMercadoPagoPreference: createPreferenceMock,
}));

const { orderPipeline, OrderPipelineError } = await import('@/lib/orders/order-pipeline');

describe('orderPipeline.processFamilyCheckout', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
    catalogMock.getCatalogForEvent.mockReset();
    createPreferenceMock.mockReset();
  });

  it('creates order and preference using normalized price list items', async () => {
    const folderBuilder: any = {
      select: vi.fn(() => folderBuilder),
      eq: vi.fn(() => folderBuilder),
      maybeSingle: vi.fn(async () => ({
        data: { id: 'folder-1', event_id: 'event-1', view_count: 2, name: 'Folder' },
        error: null,
      })),
    };

    const eventBuilder: any = {
      select: vi.fn(() => eventBuilder),
      eq: vi.fn(() => eventBuilder),
      maybeSingle: vi.fn(async () => ({ data: { id: 'event-1', name: 'Acto escolar' }, error: null })),
    };

    const assetsBuilder: any = {
      select: vi.fn(() => assetsBuilder),
      in: vi.fn(async () => ({ data: [{ id: 'photo-1', filename: 'foto.jpg' }], error: null })),
    };

    const ordersInsertBuilder: any = {
      insert: vi.fn(() => ordersInsertBuilder),
      select: vi.fn(() => ordersInsertBuilder),
      single: vi.fn(async () => ({ data: { id: 'order-1' }, error: null })),
    };

    const orderItemsInsertBuilder: any = {
      insert: vi.fn(async () => ({ data: null, error: null })),
    };

    const foldersUpdateBuilder: any = {
      update: vi.fn(() => foldersUpdateBuilder),
      eq: vi.fn(() => foldersUpdateBuilder),
    };

    const ordersUpdateBuilder: any = {
      update: vi.fn(() => ordersUpdateBuilder),
      eq: vi.fn(() => ({ data: null, error: null })),
    };

    supabaseMock.from
      .mockReturnValueOnce(folderBuilder)
      .mockReturnValueOnce(eventBuilder)
      .mockReturnValueOnce(assetsBuilder)
      .mockReturnValueOnce(ordersInsertBuilder)
      .mockReturnValueOnce(orderItemsInsertBuilder)
      .mockReturnValueOnce(foldersUpdateBuilder)
      .mockReturnValueOnce(ordersUpdateBuilder);

    catalogMock.getCatalogForEvent.mockResolvedValue({
      eventId: 'event-1',
      priceListId: 'pl-1',
      currency: 'ARS',
      items: [
        { id: 'pli-1', label: 'Foto Base', type: 'base', priceCents: 1500, sortOrder: 0, metadata: null },
      ],
      overrides: [],
    });

    createPreferenceMock.mockResolvedValue({
      id: 'pref-1',
      initPoint: 'https://mp.com/init',
      sandboxInitPoint: 'https://mp.com/sandbox',
    });

    const result = await orderPipeline.processFamilyCheckout({
      token: 'valid-token-1234567890',
      contactInfo: {
        name: 'Juan',
        email: 'juan@example.com',
        phone: '+5491100000000',
        street: 'Calle 123',
        city: 'Buenos Aires',
        state: 'BA',
        zipCode: '1000',
      },
      items: [
        {
          photoId: 'photo-1',
          quantity: 2,
          priceListItemId: 'pli-1',
        },
      ],
    });

    expect(result.orderId).toBe('order-1');
    expect(result.totalCents).toBe(3000);
    expect(result.preferenceId).toBe('pref-1');
    expect(createPreferenceMock).toHaveBeenCalledTimes(1);
  });

  it('throws when provided price does not match official price', async () => {
    const folderBuilder: any = {
      select: vi.fn(() => folderBuilder),
      eq: vi.fn(() => folderBuilder),
      maybeSingle: vi.fn(async () => ({ data: { id: 'folder-1', event_id: 'event-1' }, error: null })),
    };
    const eventBuilder: any = {
      select: vi.fn(() => eventBuilder),
      eq: vi.fn(() => eventBuilder),
      maybeSingle: vi.fn(async () => ({ data: { id: 'event-1' }, error: null })),
    };
    const assetsBuilder: any = {
      select: vi.fn(() => assetsBuilder),
      in: vi.fn(async () => ({ data: [{ id: 'photo-1' }], error: null })),
    };

    supabaseMock.from
      .mockReturnValueOnce(folderBuilder)
      .mockReturnValueOnce(eventBuilder)
      .mockReturnValueOnce(assetsBuilder);

    catalogMock.getCatalogForEvent.mockResolvedValue({
      eventId: 'event-1',
      priceListId: 'pl-1',
      currency: 'ARS',
      items: [
        { id: 'pli-1', label: 'Foto Base', type: 'base', priceCents: 2000, sortOrder: 0, metadata: null },
      ],
      overrides: [],
    });

    await expect(
      orderPipeline.processFamilyCheckout({
        token: 'valid-token-1234567890',
        contactInfo: {
          name: 'Juan',
          email: 'juan@example.com',
          phone: '+5491100000000',
          street: 'Calle 123',
          city: 'Buenos Aires',
          state: 'BA',
          zipCode: '1000',
        },
        items: [
          {
            photoId: 'photo-1',
            quantity: 1,
            priceListItemId: 'pli-1',
            price: 10,
          },
        ],
      })
    ).rejects.toBeInstanceOf(OrderPipelineError);
  });
});
