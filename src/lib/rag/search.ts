/**
 * RAG Search Service
 *
 * Performs semantic search over the knowledge base with caching.
 * Combines vector similarity search with optional keyword matching.
 *
 * @module lib/rag/search
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateCacheKey, getCached, setCache, CACHE_TTL } from '@/lib/redis/cache';
import { generateEmbedding } from './embeddings';
import { logger } from '@/lib/logger';
import type {
  KnowledgeSearchResult,
  KnowledgeQASearchResult,
} from '@/lib/supabase/types';

// Type for Supabase client to allow table operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ============================================
// Configuration
// ============================================

/** Cache TTL for RAG search results (5 minutes) */
const RAG_CACHE_TTL = 300;

/** Default number of results to return */
const DEFAULT_MATCH_COUNT = 5;

/** Default similarity threshold */
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

/** Higher threshold for Q&A (need more precision) */
const QA_SIMILARITY_THRESHOLD = 0.7;

// ============================================
// Types
// ============================================

export interface SearchOptions {
  /** Maximum number of results */
  matchCount?: number;
  /** Minimum similarity score (0-1) */
  similarityThreshold?: number;
  /** Filter by category */
  category?: string;
  /** Filter by language */
  language?: string;
  /** Include Q&A search */
  includeQA?: boolean;
  /** Skip cache */
  skipCache?: boolean;
}

export interface SearchResult {
  /** Results from document chunks */
  chunks: KnowledgeSearchResult[];
  /** Results from Q&A pairs (higher precision) */
  qa: KnowledgeQASearchResult[];
  /** Whether results came from cache */
  fromCache: boolean;
  /** Search metadata */
  metadata: {
    query: string;
    totalResults: number;
    searchTimeMs: number;
  };
}

// ============================================
// Core Search Functions
// ============================================

/**
 * Search the knowledge base
 *
 * Performs semantic search over document chunks and optionally Q&A pairs.
 * Results are cached for performance.
 *
 * @param query - Search query text
 * @param options - Search options
 * @returns Search results with chunks and Q&A matches
 *
 * @example
 * ```ts
 * const results = await searchKnowledge("What is VAT in Rwanda?", {
 *   category: 'tax',
 *   includeQA: true,
 * });
 *
 * // Q&A results have higher precision
 * if (results.qa.length > 0) {
 *   console.log("Direct answer:", results.qa[0].answer);
 * }
 *
 * // Chunk results provide context
 * for (const chunk of results.chunks) {
 *   console.log(`[${chunk.category}] ${chunk.content}`);
 * }
 * ```
 */
