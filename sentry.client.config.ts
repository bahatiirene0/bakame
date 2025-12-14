/**
 * Sentry Client-Side Configuration
 *
 * This file configures Sentry for client-side (browser) error tracking.
 * It's automatically loaded by Next.js when the application starts in the browser.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize if DSN is configured
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance monitoring - 20% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Session Replay - capture 10% of sessions, 100% on errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Debug in development
    debug: process.env.NODE_ENV === 'development',

    // Filter noisy errors
    ignoreErrors: [
      'AbortError',
      'Network request failed',
      'Failed to fetch',
      /^chrome-extension:\/\//,
    ],
  });
}
