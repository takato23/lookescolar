import { publicAccessService } from '@/lib/services/public-access.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Fallback currency until multi-currency support is added
const DEFAULT_CURRENCY = 'ARS';

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseServiceClient>>;

interface PriceListRow {
  id: string;
  currency?: string | null;
}

interface PriceListItemRow {
  id: string;
  label?: string | null;
  type?: string | null;
  price_cents?: number | null;
  sort_order?: number | null;
  metadata?: Record<string, any> | null;
}

interface EventProductPricingRow {
  id: string;
  event_id: string;
  product_id: string | null;
  combo_id: string | null;
  override_price: number;
  is_active: boolean;
}

export interface CatalogPriceItem {
  id: string;
  label: string | null;
  type: string | null;
  priceCents: number;
  sortOrder: number | null;
  metadata: Record<string, any> | null;
}

export interface CatalogOverride {
  id: string;
  productId: string | null;
  comboId: string | null;
  overridePrice: number;
}

export interface CatalogData {
  eventId: string;
  priceListId: string | null;
  currency: string;
  items: CatalogPriceItem[];
  overrides: CatalogOverride[];
}

function mapPriceListItem(row: Partial<PriceListItemRow>): CatalogPriceItem {
  return {
    id: row.id ?? 'unknown',
    label: (row as any).label ?? null,
    type: (row as any).type ?? null,
    priceCents: typeof row.price_cents === 'number' ? row.price_cents : 0,
    sortOrder: (row as any).sort_order ?? null,
    metadata: (row as any).metadata ?? null,
  };
}

function mapOverride(row: EventProductPricingRow): CatalogOverride {
  return {
    id: row.id,
    productId: row.product_id,
    comboId: row.combo_id,
    overridePrice: row.override_price,
  };
}

class CatalogService {
  async getCatalogForToken(token: string): Promise<CatalogData> {
    const resolved = await publicAccessService.resolveAccessToken(token);

    if (!resolved?.event?.id) {
      throw new Error('No se pudo resolver el evento para el token solicitado');
    }

    return this.getCatalogForEvent(resolved.event.id);
  }

  async getCatalogForEvent(eventId: string): Promise<CatalogData> {
    const client = await createServerSupabaseServiceClient();

    const priceList = await this.fetchPriceList(client, eventId);
    const overrides = await this.fetchOverrides(client, eventId);

    return {
      eventId,
      priceListId: priceList?.id ?? null,
      currency: (priceList as any)?.currency ?? DEFAULT_CURRENCY,
      items: priceList?.items ?? [],
      overrides,
    };
  }

  private async fetchPriceList(
    client: SupabaseClient,
    eventId: string
  ): Promise<(PriceListRow & { items: CatalogPriceItem[] }) | null> {
    const { data, error } = await client
      .from('price_lists')
      .select(
        `
        id,
        price_list_items (* )
      `
      )
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    const items = Array.isArray((data as any).price_list_items)
      ? ((data as any).price_list_items as Partial<PriceListItemRow>[])
          .map(mapPriceListItem)
          .sort((a, b) => {
            const aOrder = a.sortOrder ?? 0;
            const bOrder = b.sortOrder ?? 0;
            if (aOrder === bOrder) {
              return (a.label || '').localeCompare(b.label || '');
            }
            return aOrder - bOrder;
          })
      : [];

    return {
      ...(data as PriceListRow),
      items,
    };
  }

  private async fetchOverrides(
    client: SupabaseClient,
    eventId: string
  ): Promise<CatalogOverride[]> {
    const { data, error } = await client
      .from('event_product_pricing')
      .select('id, event_id, product_id, combo_id, override_price, is_active')
      .eq('event_id', eventId)
      .eq('is_active', true);

    if (error) {
      if (error.code === '42P01') {
        // Table missing in some environments; treat as no overrides
        return [];
      }
      throw error;
    }

    if (!data) {
      return [];
    }

    return data.map(mapOverride);
  }
}

export const catalogService = new CatalogService();
