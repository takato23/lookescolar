import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getDefaultTenantId, sanitizeTenantId } from './config';

const TENANT_SCOPED_TABLES = new Set<string>([
  'events',
  'folders',
  'photos',
  'assets',
  'subjects',
  'store_settings',
  'orders',
  'order_items',
  'unified_orders',
  'share_tokens',
  'subject_tokens',
  'photo_subjects',
  'folder_shares',
  'access_tokens',
  'tenant_plan_subscriptions',
  'whatsapp_notifications',
  'whatsapp_notification_attempts',
]);

function applyTenantToPayload<T extends Record<string, unknown> | null>(
  payload: T | T[],
  tenantId: string
): T | T[] {
  if (!payload) {
    return payload;
  }

  const assignTenant = (item: Record<string, unknown>) => {
    if (!('tenant_id' in item) || item.tenant_id == null) {
      item.tenant_id = tenantId;
    }
    return item;
  };

  if (Array.isArray(payload)) {
    return payload.map((item) => (item ? assignTenant({ ...item }) : item));
  }

  return assignTenant({ ...payload }) as T;
}

function wrapBuilder(builder: any, tenantId: string) {
  if (!builder || typeof builder !== 'object') {
    return builder;
  }

  if (typeof builder.select === 'function') {
    const originalSelect = builder.select.bind(builder);
    builder.select = (...args: any[]) => {
      const result = originalSelect(...args);
      return typeof result?.eq === 'function'
        ? result.eq('tenant_id', tenantId)
        : result;
    };
  }

  if (typeof builder.update === 'function') {
    const originalUpdate = builder.update.bind(builder);
    builder.update = (values: any, ...rest: any[]) => {
      const result = originalUpdate(
        applyTenantToPayload(values, tenantId),
        ...rest
      );
      return typeof result?.eq === 'function'
        ? result.eq('tenant_id', tenantId)
        : result;
    };
  }

  if (typeof builder.upsert === 'function') {
    const originalUpsert = builder.upsert.bind(builder);
    builder.upsert = (values: any, ...rest: any[]) =>
      originalUpsert(applyTenantToPayload(values, tenantId), ...rest);
  }

  if (typeof builder.insert === 'function') {
    const originalInsert = builder.insert.bind(builder);
    builder.insert = (values: any, ...rest: any[]) =>
      originalInsert(applyTenantToPayload(values, tenantId), ...rest);
  }

  if (typeof builder.delete === 'function') {
    const originalDelete = builder.delete.bind(builder);
    builder.delete = (...args: any[]) => {
      const result = originalDelete(...args);
      return typeof result?.eq === 'function'
        ? result.eq('tenant_id', tenantId)
        : result;
    };
  }

  return builder;
}

export interface TenantClientOptions {
  bypassTenant?: boolean;
  tenantId?: string | null;
  tables?: string[];
}

export function withTenantOnClient(
  client: SupabaseClient<Database>,
  options: TenantClientOptions = {}
): SupabaseClient<Database> {
  if (!client) {
    throw new Error('Supabase client is required for tenant scoping');
  }

  if (options.bypassTenant) {
    return client;
  }

  const tenantId =
    sanitizeTenantId(options.tenantId || (client as any).tenantId) ||
    getDefaultTenantId();
  const scopedTables = new Set(options.tables ?? TENANT_SCOPED_TABLES);

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string, ...rest: any[]) => {
          const builder = (target as any).from(table, ...rest);
          if (!scopedTables.has(table)) {
            return builder;
          }
          return wrapBuilder(builder, tenantId);
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}
