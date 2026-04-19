import { z } from 'zod';

/**
 * Server-side environment variables schema.
 * These are validated at runtime when any server code imports this module.
 * Missing required variables will crash the app immediately with a clear error.
 */
const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Meta
  META_ACCESS_TOKEN: z.string().min(1, 'META_ACCESS_TOKEN is required'),
  META_PIXEL_ID: z.string().min(1, 'META_PIXEL_ID is required'),
  META_API_VERSION: z.string().default('v25.0'),
  META_TEST_EVENT_CODE: z.string().optional().default(''),

  // App
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
});

/**
 * Client-side environment variables schema.
 * Only NEXT_PUBLIC_ prefixed variables are available on the client.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('http://localhost:3000'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Cache parsed envs
let _serverEnv: ServerEnv | null = null;
let _clientEnv: ClientEnv | null = null;

/**
 * Get validated server environment variables.
 * Throws immediately if any required variable is missing or malformed.
 */
export function getServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessage = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    throw new Error(
      `\n❌ Missing or invalid environment variables:\n${errorMessage}\n\n` +
      `Copy .env.example to .env.local and fill in the required values.\n`
    );
  }

  _serverEnv = parsed.data;
  return _serverEnv;
}

/**
 * Get validated client environment variables.
 * Safe to use in client-side code — only NEXT_PUBLIC_ vars.
 */
export function getClientEnv(): ClientEnv {
  if (_clientEnv) return _clientEnv;

  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    throw new Error('Missing client environment variables. Check .env.local.');
  }

  _clientEnv = parsed.data;
  return _clientEnv;
}

/** Helper: is the app running in test mode? */
export function isTestMode(): boolean {
  const env = getServerEnv();
  return env.NEXT_PUBLIC_APP_ENV !== 'production';
}

/** Helper: get Meta API base URL */
export function getMetaApiBaseUrl(): string {
  const env = getServerEnv();
  return `https://graph.facebook.com/${env.META_API_VERSION}`;
}
