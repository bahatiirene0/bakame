/**
 * Supabase Library Exports
 *
 * This module exports client-side Supabase functionality.
 *
 * IMPORTANT: Server-side clients are NOT exported here to avoid
 * importing 'next/headers' in client components.
 *
 * For server-side usage, import directly:
 * ```typescript
 * import { createServerSupabaseClient } from '@/lib/supabase/server';
 * import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
 * ```
 *
 * @module lib/supabase
 */

// Client-side exports
export {
  createClient,
  getSupabaseClient,
  resetSupabaseClient,
} from './client';

// Type exports
export * from './types';
