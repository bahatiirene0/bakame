# Sentry Error Tracking Integration

This document explains how to set up and use Sentry error tracking in the Bakame AI project.

## Overview

Sentry is integrated into the project with a **graceful fallback** approach:

- ✅ Works with or without `@sentry/nextjs` installed
- ✅ Automatically falls back to console logging if Sentry is not configured
- ✅ Safe to use anywhere in the codebase without breaking the app
- ✅ Filters sensitive data (passwords, tokens, API keys) automatically
- ✅ Configurable sample rates for performance monitoring

## Installation

### Option 1: With Sentry (Recommended for Production)

1. Install the Sentry Next.js SDK:

```bash
npm install @sentry/nextjs
# or
yarn add @sentry/nextjs
# or
pnpm add @sentry/nextjs
```

2. Run the Sentry wizard to get your DSN:

```bash
npx @sentry/wizard@latest -i nextjs
```

3. Add your Sentry DSN to `.env.local`:

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

4. The configuration files are already created:
   - `/src/lib/sentry.ts` - Core Sentry wrapper
   - `/sentry.client.config.ts` - Client-side configuration
   - `/sentry.server.config.ts` - Server-side configuration
   - `/src/app/global-error.tsx` - Global error handler

### Option 2: Without Sentry (Development)

No installation needed! The integration automatically falls back to console logging:

- Errors are logged to the console
- Messages are logged with appropriate levels (error, warn, info)
- User context and breadcrumbs are logged in development mode
- All functions work normally - no breaking changes

## Configuration

### Environment Variables

Add to your `.env.local`:

```bash
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id

# Optional: Override environment
NODE_ENV=production # or development

# Optional: Set app URL for source maps
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### Sample Rates

The integration comes with sensible defaults:

**Client-side** (`sentry.client.config.ts`):
- Traces Sample Rate: 20% in production, 100% in development
- Session Replay: 10% of sessions, 100% of error sessions
- Performance monitoring enabled

**Server-side** (`sentry.server.config.ts`):
- Traces Sample Rate: 10% in production, 100% in development
- No session replay (not applicable)
- Performance monitoring enabled

You can adjust these in the respective config files.

## Usage

### Basic Error Tracking

```typescript
import { captureException } from '@/lib/sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error);
}
```

### Error with Context

```typescript
import { captureException } from '@/lib/sentry';

try {
  await fetch('/api/data');
} catch (error) {
  captureException(error, {
    tags: {
      operation: 'data-fetch',
      endpoint: '/api/data',
    },
    extra: {
      timestamp: new Date().toISOString(),
      userId: user.id,
    },
    level: 'error',
  });
}
```

### Message Logging

```typescript
import { captureMessage } from '@/lib/sentry';

// Info message
captureMessage('User completed onboarding', 'info', {
  tags: { flow: 'onboarding' },
  extra: { step: 5 },
});

// Warning message
captureMessage('API rate limit approaching', 'warning', {
  tags: { api: 'openai' },
});

// Error message
captureMessage('Failed to sync data', 'error');
```

### User Context

```typescript
import { setUser } from '@/lib/sentry';

// After login
setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// After logout
setUser(null);
```

### Breadcrumbs (User Actions)

```typescript
import { addBreadcrumb } from '@/lib/sentry';

// Track navigation
addBreadcrumb({
  message: 'User navigated to settings',
  category: 'navigation',
  level: 'info',
});

// Track user actions
addBreadcrumb({
  message: 'User clicked export button',
  category: 'user-action',
  level: 'info',
  data: { format: 'csv' },
});
```

### Tags and Extra Data

```typescript
import { setTag, setTags, setExtra } from '@/lib/sentry';

// Single tag
setTag('payment-provider', 'stripe');

// Multiple tags
setTags({
  'subscription-tier': 'premium',
  'feature-flag': 'enabled',
});

// Extra contextual data
setExtra('api-response-time', 150);
setExtra('cache-hit-rate', 0.85);
```

### Scoped Error Tracking

```typescript
import { withScope, captureException } from '@/lib/sentry';

