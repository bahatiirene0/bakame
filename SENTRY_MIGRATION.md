# Sentry Migration Guide

How to integrate Sentry error tracking into your existing Bakame AI codebase.

## Overview

This guide shows you how to add Sentry tracking to your existing code without breaking anything. The Sentry integration is designed to be:

- **Non-breaking** - Works with or without `@sentry/nextjs` installed
- **Gradual** - Add tracking incrementally, file by file
- **Safe** - Automatically filters sensitive data
- **Optional** - Falls back to console logging if not configured

## Step 1: Install Sentry (Optional)

```bash
npm install @sentry/nextjs
```

Add to `.env.local`:

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

**Note:** You can skip this step and still use all the Sentry functions - they'll log to console instead.

## Step 2: Update API Routes

### Before:

```typescript
export async function POST(request: Request) {
  try {
    const data = await processRequest(request);
    return Response.json(data);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### After:

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
      tags: { route: '/api/example', method: 'POST' },
      extra: { url: request.url },
    });

    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Step 3: Update Client Components

### Before:

```typescript
'use client';

export function MyComponent() {
  const handleClick = async () => {
    try {
      await submitForm();
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

### After:

```typescript
'use client';

import { captureException, addBreadcrumb } from '@/lib/sentry';

export function MyComponent() {
  const handleClick = async () => {
    try {
      addBreadcrumb({
        message: 'User clicked submit',
        category: 'user-action',
      });

      await submitForm();
    } catch (error) {
      captureException(error, {
        tags: { component: 'MyComponent' },
      });

      alert('Something went wrong');
    }
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

## Step 4: Update Authentication

### Login (Set User Context)

```typescript
import { setUser, captureMessage } from '@/lib/sentry';

async function handleLogin(email: string, password: string) {
  try {
    const user = await signIn(email, password);

    // Set user context for error tracking
    setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    captureMessage('User logged in', 'info', {
      tags: { event: 'login' },
    });

    return user;
  } catch (error) {
    captureException(error, {
      tags: { event: 'login-failure' },
      level: 'warning',
    });

    throw error;
  }
}
```

### Logout (Clear User Context)

```typescript
import { setUser, captureMessage } from '@/lib/sentry';

async function handleLogout() {
  captureMessage('User logged out', 'info', {
    tags: { event: 'logout' },
  });

  // Clear user context
  setUser(null);

  await signOut();
}
```

## Step 5: Add Breadcrumbs for Key Actions

Track important user actions to understand what happened before an error:

```typescript
import { addBreadcrumb } from '@/lib/sentry';

// Navigation
addBreadcrumb({
  message: 'User navigated to chat page',
  category: 'navigation',
  level: 'info',
});

// User actions
addBreadcrumb({
  message: 'User changed model to GPT-4',
  category: 'user-action',
  data: { from: 'gpt-3.5-turbo', to: 'gpt-4' },
});

// API calls
addBreadcrumb({
  message: 'API call to OpenAI',
  category: 'api',
  data: { model: 'gpt-4', tokens: 500 },
});

// State changes
addBreadcrumb({
  message: 'Chat history cleared',
  category: 'state',
  data: { messageCount: 10 },
});
```

## Step 6: Add Tags for Better Filtering

Use tags to filter and group errors in Sentry:

```typescript
import { setTag, setTags } from '@/lib/sentry';

// Feature flags
setTag('feature-new-ui', 'enabled');

// User properties
setTags({
  'subscription-tier': user.subscriptionTier,
  'user-role': user.role,
  'ab-test-variant': 'B',
});

// Environment info
setTag('deployment', process.env.VERCEL_ENV || 'local');
```

## Step 7: Use Scopes for Complex Scenarios

For operations with specific context, use scopes:

```typescript
import { withScope, captureException } from '@/lib/sentry';

async function processPayment(amount: number) {
  withScope((scope) => {
    scope.setTag('operation', 'payment');
    scope.setTag('provider', 'stripe');
    scope.setExtra('amount', amount);

    try {
      const result = await stripe.charge(amount);
      return result;
    } catch (error) {
      captureException(error);
      throw error;
    }
  });
}
```

## Common Patterns

### Pattern 1: Critical Operations

```typescript
import { captureException, setTag } from '@/lib/sentry';

async function criticalOperation() {
  setTag('critical', 'true');

  try {
    await performOperation();
  } catch (error) {
    captureException(error, {
      level: 'fatal',
      tags: { operation: 'critical' },
    });

    throw error;
  }
}
```

### Pattern 2: Retry Logic

```typescript
import { captureMessage, captureException } from '@/lib/sentry';

async function operationWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await performOperation();
    } catch (error) {
      if (attempt === maxRetries) {
        captureException(error, {
          tags: { retries: maxRetries },
          level: 'error',
        });

        throw error;
      }

      captureMessage(`Retry ${attempt}/${maxRetries} failed`, 'warning', {
        extra: { error: (error as Error).message },
      });
    }
  }
}
```

### Pattern 3: Background Jobs

```typescript
import { captureException, setTag, addBreadcrumb } from '@/lib/sentry';

