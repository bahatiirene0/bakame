# Circuit Breaker - Quick Reference

## Import

```typescript
import {
  withCircuitBreaker,
  recordSuccess,
  recordFailure,
  isCircuitOpen,
  isCircuitClosed,
  getServiceStatus,
  getAllServiceStatuses,
  getSystemHealth,
  resetCircuitBreaker,
} from '@/lib/degradation';
```

## Common Usage Patterns

### 1. Wrap Service Call (Recommended)

```typescript
const result = await withCircuitBreaker(
  'service-name',
  async () => await yourOperation(),
  fallbackValue
);
```

### 2. Manual Recording

```typescript
if (!isCircuitOpen('service')) {
  try {
    const result = await operation();
    recordSuccess('service');
    return result;
  } catch (error) {
    recordFailure('service', error);
    throw error;
  }
}
```

## Quick Examples

### OpenAI

```typescript
const response = await withCircuitBreaker(
  'openai',
  async () => await openai.chat.completions.create({...}),
  { error: 'AI unavailable' }
);
```

### Supabase

```typescript
const data = await withCircuitBreaker(
  'supabase',
  async () => {
    const { data, error } = await supabase.from('users').select();
    if (error) throw error;
    return data;
  },
  []
);
```

### Redis (Non-Critical)

```typescript
if (!isCircuitOpen('redis')) {
  try {
    const cached = await redis.get(key);
    recordSuccess('redis');
    return cached;
  } catch (error) {
    recordFailure('redis', error);
  }
}
// Continue without cache
```

### External API

```typescript
const weather = await withCircuitBreaker(
  'weather-api',
  async () => await fetch('https://api.weather.com/...').then(r => r.json()),
  { error: 'Weather unavailable' }
);
```

## Health Monitoring

### System Health

```typescript
const health = getSystemHealth();
// { healthy: true, services: {...}, openCircuits: [] }
```

### Service Status

```typescript
const status = getServiceStatus('openai');
// { state: 'CLOSED', failureCount: 0, ... }
```

### All Services

```typescript
const all = getAllServiceStatuses();
// { openai: {...}, supabase: {...}, redis: {...} }
```

## Health Check Endpoint

```typescript
app.get('/health', (req, res) => {
  const health = getSystemHealth();
  res.status(health.healthy ? 200 : 503).json(health);
});
```

## Circuit States

| State | Meaning | Behavior |
|-------|---------|----------|
| `CLOSED` | Healthy | Requests pass through |
| `OPEN` | Down | Return fallback immediately |
| `HALF_OPEN` | Testing | Testing recovery |

## Default Configuration

```typescript
{
  failureThreshold: 5,      // Failures to open
  successThreshold: 3,      // Successes to close
  resetTimeout: 30000,      // Wait before retry (30s)
  requestTimeout: 10000,    // Request timeout (10s)
}
```

## Service-Specific Settings

| Service | Failure Threshold | Reset Timeout |
|---------|------------------|---------------|
| OpenAI | 3 | 20s |
| Redis | 10 | 5s |
| Weather | 3 | 60s |
| Default | 5 | 30s |

## Helper Functions

```typescript
// Check circuit state
if (isCircuitOpen('service')) { /* handle */ }
if (isCircuitClosed('service')) { /* proceed */ }

// Get statistics
const stats = getServiceStats('service');
// { failureRate: 5.2, totalRequests: 100, ... }

// Admin: Reset circuit (use carefully!)
resetCircuitBreaker('service');
```

## Error Handling Levels

### Level 1: Critical Service

```typescript
// Must have this service
const data = await withCircuitBreaker('db', operation, null);
if (!data) return { error: 'Service down' };
```

### Level 2: Important but Fallback Available

```typescript
// Try AI, fallback to template
const response = await withCircuitBreaker(
  'openai',
  () => getAIResponse(),
  getTemplateResponse()
);
```

### Level 3: Nice-to-Have (Cache)

```typescript
// Try cache, skip if down
if (!isCircuitOpen('redis')) {
  try {
    return await getFromCache();
  } catch (error) {
    recordFailure('redis', error);
  }
}
// Continue without cache
```

