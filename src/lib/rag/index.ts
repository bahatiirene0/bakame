/**
 * RAG (Retrieval Augmented Generation) Module
 *
 * Provides knowledge retrieval and context augmentation for Bakame AI.
 * Prioritizes RAG knowledge over LLM base knowledge.
 *
 * @module lib/rag
 *
 * @example
 * ```ts
 * import {
 *   retrieveKnowledge,
 *   formatForSystemPrompt,
 *   searchKnowledge,
 * } from '@/lib/rag';
 *
 * // In chat API:
 * const retrieval = await retrieveKnowledge(userMessage, {
 *   userLanguage: 'rw',
 * });
 *
 * if (retrieval.hasKnowledge) {
 *   const ragContext = formatForSystemPrompt(retrieval, 'rw');
 *   systemPrompt += '\n\n' + ragContext;
 * } else if (retrieval.fallbackSuggestion === 'web_search') {
 *   // Enable web search tool
 * }
 * ```
 */

// Core retrieval
export {
  retrieveKnowledge,
  retrieveDirectAnswer,
  formatForSystemPrompt,
  type RetrievalOptions,
  type RetrievalResult,
} from './retriever';

// Search
export {
  searchKnowledge,
  searchQA,
  searchByCategory,
  getKnowledgeCategories,
  type SearchOptions,
  type SearchResult,
} from './search';

// Embeddings
export {
  generateEmbedding,
  generateBatchEmbeddings,
  estimateTokenCount,
  getEmbeddingModelInfo,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from './embeddings';

// Chunking
export {
  chunkDocument,
  chunkQAPairs,
  chunkMarkdown,
  mergeSmallChunks,
  detectKinyarwanda,
  getOptimalConfig,
  CHUNK_CONFIG,
  type ChunkOptions,
  type Chunk,
  type ChunkConfigType,
} from './chunker';

// Default export with commonly used functions
export default {
  // Main functions for chat integration
  retrieveKnowledge: async (query: string, options?: any) => {
    const { retrieveKnowledge } = await import('./retriever');
    return retrieveKnowledge(query, options);
  },
  formatForSystemPrompt: (retrieval: any, language?: 'en' | 'rw') => {
    const { formatForSystemPrompt } = require('./retriever');
    return formatForSystemPrompt(retrieval, language);
  },
};
