import { createBrowserClient } from '@supabase/ssr';
import { getClientEnv } from '@/lib/config/env';

/**
 * Browser-side Supabase client.
 * Uses the anon key only — safe to use in client components.
 */
export function createClient() {
  const env = getClientEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