## Testing

```bash
# Run tests
npx tsx src/lib/degradation.test.ts

# In your tests
import { clearAllCircuitBreakers } from '@/lib/degradation';

beforeEach(() => {
  clearAllCircuitBreakers(); // Reset for each test
});
```

## Debugging

```typescript
// Check current status
console.log(getServiceStatus('openai'));

// Check all services
console.log(getAllServiceStatuses());

// Monitor system health
setInterval(() => {
  const health = getSystemHealth();
  if (!health.healthy) {
    console.log('Degraded:', health.openCircuits);
  }
}, 60000);
```

## Common Patterns

### Cascade with Fallbacks

```typescript
// Try AI → Try Cache → Use Template
let response;

response = await withCircuitBreaker('openai', getAI, null);
if (!response && !isCircuitOpen('redis')) {
  response = await withCircuitBreaker('redis', getCache, null);
}
if (!response) {
  response = getTemplate();
}
```

### Pre-Check Before Expensive Operation

```typescript
// Don't waste rate limits on open circuits
if (isCircuitOpen('openai')) {
  return { error: 'AI service down' };
}

// Check rate limit
if (!checkRateLimit(userId)) {
  return { error: 'Rate limited' };
}

// Now make the request
return await withCircuitBreaker('openai', operation, fallback);
```

### Composite Service Health

```typescript
// Require multiple services
const required = ['openai', 'supabase'];
const unavailable = required.filter(s => isCircuitOpen(s));

if (unavailable.length > 0) {
  return {
    error: 'Required services unavailable',
    unavailable
  };
}

// Proceed with operations
```

## Integration Examples

### With Rate Limiting

```typescript
import { checkRateLimit } from '@/lib/rateLimit';

if (!checkRateLimit(userId)) return { error: 'Rate limited' };
if (isCircuitOpen('service')) return { error: 'Service down' };

return await withCircuitBreaker('service', operation, fallback);
```

### With Caching

```typescript
// Try cache first
if (!isCircuitOpen('redis')) {
  const cached = await getFromCache(key);
  if (cached) return cached;
}

// Fetch from source
const data = await withCircuitBreaker('api', fetchData, null);

// Cache result (best effort)
if (data && !isCircuitOpen('redis')) {
  await saveToCache(key, data).catch(() => {});
}

return data;
```

### Middleware

```typescript
// Require services for specific routes
app.use('/ai', (req, res, next) => {
  if (isCircuitOpen('openai')) {
    return res.status(503).json({ error: 'AI service down' });
  }
  next();
});
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Circuit opens too often | Increase `failureThreshold` |
| Circuit stays open too long | Reduce `resetTimeout` |
| False positives | Filter error types before recording |
| Slow recovery | Check HALF_OPEN → OPEN transitions |

## State Transitions

```
CLOSED ──[5 failures]──→ OPEN
OPEN ──[30s wait]──→ HALF_OPEN ──[3 successes]──→ CLOSED
HALF_OPEN ──[1 failure]──→ OPEN
```

## When to Use Each Approach

| Use Case | Pattern | Example |
|----------|---------|---------|
| Critical API call | `withCircuitBreaker` | OpenAI, Supabase |
| Optional feature | Manual + `isCircuitOpen` | Redis cache |
| Multiple attempts | Manual with retry logic | External APIs |
| Composite operation | Check multiple circuits | Multi-service endpoint |

## Monitoring Checklist

- [ ] Health endpoint: `GET /health`
- [ ] Log circuit state changes
- [ ] Alert on OPEN state
- [ ] Dashboard with circuit status
- [ ] Track failure rates
- [ ] Monitor reset frequency

## Files Reference

- Implementation: `/home/bahati/bakame-ai/src/lib/degradation.ts`
- Examples: `/home/bahati/bakame-ai/src/lib/degradation.example.ts`
- Tests: `/home/bahati/bakame-ai/src/lib/degradation.test.ts`
- Full Documentation: `/home/bahati/bakame-ai/src/lib/degradation.README.md`
