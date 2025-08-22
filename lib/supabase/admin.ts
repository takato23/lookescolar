// Supabase admin client - stub implementation
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  // Use the same service role client as the main admin client
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export const adminClient = createAdminClient();