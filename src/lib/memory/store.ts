/**
 * Memory Store
 *
 * Handles persistence and retrieval of user memories in Supabase.
 * Implements memory decay, deduplication, and relevance search.
 *
 * @module lib/memory/store
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { generateCacheKey, getCached, setCache } from '@/lib/redis/cache';
import { logger } from '@/lib/logger';
import type { ExtractedMemory } from './extractor';
import type {
  UserMemory,
  UserMemorySearchResult,
  MemoryType,
  MemorySource,
} from '@/lib/supabase/types';

// Type for Supabase client to allow table operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ============================================
// Configuration
// ============================================

/** Cache TTL for memory search (10 minutes) */
const MEMORY_CACHE_TTL = 600;

/** Default similarity threshold for memory search */
const DEFAULT_SIMILARITY_THRESHOLD = 0.6;

/** Maximum memories to return */
const DEFAULT_MATCH_COUNT = 10;

/** Minimum strength for memories to be considered */
const MIN_MEMORY_STRENGTH = 0.3;

// ============================================
// Types
// ============================================

export interface StoreMemoryOptions {
  /** Memory source */
  source?: MemorySource;
  /** Override default confidence */
  confidence?: number;
  /** Tags for organization */
  tags?: string[];
}

export interface SearchMemoriesOptions {
  /** Maximum results */
  matchCount?: number;
  /** Minimum similarity */
  similarityThreshold?: number;
  /** Filter by type */
  memoryType?: MemoryType;
  /** Filter by category */
  category?: string;
  /** Skip cache */
  skipCache?: boolean;
}

export interface MemoryContext {
  /** Formatted context for LLM */
  context: string;
  /** Whether user has stored memories */
  hasMemories: boolean;
  /** Number of relevant memories */
  count: number;
  /** Raw memories */
  memories: UserMemorySearchResult[];
}

// ============================================
// Core Functions
// ============================================

/**
 * Store a memory for a user
 *
 * Handles embedding generation, deduplication, and storage.
 *
 * @param userId - User ID
 * @param memory - Memory to store
 * @param options - Storage options
 * @returns Stored memory ID or null if duplicate
 *
 * @example
 * ```ts
 * const memoryId = await storeMemory('user-123', {
 *   content: 'User is a coffee farmer',
 *   type: 'fact',
 *   category: 'business',
 *   confidence: 0.9,
 *   reasoning: 'User explicitly stated their occupation'
 * });
 * ```
 */
export async function storeMemory(
  userId: string,
  memory: ExtractedMemory,
  options: StoreMemoryOptions = {}
): Promise<string | null> {
  const { source = 'extracted', confidence, tags = [] } = options;

  try {
    const supabase = await createServerSupabaseClient() as AnySupabase;

    // Check for duplicates first
    const isDuplicate = await checkDuplicate(userId, memory.content);
    if (isDuplicate) {
      logger.debug('Duplicate memory skipped', {
        userId,
        content: memory.content.substring(0, 50),
      });
      return null;
    }

    // Generate embedding for the memory
    const embedding = await generateEmbedding(memory.content);

    // Insert memory
    const { data, error } = await supabase
      .from('user_memories')
      .insert({
        user_id: userId,
        content: memory.content,
        memory_type: memory.type,
        category: memory.category,
        embedding: JSON.stringify(embedding),
        confidence: confidence ?? memory.confidence,
        strength: 1.0, // Start at full strength
        source,
        tags,
        metadata: {
          reasoning: memory.reasoning,
          extractedAt: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to store memory', { error: error.message, userId });
      return null;
    }

    logger.info('Memory stored', {
      userId,
      memoryId: data.id,
      type: memory.type,
      category: memory.category,
    });

    // Invalidate cache
    await invalidateMemoryCache(userId);

    return data.id;
  } catch (error) {
    logger.error('Memory storage error', { error: (error as Error).message });
    return null;
  }
}

/**
 * Store multiple memories at once
 *
 * @param userId - User ID
 * @param memories - Array of memories to store
 * @param options - Storage options
 * @returns Array of stored memory IDs
 */
export async function storeMemories(
  userId: string,
  memories: ExtractedMemory[],
  options: StoreMemoryOptions = {}
): Promise<string[]> {
  const storedIds: string[] = [];

  // Process in parallel with concurrency limit
  const batchSize = 3;
  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((memory) => storeMemory(userId, memory, options))
    );
    storedIds.push(...results.filter((id): id is string => id !== null));
  }

  return storedIds;
}