async function backgroundJob() {
  setTag('job-type', 'cleanup');

  addBreadcrumb({
    message: 'Background job started',
    category: 'job',
  });

  try {
    await performCleanup();

    addBreadcrumb({
      message: 'Background job completed',
      category: 'job',
      level: 'info',
    });
  } catch (error) {
    captureException(error, {
      tags: { job: 'cleanup', scheduled: 'true' },
    });
  }
}
```

## What NOT to Do

### ❌ Don't wrap everything

```typescript
// BAD - Too granular, creates noise
try {
  const x = 1 + 1;
} catch (error) {
  captureException(error);
}
```

### ❌ Don't log sensitive data

```typescript
// BAD - Sensitive data in extra
captureException(error, {
  extra: {
    password: user.password, // Will be redacted automatically, but don't include it
    creditCard: user.creditCard,
  },
});
```

### ❌ Don't ignore the console fallback

```typescript
// BAD - Checking if Sentry is installed
if (process.env.SENTRY_DSN) {
  captureException(error); // Just call it - it will fallback gracefully
}

// GOOD
captureException(error); // Always works
```

## Gradual Migration Checklist

- [ ] Install `@sentry/nextjs` (optional)
- [ ] Add `SENTRY_DSN` to `.env.local` (optional)
- [ ] Update critical API routes first
- [ ] Add error tracking to authentication flows
- [ ] Update payment/critical business logic
- [ ] Add breadcrumbs to key user actions
- [ ] Update remaining API routes
- [ ] Update client components
- [ ] Add tags for better filtering
- [ ] Test error reporting in development
- [ ] Deploy to production

## Testing Your Integration

### Test 1: Trigger an Error

```typescript
import { captureException } from '@/lib/sentry';

// In a test endpoint or component
try {
  throw new Error('Test error');
} catch (error) {
  captureException(error, {
    tags: { test: 'true' },
  });
}
```

### Test 2: Check Console (No Sentry)

If Sentry is not installed/configured:
1. Trigger the error
2. Check browser console or server logs
3. You should see: `[Error] Error: Test error`

### Test 3: Check Sentry Dashboard (With Sentry)

If Sentry is installed and configured:
1. Trigger the error
2. Go to your Sentry dashboard
3. You should see the error with tags and context

## Need Help?

- Full documentation: [SENTRY.md](./SENTRY.md)
- Quick start: [SENTRY_QUICKSTART.md](./SENTRY_QUICKSTART.md)
- Examples: [src/lib/sentry.example.ts](./src/lib/sentry.example.ts)
- API route example: [src/app/api/example-with-sentry/route.ts](./src/app/api/example-with-sentry/route.ts)
