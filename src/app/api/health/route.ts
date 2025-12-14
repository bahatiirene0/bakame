/**
 * Health Check API Endpoint
 *
 * Production-ready health monitoring for the Bakame AI application.
 * Checks connectivity to critical services with proper timeout handling.
 *
 * Endpoints:
 * - GET /api/health - Full health check with service status
 * - GET /api/health/live - Simple liveness probe
 *
 * Features:
 * - Multi-service health checks (Database, Redis, OpenAI)
 * - Response time measurement for each service
 * - Graceful degradation (partial service availability)
 * - Proper HTTP status codes (200/207/503)
 * - Request timeout protection (5s max per check)
 * - Conditional checks based on environment configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRedisClient, isUsingInMemoryFallback } from '@/lib/redis/client';
import { logger } from '@/lib/logger';
import { env, hasRedis } from '@/lib/env';
import OpenAI from 'openai';

// ============================================================================
// Types & Interfaces
// ============================================================================

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface ServiceHealth {
  status: HealthStatus;
  latency: number;
  error?: string;
}

interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis?: ServiceHealth;
    openai: ServiceHealth;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const APP_VERSION = process.env.npm_package_version || '0.1.0';
const SERVICE_TIMEOUT_MS = 5000; // 5 seconds max per service check
const startTime = Date.now();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Execute a function with timeout protection
 * Returns null if timeout is reached
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Measure execution time of an async function
 */
async function measureLatency<T>(
  fn: () => Promise<T>
): Promise<{ result: T; latency: number }> {
  const start = performance.now();
  const result = await fn();
  const latency = Math.round(performance.now() - start);

  return { result, latency };
}

// ============================================================================
// Service Health Checks
// ============================================================================

/**
 * Check Supabase database connectivity
 * Executes a simple SELECT 1 query
 */
async function checkDatabase(): Promise<ServiceHealth> {
  try {
    logger.debug('Health check: Testing database connection');

    const { result, latency } = await measureLatency(async () => {
      // Create a direct Supabase client for health check
      // Using service client avoids cookie dependencies
      const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      // Execute simple health check query
      const { error } = await supabase.rpc('ping' as any).select();

      // If 'ping' function doesn't exist, try a simple query
      if (error?.code === '42883') {
        // Function not found, try simple query instead
        const { error: queryError } = await supabase
          .from('users')
          .select('id')
          .limit(0);

        if (queryError && queryError.code !== 'PGRST116') {
          // PGRST116 = no rows, which is fine for health check
          throw queryError;
        }
        return { success: true };
      }

      if (error) {
        throw error;
      }

      return { success: true };
    });

    if (!result.success) {
      throw new Error('Database query failed');
    }

    logger.debug('Health check: Database OK', { latency });

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error';

    logger.error('Health check: Database failed', {
      error: errorMessage,
    });

    return {
      status: 'unhealthy',
      latency: 0,
      error: errorMessage,
    };
  }
}

/**
 * Check Redis connectivity
 * Only runs if Redis is configured
 */
async function checkRedis(): Promise<ServiceHealth | undefined> {
  // Skip if Redis is not configured
  if (!hasRedis) {
    logger.debug('Health check: Redis not configured, skipping');
    return undefined;
  }

  try {
    logger.debug('Health check: Testing Redis connection');

    const { result, latency } = await measureLatency(async () => {
      const redis = getRedisClient();

      // Set a test key with 10 second expiry
      const testKey = `health:check:${Date.now()}`;
      const testValue = 'ok';

      await redis.set(testKey, testValue, { ex: 10 });

      // Verify we can read it back
      const value = await redis.get(testKey);

      // Clean up
      await redis.del(testKey);

      if (value !== testValue) {
        throw new Error('Redis read/write verification failed');
      }

      return { success: true };
    });

    if (!result.success) {
      throw new Error('Redis ping failed');
    }

    // Warn if using in-memory fallback
    if (isUsingInMemoryFallback()) {
      logger.warn('Health check: Redis using in-memory fallback');
      return {
        status: 'degraded',
        latency,
        error: 'Using in-memory fallback',
      };
    }

    logger.debug('Health check: Redis OK', { latency });

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown Redis error';

    logger.error('Health check: Redis failed', {
      error: errorMessage,
    });

    return {
      status: 'unhealthy',
      latency: 0,
      error: errorMessage,
    };
  }
}

