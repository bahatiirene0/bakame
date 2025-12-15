/**
 * Redis Cache Layer for Tool Responses
 *
 * Production-ready caching implementation for expensive tool calls.
 * Includes graceful fallback when Redis is unavailable and comprehensive logging.
 */

import { getRedisClient, isUsingInMemoryFallback } from './client';
import { createHash } from 'crypto';

/**
 * Cache TTL Configuration (in seconds)
 * Define default time-to-live for different tool types
 */
export const CACHE_TTL = {
  WEATHER: 600,        // 10 minutes - weather data
  CURRENCY: 300,       // 5 minutes - currency exchange rates
  NEWS: 900,           // 15 minutes - news articles
  WEB_SEARCH: 1800,    // 30 minutes - web search results
  PLACES: 3600,        // 1 hour - location/places data
  DEFAULT: 600,        // 10 minutes - default for other tools
} as const;

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
}

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
};

/**
 * Generate cache key from tool name and arguments
 *
 * Creates a deterministic cache key using SHA-256 hash of serialized arguments.
 * Format: cache:tool:{toolName}:{hash(args)}
 *
 * @param toolName - Name of the tool being cached
 * @param args - Tool arguments (will be JSON serialized)
 * @returns Cache key string
 *
 * @example
 * ```typescript
 * const key = generateCacheKey('weather', { city: 'New York' });
 * // Returns: "cache:tool:weather:a1b2c3d4..."
 * ```
 */
export function generateCacheKey(toolName: string, args: Record<string, unknown> = {}): string {
  // Serialize arguments in a deterministic way
  const argsString = JSON.stringify(args, Object.keys(args).sort());

  // Create hash of arguments for compact key
  const argsHash = createHash('sha256')
    .update(argsString)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for brevity

  return `cache:tool:${toolName}:${argsHash}`;
}

/**
 * Get cached value by key
 *
 * Retrieves a cached value from Redis with type safety.
 * Returns null if key doesn't exist or has expired.
 * Gracefully handles Redis errors by returning null.
 *
 * @param key - Cache key to retrieve
 * @returns Cached value or null if not found
 *
 * @example
 * ```typescript
 * const weather = await getCached<WeatherData>('cache:tool:weather:abc123');
 * if (weather) {
 *   console.log('Cache hit!', weather);
 * }
 * ```
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const value = await redis.get(key);

    if (value === null || value === undefined) {
      stats.misses++;
      console.log(`[Cache] MISS - ${key}`);
      return null;
    }

    stats.hits++;
    console.log(`[Cache] HIT - ${key}`);

    // Parse if string, return as-is if object
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    stats.errors++;
    console.error(`[Cache] Error getting key "${key}":`, error);
    // Gracefully fall back to cache miss on error
    return null;
  }
}

/**
 * Set cached value with TTL
 *
 * Stores a value in Redis with an expiration time.
 * Automatically serializes complex objects to JSON.
 * Gracefully handles Redis errors without throwing.
 *
 * @param key - Cache key to set
 * @param value - Value to cache (will be JSON serialized)
 * @param ttlSeconds - Time to live in seconds
 *
 * @example
 * ```typescript
 * await setCache('cache:tool:weather:abc123', weatherData, 600);
 * ```
 */
