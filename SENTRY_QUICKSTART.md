# Sentry Quick Start Guide

Get up and running with Sentry error tracking in 5 minutes.

## Option 1: With Sentry (Recommended for Production)

### Step 1: Install Sentry

```bash
npm install @sentry/nextjs
# or
yarn add @sentry/nextjs
# or
pnpm add @sentry/nextjs
```

### Step 2: Get Your DSN

1. Go to [https://sentry.io/](https://sentry.io/)
2. Create a new project (or use an existing one)
3. Copy your DSN (looks like: `https://xxx@sentry.io/xxx`)

### Step 3: Add DSN to Environment

Add to your `.env.local`:

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

### Step 4: Restart Your Dev Server

```bash
npm run dev
```

That's it! Sentry is now tracking errors.

## Option 2: Without Sentry (Development)

No setup needed! The integration automatically falls back to console logging.

Just use the Sentry functions anywhere in your code:

```typescript
import { captureException } from '@/lib/sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error); // Logs to console if Sentry not configured
}
```

## Quick Usage Examples

### 1. Track Errors

```typescript
import { captureException } from '@/lib/sentry';

try {
  await fetch('/api/data');
} catch (error) {
  captureException(error, {
    tags: { operation: 'fetch-data' },
    extra: { endpoint: '/api/data' },
  });
}
```

### 2. Log Messages

```typescript
import { captureMessage } from '@/lib/sentry';

captureMessage('User completed checkout', 'info', {
  tags: { flow: 'checkout' },
  extra: { total: 99.99 },
});
```

### 3. Set User Context (After Login)

```typescript
import { setUser } from '@/lib/sentry';

setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});
```

### 4. Track User Actions

```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb({
  message: 'User clicked checkout button',
  category: 'user-action',
  data: { cartTotal: 99.99 },
});
```

## Verify It's Working

### With Sentry Installed

1. Trigger an error in your app
2. Check your Sentry dashboard
3. You should see the error with full context

### Without Sentry Installed

1. Trigger an error in your app
2. Check your browser console (or server logs)
3. You should see the error logged with context

## Next Steps

- Read the full documentation: [SENTRY.md](./SENTRY.md)
- See examples: [src/lib/sentry.example.ts](./src/lib/sentry.example.ts)
- Run tests: [src/lib/sentry.test.ts](./src/lib/sentry.test.ts)

## Troubleshooting

**Errors not showing in Sentry?**
- Check `SENTRY_DSN` is set in `.env.local`
- Verify `@sentry/nextjs` is installed
- Restart your dev server

**Too many events?**
- Adjust sample rates in `sentry.client.config.ts`
- Lower `tracesSampleRate` and `replaysSessionSampleRate`

**Need help?**
- See [SENTRY.md](./SENTRY.md) for full documentation
- Check [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
