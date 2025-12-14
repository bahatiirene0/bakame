# Redis Rate Limiting System

Production-ready rate limiting system for the bakame-ai project using Redis (Upstash) with sliding window algorithm.

## Features

- **Sliding Window Algorithm**: Accurate rate limiting using Redis sorted sets
- **Dual User Types**: Different limits for authenticated vs guest users
- **Endpoint-Specific Limits**: Separate limits for chat and upload APIs
- **Graceful Fallback**: Automatically falls back to allowing requests if Redis is unavailable
- **In-Memory Fallback**: Uses in-memory storage when Upstash credentials are not configured
- **Production-Ready**: Comprehensive error handling and logging

## Rate Limits

### Chat API
- **Authenticated Users**: 100 requests per minute
- **Guest Users**: 30 requests per minute

### Upload API
- **Authenticated Users**: 10 requests per minute
- **Guest Users**: 5 requests per minute

## Setup

### 1. Install Dependencies

```bash
npm install @upstash/redis
```

### 2. Configure Environment Variables

Add your Upstash Redis credentials to `.env`:

```env
UPSTASH_REDIS_REST_URL=your_upstash_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
```

If these are not set, the system will use an in-memory fallback (suitable for development).

### 3. Import and Use

```typescript
import { checkRateLimit } from '@/lib/redis';

// In your API route
const result = await checkRateLimit('chat', userIpAddress, isAuthenticated);

if (!result.allowed) {
  return new Response('Rate limit exceeded', {
    status: 429,
    headers: {
      'X-RateLimit-Limit': String(result.resetTime),
      'X-RateLimit-Remaining': String(result.remaining),
      'Retry-After': String(result.retryAfter),
    },
  });
}
```

## API Reference

### `checkRateLimit(endpoint, identifier, isAuthenticated)`

Check if a request should be allowed based on rate limiting.

**Parameters:**
- `endpoint`: `'chat' | 'upload'` - The API endpoint being rate limited
- `identifier`: `string` - Unique identifier (IP address, user ID, etc.)
- `isAuthenticated`: `boolean` - Whether the user is authenticated

**Returns:** `Promise<RateLimitResult>`

```typescript
interface RateLimitResult {
  allowed: boolean;        // Whether the request is allowed
  remaining: number;       // Number of requests remaining
  resetTime: number;       // Unix timestamp (ms) when limit resets
  retryAfter?: number;     // Seconds to wait (only when allowed=false)
}
```

**Example:**

```typescript
const result = await checkRateLimit('chat', '192.168.1.1', true);
console.log(result);
// {
//   allowed: true,
//   remaining: 95,
//   resetTime: 1702594860000
// }
```

### `getRateLimitStatus(endpoint, identifier, isAuthenticated)`

Get current rate limit status without incrementing the counter.

**Parameters:** Same as `checkRateLimit()`

**Returns:** `Promise<RateLimitResult>`

**Example:**

```typescript
// Check status without consuming a request
const status = await getRateLimitStatus('upload', userId, true);
console.log(`You have ${status.remaining} requests remaining`);
```

### `resetRateLimit(endpoint, identifier)`

Reset rate limit for a specific identifier (useful for testing/admin).

**Parameters:**
- `endpoint`: `'chat' | 'upload'` - The API endpoint
- `identifier`: `string` - Unique identifier to reset

**Returns:** `Promise<void>`

**Example:**

```typescript
// Reset rate limit for a user
await resetRateLimit('chat', userId);
```

## Usage in Next.js API Routes

### Example: Chat API with Rate Limiting

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/redis';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  // Get user identifier (IP or user ID)
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const session = await getServerSession();
  const identifier = session?.user?.id || ip;
  const isAuthenticated = !!session?.user;

  // Check rate limit
  const rateLimit = await checkRateLimit('chat', identifier, isAuthenticated);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: rateLimit.retryAfter
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(isAuthenticated ? 100 : 30),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetTime),
          'Retry-After': String(rateLimit.retryAfter || 60),
        },
      }
    );
  }

  // Process chat request
  const body = await req.json();
  // ... your chat logic here

  return NextResponse.json(
    { message: 'Success' },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetTime),
      },
    }
  );
}
```

### Example: Upload API with Rate Limiting

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const session = await getServerSession();
  const identifier = session?.user?.id || ip;
  const isAuthenticated = !!session?.user;

  // Check upload rate limit
  const rateLimit = await checkRateLimit('upload', identifier, isAuthenticated);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Upload rate limit exceeded. Please try again later.',
        retryAfter: rateLimit.retryAfter
      },
      { status: 429 }
    );
  }

  // Process upload
  // ... your upload logic here

  return NextResponse.json({ success: true });
}
```

## Middleware Integration

You can also use rate limiting in Next.js middleware:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/redis';

export async function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  // Determine endpoint type from URL
  const isChatApi = req.nextUrl.pathname.startsWith('/api/chat');
  const isUploadApi = req.nextUrl.pathname.startsWith('/api/upload');

  if (isChatApi || isUploadApi) {
    const endpoint = isChatApi ? 'chat' : 'upload';
    const rateLimit = await checkRateLimit(endpoint, ip, false);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
          }
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/chat/:path*', '/api/upload/:path*'],
};
```

## Development Mode

Rate limiting is automatically disabled in development mode (`NODE_ENV=development`). All requests are allowed with a remaining count of 999.

## Error Handling

The rate limiter follows a "fail-open" strategy:
- If Redis is unavailable, requests are allowed
- Errors are logged but don't block requests
- This ensures high availability

## Algorithm: Sliding Window

The implementation uses Redis sorted sets to implement a sliding window algorithm:

1. Each request is stored with its timestamp as the score
2. Old requests outside the time window are automatically removed
3. Current request count is checked against the limit
4. The oldest request timestamp determines when the limit resets

This provides more accurate rate limiting compared to fixed windows, preventing burst traffic at window boundaries.

## Testing

```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/redis';

// Test rate limiting
async function testRateLimit() {
  const identifier = 'test-user';

  // Make multiple requests
  for (let i = 0; i < 5; i++) {
    const result = await checkRateLimit('chat', identifier, false);
    console.log(`Request ${i + 1}:`, result);
  }

  // Reset for next test
  await resetRateLimit('chat', identifier);
}
```

## Production Checklist

- [ ] Configure Upstash Redis credentials
- [ ] Set appropriate rate limits for your use case
- [ ] Add rate limit headers to API responses
- [ ] Implement frontend handling for 429 responses
- [ ] Monitor rate limit metrics in production
- [ ] Consider user feedback when adjusting limits
