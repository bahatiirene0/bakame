/**
 * Rate Limiting Usage Examples
 *
 * This file demonstrates how to use the rate limiting system
 * in various scenarios within the bakame-ai application.
 */

import { checkRateLimit, getRateLimitStatus, resetRateLimit } from './rateLimit';
import type { RateLimitResult } from './rateLimit';

/**
 * Example 1: Basic rate limit check
 */
export async function basicRateLimitExample() {
  // Check rate limit for a chat request
  const identifier = '192.168.1.1'; // Could be IP address or user ID
  const isAuthenticated = true;

  const result: RateLimitResult = await checkRateLimit(
    'chat',
    identifier,
    isAuthenticated
  );

  if (!result.allowed) {
    console.log(`Rate limit exceeded. Try again in ${result.retryAfter} seconds`);
    return false;
  }

  console.log(`Request allowed. ${result.remaining} requests remaining`);
  return true;
}

/**
 * Example 2: Next.js API Route Handler
 */
export async function apiRouteExample(
  userIdOrIp: string,
  isAuthenticated: boolean
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  // Check rate limit
  const rateLimit = await checkRateLimit('chat', userIdOrIp, isAuthenticated);

  // Prepare rate limit headers
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(isAuthenticated ? 100 : 30),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
  };

  if (!rateLimit.allowed && rateLimit.retryAfter) {
    headers['Retry-After'] = String(rateLimit.retryAfter);
  }

  return {
    allowed: rateLimit.allowed,
    headers,
  };
}

/**
 * Example 3: Upload endpoint with different limits
 */
export async function uploadRateLimitExample(
  userId: string,
  isAuthenticated: boolean
): Promise<boolean> {
  const result = await checkRateLimit('upload', userId, isAuthenticated);

  if (!result.allowed) {
    console.error(`Upload rate limit exceeded. Retry after ${result.retryAfter}s`);
    return false;
  }

  console.log(`Upload allowed. ${result.remaining} uploads remaining`);
  return true;
}

/**
 * Example 4: Check status without consuming a request
 */
export async function checkStatusExample(userId: string): Promise<void> {
  const status = await getRateLimitStatus('chat', userId, true);

  console.log('Current rate limit status:');
  console.log(`- Remaining: ${status.remaining}`);
  console.log(`- Resets at: ${new Date(status.resetTime).toLocaleString()}`);
  console.log(`- Would allow: ${status.allowed}`);
}

/**
 * Example 5: Admin reset functionality
 */
export async function adminResetExample(userId: string): Promise<void> {
  console.log(`Resetting rate limit for user: ${userId}`);

  // Reset both chat and upload limits
  await resetRateLimit('chat', userId);
  await resetRateLimit('upload', userId);

  console.log('Rate limits reset successfully');
}

/**
 * Example 6: Progressive rate limiting with warnings
 */
export async function progressiveRateLimitExample(
  userId: string,
  isAuthenticated: boolean
): Promise<{
  allowed: boolean;
  warning?: string;
}> {
  const result = await checkRateLimit('chat', userId, isAuthenticated);

  // Warn user when approaching limit (e.g., 10% remaining)
  const limit = isAuthenticated ? 100 : 30;
  const warningThreshold = Math.ceil(limit * 0.1);

  if (result.allowed && result.remaining <= warningThreshold) {
    return {
      allowed: true,
      warning: `You are approaching your rate limit. Only ${result.remaining} requests remaining.`,
    };
  }

  return {
    allowed: result.allowed,
  };
}

/**
 * Example 7: Retry logic with exponential backoff
 */
export async function retryWithBackoffExample(
  userId: string,
  isAuthenticated: boolean,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await checkRateLimit('chat', userId, isAuthenticated);

    if (result.allowed) {
      return true;
    }

    // Wait before retrying (exponential backoff)
    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
    console.log(`Rate limited. Retrying in ${backoffMs}ms...`);

    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  console.error('Max retries exceeded');
  return false;
}

/**
 * Example 8: Batch operation with rate limit checking
 */
export async function batchOperationExample(
  userId: string,
  isAuthenticated: boolean,
  operations: Array<() => Promise<void>>
): Promise<{ completed: number; rateLimited: boolean }> {
  let completed = 0;

  for (const operation of operations) {
    // Check rate limit before each operation
    const result = await checkRateLimit('chat', userId, isAuthenticated);

    if (!result.allowed) {
      console.log(
        `Rate limited after ${completed} operations. Retry in ${result.retryAfter}s`
      );
      return { completed, rateLimited: true };
    }

    // Perform the operation
    await operation();
    completed++;
  }

  return { completed, rateLimited: false };
}

/**
 * Example 9: Rate limit wrapper for any async function
 */
export function withRateLimit<T>(
  endpoint: 'chat' | 'upload',
  getUserId: () => string,
  isAuthenticated: boolean
) {
  return async (fn: () => Promise<T>): Promise<T> => {
    const userId = getUserId();
    const result = await checkRateLimit(endpoint, userId, isAuthenticated);

    if (!result.allowed) {
      throw new Error(
        `Rate limit exceeded. Retry after ${result.retryAfter} seconds`
      );
    }

    return await fn();
  };
}

// Usage of the wrapper:
// const rateLimitedChat = withRateLimit('chat', () => req.userId, true);
// const response = await rateLimitedChat(() => callChatAPI(message));
