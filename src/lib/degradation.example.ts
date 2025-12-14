/**
 * Example usage of the graceful degradation module
 *
 * This file demonstrates how to use circuit breakers to handle
 * service failures gracefully in various scenarios.
 */

import {
  withCircuitBreaker,
  recordSuccess,
  recordFailure,
  getServiceStatus,
  getAllServiceStatuses,
  getServiceStats,
  getFallbackResponse,
  isCircuitOpen,
  getSystemHealth,
  resetCircuitBreaker,
} from './degradation';

// ============================================================================
// Example 1: Basic Usage with OpenAI
// ============================================================================

/**
 * Wrapping an OpenAI API call with circuit breaker protection
 */
async function chatWithAI(message: string) {
  const fallback = {
    role: 'assistant',
    content: 'AI service is temporarily unavailable. Please try again in a few moments.',
  };

  return await withCircuitBreaker(
    'openai',
    async () => {
      // Your actual OpenAI call here
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: message }],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message;
    },
    fallback
  );
}

// ============================================================================
// Example 2: Database Operations with Supabase
// ============================================================================

/**
 * Wrapping database queries with circuit breaker
 */
async function fetchUserData(userId: string) {
  const fallback = {
    error: 'Database is temporarily unavailable. Please try again shortly.',
    cached: false,
  };

  return await withCircuitBreaker(
    'supabase',
    async () => {
      // Your Supabase query here
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { data, cached: false };
    },
    fallback
  );
}

// ============================================================================
// Example 3: Redis Cache with Manual Success/Failure Recording
// ============================================================================

/**
 * Manual circuit breaker recording (when you need more control)
 */
async function getCachedValue(key: string): Promise<string | null> {
  try {
    // Check circuit before attempting
    if (isCircuitOpen('redis')) {
      console.log('Redis circuit is open, skipping cache');
      return null;
    }

    // Your Redis operation
    const redis = await getRedisClient();
    const value = await redis.get(key);

    // Record success
    recordSuccess('redis');

    return value;
  } catch (error) {
    // Record failure
    recordFailure('redis', error as Error);

    // Return null to fall back to database
    return null;
  }
}

async function getRedisClient() {
  // Mock Redis client for example
  throw new Error('Redis connection failed');
}

// ============================================================================
// Example 4: External API (Weather Service)
// ============================================================================

/**
 * Calling external weather API with circuit breaker
 */
async function getWeather(location: string) {
  const fallback = {
    error: 'Weather service is currently unavailable. Please try again later.',
    location,
    temperature: null,
    conditions: 'unavailable',
  };

  return await withCircuitBreaker(
    'weather',
    async () => {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        location: data.location.name,
        temperature: data.current.temp_c,
        conditions: data.current.condition.text,
      };
    },
    fallback
  );
}

// ============================================================================
// Example 5: N8N Workflow Automation
// ============================================================================

/**
 * Triggering n8n workflows with circuit breaker protection
 */
async function triggerWorkflow(workflowId: string, payload: any) {
  const fallback = {
    success: false,
    error: 'Automation service is temporarily unavailable. Your request will be processed when service recovers.',
    queued: true,
  };

  return await withCircuitBreaker(
    'n8n',
    async () => {
      const response = await fetch(
        `${process.env.N8N_WEBHOOK_URL}/webhook/${workflowId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status}`);
      }

      return {
        success: true,
        data: await response.json(),
        queued: false,
      };
    },
    fallback
  );
}

// ============================================================================
// Example 6: Monitoring & Health Checks
// ============================================================================

/**
 * Health check endpoint implementation
 */
export async function healthCheckEndpoint() {
  const systemHealth = getSystemHealth();

  // Get detailed stats for each service
  const serviceStats: Record<string, any> = {};
  for (const service of Object.keys(systemHealth.services)) {
    serviceStats[service] = {
      ...systemHealth.services[service],
      stats: getServiceStats(service),
    };
  }

  return {
    status: systemHealth.healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: serviceStats,
    openCircuits: systemHealth.openCircuits,
  };
}

/**
 * Example output:
 * {
 *   "status": "degraded",
 *   "timestamp": "2024-12-14T12:00:00.000Z",
 *   "services": {
 *     "openai": {
 *       "state": "CLOSED",
 *       "healthy": true,
 *       "stats": {
 *         "failureRate": 2.5,
 *         "totalRequests": 120,
 *         "uptime": 3600000
 *       }
 *     },
 *     "redis": {
 *       "state": "OPEN",
 *       "healthy": false,
 *       "stats": {
 *         "failureRate": 100,
 *         "totalRequests": 15,
 *         "uptime": 35000,
 *         "lastFailure": "2024-12-14T11:59:30.000Z"
 *       }
 *     }
 *   },
 *   "openCircuits": ["redis"]
 * }
 */

// ============================================================================
// Example 7: Admin Operations
// ============================================================================

/**
 * Admin endpoint to view circuit breaker status
 */
export function getCircuitBreakerDashboard() {
  const allStatuses = getAllServiceStatuses();

  return Object.entries(allStatuses).map(([service, status]) => ({
    service,
    state: status.state,
    failureCount: status.failureCount,
    successCount: status.successCount,
    totalRequests: status.totalRequests,
    totalFailures: status.totalFailures,
    totalSuccesses: status.totalSuccesses,
    failureRate: status.totalRequests > 0
      ? ((status.totalFailures / status.totalRequests) * 100).toFixed(2) + '%'
      : '0%',
    lastFailure: status.lastFailureTime > 0
      ? new Date(status.lastFailureTime).toISOString()
      : 'Never',
  }));
}