export async function searchKnowledge(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const startTime = Date.now();

  const {
    matchCount = DEFAULT_MATCH_COUNT,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
    category,
    language,
    includeQA = true,
    skipCache = false,
  } = options;

  // Generate cache key
  const cacheKey = generateCacheKey('rag_search', {
    query,
    matchCount,
    similarityThreshold,
    category,
    language,
    includeQA,
  });

  // Check cache first
  if (!skipCache) {
    const cached = await getCached<SearchResult>(cacheKey);
    if (cached) {
      logger.debug('RAG search cache hit', { query: query.substring(0, 50) });
      return { ...cached, fromCache: true };
    }
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Get Supabase client
  const supabase = await createServerSupabaseClient() as AnySupabase;

  // Search chunks and Q&A in parallel
  const [chunksResult, qaResult] = await Promise.all([
    // Search document chunks
    supabase.rpc('search_knowledge_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: matchCount,
      similarity_threshold: similarityThreshold,
      category_filter: category || null,
      language_filter: language || null,
    }),

    // Search Q&A pairs (if enabled)
    includeQA
      ? supabase.rpc('search_knowledge_qa', {
          query_embedding: JSON.stringify(queryEmbedding),
          match_count: 3, // Fewer Q&A results (they're more precise)
          similarity_threshold: QA_SIMILARITY_THRESHOLD,
          category_filter: category || null,
          language_filter: language || null,
        })
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Handle errors
  if (chunksResult.error) {
    logger.error('Chunk search failed', { error: chunksResult.error.message });
  }
  if (qaResult.error) {
    logger.error('QA search failed', { error: qaResult.error.message });
  }

  const chunks = (chunksResult.data || []) as KnowledgeSearchResult[];
  const qa = (qaResult.data || []) as KnowledgeQASearchResult[];

  const result: SearchResult = {
    chunks,
    qa,
    fromCache: false,
    metadata: {
      query,
      totalResults: chunks.length + qa.length,
      searchTimeMs: Date.now() - startTime,
    },
  };

  // Cache the results
  if (!skipCache && result.metadata.totalResults > 0) {
    await setCache(cacheKey, result, RAG_CACHE_TTL);
  }

  logger.info('RAG search completed', {
    query: query.substring(0, 50),
    chunkResults: chunks.length,
    qaResults: qa.length,
    timeMs: result.metadata.searchTimeMs,
  });

  return result;
}

/**
 * Search only Q&A pairs
 *
 * Use this for direct question matching when you need precise answers.
 *
 * @param question - Question to search
 * @param options - Search options
 * @returns Matching Q&A pairs
 */
export async function searchQA(
  question: string,
  options: Omit<SearchOptions, 'includeQA'> = {}
): Promise<KnowledgeQASearchResult[]> {
  const {
    matchCount = 3,
    similarityThreshold = QA_SIMILARITY_THRESHOLD,
    category,
    language,
    skipCache = false,
  } = options;

  // Check cache
  const cacheKey = generateCacheKey('rag_qa', {
    question,
    matchCount,
    category,
    language,
  });

  if (!skipCache) {
    const cached = await getCached<KnowledgeQASearchResult[]>(cacheKey);
    if (cached) return cached;
  }

  // Generate embedding
  const queryEmbedding = await generateEmbedding(question);

  // Search
  const supabase = await createServerSupabaseClient() as AnySupabase;
  const { data, error } = await supabase.rpc('search_knowledge_qa', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: matchCount,
    similarity_threshold: similarityThreshold,
    category_filter: category || null,
    language_filter: language || null,
  });

  if (error) {
    logger.error('QA search failed', { error: error.message });
    return [];
  }

  const results = (data || []) as KnowledgeQASearchResult[];

  // Cache results
  if (!skipCache && results.length > 0) {
    await setCache(cacheKey, results, RAG_CACHE_TTL);
  }

  return results;
}

/**
 * Search by category
 *
 * Get knowledge from a specific category.
 *
 * @param category - Category to search in
 * @param query - Optional search query
 * @param limit - Maximum results
 * @returns Knowledge chunks from the category
 */
export async function searchByCategory(
  category: string,
  query?: string,
  limit: number = 10
): Promise<KnowledgeSearchResult[]> {
  const supabase = await createServerSupabaseClient() as AnySupabase;

  if (query) {
    // Semantic search within category
    const results = await searchKnowledge(query, {
      category,
      matchCount: limit,
      includeQA: false,
    });
    return results.chunks;
  }

  // Get recent/important chunks from category
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select(`
      id,
      document_id,
      content,
      metadata,
      knowledge_documents!inner(
        category,
        title,
        source,
        priority
      )
    `)
    .eq('knowledge_documents.category', category)
    .eq('knowledge_documents.is_active', true)
    .order('knowledge_documents.priority', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Category search failed', { error: error.message, category });
    return [];
  }

  // Transform to search result format
  return (data || []).map((item: any) => ({
    id: item.id,
    document_id: item.document_id,
    content: item.content,
    similarity: 1.0, // No similarity score for non-semantic search
    category: item.knowledge_documents.category,
    document_title: item.knowledge_documents.title,
    source: item.knowledge_documents.source,
    metadata: item.metadata,
  }));
}

/**
 * Get available knowledge categories
 *
 * @returns List of categories with document counts
 */
export async function getKnowledgeCategories(): Promise<
  { category: string; count: number }[]
> {
  const supabase = await createServerSupabaseClient() as AnySupabase;

  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('category')
    .eq('is_active', true)
    .eq('status', 'ready');

  if (error) {
    logger.error('Failed to get categories', { error: error.message });
    return [];
  }

  // Count by category
  const counts = (data || []).reduce(
    (acc: Record<string, number>, item: { category: string }) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count: count as number }))
    .sort((a, b) => b.count - a.count);
}

// ============================================
// Exports
// ============================================

export default {
  searchKnowledge,
  searchQA,
  searchByCategory,
  getKnowledgeCategories,
  DEFAULT_MATCH_COUNT,
  DEFAULT_SIMILARITY_THRESHOLD,
};
