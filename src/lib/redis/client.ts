/**
 * Redis Client Configuration
 *
 * Production-ready Redis client using Upstash for serverless compatibility.
 * Includes graceful fallback to in-memory storage for development environments.
 */

import { Redis } from '@upstash/redis';

/**
 * In-Memory Store Interface
 * Used as fallback when Redis credentials are not available
 */
interface InMemoryStore {
  data: Map<string, { value: any; expiresAt?: number }>;
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, options?: { ex?: number }) => Promise<void>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<void>;
  del: (key: string) => Promise<void>;
  exists: (key: string) => Promise<number>;
}

/**
 * In-Memory Redis Mock
 * Provides Redis-compatible API for local development
 */
class InMemoryRedis implements InMemoryStore {
  data = new Map<string, { value: any; expiresAt?: number }>();

  constructor() {
    // Clean up expired entries every 60 seconds
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.data.entries()) {
          if (entry.expiresAt && now > entry.expiresAt) {
            this.data.delete(key);
          }
        }
      }, 60 * 1000);
    }
  }

  async get(key: string): Promise<any> {
    const entry = this.data.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    const expiresAt = options?.ex
      ? Date.now() + options.ex * 1000
      : undefined;

    this.data.set(key, { value, expiresAt });
  }

  async incr(key: string): Promise<number> {
    const entry = this.data.get(key);
    const currentValue = entry?.value ?? 0;
    const newValue = Number(currentValue) + 1;

    this.data.set(key, {
      value: newValue,
      expiresAt: entry?.expiresAt,
    });

    return newValue;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.data.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async exists(key: string): Promise<number> {
    const entry = this.data.get(key);
    if (!entry) return 0;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return 0;
    }

    return 1;
  }
}

/**
 * Redis Client Type
 * Union type for both Upstash Redis and in-memory fallback
 */
export type RedisClient = Redis | InMemoryStore;

/**
 * Environment Configuration
 */
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Check if Redis credentials are available
 */
const hasRedisCredentials = Boolean(
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
);

/**
 * Create Redis Client
 *
 * Creates an Upstash Redis client if credentials are available,
 * otherwise falls back to in-memory storage for development.
 *
 * @returns Redis client instance
 */
function createRedisClient(): RedisClient {
  if (hasRedisCredentials) {
    console.log('[Redis] Initializing Upstash Redis client');
    return new Redis({
      url: UPSTASH_REDIS_REST_URL!,
      token: UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  console.warn(
    '[Redis] Missing Upstash credentials - using in-memory fallback. ' +
    'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production.'
  );

  return new InMemoryRedis();
}

/**
 * Singleton Redis Client Instance
 *
 * Exported singleton instance to ensure a single Redis connection
 * is reused across the application.
 */
let redisClient: RedisClient | null = null;

/**
 * Get Redis Client
 *
 * Returns the singleton Redis client instance.
 * Creates a new instance on first call.
 *
 * @returns Redis client instance
 *
 * @example
 * ```typescript
 * import { getRedisClient } from '@/lib/redis/client';
 *
 * const redis = getRedisClient();
 * await redis.set('key', 'value', { ex: 60 });
 * const value = await redis.get('key');
 * ```
 */
export function getRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Default Export
 * Singleton Redis client for convenient importing
 */
const redis = getRedisClient();
export default redis;

/**
 * Helper: Check if using in-memory fallback
 *
 * Useful for conditional logic or logging in production
 *
 * @returns true if using in-memory fallback, false if using Upstash Redis
 */
export function isUsingInMemoryFallback(): boolean {
  return !hasRedisCredentials;
}

/**
 * Helper: Reset Redis client (useful for testing)
 *
 * Forces recreation of the Redis client on next getRedisClient() call
 */
export function resetRedisClient(): void {
  redisClient = null;
}