/**
 * Admin endpoint to manually reset a circuit breaker
 */
export function adminResetCircuit(service: string) {
  const beforeStatus = getServiceStatus(service);

  resetCircuitBreaker(service);

  const afterStatus = getServiceStatus(service);

  return {
    success: true,
    service,
    before: beforeStatus.state,
    after: afterStatus.state,
    message: `Circuit breaker for ${service} has been reset`,
  };
}

// ============================================================================
// Example 8: Composite Operations (Multiple Services)
// ============================================================================

/**
 * Example of an operation that uses multiple services
 */
async function processUserRequest(userId: string, message: string) {
  // Try to get user data
  const userData = await fetchUserData(userId);

  if ('error' in userData) {
    return {
      error: 'Unable to process request. User service unavailable.',
      fallback: true,
    };
  }

  // Try to get AI response
  const aiResponse = await chatWithAI(message);

  // Try to cache the response (non-critical)
  try {
    const cached = await getCachedValue(`ai:${userId}:${message}`);
    // Store response in cache...
  } catch (error) {
    // Cache failure is non-critical, continue
    console.log('Cache unavailable, skipping...');
  }

  return {
    user: userData.data,
    response: aiResponse,
    fallback: false,
  };
}

// ============================================================================
// Example 9: Scheduled Circuit Breaker Reports
// ============================================================================

/**
 * Function to generate periodic circuit breaker reports
 * Run this on a schedule (e.g., every 5 minutes) to monitor service health
 */
export function generateCircuitBreakerReport() {
  const health = getSystemHealth();
  const timestamp = new Date().toISOString();

  console.log('\n=== Circuit Breaker Report ===');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Overall Health: ${health.healthy ? 'HEALTHY' : 'DEGRADED'}`);
  console.log(`Open Circuits: ${health.openCircuits.length > 0 ? health.openCircuits.join(', ') : 'None'}`);
  console.log('\nService Details:');

  for (const [service, status] of Object.entries(health.services)) {
    const stats = getServiceStats(service);
    const fullStatus = getServiceStatus(service);

    console.log(`\n  ${service}:`);
    console.log(`    State: ${status.state}`);
    console.log(`    Healthy: ${status.healthy ? 'Yes' : 'No'}`);
    console.log(`    Total Requests: ${stats.totalRequests}`);
    console.log(`    Failure Rate: ${stats.failureRate}%`);
    console.log(`    Current Failures: ${fullStatus.failureCount}`);
    console.log(`    Last Failure: ${stats.lastFailure || 'Never'}`);
  }

  console.log('\n==============================\n');

  return health;
}

// ============================================================================
// Example 10: Testing Circuit Breaker Behavior
// ============================================================================

/**
 * Function to test circuit breaker transitions
 * Useful for testing and understanding circuit breaker behavior
 */
export async function testCircuitBreaker() {
  console.log('Starting circuit breaker test...\n');

  // Test service
  const testService = 'test-service';

  // 1. Initial state (CLOSED)
  console.log('1. Initial state:', getServiceStatus(testService).state);

  // 2. Simulate failures to open circuit
  console.log('2. Simulating failures...');
  for (let i = 0; i < 5; i++) {
    recordFailure(testService, new Error(`Test failure ${i + 1}`));
  }
  console.log('   State after failures:', getServiceStatus(testService).state);

  // 3. Wait for reset timeout
  console.log('3. Waiting for reset timeout (30s in production, instant in test)...');

  // 4. Circuit should transition to HALF_OPEN on next request
  const result = await withCircuitBreaker(
    testService,
    async () => {
      console.log('   Executing test operation...');
      return 'Success!';
    },
    'Fallback value'
  );
  console.log('   Result:', result);
  console.log('   State:', getServiceStatus(testService).state);

  // 5. Record successes to close circuit
  console.log('4. Recording successes to close circuit...');
  for (let i = 0; i < 3; i++) {
    recordSuccess(testService);
  }
  console.log('   Final state:', getServiceStatus(testService).state);

  console.log('\nCircuit breaker test complete!');
}

// ============================================================================
// Example 11: Integration with Express/Next.js Middleware
// ============================================================================

/**
 * Express middleware to check service health
 */
export function circuitBreakerMiddleware(requiredServices: string[]) {
  return (req: any, res: any, next: any) => {
    const openCircuits = requiredServices.filter(service => isCircuitOpen(service));

    if (openCircuits.length > 0) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        unavailableServices: openCircuits,
        message: 'Some required services are currently down. Please try again later.',
      });
    }

    next();
  };
}

/**
 * Next.js API route example
 */
export async function nextJsApiRoute(req: any, res: any) {
  // Check if critical services are available
  if (isCircuitOpen('openai') || isCircuitOpen('supabase')) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Critical services are down. Please try again later.',
    });
  }

  try {
    const result = await chatWithAI(req.body.message);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    });
  }
}

// ============================================================================
// Usage in Application Startup
// ============================================================================

/**
 * Initialize circuit breakers on application startup
 */
export function initializeCircuitBreakers() {
  console.log('Initializing circuit breakers...');

  // Pre-initialize circuit breakers for known services
  const services = ['openai', 'supabase', 'redis', 'weather', 'n8n'];

  services.forEach(service => {
    getServiceStatus(service);
    console.log(`  - ${service}: initialized`);
  });

  // Set up periodic health checks (every 5 minutes)
  setInterval(() => {
    generateCircuitBreakerReport();
  }, 5 * 60 * 1000);

  console.log('Circuit breakers initialized successfully!');
}
