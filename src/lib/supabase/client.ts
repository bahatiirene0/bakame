/**
 * Supabase Browser Client
 *
 * Production-ready browser client with singleton pattern and error handling.
 *
 * Features:
 * - Singleton pattern ensures only one client instance per browser session
 * - Automatic connection management and session refresh
 * - Proper error handling with user-friendly messages
 * - Type-safe database operations
 * - Optimized for client-side performance
 *
 * @module lib/supabase/client
 */

import { createBrowserClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';
import type { Database } from './types';

/**
 * Supabase client configuration for browser
 */
const SUPABASE_CONFIG = {
  // Auth settings optimized for browser
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
  },

  // Global settings
  global: {
    headers: {
      'x-application-name': 'bakame-ai',
    },
  },
} as const;

/**
 * Singleton instance for client-side use
 * This ensures we only create one Supabase client per browser session
 */
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates a new Supabase browser client
 *
 * This function creates a fresh client instance. In most cases, you should
 * use `getSupabaseClient()` instead to get the singleton instance.
 *
 * @returns Configured Supabase browser client
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/client';
 *
 * const supabase = createClient();
 * const { data, error } = await supabase.from('users').select();
 * ```
 */
export function createClient() {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Missing Supabase environment variables', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
      });
      throw new Error('Supabase configuration is missing. Please check your environment variables.');
    }

    const client = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: SUPABASE_CONFIG.auth,
        global: SUPABASE_CONFIG.global,
      }
    );

    logger.debug('Created Supabase browser client', {
      url: supabaseUrl,
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Supabase browser client', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}

/**
 * Gets the singleton Supabase client instance
 *
 * This is the recommended way to access Supabase in client-side code.
 * It ensures only one client instance is created and reused across
 * your application, preventing unnecessary connections and improving performance.
 *
 * @returns Singleton Supabase browser client
 *
 * @example
 * ```typescript
 * import { getSupabaseClient } from '@/lib/supabase/client';
 *
 * export function MyComponent() {
 *   const supabase = getSupabaseClient();
 *
 *   useEffect(() => {
 *     async function fetchData() {
 *       const { data, error } = await supabase.from('users').select();
 *       // ...
 *     }
 *     fetchData();
 *   }, []);
 * }
 * ```
 */
export function getSupabaseClient() {
  // Return existing instance if available
  if (clientInstance) {
    return clientInstance;
  }

  try {
    // Create new instance and cache it
    clientInstance = createClient();
    return clientInstance;
  } catch (error) {
    logger.error('Failed to get Supabase client instance', {
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error('Unable to connect to database. Please refresh the page and try again.');
  }
}

/**
 * Resets the singleton client instance
 *
 * This is primarily useful for testing or when you need to force
 * a new client instance (e.g., after a logout or critical error).
 *
 * @example
 * ```typescript
 * import { resetSupabaseClient } from '@/lib/supabase/client';
 *
 * // After logout
 * await supabase.auth.signOut();
 * resetSupabaseClient();
 * ```
 */
export function resetSupabaseClient(): void {
  clientInstance = null;
  logger.debug('Reset Supabase client instance');
}
