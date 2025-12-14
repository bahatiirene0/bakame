# Circuit Breaker - Visual Diagrams

## State Machine Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Circuit Breaker States                      │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────┐
                            │          │
                       ┌────│  CLOSED  │────┐
                       │    │ (Healthy)│    │
                       │    └──────────┘    │
                       │                    │
                       │ Success            │ 5 Failures
                       │                    │
                       │                    ▼
                       │              ┌──────────┐
                       │              │   OPEN   │
                       │              │ (Failed) │
                       │              └──────────┘
                       │                    │
                       │                    │ Wait 30s
                       │                    │
                       │                    ▼
                       │              ┌──────────┐
                       │              │ HALF_OPEN│◄────┐
                       └─────────────▶│ (Testing)│     │
                          3 Successes └──────────┘     │
                                           │           │
                                           │ 1 Failure │
                                           └───────────┘
```

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  Request Processing Flow                         │
└─────────────────────────────────────────────────────────────────┘

  Client Request
       │
       ▼
  ┌─────────────────┐
  │ Check Circuit   │
  │ State           │
  └────────┬────────┘
           │
     ┌─────┴─────┐
     │           │
  OPEN         CLOSED
     │           │
     │           ▼
     │     ┌──────────────┐
     │     │  Execute     │
     │     │  Operation   │
     │     └──────┬───────┘
     │            │
     │      ┌─────┴─────┐
     │      │           │
     │   Success     Failure
     │      │           │
     │      ▼           ▼
     │  ┌────────┐  ┌────────┐
     │  │ Record │  │ Record │
     │  │Success │  │Failure │
     │  └───┬────┘  └───┬────┘
     │      │           │
     │      ▼           ▼
     │  ┌────────┐  ┌────────┐
     │  │ Return │  │ Return │
     │  │ Result │  │Fallback│
     │  └────────┘  └────────┘
     │
     ▼
  ┌──────────┐
  │  Return  │
  │ Fallback │
  │(Immediate)│
  └──────────┘
```

## Timeline Example

```
┌─────────────────────────────────────────────────────────────────┐
│              Circuit Breaker Timeline Example                    │
└─────────────────────────────────────────────────────────────────┘

Time    │ Requests │ Circuit State │ Result
────────┼──────────┼───────────────┼──────────────────────
00:00   │    ✓     │    CLOSED     │ Success
00:05   │    ✓     │    CLOSED     │ Success
00:10   │    ✗     │    CLOSED     │ Fail (count: 1)
00:15   │    ✗     │    CLOSED     │ Fail (count: 2)
00:20   │    ✗     │    CLOSED     │ Fail (count: 3)
00:25   │    ✗     │    CLOSED     │ Fail (count: 4)
00:30   │    ✗     │ CLOSED→OPEN   │ Fail (count: 5)
00:35   │    -     │     OPEN      │ Fallback (no request)
00:40   │    -     │     OPEN      │ Fallback (no request)
01:00   │    -     │     OPEN      │ Fallback (30s not elapsed)
01:05   │    ✓     │ OPEN→HALF_OPEN│ Test request (success: 1)
01:10   │    ✓     │   HALF_OPEN   │ Test request (success: 2)
01:15   │    ✓     │HALF_OPEN→CLOSE│ Test request (success: 3)
01:20   │    ✓     │    CLOSED     │ Success (normal operation)
```

## Multi-Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Application Architecture                        │
└─────────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │   Client     │
                        │  Request     │
                        └──────┬───────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  API Route Handler   │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
  ┌──────────┐          ┌──────────┐          ┌──────────┐
  │ Circuit  │          │ Circuit  │          │ Circuit  │
  │ Breaker  │          │ Breaker  │          │ Breaker  │
  │ (OpenAI) │          │(Supabase)│          │ (Redis)  │
  └────┬─────┘          └────┬─────┘          └────┬─────┘
       │                     │                     │
       │ CLOSED              │ CLOSED              │ OPEN
       │                     │                     │
       ▼                     ▼                     ▼
  ┌──────────┐          ┌──────────┐          ┌──────────┐
  │  OpenAI  │          │ Supabase │          │  SKIP    │
  │   API    │          │ Database │          │ (Fallback)│
  └──────────┘          └──────────┘          └──────────┘
       │                     │                     │
       └─────────────────────┴─────────────────────┘
                             │
                             ▼
                     ┌──────────────┐
                     │   Combine    │
                     │   Results    │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Response   │
                     │  to Client   │
                     └──────────────┘