/**
 * Search user memories by semantic similarity
 *
 * @param userId - User ID
 * @param query - Search query
 * @param options - Search options
 * @returns Matching memories
 *
 * @example
 * ```ts
 * const memories = await searchMemories('user-123', 'coffee farming', {
 *   matchCount: 5,
 *   memoryType: 'fact'
 * });
 * ```
 */
export async function searchMemories(
  userId: string,
  query: string,
  options: SearchMemoriesOptions = {}
): Promise<UserMemorySearchResult[]> {
  const {
    matchCount = DEFAULT_MATCH_COUNT,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
    memoryType,
    category,
    skipCache = false,
  } = options;

  // Check cache
  const cacheKey = generateCacheKey('memory_search', {
    userId,
    query,
    matchCount,
    similarityThreshold,
    memoryType,
    category,
  });

  if (!skipCache) {
    const cached = await getCached<UserMemorySearchResult[]>(cacheKey);
    if (cached) {
      logger.debug('Memory search cache hit', { userId });
      return cached;
    }
  }

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    const supabase = await createServerSupabaseClient() as AnySupabase;

    // Search using RPC function
    const { data, error } = await supabase.rpc('search_user_memories', {
      p_user_id: userId,
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: matchCount,
      similarity_threshold: similarityThreshold,
      min_strength: MIN_MEMORY_STRENGTH,
      type_filter: memoryType || null,
      category_filter: category || null,
    });

    if (error) {
      logger.error('Memory search failed', { error: error.message, userId });
      return [];
    }

    const results = (data || []) as UserMemorySearchResult[];

    // Cache results
    if (!skipCache && results.length > 0) {
      await setCache(cacheKey, results, MEMORY_CACHE_TTL);
    }

    return results;
  } catch (error) {
    logger.error('Memory search error', { error: (error as Error).message });
    return [];
  }
}

/**
 * Get all active memories for a user
 *
 * @param userId - User ID
 * @param options - Filter options
 * @returns All user memories
 */
export async function getUserMemories(
  userId: string,
  options: { memoryType?: MemoryType; category?: string; limit?: number } = {}
): Promise<UserMemory[]> {
  const { memoryType, category, limit = 50 } = options;

  try {
    const supabase = await createServerSupabaseClient() as AnySupabase;

    let query = supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('strength', MIN_MEMORY_STRENGTH)
      .order('strength', { ascending: false })
      .order('last_accessed', { ascending: false })
      .limit(limit);

    if (memoryType) {
      query = query.eq('memory_type', memoryType);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get user memories', { error: error.message });
      return [];
    }

    return (data || []) as UserMemory[];
  } catch (error) {
    logger.error('Get memories error', { error: (error as Error).message });
    return [];
  }
}

/**
 * Get memory context for LLM
 *
 * Retrieves relevant memories and formats them for inclusion in system prompt.
 *
 * @param userId - User ID
 * @param currentContext - Current conversation context
 * @param language - User's language preference
 * @returns Formatted memory context
 *
 * @example
 * ```ts
 * const context = await getMemoryContext('user-123', 'Help me with my farm', 'en');
 *
 * if (context.hasMemories) {
 *   systemPrompt += '\n\n' + context.context;
 * }
 * ```
 */
export async function getMemoryContext(
  userId: string,
  currentContext: string,
  language: 'en' | 'rw' = 'en'
): Promise<MemoryContext> {
  // Search for relevant memories
  const memories = await searchMemories(userId, currentContext, {
    matchCount: 8,
    similarityThreshold: 0.5,
  });

  if (memories.length === 0) {
    // Also get recent high-strength memories even if not directly relevant
    const recentMemories = await getUserMemories(userId, { limit: 5 });

    if (recentMemories.length === 0) {
      return {
        context: '',
        hasMemories: false,
        count: 0,
        memories: [],
      };
    }

    // Format recent memories
    const formatted = formatMemoriesForPrompt(
      recentMemories.map((m) => ({
        ...m,
        similarity: m.strength, // Use strength as relevance
      })),
      language
    );

    return {
      context: formatted,
      hasMemories: true,
      count: recentMemories.length,
      memories: recentMemories.map((m) => ({ ...m, similarity: m.strength })),
    };
  }

  // Touch accessed memories (update last_accessed, boost strength)
  await touchMemories(memories.map((m) => m.id));

  // Format for prompt
  const formatted = formatMemoriesForPrompt(memories, language);

  return {
    context: formatted,
    hasMemories: true,
    count: memories.length,
    memories,
  };
}

