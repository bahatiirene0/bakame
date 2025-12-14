# Health Check API Endpoints

Production-ready health monitoring endpoints for the Bakame AI application.

## Endpoints

### 1. Full Health Check: `GET /api/health`

Comprehensive health check that tests connectivity to all critical services.

#### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "healthy",
      "latency": 45
    },
    "redis": {
      "status": "healthy",
      "latency": 12
    },
    "openai": {
      "status": "healthy",
      "latency": 200
    }
  }
}
```

#### Status Values

- **healthy**: All services operational
- **degraded**: Some services down or slow (partial functionality)
- **unhealthy**: Critical services unavailable

#### HTTP Status Codes

- **200**: All services healthy
- **207**: Multi-Status (some services degraded)
- **503**: Service Unavailable (critical services down)

#### Service Checks

1. **Database (Supabase)**
   - Tests connection with lightweight query
   - Timeout: 5 seconds
   - Critical service

2. **Redis (Upstash)**
   - Tests read/write operations
   - Timeout: 5 seconds
   - Optional (only checked if configured)
   - Falls back to in-memory storage if not configured

3. **OpenAI API**
   - Verifies API key validity
   - Lists available models
   - Timeout: 5 seconds
   - Critical service

#### Example Requests

```bash
# Basic health check
curl http://localhost:3000/api/health

# With formatted output
curl http://localhost:3000/api/health | jq

# Check only HTTP status
curl -I http://localhost:3000/api/health
```

---

### 2. Liveness Probe: `GET /api/health/live`

Simple endpoint that returns 200 OK if the application process is running.

#### Response Format

```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 3600
}
```

#### Characteristics

- **Fast**: Returns immediately with no external service checks
- **Lightweight**: Minimal CPU and memory overhead
- **Always 200**: Only returns non-200 if process is dead
- **Use Case**: Kubernetes/Docker liveness probes

#### Example Requests

```bash
# Basic liveness check
curl http://localhost:3000/api/health/live

# Use in Kubernetes
# See deployment example below
```

---

## Integration Examples

### Kubernetes Liveness & Readiness Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bakame-ai
spec:
  template:
    spec:
      containers:
      - name: app
        image: bakame-ai:latest
        ports:
        - containerPort: 3000

        # Liveness probe - restart if unhealthy
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe - remove from load balancer if unhealthy
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 10
          successThreshold: 1
          failureThreshold: 3
```

### Docker Compose Health Check

```yaml
version: '3.8'
services:
  app:
    image: bakame-ai:latest
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Monitoring with Uptime Kuma

```yaml
# Add a new monitor in Uptime Kuma
Name: Bakame AI - Health Check
Monitor Type: HTTP(s)
URL: https://your-domain.com/api/health
Method: GET
Expected Status Code: 200
Interval: 60 seconds
Retries: 3
```

### Load Balancer Health Checks

#### AWS Application Load Balancer (ALB)

```terraform
resource "aws_lb_target_group" "bakame_ai" {
  name     = "bakame-ai-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    path                = "/api/health"
    protocol            = "HTTP"
    matcher             = "200,207"  # Accept healthy or degraded
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}
```

#### Google Cloud Load Balancer

```yaml
healthCheck:
  checkIntervalSec: 30
  timeoutSec: 5
  healthyThreshold: 2
  unhealthyThreshold: 3
  type: HTTP
  httpHealthCheck:
    port: 3000
    requestPath: /api/health
```

---

## Monitoring & Alerting

### Prometheus Metrics (Future Enhancement)

```yaml
# Example metrics to expose
bakame_health_check_duration_seconds{service="database"}
bakame_health_check_duration_seconds{service="redis"}
bakame_health_check_duration_seconds{service="openai"}
bakame_health_check_status{service="database"} # 1=healthy, 0.5=degraded, 0=unhealthy
```

### Alert Examples

```yaml
# Alert when service is unhealthy
- alert: BakameUnhealthy
  expr: bakame_health_check_status < 1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Bakame AI service unhealthy"
    description: "{{ $labels.service }} has been unhealthy for 2 minutes"

# Alert when response time is high
- alert: BakameSlowHealthCheck
  expr: bakame_health_check_duration_seconds > 3
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Bakame AI health check slow"
    description: "{{ $labels.service }} health check taking > 3s"
```

---

## Development & Testing

### Local Testing

```bash
# Start the development server
npm run dev

# Test full health check
curl http://localhost:3000/api/health | jq

# Test liveness probe
curl http://localhost:3000/api/health/live | jq

# Test with various Redis configurations
# 1. With Redis configured (healthy)
UPSTASH_REDIS_REST_URL=your-url npm run dev

# 2. Without Redis (degraded, uses in-memory fallback)
unset UPSTASH_REDIS_REST_URL
npm run dev
```

### Expected Responses

#### All Services Healthy (200)
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 3600,
  "services": {
    "database": { "status": "healthy", "latency": 45 },
    "redis": { "status": "healthy", "latency": 12 },
    "openai": { "status": "healthy", "latency": 200 }
  }
}
```