```

## Service Health Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    Service Health Status                         │
└─────────────────────────────────────────────────────────────────┘

Service     State      Requests  Failures  Rate    Uptime
──────────────────────────────────────────────────────────────────
OpenAI      ● CLOSED      1,234        15   1.2%   4h 32m
Supabase    ● CLOSED      5,678        23   0.4%   4h 32m
Redis       ⚠ OPEN          567       567  100%      45s
Weather     ◐ HALF_OPEN     123        12   9.8%      12s
N8N         ● CLOSED        234         3   1.3%   4h 32m

Legend:
  ● CLOSED     = Healthy, operating normally
  ⚠ OPEN       = Service down, using fallbacks
  ◐ HALF_OPEN  = Testing recovery

Overall System Status: ⚠ DEGRADED (1 service down)
```

## Failure Cascade Prevention

```
┌─────────────────────────────────────────────────────────────────┐
│             Without Circuit Breaker (Bad)                        │
└─────────────────────────────────────────────────────────────────┘

Request 1 → Wait 30s → Timeout → Error
Request 2 → Wait 30s → Timeout → Error
Request 3 → Wait 30s → Timeout → Error
Request 4 → Wait 30s → Timeout → Error
   ...
All resources exhausted, system crashes!


┌─────────────────────────────────────────────────────────────────┐
│              With Circuit Breaker (Good)                         │
└─────────────────────────────────────────────────────────────────┘

Request 1 → Wait 30s → Timeout → Error → Count: 1
Request 2 → Wait 30s → Timeout → Error → Count: 2
Request 3 → Wait 30s → Timeout → Error → Count: 3
Request 4 → Wait 30s → Timeout → Error → Count: 4
Request 5 → Wait 30s → Timeout → Error → Count: 5 → OPEN
Request 6 → Fallback (immediate) → Success ✓
Request 7 → Fallback (immediate) → Success ✓
Request 8 → Fallback (immediate) → Success ✓
   ...
System continues operating with degraded functionality!
```

## Graceful Degradation Levels

```
┌─────────────────────────────────────────────────────────────────┐
│                 Degradation Strategy Levels                      │
└─────────────────────────────────────────────────────────────────┘

         User Request: "Get Weather Forecast"
                         │
                         ▼
    ┌────────────────────────────────────────┐
    │ Level 1: AI-Enhanced Weather Report    │
    │ Circuit: OpenAI + Weather API          │
    └──────────────┬─────────────────────────┘
                   │
                   │ OpenAI Down
                   ▼
    ┌────────────────────────────────────────┐
    │ Level 2: Basic Weather Report          │
    │ Circuit: Weather API Only              │
    └──────────────┬─────────────────────────┘
                   │
                   │ Weather API Down
                   ▼
    ┌────────────────────────────────────────┐
    │ Level 3: Cached Weather Data           │
    │ Circuit: Redis Cache                   │
    └──────────────┬─────────────────────────┘
                   │
                   │ Cache Down/Empty
                   ▼
    ┌────────────────────────────────────────┐
    │ Level 4: Generic Error Message         │
    │ "Weather service temporarily unavail." │
    └────────────────────────────────────────┘
```

## Monitoring & Alerting Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Monitoring & Alerting Pipeline                      │
└─────────────────────────────────────────────────────────────────┘

Circuit Breaker Events
         │
         ├─────────────┬─────────────┬─────────────┐
         │             │             │             │
         ▼             ▼             ▼             ▼
    ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
    │ Logger │   │ Sentry │   │Metrics │   │ Health │
    │  Logs  │   │ Errors │   │ Export │   │Endpoint│
    └────────┘   └────────┘   └────────┘   └────────┘
         │             │             │             │
         ▼             ▼             ▼             ▼
    ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
    │Datadog │   │  Slack │   │Grafana │   │Uptime  │
    │  Logs  │   │ Alert  │   │Dashboard   │Monitor │
    └────────┘   └────────┘   └────────┘   └────────┘
         │             │             │             │
         └─────────────┴─────────────┴─────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  On-Call     │
                  │   Engineer   │
                  └──────────────┘
```

## Request Success Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                Pattern: Retry with Backoff                       │
└─────────────────────────────────────────────────────────────────┘

Attempt 1 ───✗───▶ Wait 1s
Attempt 2 ───✗───▶ Wait 2s
Attempt 3 ───✗───▶ Wait 4s
Attempt 4 ───✗───▶ Circuit Opens
Fallback  ───✓───▶ Return to user


┌─────────────────────────────────────────────────────────────────┐
│            Pattern: Fallback Chain (Cascade)                     │
└─────────────────────────────────────────────────────────────────┘

Primary Service (AI)
        │
        ✗ Circuit Open
        ▼
Secondary Service (Cache)
        │
        ✗ Circuit Open
        ▼
Tertiary Service (Database)
        │
        ✓ Success
        ▼
Return Result


┌─────────────────────────────────────────────────────────────────┐
│           Pattern: Parallel Services (Best Effort)               │
└─────────────────────────────────────────────────────────────────┘

         Request
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
  Svc A   Svc B   Svc C
 (CLOSED) (OPEN) (CLOSED)
    │       │       │
    ✓       ✗       ✓
    │   Fallback    │
    └───────┼───────┘
            │
      Combine Results
            │
            ▼
         Response
```

