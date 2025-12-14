# Sentry Functions Cheat Sheet

Quick reference for all available Sentry functions.

## Import

```typescript
import {
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  setTag,
  setTags,
  setExtra,
  withScope,
  isSentryEnabled,
  Sentry,
} from '@/lib/sentry';
```

## Functions

### captureException(error, context?)

Capture an exception with optional context.

```typescript
captureException(error);

captureException(error, {
  tags: { operation: 'checkout' },
  extra: { amount: 99.99 },
  level: 'error',
});
```

**Parameters:**
- `error` - Error object
- `context` - Optional context object
  - `tags` - Key-value pairs for filtering
  - `extra` - Additional debug data
  - `level` - Severity: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
  - `fingerprint` - Custom grouping
  - `contexts` - Additional context

**Returns:** Event ID (string) or null

---

### captureMessage(message, level?, context?)

Capture a message with optional level and context.

```typescript
captureMessage('User completed onboarding', 'info');

captureMessage('Payment failed', 'error', {
  tags: { provider: 'stripe' },
  extra: { amount: 99.99 },
});
```

**Parameters:**
- `message` - Message string
- `level` - Optional severity level (default: 'info')
- `context` - Optional context object (same as captureException)

**Returns:** Event ID (string) or null

---

### setUser(user)

Set user context for error tracking.

```typescript
// After login
setUser({
  id: 'user-123',
  email: 'user@example.com',
  username: 'johndoe',
  // Custom fields
  subscription: 'premium',
});

// After logout
setUser(null);
```

**Parameters:**
- `user` - User object or null
  - `id` - User ID
  - `email` - Email
  - `username` - Username
  - `ip_address` - IP address
  - Any custom fields

**Returns:** void

---

### addBreadcrumb(breadcrumb)

Add a breadcrumb for tracking user actions.

```typescript
addBreadcrumb({
  message: 'User navigated to settings',
  category: 'navigation',
  level: 'info',
});

addBreadcrumb({
  message: 'API call to /api/chat',
  category: 'api',
  data: { method: 'POST', status: 200 },
});
```

**Parameters:**
- `breadcrumb` - Breadcrumb object
  - `message` - Breadcrumb message
  - `category` - Category (e.g., 'navigation', 'api', 'user-action')
  - `level` - Severity level
  - `type` - Type (e.g., 'http', 'navigation')
  - `data` - Additional data
  - `timestamp` - Unix timestamp

**Returns:** void

---

### setTag(key, value)

Set a tag for filtering errors.

```typescript
setTag('payment-provider', 'stripe');
setTag('environment', 'production');
```

**Parameters:**
- `key` - Tag key (string)
- `value` - Tag value (string | number | boolean)

**Returns:** void

---

### setTags(tags)

Set multiple tags at once.

```typescript
setTags({
  'payment-provider': 'stripe',
  'subscription-tier': 'premium',
  'ab-test-variant': 'B',
});
```

**Parameters:**
- `tags` - Object with key-value pairs

**Returns:** void

---

### setExtra(key, value)

Set extra context data.

```typescript
setExtra('api-response-time', 150);
setExtra('database-query', 'SELECT * FROM users');
setExtra('user-preferences', { theme: 'dark' });
```

**Parameters:**
- `key` - Context key (string)
- `value` - Context value (any, will be filtered for sensitive data)

**Returns:** void

---

### withScope(callback)

Create a new scope for isolated error tracking.

```typescript
withScope((scope) => {
  scope.setTag('section', 'payment');
  scope.setLevel('warning');
  scope.setExtra('amount', 99.99);

  try {
    processPayment();
  } catch (error) {
    captureException(error);
  }
});
```

**Parameters:**
- `callback` - Function that receives a scope object
  - `scope.setTag(key, value)` - Set tag in scope
  - `scope.setTags(tags)` - Set multiple tags in scope
  - `scope.setExtra(key, value)` - Set extra data in scope
  - `scope.setUser(user)` - Set user in scope
  - `scope.setLevel(level)` - Set level in scope
  - `scope.addBreadcrumb(breadcrumb)` - Add breadcrumb in scope

**Returns:** void

---

### isSentryEnabled

Boolean indicating if Sentry is installed and configured.

```typescript
if (isSentryEnabled) {
  // Sentry is available
  const debugData = computeExpensiveDebugData();
  setExtra('debug-data', debugData);
}
```

**Type:** boolean

---

### Sentry

Raw Sentry SDK (null if not installed).

```typescript
if (Sentry) {
  // Use advanced Sentry features
  Sentry.startTransaction({ name: 'checkout' });
}
```

**Type:** any | null

---

## Common Patterns

### API Route Error Handling

```typescript
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

    return Response.json({ error: 'Error' }, { status: 500 });
  }
}
```

### Client Component Error Handling

```typescript
'use client';
import { captureException, addBreadcrumb } from '@/lib/sentry';

export function MyComponent() {
  const handleClick = async () => {
    try {
      addBreadcrumb({ message: 'Button clicked', category: 'ui' });
      await performAction();
    } catch (error) {
      captureException(error, { tags: { component: 'MyComponent' } });
    }
  };

  return <button onClick={handleClick}>Click</button>;
}
```

### Authentication Flow

```typescript
import { setUser, captureMessage } from '@/lib/sentry';

// After login
async function handleLogin(email: string, password: string) {
  try {
    const user = await signIn(email, password);
    setUser({ id: user.id, email: user.email });
    captureMessage('User logged in', 'info');
    return user;
  } catch (error) {
    captureException(error, { tags: { event: 'login-failure' } });
    throw error;
  }
}

// After logout
function handleLogout() {
  captureMessage('User logged out', 'info');
  setUser(null);
  signOut();
}
```

### Scoped Error Tracking

```typescript
withScope((scope) => {
  scope.setTag('operation', 'payment');
  scope.setExtra('amount', 99.99);

  try {
    processPayment();
  } catch (error) {
    captureException(error); // Includes scope context
  }
});
```

---

## Severity Levels

| Level | Usage |
|-------|-------|
| `fatal` | Application crashes, critical failures |
| `error` | Errors that need fixing |
| `warning` | Potential issues, degraded functionality |
| `log` | General logging |
| `info` | Informational messages |
| `debug` | Debug information |

---

## See Also

- [SENTRY.md](../../SENTRY.md) - Full documentation
- [SENTRY_QUICKSTART.md](../../SENTRY_QUICKSTART.md) - Quick start guide
- [sentry.example.ts](./sentry.example.ts) - Comprehensive examples
