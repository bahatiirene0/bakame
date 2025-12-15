/**
 * Dynamic Prompt Loader
 *
 * Fetches system prompts from the database (admin_settings table).
 * Falls back to hardcoded prompts if database is unavailable.
 *
 * NOTE: This is a SERVER-ONLY module. Import directly, not from '@/lib/prompts'.
 *
 * Usage in Chat API:
 * ```ts
 * import { getDynamicSystemPrompt } from '@/lib/prompts/dynamic';
 *
 * const customPrompt = await getDynamicSystemPrompt();
 * const systemPrompt = buildSystemPrompt({ customBasePrompt: customPrompt, ... });
 * ```
 */

import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getCached, setCache } from '@/lib/redis';

// Type for Supabase client to allow table operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// Cache prompts for 5 minutes to reduce database calls
const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'prompt';

interface PromptData {
  value: string;
  isActive: boolean;
}

/**
 * Fetch the main system prompt from the database
 * Returns null if not found or inactive (will use hardcoded default)
 */
export async function getDynamicSystemPrompt(): Promise<string | null> {
  try {
    // Try cache first
    const cached = await getCachedPrompt('system_prompt_main');
    if (cached !== undefined) {
      return cached;
    }

    // Fetch from database
    const supabase = await createServerSupabaseClient() as AnySupabase;

    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'system_prompt_main')
      .eq('category', 'prompts')
      .single();

    if (error) {
      // Not found is okay - will use default
      if (error.code === 'PGRST116') {
        await setCachedPrompt('system_prompt_main', null);
        return null;
      }
      logger.warn('Failed to fetch system prompt', { error: error.message });
      return null;
    }

    const promptData = data?.value as PromptData | null;

    // Check if active
    if (!promptData?.isActive) {
      await setCachedPrompt('system_prompt_main', null);
      return null;
    }

    const promptValue = promptData.value || null;
    await setCachedPrompt('system_prompt_main', promptValue);

    return promptValue;
  } catch (error) {
    logger.error('Error fetching dynamic prompt', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Fetch a specific prompt by key
 */
export async function getDynamicPrompt(key: string): Promise<string | null> {
  try {
    const cached = await getCachedPrompt(key);
    if (cached !== undefined) {
      return cached;
    }

    const supabase = await createServerSupabaseClient() as AnySupabase;

    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', key)
      .eq('category', 'prompts')
      .single();

    if (error || !data) {
      await setCachedPrompt(key, null);
      return null;
    }

    const promptData = data.value as PromptData | null;

    if (!promptData?.isActive) {
      await setCachedPrompt(key, null);
      return null;
    }

    const promptValue = promptData.value || null;
    await setCachedPrompt(key, promptValue);

    return promptValue;
  } catch (error) {
    logger.error('Error fetching dynamic prompt', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Invalidate prompt cache (call after admin updates a prompt)
 */
export async function invalidatePromptCache(key?: string): Promise<void> {
  try {
    if (key) {
      await setCachedPrompt(key, undefined as unknown as string | null);
    }
    // For full invalidation, we'd need to clear all prompt keys
    // This is handled by the cache TTL naturally
  } catch (error) {
    logger.warn('Failed to invalidate prompt cache', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Cache helpers using Redis
async function getCachedPrompt(key: string): Promise<string | null | undefined> {
  try {
    const cacheKey = `${CACHE_PREFIX}:${key}`;
    const result = await getCached<string | null>(cacheKey);
    // getCached returns null for cache miss, we use undefined to differentiate
    // from an actual null value (prompt not found/inactive)
    return result;
  } catch {
    // Cache unavailable, return undefined to fetch fresh
    return undefined;
  }
}

async function setCachedPrompt(key: string, value: string | null): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}:${key}`;
    await setCache(cacheKey, value, CACHE_TTL);
  } catch {
    // Cache unavailable, ignore
  }
}
