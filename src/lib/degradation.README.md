# Graceful Degradation Module

A production-ready circuit breaker implementation for handling service failures gracefully in the bakame-ai project.

## Overview

When external services fail (OpenAI, Supabase, Redis, etc.), the circuit breaker pattern prevents cascading failures and provides fallback responses automatically. This module implements the circuit breaker pattern with three states:

- **CLOSED** (Healthy): Requests pass through normally
- **OPEN** (Failing): Service is down, return fallback immediately (fail fast)
- **HALF_OPEN** (Testing): Testing if service has recovered after cooldown

## Quick Start

### Basic Usage

```typescript
import { withCircuitBreaker } from '@/lib/degradation';

// Wrap any service call with circuit breaker protection
const response = await withCircuitBreaker(
  'openai',
  async () => await openai.chat.completions.create({...}),
  { error: 'AI service temporarily unavailable. Please try again.' }
);
```

### Manual Success/Failure Recording

```typescript
import { recordSuccess, recordFailure, isCircuitOpen } from '@/lib/degradation';

try {
  // Check circuit before attempting
  if (isCircuitOpen('redis')) {
    return null; // Skip cache
  }

  const result = await redis.get(key);
  recordSuccess('redis');
  return result;
} catch (error) {
  recordFailure('redis', error);
  return null;
}
```

## Configuration

### Default Settings

```typescript
{
  failureThreshold: 5,      // Open circuit after 5 failures
  successThreshold: 3,      // Close circuit after 3 successes
  resetTimeout: 30000,      // Wait 30s before trying again
  requestTimeout: 10000,    // 10s timeout for requests
}
```

### Service-Specific Configuration

The module includes optimized configurations for different services:

- **OpenAI**: Fails faster (3 failures), quicker recovery (20s)
- **Redis**: More tolerant (10 failures), quick recovery (5s)
- **Weather**: Standard tolerance, longer recovery (60s)

## API Reference

### Core Functions

#### `withCircuitBreaker<T>(service, operation, fallback): Promise<T>`

Execute an operation with circuit breaker protection.

**Parameters:**
- `service` (string): Service name (e.g., 'openai', 'supabase')
- `operation` (function): Async function to execute
- `fallback` (T): Fallback value to return if circuit is open or operation fails

**Returns:** Promise resolving to operation result or fallback

**Example:**
```typescript
const weather = await withCircuitBreaker(
  'weather',
  async () => fetch('https://api.weather.com/...'),
  { error: 'Weather service unavailable' }
);
```

#### `recordSuccess(service: string): void`

Record a successful operation. Updates circuit state and metrics.

#### `recordFailure(service: string, error: Error): void`

Record a failed operation. May trigger circuit state transitions.

#### `getServiceStatus(service: string): CircuitBreaker`

Get current status and metrics for a service.

**Returns:**
```typescript
{
  name: 'openai',
  state: 'CLOSED',
  failureCount: 0,
  lastFailureTime: 0,
  successCount: 0,
  totalRequests: 150,
  totalFailures: 5,
  totalSuccesses: 145
}
```

#### `getAllServiceStatuses(): Record<string, CircuitBreaker>`

Get status of all tracked services.

#### `getServiceStats(service: string): CircuitBreakerStats`

Get statistical information about a service.

**Returns:**
```typescript
{
  state: 'CLOSED',
  failureRate: 3.33,        // Percentage
  totalRequests: 150,
  uptime: 3600000,          // Milliseconds
  lastFailure: '2024-12-14T12:00:00.000Z'
}
```

### Helper Functions

#### `isCircuitOpen(service: string): boolean`

Check if circuit is currently open (service unavailable).

#### `isCircuitClosed(service: string): boolean`

Check if circuit is currently closed (service available).

#### `getFallbackResponse(service, customMessage?): FallbackResponse`

Get a formatted fallback response for a service.

**Returns:**
```typescript
{
  error: 'AI service is temporarily unavailable...',
  service: 'openai',
  fallback: true,
  retryAfter: 30  // seconds
}
```

#### `resetCircuitBreaker(service: string): void`

Manually reset a circuit to CLOSED state. Use with caution - only for administrative purposes.

#### `clearAllCircuitBreakers(): void`

Clear all circuit breaker data. Only use in tests.

### Monitoring Functions

#### `getSystemHealth(): SystemHealth`

Get overall system health status.

**Returns:**
```typescript
{
  healthy: false,
  services: {
    openai: { state: 'CLOSED', healthy: true },
    redis: { state: 'OPEN', healthy: false }
  },
  openCircuits: ['redis']
}
```

**Usage in health check endpoint:**
```typescript
app.get('/health', (req, res) => {
  const health = getSystemHealth();
  res.status(health.healthy ? 200 : 503).json(health);
});
```

## Usage Examples

### 1. OpenAI Integration

```typescript
import { withCircuitBreaker } from '@/lib/degradation';

async function chatWithAI(message: string) {
  return await withCircuitBreaker(
    'openai',
    async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }]
      });
      return response.choices[0].message;
    },
    {
      role: 'assistant',
      content: 'AI service is temporarily unavailable. Please try again shortly.'
    }
  );
}
```

