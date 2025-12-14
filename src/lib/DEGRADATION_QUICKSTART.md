# Circuit Breaker - 5 Minute Quick Start

## What is this?

A circuit breaker prevents your app from crashing when external services fail. Instead of hanging or cascading failures, it automatically returns fallback responses.

## Basic Usage (Copy & Paste)

### 1. Import

```typescript
import { withCircuitBreaker } from '@/lib/degradation';
```

### 2. Wrap Your Service Call

**Before:**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
});
```

**After:**
```typescript
const response = await withCircuitBreaker(
  'openai',
  async () => await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }]
  }),
  { error: 'AI service temporarily unavailable. Please try again.' }
);
```

That's it! Now if OpenAI fails:
- After 3 failures → Circuit opens
- All requests get instant fallback response
- After 20 seconds → Circuit tests recovery
- After 3 successes → Circuit closes, back to normal

## Health Check (2 Minutes)

Create `/app/api/health/route.ts`:

```typescript
import { getSystemHealth } from '@/lib/degradation';

export async function GET() {
  const health = getSystemHealth();
  return Response.json(health, {
    status: health.healthy ? 200 : 503
  });
}
```

Test it:
```bash
curl http://localhost:3000/api/health
```

## Common Patterns

### OpenAI
```typescript
const ai = await withCircuitBreaker(
  'openai',
  async () => await openai.chat.completions.create({...}),
  { error: 'AI temporarily unavailable' }
);
```

### Supabase
```typescript
const user = await withCircuitBreaker(
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
  null
);
```

### Redis (Non-Critical)
```typescript
import { isCircuitOpen, recordSuccess, recordFailure } from '@/lib/degradation';

if (!isCircuitOpen('redis')) {
  try {
    const cached = await redis.get(key);
    recordSuccess('redis');
    if (cached) return cached;
  } catch (error) {
    recordFailure('redis', error);
  }
}
// Continue without cache
```

### External API
```typescript
const weather = await withCircuitBreaker(
  'weather',
  async () => await fetch('https://api.weather.com/...').then(r => r.json()),
  { error: 'Weather unavailable' }
);
```

## How It Works

```
✓✓✓✓✓  Normal operation (CLOSED)
   ↓
✗✗✗    3 failures detected
   ↓
[OPEN] Circuit opens - all requests get fallback
   ↓
⏱️     Wait 20 seconds
   ↓
✓      Test recovery (HALF_OPEN)
✓✓     3 successes
   ↓
✓✓✓✓✓  Circuit closes - back to normal
```

## Check Circuit Status

```typescript
import { isCircuitOpen, getServiceStatus } from '@/lib/degradation';

// Simple check
if (isCircuitOpen('openai')) {
  return { error: 'AI service down' };
}

// Detailed status
const status = getServiceStatus('openai');
console.log(status.state); // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
console.log(status.failureCount);
console.log(status.totalRequests);
```

## Configuration

Default settings (works great out of the box):

```typescript
{
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 3,      // Close after 3 successes
  resetTimeout: 30000,      // Wait 30s before retry
}
```

Service-specific overrides (already configured):
- **OpenAI**: 3 failures, 20s timeout (more aggressive)
- **Redis**: 10 failures, 5s timeout (more tolerant)
- **Weather**: 3 failures, 60s timeout (patient with external APIs)

## Next Steps

1. ✅ Use `withCircuitBreaker` for your first service call
2. ✅ Add health check endpoint
3. ✅ Test in development
4. 📖 Read full docs: `degradation.README.md`
5. 🔧 Check examples: `degradation.example.ts`
6. 🚀 Deploy to production

## Quick Reference

| Function | Use When |
|----------|----------|
| `withCircuitBreaker()` | Wrapping any service call |
| `isCircuitOpen()` | Check if service is down |
| `getSystemHealth()` | Health check endpoint |
| `recordSuccess()` | Manual success tracking |
| `recordFailure()` | Manual failure tracking |

## Testing

Simulate failures in development:

```typescript
import { recordFailure, getServiceStatus } from '@/lib/degradation';

// Simulate 5 failures
for (let i = 0; i < 5; i++) {
  recordFailure('test-service', new Error('Test'));
}

// Check status
console.log(getServiceStatus('test-service').state); // 'OPEN'
```

## Monitoring

Check all circuits:
```typescript
import { getAllServiceStatuses } from '@/lib/degradation';

const statuses = getAllServiceStatuses();
Object.entries(statuses).forEach(([service, status]) => {
  console.log(`${service}: ${status.state}`);
});
```

## Full Documentation

- **This file**: Quick start (you are here)
- **Integration**: `degradation.INTEGRATION.md`
- **Full docs**: `degradation.README.md`
- **Cheat sheet**: `degradation.cheatsheet.md`
- **Diagrams**: `degradation.diagrams.md`
- **Examples**: `degradation.example.ts`

## Support

Got questions? Check:
1. Examples: `degradation.example.ts` (real-world usage)
2. Cheat sheet: `degradation.cheatsheet.md` (common patterns)
3. Full docs: `degradation.README.md` (everything you need)

---

**Ready?** Copy the first example above and protect your first service call!
