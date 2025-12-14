/**
 * Graceful Degradation Module for bakame-ai
 *
 * Implements the circuit breaker pattern to handle service failures gracefully.
 * When external services fail, this module automatically switches to fallback
 * responses and prevents cascading failures.
 *
 * Features:
 * - Circuit breaker pattern for all external services
 * - Automatic failure detection and recovery
 * - Configurable thresholds and timeouts
 * - Comprehensive logging and monitoring
 * - Sentry integration for alerting
 *
 * Circuit States:
 * - CLOSED: Service is healthy, requests pass through normally
 * - OPEN: Service is failing, return fallback immediately (fail fast)
 * - HALF_OPEN: Testing if service has recovered after cooldown period
 *
 * @module lib/degradation
 */

import { logger } from '@/lib/logger';
import { captureException, captureMessage } from '@/lib/sentry';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Circuit breaker states
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Service names tracked by circuit breakers
 */
export type ServiceName = 'openai' | 'supabase' | 'redis' | 'weather' | 'n8n' | string;

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Number of successes required to close circuit from half-open */
  successThreshold: number;
  /** Time in ms to wait before trying again after circuit opens */
  resetTimeout: number;
  /** Time in ms before a request times out */
  requestTimeout?: number;
}

/**
 * Circuit breaker state and metrics
 */
export interface CircuitBreaker {
  /** Service name */
  name: string;
  /** Current circuit state */
  state: CircuitState;
  /** Number of consecutive failures */
  failureCount: number;
  /** Timestamp of last failure */
  lastFailureTime: number;
  /** Number of consecutive successes (in HALF_OPEN state) */
  successCount: number;
  /** Timestamp of last state change */
  lastStateChange: number;
  /** Total number of requests */
  totalRequests: number;
  /** Total number of failures */
  totalFailures: number;
  /** Total number of successes */
  totalSuccesses: number;
}

/**
 * Fallback response structure
 */
export interface FallbackResponse {
  error: string;
  service: string;
  fallback: true;
  retryAfter?: number;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failureRate: number;
  totalRequests: number;
  uptime: number;
  lastFailure?: string;
}

// ============================================================================
// Constants & Configuration
// ============================================================================

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,      // Open circuit after 5 consecutive failures
  successThreshold: 3,      // Close circuit after 3 consecutive successes
  resetTimeout: 30000,      // Wait 30 seconds before trying again
  requestTimeout: 10000,    // 10 second timeout for requests
};

/**
 * Service-specific configurations
 * Override defaults for specific services
 */
const SERVICE_CONFIGS: Partial<Record<ServiceName, Partial<CircuitBreakerConfig>>> = {
  openai: {
    failureThreshold: 3,    // OpenAI is critical, fail faster
    resetTimeout: 20000,    // Shorter recovery time
  },
  redis: {
    failureThreshold: 10,   // Redis can tolerate more failures (cache misses)
    resetTimeout: 5000,     // Quick recovery
  },
  weather: {
    failureThreshold: 3,
    resetTimeout: 60000,    // External API, wait longer
  },
};

/**
 * Fallback messages for each service
 */
const FALLBACK_MESSAGES: Record<string, string> = {
  openai: 'AI service is temporarily unavailable. Please try again in a few moments.',
  supabase: 'Database service is temporarily unavailable. Your data is safe, please try again shortly.',
  redis: 'Cache service is temporarily unavailable. Service may be slower than usual.',
  weather: 'Weather service is currently unavailable. Please try again later.',
  n8n: 'Automation service is temporarily unavailable. Please try again shortly.',
  default: 'Service is temporarily unavailable. Please try again later.',
};

// ============================================================================
// Circuit Breaker Storage
// ============================================================================

/**
 * In-memory storage for circuit breakers
 * In production, consider using Redis for distributed systems
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

// ============================================================================
// Core Circuit Breaker Functions
// ============================================================================

/**
 * Get or create a circuit breaker for a service
 */