### 2. Database Queries

```typescript
async function getUserById(userId: string) {
  return await withCircuitBreaker(
    'supabase',
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    null // Return null on failure, caller handles gracefully
  );
}
```

### 3. Redis Caching (Non-Critical)

```typescript
async function getCachedData(key: string) {
  // Cache failures are non-critical, just skip cache
  if (isCircuitOpen('redis')) {
    console.log('Redis unavailable, skipping cache');
    return null;
  }

  try {
    const value = await redis.get(key);
    recordSuccess('redis');
    return value;
  } catch (error) {
    recordFailure('redis', error);
    return null; // Fail gracefully
  }
}
```

### 4. External API Calls

```typescript
async function getWeatherData(location: string) {
  return await withCircuitBreaker(
    'weather',
    async () => {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${location}`
      );

      if (!response.ok) throw new Error('Weather API error');

      return await response.json();
    },
    {
      error: 'Weather service unavailable',
      temperature: null,
      conditions: 'unknown'
    }
  );
}
```

### 5. Health Check Endpoint

```typescript
import { getSystemHealth, getServiceStats } from '@/lib/degradation';

app.get('/api/health', (req, res) => {
  const health = getSystemHealth();

  // Add detailed stats for each service
  const detailedHealth = {
    ...health,
    services: Object.fromEntries(
      Object.entries(health.services).map(([service, status]) => [
        service,
        {
          ...status,
          stats: getServiceStats(service)
        }
      ])
    )
  };

  res.status(health.healthy ? 200 : 503).json(detailedHealth);
});
```

### 6. Admin Dashboard

```typescript
import { getAllServiceStatuses, resetCircuitBreaker } from '@/lib/degradation';

// View circuit breaker status
app.get('/admin/circuits', (req, res) => {
  const statuses = getAllServiceStatuses();
  res.json(statuses);
});

// Manually reset a circuit (admin only)
app.post('/admin/circuits/:service/reset', (req, res) => {
  const { service } = req.params;
  resetCircuitBreaker(service);
  res.json({ success: true, message: `Circuit for ${service} reset` });
});
```

## Circuit Breaker States

### CLOSED (Healthy)

- Requests pass through normally
- Failures are counted
- Transitions to OPEN when failure threshold reached

```
Successes: ✓✓✓✓✓
State: CLOSED → CLOSED
```

### OPEN (Service Down)

- All requests return fallback immediately (fail fast)
- No actual requests are made to the service
- After reset timeout, transitions to HALF_OPEN on next request

```
Failures: ✗✗✗✗✗
State: CLOSED → OPEN
Wait: 30 seconds...
State: OPEN → HALF_OPEN (on next request)
```

### HALF_OPEN (Testing Recovery)

- Service is being tested for recovery
- Requests pass through but are closely monitored
- If success threshold reached: → CLOSED
- If any failure occurs: → OPEN (immediately)

```
Testing: ✓✓✓
State: HALF_OPEN → CLOSED

Testing: ✓✗
State: HALF_OPEN → OPEN
```

## State Transition Diagram

```
         5 failures
CLOSED ────────────────→ OPEN
   ↑                       │
   │                       │ 30s timeout
   │                       ↓
   │                   HALF_OPEN
   │                       │
   └──── 3 successes ──────┘

   HALF_OPEN ──── 1 failure ────→ OPEN
```

## Integration with Logging & Monitoring

### Automatic Logging

The module automatically logs:
- Circuit state transitions (CLOSED → OPEN → HALF_OPEN)
- Fallback activations
- Service failures

```typescript
// Example log output
{
  timestamp: '2024-12-14T12:00:00.000Z',
  level: 'warn',
  message: 'Circuit breaker state changed',
  context: {
    service: 'openai',
    oldState: 'CLOSED',
    newState: 'OPEN',
    reason: 'Failure threshold reached (5 failures)',
    failureCount: 5
  }
}
```

### Sentry Integration

Critical state changes are reported to Sentry:

```typescript
// Circuit opens
captureMessage(
  'Circuit breaker OPENED for openai',
  'warning',
  {
    tags: { service: 'openai', circuit_state: 'OPEN' },
    extra: { failureCount: 5, totalFailures: 12 }
  }
);

// Errors are captured
captureException(error, {
  tags: { service: 'openai', circuit_state: 'OPEN' },
  extra: { failureCount: 5, threshold: 5 }
});
```

## Best Practices

### 1. Use Appropriate Service Names

```typescript
// Good: Descriptive service names
withCircuitBreaker('openai', ...)
withCircuitBreaker('supabase-auth', ...)
withCircuitBreaker('weather-api', ...)

// Bad: Generic names
withCircuitBreaker('api', ...)
withCircuitBreaker('service1', ...)
```

### 2. Provide Meaningful Fallbacks

```typescript
// Good: User-friendly fallback
withCircuitBreaker('openai', operation, {
  role: 'assistant',
  content: 'AI service is temporarily unavailable. Please try again in a moment.'
});