withScope((scope) => {
  scope.setTag('section', 'payment');
  scope.setLevel('warning');

  try {
    processPayment();
  } catch (error) {
    captureException(error);
  }
});
```

## API Route Example

```typescript
import { captureException, addBreadcrumb } from '@/lib/sentry';

export async function POST(request: Request) {
  try {
    addBreadcrumb({
      message: 'API request received',
      category: 'api',
      data: { method: 'POST', url: request.url },
    });

    const data = await processRequest(request);
    return Response.json(data);
  } catch (error) {
    captureException(error, {
      tags: { route: '/api/chat' },
      extra: { url: request.url },
    });

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## React Component Example

```typescript
'use client';

import { captureException, addBreadcrumb } from '@/lib/sentry';

export function MyComponent() {
  const handleSubmit = async () => {
    try {
      addBreadcrumb({
        message: 'Form submission started',
        category: 'user-action',
      });

      await submitForm();
    } catch (error) {
      captureException(error, {
        tags: { component: 'MyComponent' },
      });

      // Show error to user
      alert('Something went wrong');
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

## Global Error Handler

The global error handler (`/src/app/global-error.tsx`) automatically catches and reports all unhandled errors:

- Captures errors to Sentry with `fatal` level
- Shows user-friendly error UI
- Displays error details in development mode
- Provides recovery options (try again, go home)

## Sensitive Data Filtering

The integration automatically filters sensitive data:

**Filtered patterns:**
- `password`, `token`, `secret`, `api_key`
- `auth`, `credential`, `bearer`, `session`
- `cookie`, `ssn`, `credit_card`, `cvv`

**Example:**
```typescript
captureException(error, {
  extra: {
    password: '12345',      // Will be [REDACTED]
    api_key: 'secret',      // Will be [REDACTED]
    username: 'john',       // Will be preserved
  },
});
```

## Checking if Sentry is Enabled

```typescript
import { isSentryEnabled } from '@/lib/sentry';

if (isSentryEnabled) {
  // Sentry is installed and configured
  const debugData = computeExpensiveDebugData();
  setExtra('debug-data', debugData);
}
```

## Development vs Production

**Development:**
- All events are captured (100% sample rate)
- Console fallback is used if Sentry is not configured
- Debug mode enabled
- Breadcrumbs logged to console

**Production:**
- Lower sample rates to reduce costs
- Sensitive data automatically filtered
- Only critical errors and a sample of traces are sent
- User-friendly error messages

## Troubleshooting

### Sentry is not capturing errors

1. Check if `SENTRY_DSN` is set in `.env.local`
2. Verify `@sentry/nextjs` is installed: `npm list @sentry/nextjs`
3. Check the console for initialization messages
4. Ensure you're calling `captureException()` in try/catch blocks

### Errors are logged to console but not Sentry

This is expected behavior when:
- `SENTRY_DSN` is not configured
- `@sentry/nextjs` is not installed
- Running in development without Sentry setup

The integration gracefully falls back to console logging.

### Too many events being sent to Sentry

Adjust sample rates in `sentry.client.config.ts` and `sentry.server.config.ts`:

```typescript
tracesSampleRate: 0.1, // 10% of traces
replaysSessionSampleRate: 0.05, // 5% of sessions
```

## Best Practices

1. **Always use try/catch** - Don't rely solely on the global error handler
2. **Add context** - Include tags and extra data to make debugging easier
3. **Set user context** - After login, set user info with `setUser()`
4. **Use breadcrumbs** - Track user actions leading up to errors
5. **Filter sensitive data** - The integration does this automatically, but be cautious
6. **Use appropriate levels** - `fatal` for crashes, `error` for errors, `warning` for warnings, `info` for info
7. **Test in development** - Errors will be logged to console even without Sentry

## More Examples

See `/src/lib/sentry.example.ts` for comprehensive usage examples.

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Error Tracking](https://docs.sentry.io/product/sentry-basics/concepts/tracing/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Session Replay](https://docs.sentry.io/product/session-replay/)
