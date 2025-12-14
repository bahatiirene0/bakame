/**
 * Redis Module Exports
 *
 * Central export point for Redis-related functionality
 */

export {
  getRedisClient,
  isUsingInMemoryFallback,
  resetRedisClient,
  type RedisClient,
} from './client';

export { default as redis } from './client';

export {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitEndpoint,
} from './rateLimit';

export {
  getCached,
  setCache,
  invalidateCache,
  withCache,
  generateCacheKey,
  getCacheStats,
  resetCacheStats,
  cacheWeather,
  cacheCurrency,
  cacheNews,
  cacheWebSearch,
  cachePlace,
  isCacheHealthy,
  CACHE_TTL,
} from './cache';

export { default as cache } from './cache';
