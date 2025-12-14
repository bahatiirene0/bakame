/**
 * Simple In-Memory Rate Limiter
 *
 * Tracks requests by IP address to prevent abuse.
 *
 * Limits:
 * - Authenticated users: 30 requests per minute
 * - Guest users: 10 requests per minute
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store: Map<identifier, RateLimitEntry>
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be allowed based on rate limiting
 *
 * @param identifier - Unique identifier (e.g., IP address or user ID)
 * @param isAuthenticated - Whether the user is authenticated
 * @returns RateLimitResult with allowed status, remaining requests, and reset time
 */
export function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean
): RateLimitResult {
  // DEVELOPMENT: Disable rate limiting in dev mode
  console.log('[RATE LIMIT CHECK] NODE_ENV:', process.env.NODE_ENV, '| Identifier:', identifier);

  if (process.env.NODE_ENV === 'development') {
    console.log('[RATE LIMIT] Disabled in development mode - allowing request');
    return {
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 60000,
    };
  }

  const limit = isAuthenticated ? 100 : 30; // requests per minute
  const windowMs = 60 * 1000; // 1 minute in milliseconds
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific identifier (useful for testing)
 *
 * @param identifier - The identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
