// Supabase admin client - stub implementation
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { withTenantOnClient } from '@/lib/multitenant/supabase-tenant';
import { getDefaultTenantId, sanitizeTenantId } from '@/lib/multitenant/config';

export function createAdminClient(tenantId?: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variables de entorno de Supabase faltantes para el cliente admin'
    );
  }

  const resolvedTenant = sanitizeTenantId(tenantId) ?? getDefaultTenantId();

  const client = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-tenant-id': resolvedTenant,
      },
    },
  });

  return withTenantOnClient(client, { tenantId: resolvedTenant });
}

export const adminClient = createAdminClient();
export const supabaseAdmin = adminClient;