// Bad: Generic error
withCircuitBreaker('openai', operation, { error: 'Error' });
```

### 3. Non-Critical Services

For non-critical services (like caching), use the manual approach:

```typescript
// Cache failures shouldn't block the request
if (!isCircuitOpen('redis')) {
  try {
    const cached = await redis.get(key);
    recordSuccess('redis');
    if (cached) return cached;
  } catch (error) {
    recordFailure('redis', error);
    // Continue to database
  }
}

// Fetch from database
return await database.query(...);
```

### 4. Monitoring

Set up regular monitoring:

```typescript
// Every 5 minutes
setInterval(() => {
  const health = getSystemHealth();

  if (!health.healthy) {
    logger.warn('System degraded', {
      openCircuits: health.openCircuits
    });
  }
}, 5 * 60 * 1000);
```

### 5. Graceful Degradation Levels

Implement multiple levels of degradation:

```typescript
async function getRecommendations(userId: string) {
  // Level 1: Try AI recommendations
  if (!isCircuitOpen('openai')) {
    try {
      const aiRecs = await getAIRecommendations(userId);
      recordSuccess('openai');
      return aiRecs;
    } catch (error) {
      recordFailure('openai', error);
      // Fall through to level 2
    }
  }

  // Level 2: Try cached recommendations
  if (!isCircuitOpen('redis')) {
    try {
      const cached = await redis.get(`recs:${userId}`);
      recordSuccess('redis');
      if (cached) return JSON.parse(cached);
    } catch (error) {
      recordFailure('redis', error);
      // Fall through to level 3
    }
  }

  // Level 3: Basic recommendations from database
  return await getBasicRecommendations(userId);
}
```

## Testing

Run the test suite:

```bash
npx tsx src/lib/degradation.test.ts
```

Example test output:
```
========================================
  Circuit Breaker Tests
========================================

=== Test: Circuit Breaker Basics ===
✓ Initial state is CLOSED
✓ Stays CLOSED after success
✓ All basic tests passed

=== Test: Circuit Opening ===
Recording 5 failures...
✓ Circuit opens after threshold failures
✓ Failure count is 5
✓ All opening tests passed

========================================
  ✓ All Tests Passed!
========================================
```

## Common Patterns

### Pattern 1: Composite Operations

```typescript
async function processRequest(userId: string, message: string) {
  // Get user data (critical)
  const user = await withCircuitBreaker(
    'supabase',
    async () => await getUserById(userId),
    null
  );

  if (!user) {
    return { error: 'User service unavailable' };
  }

  // Get AI response (critical)
  const response = await withCircuitBreaker(
    'openai',
    async () => await chatWithAI(message),
    { content: 'AI temporarily unavailable' }
  );

  // Store in cache (non-critical, best effort)
  if (!isCircuitOpen('redis')) {
    try {
      await redis.set(`chat:${userId}`, JSON.stringify(response));
      recordSuccess('redis');
    } catch (error) {
      recordFailure('redis', error);
      // Don't fail the request
    }
  }

  return { user, response };
}
```

### Pattern 2: Rate Limiting Integration

```typescript
import { checkRateLimit } from '@/lib/rateLimit';
import { withCircuitBreaker } from '@/lib/degradation';

async function rateLimitedOperation(userId: string) {
  // Check rate limit first
  const allowed = await checkRateLimit(userId);
  if (!allowed) {
    return { error: 'Rate limit exceeded' };
  }

  // Then check circuit breaker
  return await withCircuitBreaker(
    'external-api',
    async () => await expensiveOperation(),
    { error: 'Service unavailable' }
  );
}
```

## Troubleshooting

### Circuit keeps opening

**Problem:** Circuit frequently opens for a service.

**Solutions:**
1. Increase failure threshold for that service
2. Investigate root cause (service instability, network issues)
3. Add retries with exponential backoff before recording failure
4. Check if timeout is too aggressive

### Circuit stays open too long

**Problem:** Service recovers but circuit doesn't close.

**Solutions:**
1. Reduce reset timeout for that service
2. Check logs for HALF_OPEN → OPEN transitions (recovery failures)
3. Verify service is actually healthy

### False positives

**Problem:** Circuit opens during normal temporary errors.

**Solutions:**
1. Distinguish between temporary and permanent errors
2. Only record failure for actual service failures
3. Increase failure threshold

```typescript
try {
  const result = await operation();
  recordSuccess('service');
} catch (error) {
  // Only record failures for service issues, not user errors
  if (error.code === 'SERVICE_ERROR') {
    recordFailure('service', error);
  }
  throw error;
}
```

## Performance Considerations

- **Memory:** Circuit breakers are stored in-memory. For distributed systems, consider using Redis.
- **Overhead:** Minimal - just counter increments and timestamp comparisons
- **Logging:** Structured logging has minimal overhead, but avoid verbose logging in hot paths

## Future Enhancements

Potential improvements for production use:

1. **Distributed Circuit Breakers:** Use Redis to share circuit state across instances
2. **Metrics Export:** Export circuit breaker metrics to Prometheus/Datadog
3. **Advanced Strategies:** Implement sliding window for failure counting
4. **Custom Thresholds:** Per-operation thresholds within a service
5. **Health Probes:** Active health checking for faster recovery detection

## License

Part of the bakame-ai project.
