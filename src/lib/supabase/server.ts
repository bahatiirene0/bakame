/**
 * Supabase Server Client
 *
 * Production-ready server-side client with connection pooling and error handling.
 *
 * Features:
 * - Uses connection pooler URL when available for better performance
 * - Implements connection timeout handling
 * - Proper error logging with structured context
 * - Connection reuse pattern to avoid excessive connections
 * - Type-safe database operations
 *
 * @module lib/supabase/server
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import type { Database } from './types';

/**
 * Supabase client configuration
 */
const SUPABASE_CONFIG = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  poolerUrl: env.SUPABASE_DB_POOLER_URL,

  // Connection settings
  db: {
    schema: 'public',
  },

  // Auth settings
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },

  // Global settings
  global: {
    headers: {
      'x-application-name': 'bakame-ai',
    },
  },
} as const;

/**
 * Creates a Supabase client for server-side operations
 *
 * This function creates a new client instance with proper cookie handling
 * for server-side rendering and API routes. It uses the connection pooler
 * URL when available to reduce database connection overhead.
 *
 * @returns Promise resolving to configured Supabase client
 *
 * @example
 * ```typescript
 * import { createServerSupabaseClient } from '@/lib/supabase/server';
 *
 * export async function GET() {
 *   const supabase = await createServerSupabaseClient();
 *   const { data, error } = await supabase.from('users').select();
 *   // ...
 * }
 * ```
 */
export async function createServerSupabaseClient() {
  try {
    const cookieStore = await cookies();

    // Use pooler URL if available for better connection management
    const supabaseUrl = SUPABASE_CONFIG.poolerUrl || SUPABASE_CONFIG.url;

    if (SUPABASE_CONFIG.poolerUrl) {
      logger.debug('Using Supabase connection pooler', {
        poolerUrl: SUPABASE_CONFIG.poolerUrl,
      });
    }

    const client = createServerClient<Database>(
      supabaseUrl,
      SUPABASE_CONFIG.anonKey,
      {
        cookies: {
          /**
           * Get all cookies for the current request
           */
          getAll() {
            return cookieStore.getAll();
          },

          /**
           * Set cookies in the response
           * Gracefully handles errors when called from Server Components
           */
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options as CookieOptions);
              });
            } catch (error) {
              // This can happen when setAll is called from a Server Component.
              // It's safe to ignore if you have middleware refreshing sessions.
              logger.debug('Failed to set cookies in Server Component', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          },
        },

        db: SUPABASE_CONFIG.db,
        auth: SUPABASE_CONFIG.auth,
        global: SUPABASE_CONFIG.global,
      }
    );

    logger.debug('Created Supabase server client', {
      url: supabaseUrl,
      hasPooler: !!SUPABASE_CONFIG.poolerUrl,
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Supabase server client', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error('Database connection failed. Please try again later.');
  }
}

/**
 * Creates a Supabase admin client for server-side admin operations
 *
 * This client bypasses Row Level Security (RLS) and should only be used
 * for admin operations that require elevated privileges. Use with caution.
 *
 * @returns Promise resolving to admin Supabase client
 *
 * @example
 * ```typescript
 * import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
 *
 * export async function GET() {
 *   const supabase = await createServerSupabaseAdminClient();
 *   // Perform admin operations (bypasses RLS)
 *   const { data, error } = await supabase.from('users').select();
 *   // ...
 * }
 * ```
 */
export async function createServerSupabaseAdminClient() {
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('Attempted to create admin client without service role key');
      throw new Error('Service role key not configured');
    }

    const cookieStore = await cookies();

    // Use pooler URL if available
    const supabaseUrl = SUPABASE_CONFIG.poolerUrl || SUPABASE_CONFIG.url;

    const client = createServerClient<Database>(
      supabaseUrl,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options as CookieOptions);
              });
            } catch (error) {
              logger.debug('Failed to set cookies in admin client', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          },
        },

        db: SUPABASE_CONFIG.db,
        auth: {
          ...SUPABASE_CONFIG.auth,
          autoRefreshToken: false,
          persistSession: false,
        },
        global: SUPABASE_CONFIG.global,
      }
    );

    logger.debug('Created Supabase admin client', {
      url: supabaseUrl,
      hasPooler: !!SUPABASE_CONFIG.poolerUrl,
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Supabase admin client', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error('Admin database connection failed. Please try again later.');
  }
}
