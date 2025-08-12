import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import 'server-only';

/**
 * Creates a Supabase client for server-side usage with anon key.
 * Uses cookie-based auth for SSR.
 * @returns {Promise<SupabaseClient<Database>>} Supabase client
 * @throws {Error} If env vars missing
 */
export async function createServerSupabaseClient(): Promise<
  SupabaseClient<Database>
> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables de entorno de Supabase faltantes (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Creates a Supabase service role client for admin tasks.
 * Bypasses RLS for privileged operations.
 * @returns {Promise<SupabaseClient<Database>>} Service role client
 * @throws {Error} If env vars missing
 */
export async function createServerSupabaseServiceClient(): Promise<
  SupabaseClient<Database>
> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variables de entorno de Supabase faltantes (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  // Para service role, usar createClient directamente sin cookies
  // Importar createClient de @supabase/supabase-js
  const { createClient } = await import('@supabase/supabase-js');

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Aliases de compatibilidad para código existente
export const createClient = createServerSupabaseClient;
export const createServiceClient = createServerSupabaseServiceClient;