#### Degraded - Redis Using Fallback (207)
```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 3600,
  "services": {
    "database": { "status": "healthy", "latency": 45 },
    "redis": {
      "status": "degraded",
      "latency": 2,
      "error": "Using in-memory fallback"
    },
    "openai": { "status": "healthy", "latency": 200 }
  }
}
```

#### Unhealthy - Database Down (503)
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "unhealthy",
      "latency": 0,
      "error": "Connection timeout"
    },
    "openai": { "status": "healthy", "latency": 200 }
  }
}
```

---

## Implementation Details

### Timeout Protection

All service checks have a 5-second timeout to prevent hanging:

```typescript
const SERVICE_TIMEOUT_MS = 5000;

// Each check is wrapped with timeout
const result = await withTimeout(checkDatabase(), SERVICE_TIMEOUT_MS);
```

### Parallel Execution

Service checks run in parallel for faster response times:

```typescript
const [databaseHealth, redisHealth, openaiHealth] = await Promise.all([
  withTimeout(checkDatabase(), SERVICE_TIMEOUT_MS),
  withTimeout(checkRedis(), SERVICE_TIMEOUT_MS),
  withTimeout(checkOpenAI(), SERVICE_TIMEOUT_MS),
]);
```

### Logging

All health check events are logged using the structured logger:

```typescript
import { logger } from '@/lib/logger';

logger.info('Health check: Starting service checks');
logger.debug('Health check: Database OK', { latency });
logger.error('Health check: Database failed', { error: errorMessage });
```

### Conditional Checks

Services are only checked if configured:

```typescript
import { hasRedis } from '@/lib/env';

// Redis check only runs if configured
if (!hasRedis) {
  return undefined; // Skip check
}
```

---

## Troubleshooting

### Common Issues

#### 1. Health check returns 503 immediately

**Cause**: Environment variables not configured

**Solution**: Check `.env` file has required variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
OPENAI_API_KEY=your-key
```

#### 2. Database check fails with "auth session missing"

**Cause**: Health check uses direct Supabase client (bypasses auth)

**Solution**: This is expected behavior. Health check doesn't require authentication.

#### 3. Redis shows "degraded" in production

**Cause**: Using in-memory fallback instead of real Redis

**Solution**: Configure Upstash Redis credentials:
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

#### 4. OpenAI check fails with 401

**Cause**: Invalid or expired API key

**Solution**: Verify API key in OpenAI dashboard and update `.env`

#### 5. Health check times out

**Cause**: One or more services not responding within 5 seconds

**Solution**: Check network connectivity and service status. If services are slow, consider increasing timeout (not recommended for production).

---

## Security Considerations

### What's Safe to Expose

✅ **Safe to expose publicly:**
- `/api/health/live` - No sensitive information
- `/api/health` - Service status only (no credentials or internal details)

❌ **Don't expose:**
- Database connection strings
- API keys
- Internal IP addresses
- Detailed error messages with stack traces

### Current Implementation

The health check endpoints:
- ✅ Don't require authentication (public endpoints)
- ✅ Don't expose credentials or secrets
- ✅ Return only high-level status information
- ✅ Use generic error messages
- ✅ Log detailed errors server-side only

---

## Future Enhancements

### Planned Features

1. **Prometheus Metrics Export** (`/api/health/metrics`)
   - Expose metrics in Prometheus format
   - Track response times, error rates, uptime

2. **Startup Probe** (`/api/health/startup`)
   - Separate endpoint for Kubernetes startup probes
   - Allows longer initialization time

3. **Detailed Service Info** (`/api/health/detailed`)
   - Authenticated endpoint with more details
   - Database connection pool stats
   - Redis memory usage
   - OpenAI rate limit status

4. **Custom Health Checks**
   - Plugin system for additional checks
   - N8N workflow connectivity
   - File system health
   - Memory usage monitoring

5. **Health Check History**
   - Store last N health check results
   - Expose via `/api/health/history`
   - Useful for debugging intermittent issues

---

## Related Documentation

- [Logger Implementation](../../../LOGGER_IMPLEMENTATION.md)
- [Environment Variables](../../../.env.example)
- [System Overview](../../../SYSTEM_OVERVIEW.md)
- [Supabase Client](../../../lib/supabase/README.md) (if exists)
- [Redis Client](../../../lib/redis/README.md) (if exists)

---

## Support

For issues or questions about the health check endpoints:
1. Check logs with `npm run dev` and review console output
2. Verify all environment variables are set correctly
3. Test individual services (database, Redis, OpenAI) separately
4. Review this documentation for troubleshooting steps

---

**Last Updated**: 2024-12-14
**API Version**: 0.1.0
**Maintained By**: Bakame AI Team
