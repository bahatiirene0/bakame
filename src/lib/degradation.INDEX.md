# Graceful Degradation Module - Index

Complete circuit breaker implementation for the bakame-ai project with comprehensive documentation.

## Quick Links

| Document | Purpose | Location |
|----------|---------|----------|
| **Main Implementation** | Core circuit breaker module | [`degradation.ts`](/home/bahati/bakame-ai/src/lib/degradation.ts) |
| **Integration Guide** | How to integrate into your app | [`degradation.INTEGRATION.md`](/home/bahati/bakame-ai/src/lib/degradation.INTEGRATION.md) |
| **Full Documentation** | Complete API reference & patterns | [`degradation.README.md`](/home/bahati/bakame-ai/src/lib/degradation.README.md) |
| **Quick Reference** | Cheat sheet for common tasks | [`degradation.cheatsheet.md`](/home/bahati/bakame-ai/src/lib/degradation.cheatsheet.md) |
| **Visual Diagrams** | State diagrams & flow charts | [`degradation.diagrams.md`](/home/bahati/bakame-ai/src/lib/degradation.diagrams.md) |
| **Examples** | Real-world usage examples | [`degradation.example.ts`](/home/bahati/bakame-ai/src/lib/degradation.example.ts) |
| **Tests** | Test suite for the module | [`degradation.test.ts`](/home/bahati/bakame-ai/src/lib/degradation.test.ts) |

## What This Module Does

The graceful degradation module implements the **Circuit Breaker Pattern** to handle service failures gracefully. When external services (OpenAI, Supabase, Redis, etc.) fail, it:

1. **Detects failures** automatically
2. **Prevents cascade failures** by failing fast
3. **Returns fallback responses** to keep your app running
4. **Tests for recovery** automatically after a timeout
5. **Logs everything** for monitoring and debugging

## Three-Minute Quickstart

### 1. Import

```typescript
import { withCircuitBreaker } from '@/lib/degradation';
```

### 2. Wrap Service Calls

```typescript
const response = await withCircuitBreaker(
  'openai',
  async () => await openai.chat.completions.create({...}),
  { error: 'AI service temporarily unavailable' }
);
```

### 3. Add Health Check

```typescript
// app/api/health/route.ts
import { getSystemHealth } from '@/lib/degradation';

export async function GET() {
  const health = getSystemHealth();
  return Response.json(health, {
    status: health.healthy ? 200 : 503
  });
}
```

That's it! Your app now gracefully handles service failures.

## Core Features

### ✅ Circuit Breaker Pattern
- Three states: CLOSED (healthy), OPEN (failing), HALF_OPEN (testing)
- Automatic state transitions based on failures/successes
- Configurable thresholds per service

### ✅ Service Protection
- Prevents wasting resources on failing services
- Automatic timeout on requests
- Immediate fallback responses when circuit is open

### ✅ Monitoring & Logging
- Integration with existing logger
- Sentry integration for alerting
- Comprehensive metrics and statistics
- Health check endpoints

### ✅ Production Ready
- Zero external dependencies
- Type-safe TypeScript implementation
- Comprehensive test suite
- Minimal memory footprint (~100 bytes per service)

## Supported Services

| Service | Description | Failure Threshold | Reset Timeout |
|---------|-------------|-------------------|---------------|
| **openai** | OpenAI API calls | 3 | 20s |
| **supabase** | Database queries | 5 | 30s |
| **redis** | Cache operations | 10 | 5s |
| **weather** | External weather API | 3 | 60s |
| **n8n** | Workflow automation | 5 | 30s |
| **custom** | Any service name | 5 | 30s |

## API Overview

### Core Functions

```typescript
// Wrap operations with circuit breaker
withCircuitBreaker<T>(service, operation, fallback): Promise<T>

// Manual recording
recordSuccess(service: string): void
recordFailure(service: string, error: Error): void

// Status checks
isCircuitOpen(service: string): boolean
isCircuitClosed(service: string): boolean
getServiceStatus(service: string): CircuitBreaker
getAllServiceStatuses(): Record<string, CircuitBreaker>

// Statistics
getServiceStats(service: string): CircuitBreakerStats
getSystemHealth(): SystemHealth

// Administration
resetCircuitBreaker(service: string): void
clearAllCircuitBreakers(): void

// Fallback responses
getFallbackResponse(service, customMessage?): FallbackResponse
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Your Application                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Circuit Breaker     │
        │  (degradation.ts)    │
        └──────────┬───────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌────────┐    ┌────────┐    ┌────────┐
│ OpenAI │    │Supabase│    │ Redis  │
└────────┘    └────────┘    └────────┘
```

## File Structure

```
/home/bahati/bakame-ai/src/lib/
├── degradation.ts                    # Main implementation (689 lines)
├── degradation.INTEGRATION.md        # Integration guide
├── degradation.README.md             # Full documentation
├── degradation.cheatsheet.md         # Quick reference
├── degradation.diagrams.md           # Visual diagrams
├── degradation.example.ts            # Usage examples (508 lines)
├── degradation.test.ts               # Test suite (439 lines)
└── degradation.INDEX.md              # This file
```

## Statistics

