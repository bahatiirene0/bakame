/**
 * Redis-based Rate Limiting System
 *
 * Implements a sliding window rate limiting algorithm using Redis for accurate,
 * distributed rate limiting across multiple servers.
 *
 * Features:
 * - Sliding window algorithm for precise rate limiting
 * - Different limits for authenticated vs guest users
 * - Endpoint-specific rate limits (chat, upload)
 * - Graceful fallback if Redis is unavailable
 * - Production-ready with proper error handling
 * - Compatible with Upstash Redis and in-memory fallback
 */

import { getRedisClient, type RedisClient } from './client';

/**
 * Rate limit configuration for different endpoints and user types
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Unix timestamp (ms) when the rate limit resets */
  resetTime: number;
  /** Seconds to wait before retrying (only present when allowed=false) */
  retryAfter?: number;
}

/**
 * Supported endpoint types for rate limiting
 */
export type RateLimitEndpoint = 'chat' | 'upload';

/**
 * Rate limit configurations for different endpoints
 */
const RATE_LIMIT_CONFIGS: Record<
  RateLimitEndpoint,
  { authenticated: RateLimitConfig; guest: RateLimitConfig }
> = {
  chat: {
    authenticated: { maxRequests: 100, windowSeconds: 60 },
    guest: { maxRequests: 30, windowSeconds: 60 },
  },
  upload: {
    authenticated: { maxRequests: 10, windowSeconds: 60 },
    guest: { maxRequests: 5, windowSeconds: 60 },
  },
};

/**
 * Get rate limit configuration for endpoint and user type
 */
function getRateLimitConfig(
  endpoint: RateLimitEndpoint,
  isAuthenticated: boolean
): RateLimitConfig {
  return isAuthenticated
    ? RATE_LIMIT_CONFIGS[endpoint].authenticated
    : RATE_LIMIT_CONFIGS[endpoint].guest;
}

/**
 * Generate Redis key for rate limiting
 */
function getRateLimitKey(
  endpoint: RateLimitEndpoint,
  identifier: string
): string {
  return `ratelimit:${endpoint}:${identifier}`;
}

/**
 * Check if client has Upstash Redis methods
 */
function hasUpstashMethods(client: RedisClient): boolean {
  return 'zadd' in client && 'zremrangebyscore' in client && 'zcard' in client;
}

/**
 * Implement sliding window using simple counter (fallback for in-memory client)
 *
 * This is a simpler fixed-window implementation for the in-memory fallback.
 * Production should use Upstash Redis with the sliding window algorithm.
 */
async function checkRateLimitSimple(
  client: RedisClient,
  key: string,
  config: RateLimitConfig,
  now: number
): Promise<RateLimitResult> {
  const windowMs = config.windowSeconds * 1000;

  // Get current count
  const countStr = await client.get(key);
  const count = countStr ? parseInt(String(countStr), 10) : 0;

  // Check if limit exceeded
  if (count >= config.maxRequests) {
    // Get TTL to calculate reset time
    const ttl = await client.exists(key);
    const resetTime = ttl ? now + (config.windowSeconds * 1000) : now + windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter,
    };
  }

  // Increment counter
  const newCount = await client.incr(key);

  // Set expiration if this is the first request
  if (newCount === 1) {
    await client.expire(key, config.windowSeconds);
  }

  const remaining = Math.max(0, config.maxRequests - newCount);
  const resetTime = now + windowMs;

  return {
    allowed: true,
    remaining,
    resetTime,
  };
}

/**
 * Implement sliding window using sorted sets (for Upstash Redis)
 *
 * This provides more accurate rate limiting by tracking individual request timestamps.
 */
async function checkRateLimitSlidingWindow(
  client: any, // Upstash Redis client
  key: string,
  config: RateLimitConfig,
  now: number
): Promise<RateLimitResult> {
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = client.pipeline();

    // Remove requests outside the current sliding window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request with timestamp as score
    pipeline.zadd(key, { score: now, member: `${now}` });

    // Count requests in current window
    pipeline.zcard(key);

    // Set expiration to window duration (cleanup)
    pipeline.expire(key, config.windowSeconds);

    // Get oldest request timestamp in window (for calculating reset time)
    pipeline.zrange(key, 0, 0);

    // Execute pipeline
    const results = await pipeline.exec();

    if (!results || !Array.isArray(results)) {
      throw new Error('Redis pipeline returned invalid results');
    }

    // Extract request count from results (3rd command, index 2)
    const requestCount = results[2] as number;

    // Extract oldest timestamp (5th command, index 4)
    const oldestRequests = results[4] as string[];
    const oldestTimestamp =
      oldestRequests && oldestRequests.length > 0
        ? parseInt(oldestRequests[0], 10)
        : now;

    // Calculate reset time (when the oldest request will expire)
    const resetTime = oldestTimestamp + windowMs;

    // Check if limit exceeded
    const allowed = requestCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - requestCount);

    // Calculate retry after if rate limited
    const retryAfter = allowed ? undefined : Math.ceil((resetTime - now) / 1000);

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter,
    };
  } catch (error) {
    console.error('[Rate Limit] Error in sliding window implementation:', error);
    throw error;
  }
}

