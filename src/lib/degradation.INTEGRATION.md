# Graceful Degradation - Integration Guide

This guide shows you how to integrate the circuit breaker module into your bakame-ai application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration with Existing Services](#integration-with-existing-services)
3. [API Routes Integration](#api-routes-integration)
4. [Middleware Setup](#middleware-setup)
5. [Health Monitoring](#health-monitoring)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)

---

## Quick Start

### 1. Import the Module

```typescript
import {
  withCircuitBreaker,
  getSystemHealth,
  isCircuitOpen,
} from '@/lib/degradation';
```

### 2. Wrap Your First Service Call

```typescript
// Before
const response = await openai.chat.completions.create({...});

// After
const response = await withCircuitBreaker(
  'openai',
  async () => await openai.chat.completions.create({...}),
  { error: 'AI service temporarily unavailable' }
);
```

### 3. Add Health Check Endpoint

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

Done! Your application now has basic circuit breaker protection.

---

## Integration with Existing Services

### OpenAI Integration

**Location**: `/home/bahati/bakame-ai/src/lib/openai.ts` (if exists)

```typescript
import { withCircuitBreaker } from '@/lib/degradation';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateResponse(prompt: string) {
  return await withCircuitBreaker(
    'openai',
    async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0].message.content;
    },
    'I apologize, but the AI service is temporarily unavailable. Please try again in a moment.'
  );
}
```

### Supabase Integration

**Location**: `/home/bahati/bakame-ai/src/lib/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { withCircuitBreaker } from '@/lib/degradation';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Wrapper for database queries
export async function queryWithCircuitBreaker<T>(
  tableName: string,
  queryFn: (supabase: any) => Promise<T>,
  fallback: T
): Promise<T> {
  return await withCircuitBreaker(
    'supabase',
    async () => {
      const result = await queryFn(supabase);
      return result;
    },
    fallback
  );
}

// Example usage
export async function getUser(userId: string) {
  return await queryWithCircuitBreaker(
    'users',
    async (db) => {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    null
  );
}
```

### Redis Integration

**Location**: `/home/bahati/bakame-ai/src/lib/redis/client.ts`

```typescript
import { Redis } from 'ioredis';
import { recordSuccess, recordFailure, isCircuitOpen } from '@/lib/degradation';

const redis = new Redis(process.env.REDIS_URL);

// Graceful cache operations
export async function getCached<T>(key: string): Promise<T | null> {
  // Cache is non-critical, skip if circuit is open
  if (isCircuitOpen('redis')) {
    console.log('Redis circuit open, skipping cache');
    return null;
  }

  try {
    const value = await redis.get(key);
    recordSuccess('redis');
    return value ? JSON.parse(value) : null;
  } catch (error) {
    recordFailure('redis', error as Error);
    return null; // Fail gracefully
  }
}

export async function setCached(key: string, value: any, ttl: number = 3600): Promise<void> {
  if (isCircuitOpen('redis')) return;

  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    recordSuccess('redis');
  } catch (error) {
    recordFailure('redis', error as Error);
    // Don't throw, caching is non-critical
  }
}
```

### External API Integration (Weather Example)

**Location**: `/home/bahati/bakame-ai/src/lib/weather.ts`

```typescript
import { withCircuitBreaker } from '@/lib/degradation';

export async function getWeather(location: string) {
  return await withCircuitBreaker(
    'weather',
    async () => {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`,
        { signal: AbortSignal.timeout(5000) } // 5s timeout
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        location: data.location.name,
        temperature: data.current.temp_c,
        conditions: data.current.condition.text,
        icon: data.current.condition.icon,
      };
    },
    {
      error: 'Weather information is temporarily unavailable',
      location,
      temperature: null,
      conditions: 'unknown',
      icon: null,
    }
  );
}
```

---

## API Routes Integration

### Next.js App Router

**Example**: `/home/bahati/bakame-ai/app/api/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withCircuitBreaker, isCircuitOpen } from '@/lib/degradation';
import { generateResponse } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    // Pre-check critical services
    if (isCircuitOpen('openai')) {
      return NextResponse.json(
        { error: 'AI service is currently unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }

    // Process request
    const response = await generateResponse(message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
```

### Express.js Routes

**Example**: Express route handler

```typescript
import express from 'express';
import { withCircuitBreaker, isCircuitOpen } from '@/lib/degradation';

const app = express();

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  // Check if service is available
  if (isCircuitOpen('openai')) {
    return res.status(503).json({
      error: 'AI service temporarily unavailable',
      retryAfter: 30
    });
  }

  try {
    const response = await withCircuitBreaker(
      'openai',
      async () => await generateAIResponse(message),
      { error: 'AI service error' }
    );

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Middleware Setup

### Next.js Middleware

**File**: `/home/bahati/bakame-ai/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSystemHealth } from '@/lib/degradation';

export function middleware(request: NextRequest) {
  // Check system health for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const health = getSystemHealth();

    // If all critical services are down, return 503
    const criticalServices = ['openai', 'supabase'];
    const criticalDown = criticalServices.every(
      service => health.services[service]?.healthy === false
    );

    if (criticalDown) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'We are experiencing technical difficulties. Please try again later.',
          unavailableServices: health.openCircuits,
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### Express.js Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { isCircuitOpen } from '@/lib/degradation';

// Middleware to check specific services
export function requireServices(...services: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const unavailable = services.filter(service => isCircuitOpen(service));

    if (unavailable.length > 0) {
      return res.status(503).json({
        error: 'Required services unavailable',
        unavailableServices: unavailable,
      });
    }

    next();
  };
}

// Usage
app.use('/api/ai', requireServices('openai'));
app.use('/api/users', requireServices('supabase'));
```

---

## Health Monitoring

### Health Check Endpoint

**File**: `/home/bahati/bakame-ai/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import {
  getSystemHealth,
  getServiceStats,
  getAllServiceStatuses,
} from '@/lib/degradation';

export async function GET() {
  const health = getSystemHealth();

  // Add detailed stats
  const detailed = {
    status: health.healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {} as Record<string, any>,
    summary: {
      total: Object.keys(health.services).length,
      healthy: Object.values(health.services).filter(s => s.healthy).length,
      degraded: health.openCircuits.length,
    },
  };

  // Add stats for each service
  for (const [service, status] of Object.entries(health.services)) {
    detailed.services[service] = {
      ...status,
      stats: getServiceStats(service),
    };
  }

  return NextResponse.json(detailed, {
    status: health.healthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
```

### Monitoring Dashboard Endpoint

**File**: `/home/bahati/bakame-ai/app/api/admin/circuits/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getAllServiceStatuses, getServiceStats } from '@/lib/degradation';

export async function GET() {
  const statuses = getAllServiceStatuses();

  const dashboard = Object.entries(statuses).map(([service, status]) => {
    const stats = getServiceStats(service);
    return {
      service,
      state: status.state,
      health: status.state === 'CLOSED' ? 'healthy' : 'degraded',
      metrics: {
        totalRequests: stats.totalRequests,
        failureRate: `${stats.failureRate}%`,
        uptime: formatUptime(stats.uptime),
        lastFailure: stats.lastFailure || 'Never',
      },
      counters: {
        currentFailures: status.failureCount,
        currentSuccesses: status.successCount,
        totalFailures: status.totalFailures,
        totalSuccesses: status.totalSuccesses,
      },
    };
  });

  return NextResponse.json(dashboard);
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
```

### Periodic Health Reports

**File**: `/home/bahati/bakame-ai/src/lib/monitoring.ts`

```typescript
import { getSystemHealth, getServiceStats } from '@/lib/degradation';
import { logger } from '@/lib/logger';
import { captureMessage } from '@/lib/sentry';

export function startHealthMonitoring(intervalMs: number = 5 * 60 * 1000) {
  setInterval(() => {
    const health = getSystemHealth();

    // Log health status
    if (!health.healthy) {
      logger.warn('System health degraded', {
        openCircuits: health.openCircuits,
        serviceCount: Object.keys(health.services).length,
      });

      // Alert via Sentry
      captureMessage(
        `Service degradation detected: ${health.openCircuits.join(', ')}`,
        'warning',
        {
          tags: { monitoring: 'health-check' },
          extra: {
            openCircuits: health.openCircuits,
            services: health.services,
          },
        }
      );
    } else {
      logger.info('System health check passed', {
        serviceCount: Object.keys(health.services).length,
      });
    }

    // Log high failure rates
    for (const [service, status] of Object.entries(health.services)) {
      const stats = getServiceStats(service);
      if (stats.failureRate > 10 && stats.totalRequests > 10) {
        logger.warn('High failure rate detected', {
          service,
          failureRate: stats.failureRate,
          totalRequests: stats.totalRequests,
        });
      }
    }
  }, intervalMs);

  logger.info('Health monitoring started', { intervalMs });
}
```

---

## Error Handling

### Global Error Handler

```typescript
import { recordFailure } from '@/lib/degradation';
import { captureException } from '@/lib/sentry';

export function handleServiceError(
  service: string,
  error: Error,
  context?: Record<string, any>
) {
  // Record circuit breaker failure
  recordFailure(service, error);

  // Log error
  console.error(`[${service}] Error:`, error.message, context);

  // Report to Sentry
  captureException(error, {
    tags: { service },
    extra: context,
  });
}
```

### Error Boundary for React Components

```typescript
import { Component, ReactNode } from 'react';
import { captureException } from '@/lib/sentry';
import { recordFailure } from '@/lib/degradation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  service?: string;
}

interface State {
  hasError: boolean;
}

export class CircuitBreakerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    if (this.props.service) {
      recordFailure(this.props.service, error);
    }
    captureException(error, {
      extra: { errorInfo },
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }

    return this.props.children;
  }
}
```

---

## Testing

### Unit Tests

**File**: `/home/bahati/bakame-ai/src/__tests__/degradation.test.ts`

```typescript
import {
  withCircuitBreaker,
  recordFailure,
  recordSuccess,
  getServiceStatus,
  clearAllCircuitBreakers,
  circuitBreakerConfig,
} from '@/lib/degradation';

describe('Circuit Breaker', () => {
  beforeEach(() => {
    clearAllCircuitBreakers();
  });

  it('should start in CLOSED state', () => {
    const status = getServiceStatus('test-service');
    expect(status.state).toBe('CLOSED');
  });

  it('should open after failure threshold', () => {
    for (let i = 0; i < circuitBreakerConfig.failureThreshold; i++) {
      recordFailure('test-service', new Error('Test failure'));
    }

    const status = getServiceStatus('test-service');
    expect(status.state).toBe('OPEN');
  });

  it('should return fallback when open', async () => {
    // Open the circuit
    for (let i = 0; i < circuitBreakerConfig.failureThreshold; i++) {
      recordFailure('test-service', new Error('Test failure'));
    }

    const result = await withCircuitBreaker(
      'test-service',
      async () => 'actual-value',
      'fallback-value'
    );

    expect(result).toBe('fallback-value');
  });
});
```

### Integration Tests

```typescript
import { withCircuitBreaker } from '@/lib/degradation';
import { generateResponse } from '@/lib/openai';

describe('OpenAI with Circuit Breaker', () => {
  it('should handle OpenAI failures gracefully', async () => {
    const response = await withCircuitBreaker(
      'openai',
      async () => await generateResponse('Hello'),
      { error: 'Service unavailable' }
    );

    expect(response).toBeDefined();
  });
});
```

---

## Production Deployment

### Environment Variables

No additional environment variables required. The circuit breaker uses the existing logger and Sentry configuration.

### Initialization on Startup

**File**: `/home/bahati/bakame-ai/app/layout.tsx` or entry point

```typescript
import { startHealthMonitoring } from '@/lib/monitoring';

// In server component or API initialization
if (typeof window === 'undefined') {
  // Server-side only
  startHealthMonitoring(5 * 60 * 1000); // Every 5 minutes
}
```

### Monitoring Setup

1. **Add health check to uptime monitor**:
   - URL: `https://your-app.com/api/health`
   - Expected status: 200
   - Alert on: 503

2. **Configure alerts in Sentry**:
   - Alert on: "Circuit breaker OPENED"
   - Severity: Warning

3. **Dashboard metrics** (if using Grafana/Datadog):
   - Circuit breaker states
   - Failure rates per service
   - Request counts

### Performance Considerations

- Circuit breakers add ~1ms overhead per request
- Memory usage: ~100 bytes per service
- No database or external dependencies

### Scaling Considerations

For multi-instance deployments, consider:

1. **Shared state via Redis**:
```typescript
// Future enhancement: store circuit state in Redis
// This allows all instances to share circuit breaker state
```

2. **Health check aggregation**:
```typescript
// Aggregate health from all instances
GET /api/health/aggregate
```

---

## Next Steps

1. ✅ Integrate with OpenAI calls
2. ✅ Add health check endpoint
3. ✅ Set up monitoring
4. ⏭️ Test in staging environment
5. ⏭️ Deploy to production
6. ⏭️ Monitor and adjust thresholds as needed

## Support

- Documentation: `/home/bahati/bakame-ai/src/lib/degradation.README.md`
- Examples: `/home/bahati/bakame-ai/src/lib/degradation.example.ts`
- Quick Reference: `/home/bahati/bakame-ai/src/lib/degradation.cheatsheet.md`
- Visual Diagrams: `/home/bahati/bakame-ai/src/lib/degradation.diagrams.md`
