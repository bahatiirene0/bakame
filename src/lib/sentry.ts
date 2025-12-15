/**
 * Sentry Error Tracking Integration
 *
 * Provides error tracking with graceful fallback when SENTRY_DSN is not configured.
 * All functions are safe to call regardless of Sentry configuration.
 *
 * @module lib/sentry
 */

import * as Sentry from '@sentry/nextjs';

// ===========================================
// Types
// ===========================================

export type SentryLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

export interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
  [key: string]: unknown;
}

export interface SentryBreadcrumb {
  message?: string;
  category?: string;
  level?: SentryLevel;
  type?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
}

export interface SentryContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
  level?: SentryLevel;
  fingerprint?: string[];
  // Allow additional properties for tool-specific context
  [key: string]: unknown;
}

// ===========================================
// Configuration Check
// ===========================================

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === 'development';
const sentryEnabled = !!SENTRY_DSN;

// ===========================================
// Helper Functions
// ===========================================

/**
 * Capture an exception and send to Sentry
 */
export function captureException(
  error: Error | unknown,
  context?: SentryContext
): string {
  if (!sentryEnabled) {
    if (isDev) {
      console.error('[Error]', error);
    }
    return `local-${Date.now()}`;
  }

  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level,
    fingerprint: context?.fingerprint,
  });
}

/**
 * Capture a message and send to Sentry
 */
export function captureMessage(
  message: string,
  levelOrContext?: SentryLevel | SentryContext,
  context?: SentryContext
): string {
  const level = typeof levelOrContext === 'string' ? levelOrContext : 'info';
  const ctx = typeof levelOrContext === 'object' ? levelOrContext : context;

  if (!sentryEnabled) {
    if (isDev) {
      console.log(`[${level}]`, message);
    }
    return `local-${Date.now()}`;
  }

  return Sentry.captureMessage(message, {
    level: level as Sentry.SeverityLevel,
    tags: ctx?.tags,
    extra: ctx?.extra,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: SentryUser | null): void {
  if (!sentryEnabled) return;
  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for tracking user actions
 */
export function addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
  if (!sentryEnabled) return;
  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category,
    level: breadcrumb.level as Sentry.SeverityLevel,
    type: breadcrumb.type,
    data: breadcrumb.data,
    timestamp: breadcrumb.timestamp,
  });
}

/**
 * Set a tag on future events
 */
export function setTag(key: string, value: string | number | boolean): void {
  if (!sentryEnabled) return;
  Sentry.setTag(key, String(value));
}

/**
 * Set multiple tags
 */
export function setTags(tags: Record<string, string | number | boolean>): void {
  if (!sentryEnabled) return;
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, String(value));
  });
}

/**
 * Set extra context data
 */
export function setExtra(key: string, value: unknown): void {
  if (!sentryEnabled) return;
  Sentry.setExtra(key, value);
}

/**
 * Execute callback with isolated scope
 */
export function withScope(callback: (scope: Sentry.Scope) => void): void {
  if (!sentryEnabled) {
    // Create mock scope for fallback
    const mockScope = {
      setTag: () => mockScope,
      setTags: () => mockScope,
      setExtra: () => mockScope,
      setExtras: () => mockScope,
      setUser: () => mockScope,
      setLevel: () => mockScope,
      setFingerprint: () => mockScope,
      setContext: () => mockScope,
      addBreadcrumb: () => mockScope,
      clear: () => mockScope,
    } as unknown as Sentry.Scope;
    callback(mockScope);
    return;
  }
  Sentry.withScope(callback);
}

/**
 * Check if Sentry is properly configured
 */
export function isSentryAvailable(): boolean {
  return sentryEnabled;
}

/** Alias for isSentryAvailable for backwards compatibility */
export const isSentryEnabled = isSentryAvailable;