/**
 * Check rate limit using Redis sliding window algorithm
 *
 * This implementation uses a sorted set in Redis where:
 * - Each request is stored with its timestamp as the score
 * - Old requests outside the window are automatically removed
 * - We count requests within the current window
 *
 * For in-memory fallback, uses a simpler counter-based approach.
 *
 * @param endpoint - The API endpoint being rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Promise resolving to RateLimitResult
 */
export async function checkRateLimit(
  endpoint: RateLimitEndpoint,
  identifier: string,
  isAuthenticated: boolean
): Promise<RateLimitResult> {
  // Skip rate limiting in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Rate Limit] Disabled in development mode for ${endpoint}:${identifier}`);
    return {
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 60000,
    };
  }

  const config = getRateLimitConfig(endpoint, isAuthenticated);
  const key = getRateLimitKey(endpoint, identifier);
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  try {
    const client = getRedisClient();

    // Use sliding window for Upstash Redis, simple counter for in-memory
    if (hasUpstashMethods(client)) {
      return await checkRateLimitSlidingWindow(client, key, config, now);
    } else {
      return await checkRateLimitSimple(client, key, config, now);
    }
  } catch (error) {
    // Log error but allow request (fail open for availability)
    console.error(`[Rate Limit] Error checking rate limit for ${endpoint}:${identifier}:`, error);
    console.warn(`[Rate Limit] Allowing request due to error (fail-open behavior)`);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: now + windowMs,
    };
  }
}

/**
 * Reset rate limit for a specific identifier (useful for testing/admin)
 *
 * @param endpoint - The API endpoint
 * @param identifier - Unique identifier to reset
 */
export async function resetRateLimit(
  endpoint: RateLimitEndpoint,
  identifier: string
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = getRateLimitKey(endpoint, identifier);
    await client.del(key);
    console.log(`[Rate Limit] Reset rate limit for ${endpoint}:${identifier}`);
  } catch (error) {
    console.error(`[Rate Limit] Error resetting rate limit for ${endpoint}:${identifier}:`, error);
  }
}

/**
 * Get current rate limit status without incrementing the counter
 *
 * @param endpoint - The API endpoint
 * @param identifier - Unique identifier
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Promise resolving to current rate limit status
 */
export async function getRateLimitStatus(
  endpoint: RateLimitEndpoint,
  identifier: string,
  isAuthenticated: boolean
): Promise<RateLimitResult> {
  const config = getRateLimitConfig(endpoint, isAuthenticated);
  const key = getRateLimitKey(endpoint, identifier);
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  try {
    const client = getRedisClient();

    // For Upstash Redis with sliding window
    if (hasUpstashMethods(client)) {
      const windowStart = now - windowMs;
      const upstashClient = client as any;

      // Use pipeline for read-only operations
      const pipeline = upstashClient.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      pipeline.zrange(key, 0, 0);

      const results = await pipeline.exec();

      if (!results || !Array.isArray(results)) {
        throw new Error('Redis pipeline returned invalid results');
      }

      const requestCount = results[1] as number;
      const oldestRequests = results[2] as string[];
      const oldestTimestamp =
        oldestRequests && oldestRequests.length > 0
          ? parseInt(oldestRequests[0], 10)
          : now;

      const resetTime = oldestTimestamp + windowMs;
      const allowed = requestCount < config.maxRequests; // < instead of <= since we're not incrementing
      const remaining = Math.max(0, config.maxRequests - requestCount);
      const retryAfter = allowed ? undefined : Math.ceil((resetTime - now) / 1000);

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter,
      };
    } else {
      // For in-memory fallback with simple counter
      const countStr = await client.get(key);
      const count = countStr ? parseInt(String(countStr), 10) : 0;
      const allowed = count < config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetTime = now + windowMs;
      const retryAfter = allowed ? undefined : config.windowSeconds;

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter,
      };
    }
  } catch (error) {
    console.error(`[Rate Limit] Error getting rate limit status for ${endpoint}:${identifier}:`, error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: now + windowMs,
    };
  }
}
