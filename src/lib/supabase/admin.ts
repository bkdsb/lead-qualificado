import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/config/env';

/**
 * Admin Supabase client using the service role key.
 * Bypasses RLS — use only in trusted server-side code.
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
