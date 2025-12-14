/**
 * Sentry Integration - Usage Examples
 *
 * This file demonstrates how to use the Sentry integration in various scenarios.
 * These examples work whether or not @sentry/nextjs is installed - the library
 * gracefully falls back to console logging if Sentry is not available.
 *
 * Note: This file contains example code and is not imported anywhere.
 * It's for documentation and reference purposes only.
 *
 * @module lib/sentry.example
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

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
} from './sentry';

// ===========================================
// Example 1: Basic Error Tracking
// ===========================================

/**
 * Simple error capture
 */
async function exampleBasicErrorCapture() {
  try {
    // Some risky operation
    throw new Error('Something went wrong');
  } catch (error) {
    // Capture the error - works with or without Sentry installed
    captureException(error);
  }
}

/**
 * Error capture with context
 */
async function exampleErrorWithContext() {
  try {
    await fetch('/api/data');
  } catch (error) {
    // Add tags and extra data for better error grouping and debugging
    captureException(error, {
      tags: {
        operation: 'data-fetch',
        endpoint: '/api/data',
      },
      extra: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
      level: 'error',
    });
  }
}

// ===========================================
// Example 2: Message Logging
// ===========================================

/**
 * Log informational messages
 */
function exampleMessageLogging() {
  // Info level message
  captureMessage('User completed onboarding', 'info', {
    tags: { flow: 'onboarding' },
    extra: { userId: '123', step: 5 },
  });

  // Warning level message
  captureMessage('API rate limit approaching', 'warning', {
    tags: { api: 'openai' },
    extra: { remainingRequests: 10 },
  });

  // Error level message
  captureMessage('Failed to sync data', 'error', {
    tags: { operation: 'sync' },
    extra: { retryAttempt: 3 },
  });
}

// ===========================================
// Example 3: User Context
// ===========================================

/**
 * Set user context after login
 */
function exampleSetUserContext(user: any) {
  setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    // Custom fields
    subscription: user.subscriptionTier,
    signupDate: user.createdAt,
  });
}

/**
 * Clear user context on logout
 */
function exampleClearUserContext() {
  setUser(null);
}

// ===========================================
// Example 4: Breadcrumbs
// ===========================================

/**
 * Track user actions with breadcrumbs
 * Breadcrumbs provide context about what happened before an error
 */
function exampleBreadcrumbs() {
  // User navigation
  addBreadcrumb({
    message: 'User navigated to settings page',
    category: 'navigation',
    level: 'info',
  });

  // User actions
  addBreadcrumb({
    message: 'User clicked export button',
    category: 'user-action',
    level: 'info',
    data: { exportFormat: 'csv', itemCount: 100 },
  });

  // API calls
  addBreadcrumb({
    message: 'API call to /api/chat',
    category: 'api',
    level: 'info',
    data: {
      url: '/api/chat',
      method: 'POST',
      statusCode: 200,
    },
  });

  // State changes
  addBreadcrumb({
    message: 'Chat model changed',
    category: 'state',
    level: 'info',
    data: {
      from: 'gpt-4',
      to: 'gpt-4-turbo',
    },
  });
}

// ===========================================
// Example 5: Tags and Extra Data
// ===========================================

/**
 * Set tags for filtering errors in Sentry
 */
function exampleTags() {
  // Single tag
  setTag('payment-provider', 'stripe');

  // Multiple tags
  setTags({
    'subscription-tier': 'premium',
    'feature-flag-new-ui': 'enabled',
    'ab-test-variant': 'B',
  });
}

/**
 * Set extra contextual data
 */
function exampleExtraData() {
  setExtra('database-query', 'SELECT * FROM users WHERE active = true');
  setExtra('cache-hit-rate', 0.85);
  setExtra('api-response-time', 150);
}

// ===========================================
// Example 6: Scoped Error Tracking
// ===========================================

/**
 * Use scopes for isolated error tracking
 * This is useful for tracking errors in specific contexts
 */