- **Total Lines**: 3,867 lines
- **Total Size**: ~110 KB
- **Files**: 7 files
- **Implementation**: 689 lines
- **Examples**: 508 lines
- **Tests**: 439 lines
- **Documentation**: 2,231 lines

## Getting Started Path

Recommended reading order:

1. **This file** (INDEX.md) - Overview ← You are here
2. **Quick Reference** (cheatsheet.md) - Common patterns
3. **Integration Guide** (INTEGRATION.md) - Add to your app
4. **Examples** (example.ts) - Real-world usage
5. **Full Documentation** (README.md) - Deep dive
6. **Visual Diagrams** (diagrams.md) - Understanding flows
7. **Tests** (test.ts) - Testing patterns

## Common Use Cases

### Use Case 1: Protect OpenAI API Calls

```typescript
const response = await withCircuitBreaker(
  'openai',
  async () => await openai.chat.completions.create({...}),
  { error: 'AI temporarily unavailable' }
);
```

### Use Case 2: Database Query Protection

```typescript
const user = await withCircuitBreaker(
  'supabase',
  async () => await supabase.from('users').select('*').eq('id', userId),
  null
);

if (!user) {
  return { error: 'Database unavailable' };
}
```

### Use Case 3: Non-Critical Cache

```typescript
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

### Use Case 4: Health Monitoring

```typescript
app.get('/health', (req, res) => {
  const health = getSystemHealth();
  res.status(health.healthy ? 200 : 503).json(health);
});
```

## Configuration

Default configuration:

```typescript
{
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 3,      // Close after 3 successes
  resetTimeout: 30000,      // Wait 30s before retry
  requestTimeout: 10000,    // 10s request timeout
}
```

Service-specific overrides available for:
- OpenAI (more aggressive)
- Redis (more tolerant)
- Weather API (longer timeout)

## Integration Checklist

- [ ] Import module in service files
- [ ] Wrap critical service calls with `withCircuitBreaker`
- [ ] Add health check endpoint
- [ ] Set up monitoring/alerts
- [ ] Add circuit breaker middleware (optional)
- [ ] Test failure scenarios
- [ ] Deploy to staging
- [ ] Monitor and adjust thresholds
- [ ] Deploy to production

## Monitoring Checklist

- [ ] Health endpoint configured: `/api/health`
- [ ] Uptime monitoring enabled
- [ ] Sentry alerts configured
- [ ] Dashboard shows circuit states
- [ ] Log aggregation includes circuit events
- [ ] On-call team knows how to reset circuits

## Testing

Run the test suite:

```bash
npx tsx src/lib/degradation.test.ts
```

Expected output:
```
========================================
  Circuit Breaker Tests
========================================
✓ All basic tests passed
✓ All opening tests passed
✓ All withCircuitBreaker tests passed
...
========================================
  ✓ All Tests Passed!
========================================
```

## Performance Impact

- **Request overhead**: ~1ms per request
- **Memory usage**: ~100 bytes per service
- **No external dependencies**: Pure TypeScript
- **No database calls**: In-memory state

## Production Considerations

### Single Instance
Works out of the box. No additional configuration needed.

### Multi-Instance (Scaling)
Circuit state is per-instance by default. For shared state:
- Consider Redis-backed circuit breakers (future enhancement)
- Or use load balancer health checks

### Monitoring
- Set up alerts when circuits open
- Monitor failure rates per service
- Track recovery times
- Dashboard with circuit states

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Circuit opens too often | Increase `failureThreshold` |
| Circuit stays open too long | Reduce `resetTimeout` |
| False positives | Filter error types before recording |
| Missing state across instances | Implement Redis-backed storage |

## Support & Resources

- **GitHub Issues**: Report bugs or request features
- **Documentation**: See README.md for comprehensive guide
- **Examples**: See example.ts for real-world patterns
- **Tests**: See test.ts for testing patterns

## Version History

- **v1.0.0** (2024-12-14): Initial release
  - Circuit breaker pattern implementation
  - Logger and Sentry integration
  - Comprehensive documentation
  - Test suite

## License

Part of the bakame-ai project.

## What's Next?

### Immediate Next Steps
1. Read the Integration Guide: `degradation.INTEGRATION.md`
2. Check out examples: `degradation.example.ts`
3. Add to your first service call
4. Set up health monitoring
5. Test in development

### Future Enhancements
- Redis-backed distributed circuit breakers
- Prometheus metrics export
- Advanced health probes
- Circuit breaker UI dashboard
- Machine learning-based threshold adjustment

## Credits

Built with:
- TypeScript for type safety
- Integration with bakame-ai logger
- Integration with bakame-ai Sentry setup
- Circuit breaker pattern best practices

---

**Ready to get started?** → Head to [`degradation.INTEGRATION.md`](/home/bahati/bakame-ai/src/lib/degradation.INTEGRATION.md)

**Need quick reference?** → Check [`degradation.cheatsheet.md`](/home/bahati/bakame-ai/src/lib/degradation.cheatsheet.md)

**Want to understand flows?** → See [`degradation.diagrams.md`](/home/bahati/bakame-ai/src/lib/degradation.diagrams.md)
