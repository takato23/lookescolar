import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { withTenantOnClient } from '@/lib/multitenant/supabase-tenant';
import { resolveTenantForBrowser } from '@/lib/multitenant/tenant-resolver';

export interface BrowserSupabaseOptions {
  tenantId?: string | null;
  bypassTenant?: boolean;
}

/**
 * Creates a tenant-aware Supabase client for browser usage.
 * Injects the resolved tenant id in every request header and
 * automatically scopes queries to the current tenant.
 */
export function createClient(
  options: BrowserSupabaseOptions = {}
): SupabaseClient<Database> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables de entorno de Supabase faltantes (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }

  const resolution = resolveTenantForBrowser(options.tenantId ?? null);
  const tenantHeaders = options.bypassTenant
    ? {}
    : { 'x-tenant-id': resolution.tenantId };

  const baseClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: tenantHeaders,
      },
    }
  );

  (baseClient as any).tenantId = resolution.tenantId;

  if (options.bypassTenant) {
    return baseClient;
  }

  return withTenantOnClient(baseClient, {
    tenantId: resolution.tenantId,
  });
}

export const createClientSupabaseClient = createClient;
export const supabase = createClient();
