/**
 * Memory Module
 *
 * Provides long-term memory capabilities for Bakame AI users.
 * Automatically extracts and stores facts, preferences, and context
 * from conversations for personalized interactions.
 *
 * @module lib/memory
 *
 * @example
 * ```ts
 * import {
 *   extractMemories,
 *   storeMemories,
 *   getMemoryContext,
 * } from '@/lib/memory';
 *
 * // During conversation processing:
 * const extracted = await extractMemories(userMessages, assistantMessages);
 * await storeMemories(userId, extracted.memories);
 *
 * // When generating response:
 * const memoryContext = await getMemoryContext(userId, currentMessage, 'en');
 * if (memoryContext.hasMemories) {
 *   systemPrompt += '\n\n' + memoryContext.context;
 * }
 * ```
 */

// Extraction
export {
  extractMemories,
  extractFromMessage,
  summarizeMemories,
  type ExtractedMemory,
  type ExtractionResult,
} from './extractor';

// Storage and retrieval
export {
  storeMemory,
  storeMemories,
  searchMemories,
  getUserMemories,
  getMemoryContext,
  touchMemories,
  deactivateMemory,
  updateMemory,
  type StoreMemoryOptions,
  type SearchMemoriesOptions,
  type MemoryContext,
} from './store';

// Default export with commonly used functions
export default {
  // Extraction
  extract: async (userMessages: string[], assistantMessages?: string[]) => {
    const { extractMemories } = await import('./extractor');
    return extractMemories(userMessages, assistantMessages);
  },

  // Storage
  store: async (userId: string, memories: any[], options?: any) => {
    const { storeMemories } = await import('./store');
    return storeMemories(userId, memories, options);
  },

  // Context
  getContext: async (userId: string, context: string, language?: 'en' | 'rw') => {
    const { getMemoryContext } = await import('./store');
    return getMemoryContext(userId, context, language);
  },

  // Search
  search: async (userId: string, query: string, options?: any) => {
    const { searchMemories } = await import('./store');
    return searchMemories(userId, query, options);
  },
};
