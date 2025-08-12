import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client for browser-side usage.
 * Validates required environment variables.
 * @returns {SupabaseClient<Database>} Supabase client instance
 * @throws {Error} If environment variables are missing
 */
export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables de entorno de Supabase faltantes (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Alias para compatibilidad
export const createClientSupabaseClient = createClient;