function getCircuitBreaker(service: string): CircuitBreaker {
  if (!circuitBreakers.has(service)) {
    const breaker: CircuitBreaker = {
      name: service,
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      lastStateChange: Date.now(),
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
    circuitBreakers.set(service, breaker);

    logger.debug('Circuit breaker created', {
      service,
      state: 'CLOSED',
    });
  }

  return circuitBreakers.get(service)!;
}

/**
 * Get configuration for a service (merges defaults with service-specific config)
 */
function getConfig(service: string): CircuitBreakerConfig {
  const serviceConfig = SERVICE_CONFIGS[service as ServiceName] || {};
  return { ...DEFAULT_CONFIG, ...serviceConfig };
}

/**
 * Check if circuit should transition from OPEN to HALF_OPEN
 */
function shouldAttemptReset(breaker: CircuitBreaker, config: CircuitBreakerConfig): boolean {
  if (breaker.state !== 'OPEN') return false;

  const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
  return timeSinceLastFailure >= config.resetTimeout;
}

/**
 * Transition circuit breaker to a new state
 */
function transitionState(breaker: CircuitBreaker, newState: CircuitState, reason: string): void {
  const oldState = breaker.state;

  if (oldState === newState) return;

  breaker.state = newState;
  breaker.lastStateChange = Date.now();

  // Reset counters on state change
  if (newState === 'HALF_OPEN') {
    breaker.successCount = 0;
    breaker.failureCount = 0;
  } else if (newState === 'CLOSED') {
    breaker.failureCount = 0;
    breaker.successCount = 0;
  }

  // Log state change
  logger.warn('Circuit breaker state changed', {
    service: breaker.name,
    oldState,
    newState,
    reason,
    failureCount: breaker.failureCount,
    successCount: breaker.successCount,
  });

  // Report to Sentry for critical state changes
  if (newState === 'OPEN') {
    captureMessage(
      `Circuit breaker OPENED for ${breaker.name}`,
      'warning',
      {
        tags: { service: breaker.name, circuit_state: 'OPEN' },
        extra: {
          reason,
          failureCount: breaker.failureCount,
          totalFailures: breaker.totalFailures,
        },
      }
    );
  } else if (newState === 'CLOSED' && oldState === 'OPEN') {
    logger.info('Circuit breaker recovered', {
      service: breaker.name,
      state: 'CLOSED',
    });
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Record a successful operation
 *
 * @param service - Service name
 *
 * @example
 * ```typescript
 * try {
 *   const result = await openai.chat.completions.create({...});
 *   recordSuccess('openai');
 *   return result;
 * } catch (error) {
 *   recordFailure('openai', error);
 *   throw error;
 * }
 * ```
 */
export function recordSuccess(service: string): void {
  const breaker = getCircuitBreaker(service);
  const config = getConfig(service);

  breaker.totalRequests++;
  breaker.totalSuccesses++;

  if (breaker.state === 'HALF_OPEN') {
    breaker.successCount++;

    logger.debug('Circuit breaker success in HALF_OPEN', {
      service,
      successCount: breaker.successCount,
      successThreshold: config.successThreshold,
    });

    // Close circuit if enough successes
    if (breaker.successCount >= config.successThreshold) {
      transitionState(breaker, 'CLOSED', 'Success threshold reached');
    }
  } else if (breaker.state === 'CLOSED') {
    // Reset failure count on success
    breaker.failureCount = 0;
  }
}

/**
 * Record a failed operation
 *
 * @param service - Service name
 * @param error - The error that occurred
 *
 * @example
 * ```typescript
 * try {
 *   await supabase.from('users').select();
 * } catch (error) {
 *   recordFailure('supabase', error);
 *   throw error;
 * }
 * ```
 */
export function recordFailure(service: string, error: Error | unknown): void {
  const breaker = getCircuitBreaker(service);
  const config = getConfig(service);

  breaker.totalRequests++;
  breaker.totalFailures++;
  breaker.failureCount++;
  breaker.lastFailureTime = Date.now();

  const errorMessage = error instanceof Error ? error.message : String(error);

  logger.error('Circuit breaker recorded failure', {
    service,
    state: breaker.state,
    failureCount: breaker.failureCount,
    failureThreshold: config.failureThreshold,
    error: errorMessage,
  });

  if (breaker.state === 'HALF_OPEN') {
    // Immediately reopen circuit on failure during testing
    transitionState(breaker, 'OPEN', `Failure during recovery test: ${errorMessage}`);
  } else if (breaker.state === 'CLOSED') {
    // Open circuit if threshold reached
    if (breaker.failureCount >= config.failureThreshold) {
      transitionState(breaker, 'OPEN', `Failure threshold reached (${breaker.failureCount} failures)`);

      // Report to Sentry
      captureException(error, {
        tags: { service, circuit_state: 'OPEN' },
        extra: {
          failureCount: breaker.failureCount,
          threshold: config.failureThreshold,
        },
      });
    }
  }
}

/**
 * Get fallback response for a service
 *
 * @param service - Service name
 * @param customMessage - Optional custom error message
 * @returns Fallback response object
 *
 * @example
 * ```typescript
 * if (circuitIsOpen) {
 *   return getFallbackResponse('openai');
 * }
 * ```
 */
export function getFallbackResponse(
  service: string,
  customMessage?: string
): FallbackResponse {
  const breaker = getCircuitBreaker(service);
  const config = getConfig(service);
  const message = customMessage || FALLBACK_MESSAGES[service] || FALLBACK_MESSAGES.default;

  logger.info('Returning fallback response', {
    service,
    state: breaker.state,
  });

  return {
    error: message,
    service,
    fallback: true,
    retryAfter: Math.ceil(config.resetTimeout / 1000), // Convert to seconds
  };
}

/**
 * Execute an operation with circuit breaker protection
 *
 * This is the main function to use for wrapping service calls.
 * It handles circuit state checks, execution, and fallback logic.
 *
 * @param service - Service name
 * @param operation - Async function to execute
 * @param fallback - Fallback value to return if circuit is open
 * @returns Result of operation or fallback value
 *
 * @example
 * ```typescript
 * const response = await withCircuitBreaker(
 *   'openai',
 *   async () => await openai.chat.completions.create({
 *     model: 'gpt-4',
 *     messages: [{ role: 'user', content: 'Hello' }]
 *   }),
 *   { error: 'AI service temporarily unavailable. Please try again.' }
 * );
 * ```
 */
export async function withCircuitBreaker<T>(
  service: string,
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  const breaker = getCircuitBreaker(service);
  const config = getConfig(service);

  // Check if we should attempt reset
  if (shouldAttemptReset(breaker, config)) {
    transitionState(breaker, 'HALF_OPEN', 'Reset timeout elapsed, testing service');
  }

  // If circuit is OPEN, return fallback immediately
  if (breaker.state === 'OPEN') {
    logger.warn('Circuit breaker is OPEN, returning fallback', {
      service,
      timeSinceFailure: Date.now() - breaker.lastFailureTime,
      resetTimeout: config.resetTimeout,
    });

    return fallback;
  }

  // Execute operation with timeout
  try {
    const result = await executeWithTimeout(operation, config.requestTimeout);
    recordSuccess(service);
    return result;
  } catch (error) {
    recordFailure(service, error);

    // Return fallback on failure
    logger.warn('Operation failed, returning fallback', {
      service,
      error: error instanceof Error ? error.message : String(error),
    });

    return fallback;
  }
}

/**
 * Execute a function with a timeout
 *
 * @param fn - Function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with function result or rejects on timeout
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs?: number
): Promise<T> {
  if (!timeoutMs) {
    return fn();
  }

  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Get the current status of a specific service's circuit breaker
 *
 * @param service - Service name
 * @returns Circuit breaker state
 *
 * @example
 * ```typescript
 * const status = getServiceStatus('openai');
 * console.log(`OpenAI circuit is ${status.state}`);
 * ```
 */
export function getServiceStatus(service: string): CircuitBreaker {
  return { ...getCircuitBreaker(service) };
}

/**
 * Get status of all circuit breakers
 *
 * @returns Map of service names to circuit breaker states
 *
 * @example
 * ```typescript
 * const allStatuses = getAllServiceStatuses();
 * for (const [service, status] of Object.entries(allStatuses)) {
 *   console.log(`${service}: ${status.state}`);
 * }
 * ```
 */
export function getAllServiceStatuses(): Record<string, CircuitBreaker> {
  const statuses: Record<string, CircuitBreaker> = {};

  for (const [service, breaker] of circuitBreakers.entries()) {
    statuses[service] = { ...breaker };
  }

  return statuses;
}

/**
 * Get statistics for a service's circuit breaker
 *
 * @param service - Service name
 * @returns Circuit breaker statistics
 *
 * @example
 * ```typescript
 * const stats = getServiceStats('openai');
 * console.log(`Failure rate: ${stats.failureRate}%`);
 * ```
 */
export function getServiceStats(service: string): CircuitBreakerStats {
  const breaker = getCircuitBreaker(service);

  const failureRate = breaker.totalRequests > 0
    ? (breaker.totalFailures / breaker.totalRequests) * 100
    : 0;

  const uptime = Date.now() - breaker.lastStateChange;

  return {
    state: breaker.state,
    failureRate: Math.round(failureRate * 100) / 100, // Round to 2 decimals
    totalRequests: breaker.totalRequests,
    uptime,
    lastFailure: breaker.lastFailureTime > 0
      ? new Date(breaker.lastFailureTime).toISOString()
      : undefined,
  };
}

/**
 * Manually reset a circuit breaker to CLOSED state
 * Use with caution - only for administrative/testing purposes
 *
 * @param service - Service name
 *
 * @example
 * ```typescript
 * // After fixing an issue, manually reset the circuit
 * resetCircuitBreaker('openai');
 * ```
 */
export function resetCircuitBreaker(service: string): void {
  const breaker = getCircuitBreaker(service);

  logger.info('Manually resetting circuit breaker', {
    service,
    previousState: breaker.state,
  });

  transitionState(breaker, 'CLOSED', 'Manual reset');
  breaker.failureCount = 0;
  breaker.successCount = 0;
  breaker.lastFailureTime = 0;
}

/**
 * Clear all circuit breaker data
 * Use with caution - only for testing purposes
 *
 * @example
 * ```typescript
 * // In tests
 * afterEach(() => {
 *   clearAllCircuitBreakers();
 * });
 * ```
 */
export function clearAllCircuitBreakers(): void {
  logger.debug('Clearing all circuit breakers');
  circuitBreakers.clear();
}

/**
 * Check if a circuit is currently open
 *
 * @param service - Service name
 * @returns True if circuit is open (service unavailable)
 *
 * @example
 * ```typescript
 * if (isCircuitOpen('openai')) {
 *   return { error: 'AI service is down' };
 * }
 * ```
 */
export function isCircuitOpen(service: string): boolean {
  const breaker = getCircuitBreaker(service);
  return breaker.state === 'OPEN';
}

/**
 * Check if a circuit is currently closed (healthy)
 *
 * @param service - Service name
 * @returns True if circuit is closed (service available)
 *
 * @example
 * ```typescript
 * if (isCircuitClosed('supabase')) {
 *   // Safe to make database calls
 * }
 * ```
 */
export function isCircuitClosed(service: string): boolean {
  const breaker = getCircuitBreaker(service);
  return breaker.state === 'CLOSED';
}

// ============================================================================
// Health Check & Monitoring
// ============================================================================

/**
 * Get overall system health based on circuit breaker states
 *
 * @returns Health status object
 *
 * @example
 * ```typescript
 * app.get('/health', (req, res) => {
 *   const health = getSystemHealth();
 *   res.status(health.healthy ? 200 : 503).json(health);
 * });
 * ```
 */
export function getSystemHealth(): {
  healthy: boolean;
  services: Record<string, { state: CircuitState; healthy: boolean }>;
  openCircuits: string[];
} {
  const services: Record<string, { state: CircuitState; healthy: boolean }> = {};
  const openCircuits: string[] = [];

  for (const [service, breaker] of circuitBreakers.entries()) {
    const isHealthy = breaker.state === 'CLOSED';

    services[service] = {
      state: breaker.state,
      healthy: isHealthy,
    };

    if (breaker.state === 'OPEN') {
      openCircuits.push(service);
    }
  }

  return {
    healthy: openCircuits.length === 0,
    services,
    openCircuits,
  };
}

// ============================================================================
// Export Configuration (for testing/customization)
// ============================================================================

/**
 * Export default configuration for reference
 */
export const circuitBreakerConfig = DEFAULT_CONFIG;

/**
 * Export service configurations for reference
 */
export const serviceConfigs = SERVICE_CONFIGS;
