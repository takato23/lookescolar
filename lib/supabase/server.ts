import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import 'server-only';

// Temporary fix: disable ALL caching in development to prevent memory leaks
// This is a workaround until we can properly debug the AsyncHook issue

// Global cleanup function (legacy - no longer needed)
export function cleanupSupabaseClients() {
  // No-op in development mode
}

/**
 * Creates a Supabase client for server-side usage with anon key.
 * Uses cookie-based auth for SSR with connection pooling.
 * @returns {Promise<SupabaseClient<Database>>} Supabase client
 * @throws {Error} If env vars missing
 */
export async function createServerSupabaseClient(): Promise<
  SupabaseClient<Database>
> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables de entorno de Supabase faltantes (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }

  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors in middleware/edge runtime
            console.warn('Cookie setting failed:', error);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie removal errors in middleware/edge runtime
            console.warn('Cookie removal failed:', error);
          }
        },
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    }
  );
}

/**
 * Creates a Supabase service role client for admin tasks.
 * Bypasses RLS for privileged operations with connection pooling.
 * @returns {Promise<SupabaseClient<Database>>} Service role client
 * @throws {Error} If env vars missing
 */
export async function createServerSupabaseServiceClient(): Promise<
  SupabaseClient<Database>
> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl) {
    throw new Error(
      'Variables de entorno de Supabase faltantes (NEXT_PUBLIC_SUPABASE_URL)'
    );
  }

  const { createClient } = await import('@supabase/supabase-js');

  // Prefer service role when available; gracefully fallback to anon for public APIs
  const keyToUse = serviceRoleKey || anonKey;
  if (!keyToUse) {
    throw new Error(
      'Variables de entorno de Supabase faltantes (SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }

  if (!serviceRoleKey) {
    // eslint-disable-next-line no-console
    console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY ausente. Usando ANON como fallback para operaciones públicas.');
  }

  const client = createClient<Database>(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

// Aliases de compatibilidad para código existente
export const createClient = createServerSupabaseClient;
export const createServiceClient = createServerSupabaseServiceClient;
export { createServerSupabaseClient as createServerClient };
