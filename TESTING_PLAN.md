# Bakame.ai Production Testing Plan

## Overview

This document provides a comprehensive testing plan to verify all production-ready features are working as expected. Follow each section systematically before deploying to production.

---

## Prerequisites

### 1. Environment Setup

Create/update your `.env.local` with these variables:

```bash
# ==========================================
# CORE (Required)
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key

# ==========================================
# REDIS (Required for Production)
# ==========================================
# Get from: https://console.upstash.com/
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# ==========================================
# MONITORING (Recommended)
# ==========================================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# ==========================================
# DATABASE POOLING (Recommended)
# ==========================================
# Get from: Supabase Dashboard > Settings > Database > Connection Pooling
SUPABASE_DB_POOLER_URL=postgres://postgres.xxx:password@pooler.supabase.com:6543/postgres

# ==========================================
# EXTERNAL APIS (Optional - for tools)
# ==========================================
OPENWEATHER_API_KEY=your-key
EXCHANGE_RATE_API_KEY=your-key
TAVILY_API_KEY=your-key
NEWS_API_KEY=your-key
```

### 2. Install Dependencies

```bash
cd /home/bahati/bakame-ai
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

---

## Test Sections

## Section 1: Health Check Endpoints

### Test 1.1: Liveness Probe
```bash
curl http://localhost:3000/api/health/live
```

**Expected Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ",
  "version": "0.1.0",
  "uptime": <number>
}
```

**Expected Status Code:** `200 OK`

### Test 1.2: Full Health Check
```bash
curl http://localhost:3000/api/health | jq
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "version": "0.1.0",
  "uptime": <number>,
  "services": {
    "database": { "status": "healthy", "latency": <ms> },
    "redis": { "status": "healthy", "latency": <ms> },
    "openai": { "status": "healthy", "latency": <ms> }
  }
}
```

**Expected Status Codes:**
- `200` - All services healthy
- `207` - Some services degraded
- `503` - Critical services unhealthy

### Test 1.3: Health Check Without Redis
Remove Redis env vars temporarily and restart:
```bash
curl http://localhost:3000/api/health | jq '.services.redis'
```

**Expected:** Redis status should be "unavailable" or "using_fallback", overall status "degraded"

---

## Section 2: Rate Limiting

### Test 2.1: Rate Limit Headers
```bash
curl -i http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"isGuest":true}'
```

**Check Headers:**
- `X-RateLimit-Limit: 30` (guest) or `100` (authenticated)
- `X-RateLimit-Remaining: <number>`
- `X-RateLimit-Reset: <ISO timestamp>`

### Test 2.2: Rate Limit Enforcement (Guest)
```bash
# Run this 35 times quickly
for i in {1..35}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/chat \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}],"isGuest":true}'
done
```

**Expected:** First 30 requests return `200`, subsequent requests return `429`

### Test 2.3: Rate Limit Response (429)
```bash
# After exceeding limit
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"isGuest":true}'
```

**Expected Response:**
```json
{
  "error": "Bakame rate limit exceeded. Please wait a minute.",
  "resetTime": "<ISO timestamp>",
  "remaining": 0
}
```

---

## Section 3: Security Headers (Middleware)

### Test 3.1: Security Headers on Homepage
```bash
curl -I http://localhost:3000 2>/dev/null | grep -E "X-Frame|X-Content|X-XSS|Referrer|Content-Security"
```

**Expected Headers:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: <policy>
```

### Test 3.2: CORS Preflight
```bash
curl -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -I 2>/dev/null | grep -i "access-control"
```

**Expected Headers:**
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Credentials: true
```

### Test 3.3: Request ID Header
```bash
curl -I http://localhost:3000/api/health 2>/dev/null | grep "X-Request-ID"
```

**Expected:** `X-Request-ID: <unique-id>`

---

## Section 4: Chat API Functionality

### Test 4.1: Basic Chat (Guest Mode)
```bash
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in one word"}],"isGuest":true}'
```

**Expected:** Streaming response with content chunks ending with `data: [DONE]`