/**
 * Check OpenAI API connectivity
 * Makes a lightweight API call to verify the key is valid
 */
async function checkOpenAI(): Promise<ServiceHealth> {
  try {
    logger.debug('Health check: Testing OpenAI API connection');

    const { result, latency } = await measureLatency(async () => {
      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
        timeout: SERVICE_TIMEOUT_MS - 100, // Slightly less than our timeout
        maxRetries: 0, // No retries for health check
      });

      // List models - lightweight API call
      const models = await openai.models.list();

      if (!models.data || models.data.length === 0) {
        throw new Error('No models returned from OpenAI API');
      }

      return { success: true, modelCount: models.data.length };
    });

    if (!result.success) {
      throw new Error('OpenAI API check failed');
    }

    logger.debug('Health check: OpenAI API OK', {
      latency,
      modelCount: result.modelCount,
    });

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown OpenAI API error';

    logger.error('Health check: OpenAI API failed', {
      error: errorMessage,
    });

    return {
      status: 'unhealthy',
      latency: 0,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Health Check Orchestration
// ============================================================================

/**
 * Run all health checks in parallel with timeout protection
 */
async function runHealthChecks(): Promise<HealthCheckResponse> {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  logger.info('Health check: Starting service checks');

  // Run all checks in parallel with timeout protection
  const [databaseHealth, redisHealth, openaiHealth] = await Promise.all([
    withTimeout(checkDatabase(), SERVICE_TIMEOUT_MS),
    withTimeout(checkRedis(), SERVICE_TIMEOUT_MS),
    withTimeout(checkOpenAI(), SERVICE_TIMEOUT_MS),
  ]);

  // Handle timeouts - treat as unhealthy
  const services = {
    database: databaseHealth || {
      status: 'unhealthy' as const,
      latency: SERVICE_TIMEOUT_MS,
      error: 'Health check timeout',
    },
    ...(redisHealth !== undefined && {
      redis: redisHealth || {
        status: 'unhealthy' as const,
        latency: SERVICE_TIMEOUT_MS,
        error: 'Health check timeout',
      },
    }),
    openai: openaiHealth || {
      status: 'unhealthy' as const,
      latency: SERVICE_TIMEOUT_MS,
      error: 'Health check timeout',
    },
  };

  // Determine overall status
  const serviceStatuses = Object.values(services).map((s) => s.status);
  const hasUnhealthy = serviceStatuses.includes('unhealthy');
  const hasDegraded = serviceStatuses.includes('degraded');

  let overallStatus: HealthStatus = 'healthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  }

  logger.info('Health check: Complete', {
    status: overallStatus,
    services: Object.fromEntries(
      Object.entries(services).map(([name, health]) => [name, health.status])
    ),
  });

  return {
    status: overallStatus,
    timestamp,
    version: APP_VERSION,
    uptime,
    services,
  };
}

// ============================================================================
// API Route Handlers
// ============================================================================

/**
 * GET /api/health - Full health check
 *
 * Returns comprehensive health status for all services
 * HTTP Status Codes:
 * - 200: All services healthy
 * - 207: Some services degraded (partial success)
 * - 503: Critical services unhealthy
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const healthCheck = await runHealthChecks();

    // Determine HTTP status code
    let statusCode = 200;
    if (healthCheck.status === 'degraded') {
      statusCode = 207; // Multi-Status (partial success)
    } else if (healthCheck.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    }

    return NextResponse.json(healthCheck, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Health check: Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: APP_VERSION,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        error: 'Health check failed',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
