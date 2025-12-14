# Rate Limiting Quick Start Guide

## Installation

The rate limiting system is ready to use! It's already integrated with Upstash Redis.

## Basic Usage

### 1. Import the rate limiter

```typescript
import { checkRateLimit } from '@/lib/redis';
```

### 2. Check rate limit in your API route

```typescript
// In your Next.js API route
export async function POST(req: NextRequest) {
  // Get user identifier
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const session = await getServerSession();
  const userId = session?.user?.id || ip;
  const isAuth = !!session?.user;

  // Check rate limit
  const rateLimit = await checkRateLimit('chat', userId, isAuth);

  // Block if rate limited
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Continue with your logic...
}
```

## Rate Limits

| Endpoint | User Type    | Limit        |
|----------|--------------|--------------|
| Chat     | Authenticated| 100/min      |
| Chat     | Guest        | 30/min       |
| Upload   | Authenticated| 10/min       |
| Upload   | Guest        | 5/min        |

## Environment Setup

Add to your `.env` file:

```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

If not set, the system uses in-memory storage (development only).

## Response Format

```typescript
{
  allowed: boolean,      // Can the request proceed?
  remaining: number,     // Requests left in window
  resetTime: number,     // Timestamp when limit resets
  retryAfter?: number    // Seconds to wait (if rate limited)
}
```

## Common Patterns

### Add rate limit headers

```typescript
return NextResponse.json(data, {
  headers: {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.resetTime),
  }
});
```

### Check without consuming

```typescript
import { getRateLimitStatus } from '@/lib/redis';

const status = await getRateLimitStatus('chat', userId, isAuth);
// Shows remaining count without incrementing
```

### Reset for testing

```typescript
import { resetRateLimit } from '@/lib/redis';

await resetRateLimit('chat', userId);
```

## Testing

Run the demo to see it in action:

```bash
NODE_ENV=production npx tsx src/lib/redis/demo.ts
```

## Production Checklist

- [ ] Set `UPSTASH_REDIS_REST_URL` in production
- [ ] Set `UPSTASH_REDIS_REST_TOKEN` in production
- [ ] Add rate limit headers to API responses
- [ ] Handle 429 errors in frontend
- [ ] Monitor rate limit logs

## Files Created

```
src/lib/redis/
├── client.ts          # Redis client (Upstash)
├── rateLimit.ts       # Main rate limiter ⭐
├── index.ts           # Exports
├── example.ts         # Usage examples
├── demo.ts            # Interactive demo
├── README.md          # Full documentation
└── QUICKSTART.md      # This file
```

## Need Help?

- See `README.md` for detailed documentation
- Check `example.ts` for more usage patterns
- Run `demo.ts` to see it in action