/**
 * Update memory strength (touch)
 *
 * Called when memories are accessed to reinforce them.
 */
export async function touchMemories(memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return;

  try {
    const supabase = await createServerSupabaseClient() as AnySupabase;

    // Use RPC to efficiently touch multiple memories
    await Promise.all(
      memoryIds.map((id) =>
        supabase.rpc('touch_user_memory', { memory_id: id })
      )
    );
  } catch (error) {
    logger.error('Failed to touch memories', { error: (error as Error).message });
  }
}

/**
 * Deactivate a memory
 *
 * @param memoryId - Memory ID to deactivate
 * @param userId - User ID (for verification)
 */
export async function deactivateMemory(
  memoryId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient() as AnySupabase;

    const { error } = await supabase
      .from('user_memories')
      .update({ is_active: false })
      .eq('id', memoryId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to deactivate memory', { error: error.message });
      return false;
    }

    await invalidateMemoryCache(userId);
    return true;
  } catch (error) {
    logger.error('Deactivate memory error', { error: (error as Error).message });
    return false;
  }
}

/**
 * Update memory content
 *
 * @param memoryId - Memory ID
 * @param userId - User ID
 * @param newContent - Updated content
 */
export async function updateMemory(
  memoryId: string,
  userId: string,
  newContent: string
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient() as AnySupabase;

    // Generate new embedding
    const embedding = await generateEmbedding(newContent);

    const { error } = await supabase
      .from('user_memories')
      .update({
        content: newContent,
        embedding: JSON.stringify(embedding),
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoryId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to update memory', { error: error.message });
      return false;
    }

    await invalidateMemoryCache(userId);
    return true;
  } catch (error) {
    logger.error('Update memory error', { error: (error as Error).message });
    return false;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a similar memory already exists
 */
async function checkDuplicate(userId: string, content: string): Promise<boolean> {
  try {
    const embedding = await generateEmbedding(content);
    const supabase = await createServerSupabaseClient() as AnySupabase;

    const { data } = await supabase.rpc('search_user_memories', {
      p_user_id: userId,
      query_embedding: JSON.stringify(embedding),
      match_count: 1,
      similarity_threshold: 0.92, // High threshold for near-duplicates
      min_strength: 0,
      type_filter: null,
      category_filter: null,
    });

    return (data || []).length > 0;
  } catch {
    return false;
  }
}

/**
 * Format memories for LLM prompt
 */
function formatMemoriesForPrompt(
  memories: UserMemorySearchResult[],
  language: 'en' | 'rw'
): string {
  const header = language === 'en'
    ? `## USER CONTEXT (Personal Information)
The following is what you know about this user from previous conversations.
Use this information to personalize your responses.`
    : `## AMAKURU Y'UMUKORESHA (Amakuru Bwite)
Akurikira ni ibyo uzi ku mukoresha uyu biturutse ku biganiro byabayeho mbere.
Koresha aya makuru kugira ngo ugire ibisubizo byihariye.`;

  const memoryLines = memories.map((m) => {
    const typeLabel = getTypeLabel(m.memory_type, language);
    return `- [${typeLabel}] ${m.content}`;
  });

  return `${header}\n\n${memoryLines.join('\n')}`;
}

/**
 * Get localized type label
 */
function getTypeLabel(type: MemoryType, language: 'en' | 'rw'): string {
  const labels: Record<MemoryType, { en: string; rw: string }> = {
    fact: { en: 'Fact', rw: 'Ukuri' },
    preference: { en: 'Preference', rw: 'Ibyo akunda' },
    context: { en: 'Context', rw: 'Imiterere' },
    goal: { en: 'Goal', rw: 'Intego' },
  };

  return labels[type]?.[language] || type;
}

/**
 * Invalidate memory cache for user
 */
async function invalidateMemoryCache(userId: string): Promise<void> {
  // Cache invalidation happens automatically via TTL
  // This is a placeholder for more sophisticated cache management
  logger.debug('Memory cache invalidated', { userId });
}

// ============================================
// Exports
// ============================================

export default {
  storeMemory,
  storeMemories,
  searchMemories,
  getUserMemories,
  getMemoryContext,
  touchMemories,
  deactivateMemory,
  updateMemory,
};
