/**
 * Sentry Server-Side Configuration
 *
 * This file configures Sentry for server-side (Node.js) error tracking.
 * It's automatically loaded by Next.js when the application starts on the server.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

// Only initialize if DSN is configured
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance monitoring - 10% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Debug in development
    debug: process.env.NODE_ENV === 'development',
  });
}
