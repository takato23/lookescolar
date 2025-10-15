import crypto from 'crypto';
import { catalogService } from '@/lib/services/catalog.service';
import { createMercadoPagoPreference } from '@/lib/payments/mercadopago';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export interface CheckoutItemInput {
  photoId: string;
  quantity: number;
  priceListItemId?: string;
  priceType?: string;
  price?: number;
}

export interface ContactInfoInput {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface FamilyCheckoutInput {
  token: string;
  contactInfo: ContactInfoInput;
  items: CheckoutItemInput[];
  requestId?: string;
}

export interface FamilyCheckoutResult {
  orderId: string;
  totalCents: number;
  currency: string;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  fallbackRedirectUrl?: string;
}

export class OrderPipelineError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'OrderPipelineError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface FolderRecord {
  id: string;
  event_id: string;
  view_count?: number | null;
  name?: string | null;
}

interface EventRecord {
  id: string;
  name?: string | null;
}

interface AssetRecord {
  id: string;
  filename?: string | null;
}

interface NormalizedItem {
  photoId: string;
  quantity: number;
  unitPriceCents: number;
  unitPrice: number;
  subtotalCents: number;
  priceListItemId: string;
  label: string | null;
}

class OrderPipeline {
  async processFamilyCheckout(input: FamilyCheckoutInput): Promise<FamilyCheckoutResult> {
    if (!input.items.length) {
      throw new OrderPipelineError('No hay items en el pedido', 400);
    }

    const supabase = await createServerSupabaseServiceClient();

    const folder = await this.fetchFolder(supabase, input.token);
    if (!folder) {
      throw new OrderPipelineError('Token no encontrado', 404);
    }

    const event = await this.fetchEvent(supabase, folder.event_id);
    if (!event) {
      throw new OrderPipelineError('Evento asociado no disponible', 404);
    }

    const photoIds = Array.from(new Set(input.items.map((item) => item.photoId)));
    const photos = await this.fetchPhotos(supabase, photoIds);

    if (photos.length !== photoIds.length) {
      throw new OrderPipelineError('Algunas fotos seleccionadas no existen', 400);
    }

    const catalog = await catalogService.getCatalogForEvent(folder.event_id);
    if (!catalog.items.length) {
      throw new OrderPipelineError('No hay precios configurados para este evento', 400);
    }

    const normalizedItems = this.normalizeItems(input.items, catalog.items);
    const totalCents = normalizedItems.reduce((sum, item) => sum + item.subtotalCents, 0);

    if (totalCents <= 0) {
      throw new OrderPipelineError('El total calculado es inválido', 400);
    }

    const order = await this.createOrder(supabase, {
      folder,
      event,
      contactInfo: input.contactInfo,
      token: input.token,
      items: normalizedItems,
      totalCents,
    });

    await this.createOrderItems(supabase, order.id, normalizedItems);
    await this.touchFolder(supabase, folder.id, folder.view_count ?? 0);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const backUrls = {
      success: `${baseUrl}/store/${input.token}/success`,
      failure: `${baseUrl}/store/${input.token}/failure`,
      pending: `${baseUrl}/store/${input.token}/pending`,
    };

    try {
      const preference = await createMercadoPagoPreference({
        items: normalizedItems.map((item) => ({
          id: item.photoId,
          title: photos.find((photo) => photo.id === item.photoId)?.filename || 'Foto',
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          description: event.name ? `Foto del evento ${event.name}` : undefined,
          categoryId: 'art',
        })),
        payer: {
          name: input.contactInfo.name,
          email: input.contactInfo.email,
          phone: input.contactInfo.phone,
          address: {
            street: input.contactInfo.street,
            city: input.contactInfo.city,
            state: input.contactInfo.state,
            zipCode: input.contactInfo.zipCode,
          },
        },
        options: {
          externalReference: order.id,
          backUrls,
          metadata: {
            token: input.token,
            contact_email: input.contactInfo.email,
            address: `${input.contactInfo.street}, ${input.contactInfo.city}, ${input.contactInfo.state} ${input.contactInfo.zipCode}`,
          },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      await supabase
        .from('orders')
        .update({ mp_preference_id: preference.id, mp_external_reference: order.id })
        .eq('id', order.id);

      return {
        orderId: order.id,
        totalCents,
        currency: catalog.currency,
        preferenceId: preference.id,
        initPoint: preference.initPoint,
        sandboxInitPoint: preference.sandboxInitPoint,
      };
    } catch (error) {
      const fallbackUrl = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=dev_${order.id}`;

      return {
        orderId: order.id,
        totalCents,
        currency: catalog.currency,
        fallbackRedirectUrl: fallbackUrl,
      };
    }
  }

  private async fetchFolder(client: any, token: string): Promise<FolderRecord | null> {
    const { data, error } = await client
      .from('folders')
      .select('id, event_id, view_count, name')
      .eq('share_token', token)
      .eq('is_published', true)
      .maybeSingle();

    if (error) {
      throw new OrderPipelineError('Error obteniendo la carpeta', 500, { message: error.message });
    }

    return data;
  }

  private async fetchEvent(client: any, eventId: string): Promise<EventRecord | null> {
    const { data, error } = await client
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .maybeSingle();

    if (error) {
      throw new OrderPipelineError('Error obteniendo el evento', 500, { message: error.message });
    }

    return data;
  }

  private async fetchPhotos(client: any, photoIds: string[]): Promise<AssetRecord[]> {
    const { data, error } = await client
      .from('assets')
      .select('id, filename')
      .in('id', photoIds);

    if (error) {
      throw new OrderPipelineError('Error obteniendo fotos seleccionadas', 500, {
        message: error.message,
      });
    }

    return data ?? [];
  }

  private normalizeItems(
    items: CheckoutItemInput[],
    priceList: import('@/lib/services/catalog.service').CatalogPriceItem[]
  ): NormalizedItem[] {
    const priceById = new Map<string, import('@/lib/services/catalog.service').CatalogPriceItem>();
    const priceByType = new Map<string, import('@/lib/services/catalog.service').CatalogPriceItem>();

    priceList.forEach((item) => {
      priceById.set(item.id, item);
      if (item.type) {
        priceByType.set(item.type, item);
      }
    });

    return items.map((item) => {
      const explicit = item.priceListItemId
        ? priceById.get(item.priceListItemId)
        : item.priceType
        ? priceByType.get(item.priceType)
        : undefined;

      const resolved = explicit ?? (priceList.length === 1 ? priceList[0] : undefined);

      if (!resolved) {
        throw new OrderPipelineError('Los precios enviados no coinciden con la lista oficial', 400, {
          photoId: item.photoId,
          priceListItemId: item.priceListItemId,
          priceType: item.priceType,
        });
      }

      const unitPriceCents = resolved.priceCents;
      if (typeof unitPriceCents !== 'number' || unitPriceCents <= 0) {
        throw new OrderPipelineError('Precio oficial inválido', 400, {
          photoId: item.photoId,
          priceListItemId: resolved.id,
        });
      }

      if (typeof item.price === 'number') {
        const provided = item.price;
        const matches =
          provided === unitPriceCents ||
          provided === unitPriceCents / 100 ||
          Math.round(provided * 100) === unitPriceCents;

        if (!matches) {
          throw new OrderPipelineError('Los precios enviados no coinciden con la lista oficial', 400, {
            photoId: item.photoId,
            provided,
            expectedCents: unitPriceCents,
          });
        }
      }

      const unitPrice = unitPriceCents / 100;
      const subtotalCents = unitPriceCents * item.quantity;

      return {
        photoId: item.photoId,
        quantity: item.quantity,
        unitPriceCents,
        unitPrice,
        subtotalCents,
        priceListItemId: resolved.id,
        label: resolved.label,
      };
    });
  }

  private async createOrder(
    client: any,
    params: {
      folder: FolderRecord;
      event: EventRecord;
      contactInfo: ContactInfoInput;
      token: string;
      items: NormalizedItem[];
      totalCents: number;
    }
  ) {
    const orderData = {
      folder_id: params.folder.id,
      event_id: params.folder.event_id,
      subject_id: null,
      order_number: `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      status: 'pending',
      total_amount: params.totalCents,
      contact_name: params.contactInfo.name,
      contact_email: params.contactInfo.email,
      contact_phone: params.contactInfo.phone,
      payment_method: 'mercadopago',
      metadata: {
        token: params.token,
        event_name: params.event.name ?? 'Sin nombre',
        address: `${params.contactInfo.street}, ${params.contactInfo.city}, ${params.contactInfo.state} ${params.contactInfo.zipCode}`,
        items: params.items.map((item) => ({
          photo_id: item.photoId,
          quantity: item.quantity,
          unit_price_cents: item.unitPriceCents,
          price_list_item_id: item.priceListItemId,
        })),
      },
    };

    const { data, error } = await client.from('orders').insert(orderData).select().single();

    if (error || !data) {
      throw new OrderPipelineError('Error creando la orden', 500, {
        message: error?.message,
      });
    }

    return data;
  }

  private async createOrderItems(
    client: any,
    orderId: string,
    items: NormalizedItem[]
  ) {
    const payload = items.map((item) => ({
      order_id: orderId,
      photo_id: item.photoId,
      quantity: item.quantity,
      unit_price: item.unitPriceCents,
      subtotal: item.subtotalCents,
      price_list_item_id: item.priceListItemId,
    }));

    const { error } = await client.from('order_items').insert(payload);

    if (error) {
      await client.from('orders').delete().eq('id', orderId);
      throw new OrderPipelineError('Error creando los items de la orden', 500, {
        message: error.message,
      });
    }
  }

  private async touchFolder(client: any, folderId: string, currentViewCount: number) {
    await client
      .from('folders')
      .update({
        view_count: (currentViewCount ?? 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', folderId);
  }
}

export const orderPipeline = new OrderPipeline();