## Real-World Scenario

```
┌─────────────────────────────────────────────────────────────────┐
│      Scenario: OpenAI API Outage (11:00 - 11:15 AM)            │
└─────────────────────────────────────────────────────────────────┘

11:00:00  ✓✓✓✓✓  CLOSED    Normal operation, all requests succeed
11:00:30  ✗      CLOSED    First timeout (OpenAI down)
11:01:00  ✗      CLOSED    Second timeout
11:01:30  ✗      CLOSED    Third timeout
11:02:00  ✗      CLOSED    Fourth timeout
11:02:30  ✗      OPEN      Fifth timeout → Circuit opens!
          ─────────────────────────────────────────────────────
11:03:00  ▢▢▢    OPEN      50 requests → All get instant fallback
11:04:00  ▢▢▢    OPEN      40 requests → All get instant fallback
          ...               (System remains responsive!)
11:05:00  ▢▢▢    OPEN      35 requests → All get instant fallback
          ─────────────────────────────────────────────────────
11:05:30         HALF_OPEN 30s reset timeout elapsed
11:05:31  ✓      HALF_OPEN Test request succeeds (1/3)
11:05:32  ✓      HALF_OPEN Test request succeeds (2/3)
11:05:33  ✓      CLOSED    Test request succeeds (3/3) → Close!
11:06:00  ✓✓✓✓✓  CLOSED    Normal operation resumed

Impact Summary:
  - Outage duration: 15 minutes
  - Circuit open time: 3 minutes
  - Failed requests: 5 (during detection)
  - Fallback responses: ~125 (instant)
  - Recovery time: 3 seconds
  - System downtime: 0% (degraded mode worked)
```

## Memory Footprint

```
┌─────────────────────────────────────────────────────────────────┐
│              Circuit Breaker Memory Usage                        │
└─────────────────────────────────────────────────────────────────┘

Per Circuit Breaker:
┌────────────────────────────────────────────────────────────┐
│ Field              Type      Size      Value               │
├────────────────────────────────────────────────────────────┤
│ name               string    ~20 B     "openai"            │
│ state              string    ~8 B      "CLOSED"            │
│ failureCount       number    8 B       0                   │
│ lastFailureTime    number    8 B       1702555200000       │
│ successCount       number    8 B       0                   │
│ lastStateChange    number    8 B       1702555200000       │
│ totalRequests      number    8 B       1234                │
│ totalFailures      number    8 B       15                  │
│ totalSuccesses     number    8 B       1219                │
└────────────────────────────────────────────────────────────┘
Total per breaker: ~100 bytes

For 10 services: ~1 KB
For 100 services: ~10 KB
For 1000 services: ~100 KB

Conclusion: Minimal memory overhead!
```

## Configuration Tuning Guide

```
┌─────────────────────────────────────────────────────────────────┐
│              Configuration Tuning Matrix                         │
└─────────────────────────────────────────────────────────────────┘

Service Type        │ Failure    │ Success    │ Reset
                    │ Threshold  │ Threshold  │ Timeout
────────────────────┼────────────┼────────────┼──────────
Critical API        │     3      │     3      │   20s
(OpenAI, Auth)      │ (Fail fast)│(Test quick)│ (Quick)
────────────────────┼────────────┼────────────┼──────────
Database            │     5      │     3      │   30s
(Supabase, Postgres)│ (Standard) │(Standard)  │(Standard)
────────────────────┼────────────┼────────────┼──────────
Cache               │    10      │     2      │   5s
(Redis, Memcached)  │(Tolerant)  │(Fast close)│(Very fast)
────────────────────┼────────────┼────────────┼──────────
External API        │     3      │     5      │   60s
(Weather, Maps)     │(Fail fast) │(Test longer)│(Patient)
────────────────────┼────────────┼────────────┼──────────
Internal Service    │     5      │     3      │   15s
(Microservices)     │(Standard)  │(Standard)  │(Quick)

Guidelines:
  - Critical services: Fail fast, recover fast
  - Caches: Very tolerant, very quick recovery
  - External APIs: Patient recovery (they might be slow to recover)
  - Databases: Balanced approach
```