function exampleScopes() {
  // Payment processing scope
  withScope((scope) => {
    scope.setTag('section', 'payment');
    scope.setTag('provider', 'stripe');
    scope.setLevel('warning');

    try {
      // Process payment
      throw new Error('Payment failed');
    } catch (error) {
      captureException(error);
    }
  });

  // File upload scope
  withScope((scope) => {
    scope.setTag('section', 'file-upload');
    scope.setExtra('file-size', 1024 * 1024 * 5); // 5MB
    scope.setExtra('file-type', 'image/png');

    try {
      // Upload file
      throw new Error('Upload failed');
    } catch (error) {
      captureException(error);
    }
  });
}

// ===========================================
// Example 7: API Route Error Handling
// ===========================================

/**
 * Error handling in Next.js API routes
 */
export async function exampleApiRouteErrorHandling(req: Request) {
  try {
    // Add breadcrumb for the request
    addBreadcrumb({
      message: 'API request received',
      category: 'api',
      data: {
        method: req.method,
        url: req.url,
      },
    });

    // Some operation that might fail
    const response = await fetch('https://api.example.com/data');

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    // Capture the error with request context
    captureException(error, {
      tags: {
        route: '/api/data',
        method: req.method,
      },
      extra: {
        url: req.url,
        headers: req.headers ? Object.fromEntries(req.headers.entries()) : {},
      },
    });

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ===========================================
// Example 8: React Component Error Handling
// ===========================================

/**
 * Error handling in React components
 *
 * Example (in your actual component file):
 *
 * 'use client';
 * import { captureException, addBreadcrumb } from '@/lib/sentry';
 *
 * export function MyComponent() {
 *   const handleClick = async () => {
 *     try {
 *       addBreadcrumb({ message: 'User clicked submit', category: 'user-action' });
 *       await submitForm();
 *       captureMessage('Form submitted', 'info', { tags: { form: 'contact' } });
 *     } catch (error) {
 *       captureException(error, { tags: { component: 'MyComponent' } });
 *       alert('Something went wrong');
 *     }
 *   };
 *   return <button onClick={handleClick}>Submit</button>;
 * }
 */
function exampleReactComponentUsage() {
  // See the comment above for the actual React component code
  // This is just a placeholder to avoid TypeScript errors in this example file
}

// ===========================================
// Example 9: Authentication Flow
// ===========================================

/**
 * Track authentication events
 */
export async function exampleAuthFlow() {
  try {
    // Login attempt
    addBreadcrumb({
      message: 'User login attempt',
      category: 'auth',
      level: 'info',
    });

    const user = await loginUser();

    // Set user context on successful login
    setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // Tag this session
    setTag('authenticated', 'true');

    captureMessage('User logged in successfully', 'info', {
      tags: { event: 'login' },
    });
  } catch (error) {
    // Capture login failure
    captureException(error, {
      tags: { event: 'login-failure' },
      level: 'warning',
    });
  }
}

/**
 * Logout flow
 */
export function exampleLogout() {
  addBreadcrumb({
    message: 'User logout',
    category: 'auth',
    level: 'info',
  });

  // Clear user context
  setUser(null);

  captureMessage('User logged out', 'info', {
    tags: { event: 'logout' },
  });
}

// ===========================================
// Example 10: Conditional Sentry Usage
// ===========================================

/**
 * Check if Sentry is enabled before doing expensive operations
 */
export function exampleConditionalUsage() {
  if (isSentryEnabled) {
    // Only compute expensive debug data if Sentry is enabled
    const debugData = computeExpensiveDebugData();

    setExtra('debug-data', debugData);
  }

  // This always works (falls back to console if Sentry is disabled)
  captureMessage('Operation completed', 'info');
}

// ===========================================
// Helper Functions (for examples)
// ===========================================

async function loginUser() {
  return { id: '123', email: 'user@example.com', username: 'user' };
}

async function submitForm() {
  return Promise.resolve();
}

function computeExpensiveDebugData() {
  return { /* expensive computation */ };
}