### Test 4.2: Tool Invocation (Weather)
```bash
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the weather in Kigali?"}],"isGuest":true}'
```

**Expected:**
- Response includes `data: {"toolCall":"get_weather"}`
- Weather information in response

### Test 4.3: Error Response Format
```bash
# With invalid request
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
```json
{
  "error": "Messages array is required",
  "requestId": "<uuid>"
}
```

---

## Section 5: Caching

### Test 5.1: Cache Hit Detection
Make the same weather request twice:
```bash
# First request (cache miss)
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the weather in London?"}],"isGuest":true}'

# Second request (should be faster - cache hit)
time curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the weather in London?"}],"isGuest":true}'
```

**Expected:** Second request should be noticeably faster (cached weather data)

### Test 5.2: Check Server Logs for Cache
Check the server console output for:
```
[INFO] Cache hit for key: cache:tool:weather:...
```

---

## Section 6: Structured Logging

### Test 6.1: Log Format (Development)
Start dev server and make a request. Check console output.

**Expected Format (Dev):**
```
14:30:45.123 INFO  Chat request received
  requestId=abc-123
  userId=user-456
  ip=127.0.0.1
```

### Test 6.2: Log Format (Production)
```bash
NODE_ENV=production npm run dev
```

Make a request and check console output.

**Expected Format (Production):**
```json
{"timestamp":"2024-01-15T14:30:45.123Z","level":"info","message":"Chat request received","context":{"requestId":"abc-123","userId":"user-456"}}
```

---

## Section 7: Error Tracking (Sentry)

### Test 7.1: Verify Sentry Connection (if configured)
```bash
# Check if Sentry is initialized
grep -r "Sentry.init" /home/bahati/bakame-ai/sentry.*.config.ts
```

### Test 7.2: Trigger Test Error
Add this temporarily to test:
```typescript
// In any API route
import { captureException } from '@/lib/sentry';
captureException(new Error('Test error from Bakame'), { test: true });
```

**Expected:** Error appears in Sentry dashboard (if configured)

---

## Section 8: Database Connection

### Test 8.1: Database Health
```bash
curl http://localhost:3000/api/health | jq '.services.database'
```

**Expected:**
```json
{
  "status": "healthy",
  "latency": <ms less than 500>
}
```

### Test 8.2: Connection Pooler (if configured)
Check server logs for:
```
Using Supabase connection pooler
```

---

## Section 9: Graceful Degradation

### Test 9.1: Circuit Breaker Status
After running some requests, check circuit status by examining logs for:
```
[INFO] Circuit breaker state change: openai CLOSED -> HALF_OPEN
```

### Test 9.2: Simulate Service Failure
Temporarily use an invalid OpenAI API key:
```bash
OPENAI_API_KEY=invalid npm run dev
```

Make several requests and observe:
- Circuit opens after failures
- Fallback response is returned
- Circuit tests recovery after timeout

---

## Section 10: Admin Panel

### Test 10.1: Admin Access Control
```bash
# Without authentication
curl http://localhost:3000/admin
```

**Expected:** Redirect to login page

### Test 10.2: Dashboard Stats
1. Log in as admin user
2. Navigate to /admin
3. Verify dashboard shows:
   - Total users count
   - Total sessions count
   - Total messages count
   - Active today count
   - Charts and graphs

### Test 10.3: User Management
1. Navigate to /admin/users
2. Verify:
   - User list loads
   - Search works
   - Role filter works
   - Actions (suspend, delete) work

---

## Section 11: Authentication

### Test 11.1: Guest Mode
```bash
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"isGuest":true}'
```

**Expected:** Request succeeds with guest rate limits

### Test 11.2: Authenticated Mode
1. Log in through the UI
2. Open browser DevTools > Network
3. Send a chat message
4. Verify request includes auth cookies
5. Verify higher rate limits apply

---

## Section 12: Full Integration Test

### Test 12.1: Complete User Flow
1. Open http://localhost:3000 in browser
2. Start a new chat as guest
3. Send: "What's the weather in Paris?"
4. Verify weather card appears
5. Send: "Convert 100 USD to EUR"
6. Verify currency conversion works
7. Send: "Search for latest AI news"
8. Verify web search results appear
9. Create an account
10. Verify chat history persists
11. Log out and log back in
12. Verify history is restored

---

## Test Summary Checklist

Use this checklist to track test completion:

### Core Infrastructure
- [ ] Health check - liveness probe (200 OK)
- [ ] Health check - full check with all services
- [ ] Health check - degraded mode without Redis
- [ ] Rate limiting - headers present
- [ ] Rate limiting - guest limit (30/min)
- [ ] Rate limiting - 429 response format
- [ ] Security headers - all headers present
- [ ] CORS - preflight response
- [ ] Request ID - generated and returned

### API Functionality
- [ ] Chat - basic streaming works
- [ ] Chat - tool invocation works
- [ ] Chat - error responses include requestId
- [ ] Caching - subsequent requests faster
- [ ] Logging - correct format in dev
- [ ] Logging - JSON format in production

### Monitoring
- [ ] Sentry - initialized (if configured)
- [ ] Sentry - errors captured
- [ ] Circuit breaker - state changes logged
- [ ] Circuit breaker - fallback works

### Database
- [ ] Connection - health check passes
- [ ] Pooler - configured (check logs)
- [ ] Sessions - persist for authenticated users

### Admin Panel
- [ ] Access control - redirects unauthenticated
- [ ] Dashboard - stats load correctly
- [ ] Users - CRUD operations work

### Authentication
- [ ] Guest mode - works with rate limits
- [ ] Login - works correctly
- [ ] Session - persists across requests
- [ ] Logout - clears session

---

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```
Error: Redis connection failed
```
**Solution:** Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set correctly.

#### 2. Rate Limiting Not Working
```
Rate limit not enforced
```
**Solution:** Ensure you're running in production mode (`NODE_ENV=production`) or Redis is configured.

#### 3. Health Check Timeout
```
Service check timed out
```
**Solution:** Check network connectivity to external services. Verify API keys are valid.

#### 4. CORS Errors
```
Access-Control-Allow-Origin missing
```
**Solution:** Ensure `NEXT_PUBLIC_APP_URL` is set correctly.

#### 5. Sentry Not Capturing
```
Errors not appearing in Sentry
```
**Solution:** Verify `SENTRY_DSN` is set. Check Sentry dashboard for project status.

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Redis (Upstash) configured
- [ ] Sentry configured (recommended)
- [ ] Database pooler configured
- [ ] CORS origins set correctly
- [ ] Security headers verified
- [ ] Rate limits appropriate
- [ ] Monitoring alerts configured
- [ ] Error tracking verified
- [ ] Backup strategy in place

---

## Quick Test Script

Run all critical tests at once:

```bash
#!/bin/bash
# Save as test-all.sh and run: chmod +x test-all.sh && ./test-all.sh

BASE_URL=${1:-http://localhost:3000}

echo "Testing Bakame.ai at $BASE_URL"
echo "================================"

echo -n "1. Liveness probe: "
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health/live
echo ""

echo -n "2. Health check: "
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health
echo ""

echo -n "3. Security headers: "
curl -s -I $BASE_URL | grep -q "X-Frame-Options" && echo "PASS" || echo "FAIL"

echo -n "4. CORS preflight: "
curl -s -I -X OPTIONS $BASE_URL/api/health \
  -H "Origin: $BASE_URL" | grep -q "Access-Control-Allow" && echo "PASS" || echo "FAIL"

echo -n "5. Chat API: "
curl -s $BASE_URL/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"isGuest":true}' | grep -q "content" && echo "PASS" || echo "FAIL"

echo ""
echo "Testing complete!"
```

---

## Support

If tests fail or you need help:

1. Check the documentation in `/home/bahati/bakame-ai/docs/`
2. Review server logs for error details
3. Check the troubleshooting section above
4. Verify environment variables are set correctly

Happy testing!
