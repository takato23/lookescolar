import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { withTenantOnClient } from '@/lib/multitenant/supabase-tenant';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';
import { getDefaultTenantId, sanitizeTenantId } from '@/lib/multitenant/config';
import { setTenantForRequest } from '@/lib/multitenant/tenant-context';
import 'server-only';

export interface ServerSupabaseOptions {
  tenantId?: string | null;
  bypassTenant?: boolean;
  serviceRole?: boolean;
}

function normalizeOptions(
  options?: ServerSupabaseOptions | boolean
): ServerSupabaseOptions {
  if (typeof options === 'boolean') {
    return { serviceRole: options };
  }

  return options ?? {};
}

async function resolveTenant(options: ServerSupabaseOptions): Promise<{
  tenantId: string;
  source: string;
}> {
  if (options.tenantId) {
    const sanitized = sanitizeTenantId(options.tenantId);
    if (sanitized) {
      return { tenantId: sanitized, source: 'explicit' };
    }
  }

  try {
    const requestHeaders = await Promise.resolve(headers());
    const resolution = resolveTenantFromHeaders(
      Object.fromEntries(requestHeaders.entries())
    );
    return { tenantId: resolution.tenantId, source: resolution.source };
  } catch {
    // Outside of a request context. Fallback to default tenant
    return { tenantId: getDefaultTenantId(), source: 'default' };
  }
}

async function buildSupabaseClient(
  options: ServerSupabaseOptions
): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurado');
  }

  if (!anonKey && !options.serviceRole) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurado');
  }

  const tenantResolution = await resolveTenant(options);
  const tenantId = tenantResolution.tenantId || getDefaultTenantId();
  setTenantForRequest(tenantId);

  const tenantHeaders = options.bypassTenant
    ? undefined
    : { 'x-tenant-id': tenantId };
  const globalHeaders = tenantHeaders ? { headers: tenantHeaders } : undefined;

  if (options.serviceRole) {
    const keyToUse = serviceRoleKey || anonKey;
    if (!keyToUse) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar configurados para operaciones privilegiadas'
      );
    }

    const client = createSupabaseClient<Database>(supabaseUrl, keyToUse, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: globalHeaders,
      db: { schema: 'public' },
    });

    if (options.bypassTenant) {
      return client;
    }

    return withTenantOnClient(client, { tenantId });
  }

  const cookieStore = await cookies();

  const client = createServerClient<Database>(supabaseUrl, anonKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, opts: any) {
        cookieStore.set({ name, value, ...opts });
      },
      remove(name: string, opts: any) {
        cookieStore.set({ name, value: '', ...opts });
      },
    },
    auth: { autoRefreshToken: true, persistSession: true },
    global: globalHeaders,
    db: { schema: 'public' },
  });

  if (options.bypassTenant) {
    return client;
  }

  return withTenantOnClient(client, { tenantId });
}

export async function createServerSupabaseClient(
  options?: ServerSupabaseOptions | boolean
): Promise<SupabaseClient<Database>> {
  const normalized = normalizeOptions(options);
  normalized.serviceRole = Boolean(normalized.serviceRole);
  return buildSupabaseClient(normalized);
}

export async function createServerSupabaseServiceClient(
  options?: ServerSupabaseOptions
): Promise<SupabaseClient<Database>> {
  return buildSupabaseClient({ ...(options ?? {}), serviceRole: true });
}

// Legacy helper
export function cleanupSupabaseClients() {}

export const createClient = createServerSupabaseClient;
export const createServiceClient = createServerSupabaseServiceClient;
export { createServerSupabaseClient as createServerClient };