export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const redis = getRedisClient();

    // Serialize value for storage
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    await redis.set(key, serialized, { ex: ttlSeconds });

    console.log(`[Cache] SET - ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    stats.errors++;
    console.error(`[Cache] Error setting key "${key}":`, error);
    // Don't throw - caching failures shouldn't break the application
  }
}

/**
 * Invalidate cache entries matching a pattern
 *
 * Deletes cache entries that match the specified pattern.
 * Useful for clearing related caches or implementing cache busting.
 *
 * Note: Pattern matching requires scanning keys, which is supported
 * by in-memory store but may have limitations with Upstash Redis.
 * For production, consider storing cache keys in a set for efficient invalidation.
 *
 * @param pattern - Pattern to match (e.g., "cache:tool:weather:*")
 *
 * @example
 * ```typescript
 * // Invalidate all weather caches
 * await invalidateCache('cache:tool:weather:*');
 * ```
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = getRedisClient();

    if (isUsingInMemoryFallback()) {
      // For in-memory store, we can iterate over keys
      const store = redis as any;
      const keysToDelete: string[] = [];

      // Convert pattern to regex (simple * to .* conversion)
      const regexPattern = new RegExp(
        '^' + pattern.replace(/\*/g, '.*') + '$'
      );

      for (const key of store.data.keys()) {
        if (regexPattern.test(key)) {
          keysToDelete.push(key);
        }
      }

      // Delete matched keys
      for (const key of keysToDelete) {
        await redis.del(key);
      }

      console.log(`[Cache] INVALIDATE - ${pattern} (${keysToDelete.length} keys deleted)`);
    } else {
      // For Upstash Redis, pattern matching is limited
      // Log warning and suggest alternative approach
      console.warn(
        `[Cache] Pattern-based invalidation not fully supported with Upstash Redis. ` +
        `Pattern: ${pattern}. Consider storing cache keys in a set for efficient invalidation.`
      );
    }
  } catch (error) {
    stats.errors++;
    console.error(`[Cache] Error invalidating pattern "${pattern}":`, error);
  }
}

/**
 * Cache wrapper with automatic fetching
 *
 * High-level caching utility that handles the cache-aside pattern:
 * 1. Check cache for existing value
 * 2. If found, return cached value (cache hit)
 * 3. If not found, execute fetcher function (cache miss)
 * 4. Store fetcher result in cache
 * 5. Return fetcher result
 *
 * This is the recommended way to use the cache layer.
 *
 * @param key - Cache key
 * @param ttl - Time to live in seconds
 * @param fetcher - Async function to execute on cache miss
 * @returns Cached or freshly fetched value
 *
 * @example
 * ```typescript
 * const weather = await withCache(
 *   generateCacheKey('weather', { city: 'New York' }),
 *   CACHE_TTL.WEATHER,
 *   async () => {
 *     return await fetchWeatherFromAPI('New York');
 *   }
 * );
 * ```
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute fetcher
  console.log(`[Cache] Executing fetcher for ${key}`);
  const result = await fetcher();

  // Store in cache for next time
  await setCache(key, result, ttl);

  return result;
}

/**
 * Get cache statistics
 *
 * Returns current cache hit/miss/error statistics for monitoring.
 * Useful for debugging cache effectiveness and identifying issues.
 *
 * @returns Cache statistics object
 *
 * @example
 * ```typescript
 * const stats = getCacheStats();
 * console.log(`Hit rate: ${stats.hits / (stats.hits + stats.misses) * 100}%`);
 * ```
 */
export function getCacheStats(): Readonly<CacheStats> {
  return { ...stats };
}

/**
 * Reset cache statistics
 *
 * Resets hit/miss/error counters to zero.
 * Useful for testing or starting fresh monitoring periods.
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.errors = 0;
  console.log('[Cache] Statistics reset');
}

/**
 * Tool-specific cache helpers
 *
 * Convenience functions for caching specific tool types with pre-configured TTLs
 */

/**
 * Cache weather data
 *
 * @param city - City name or location identifier
 * @param fetcher - Function to fetch weather data
 * @returns Weather data (cached or fresh)
 */
export async function cacheWeather<T>(
  city: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey('weather', { city });
  return withCache(key, CACHE_TTL.WEATHER, fetcher);
}

/**
 * Cache currency exchange rates
 *
 * @param from - Source currency code
 * @param to - Target currency code
 * @param fetcher - Function to fetch exchange rate
 * @returns Exchange rate data (cached or fresh)
 */
export async function cacheCurrency<T>(
  from: string,
  to: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey('currency', { from, to });
  return withCache(key, CACHE_TTL.CURRENCY, fetcher);
}

/**
 * Cache news articles
 *
 * @param query - News search query or category
 * @param fetcher - Function to fetch news
 * @returns News data (cached or fresh)
 */
export async function cacheNews<T>(
  query: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey('news', { query });
  return withCache(key, CACHE_TTL.NEWS, fetcher);
}

/**
 * Cache web search results
 *
 * @param query - Search query
 * @param fetcher - Function to execute search
 * @returns Search results (cached or fresh)
 */
export async function cacheWebSearch<T>(
  query: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey('web_search', { query });
  return withCache(key, CACHE_TTL.WEB_SEARCH, fetcher);
}

/**
 * Cache place/location data
 *
 * @param placeId - Place identifier or name
 * @param fetcher - Function to fetch place data
 * @returns Place data (cached or fresh)
 */
export async function cachePlace<T>(
  placeId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey('places', { placeId });
  return withCache(key, CACHE_TTL.PLACES, fetcher);
}

/**
 * Health check for cache system
 *
 * Tests cache functionality by setting and getting a test value.
 * Returns true if cache is working, false otherwise.
 *
 * @returns Promise resolving to true if cache is healthy
 *
 * @example
 * ```typescript
 * const healthy = await isCacheHealthy();
 * if (!healthy) {
 *   console.warn('Cache system is not functioning properly');
 * }
 * ```
 */
export async function isCacheHealthy(): Promise<boolean> {
  try {
    const testKey = 'cache:health:check';
    const testValue = { timestamp: Date.now(), test: true };

    // Set test value
    await setCache(testKey, testValue, 10);

    // Get test value
    const retrieved = await getCached<typeof testValue>(testKey);

    // Clean up
    const redis = getRedisClient();
    await redis.del(testKey);

    // Verify values match
    return retrieved?.test === true;
  } catch (error) {
    console.error('[Cache] Health check failed:', error);
    return false;
  }
}

/**
 * Export all cache functionality
 */
export default {
  // Core functions
  getCached,
  setCache,
  invalidateCache,
  withCache,
  generateCacheKey,

  // Statistics
  getCacheStats,
  resetCacheStats,

  // Tool-specific helpers
  cacheWeather,
  cacheCurrency,
  cacheNews,
  cacheWebSearch,
  cachePlace,

  // Health check
  isCacheHealthy,

  // Constants
  CACHE_TTL,
};
