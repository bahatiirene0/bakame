/**
 * Example API Route with Sentry Integration
 *
 * This is a reference implementation showing how to properly integrate
 * Sentry error tracking into Next.js API routes.
 *
 * Copy this pattern to your own API routes for comprehensive error tracking.
 *
 * @module api/example-with-sentry
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  captureException,
  captureMessage,
  addBreadcrumb,
  setTag,
  setExtra,
  withScope,
} from '@/lib/sentry';

/**
 * GET /api/example-with-sentry
 *
 * Example endpoint demonstrating Sentry integration
 */
export async function GET(request: NextRequest) {
  try {
    // Add breadcrumb for tracking the request
    addBreadcrumb({
      message: 'API request received',
      category: 'api',
      level: 'info',
      data: {
        method: 'GET',
        url: request.url,
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Set request-specific tags
    setTag('api-route', '/api/example-with-sentry');
    setTag('http-method', 'GET');

    // Simulate some work
    const data = await processRequest();

    // Log successful completion
    captureMessage('API request completed successfully', 'info', {
      tags: { route: '/api/example-with-sentry' },
      extra: { responseSize: JSON.stringify(data).length },
    });

    return NextResponse.json(data);
  } catch (error) {
    // Capture the error with full context
    captureException(error, {
      tags: {
        route: '/api/example-with-sentry',
        method: 'GET',
      },
      extra: {
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
      },
      level: 'error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/example-with-sentry
 *
 * Example endpoint with scoped error tracking
 */
export async function POST(request: NextRequest) {
  // Use a scope for isolated error tracking
  return withScope((scope) => {
    return (async () => {
      try {
        // Set scope-specific context
        scope.setTag('api-route', '/api/example-with-sentry');
        scope.setTag('http-method', 'POST');

        // Parse request body
        const body = await request.json();

        // Validate input
        if (!body.data) {
          captureMessage('Invalid request - missing data field', 'warning', {
            tags: { validation: 'failed' },
            extra: { body },
          });

          return NextResponse.json(
            { error: 'Missing required field: data' },
            { status: 400 }
          );
        }

        // Add breadcrumb for processing
        addBreadcrumb({
          message: 'Processing POST request',
          category: 'api',
          level: 'info',
          data: { hasData: !!body.data },
        });

        // Process the request
        const result = await processData(body.data);

        // Add extra context about the result
        setExtra('processing-time', result.processingTime);
        setExtra('result-size', result.data.length);

        // Log success
        captureMessage('POST request processed successfully', 'info');

        return NextResponse.json(result);
      } catch (error) {
        // Error is automatically captured with scope context
        captureException(error, {
          level: 'error',
        });

        return NextResponse.json(
          { error: 'Failed to process request' },
          { status: 500 }
        );
      }
    })();
  });
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Simulated data processing function
 */
async function processRequest() {
  // Simulate async work
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    message: 'Request processed successfully',
    timestamp: new Date().toISOString(),
    data: {
      example: true,
      value: 42,
    },
  };
}

/**
 * Simulated data processing with error handling
 */
async function processData(data: any) {
  // Add breadcrumb for processing step
  addBreadcrumb({
    message: 'Starting data processing',
    category: 'processing',
    level: 'info',
  });

  const startTime = Date.now();

  try {
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate potential error
    if (data === 'error') {
      throw new Error('Simulated processing error');
    }

    const processingTime = Date.now() - startTime;

    return {
      data: data,
      processingTime,
      success: true,
    };
  } catch (error) {
    // Add context before re-throwing
    addBreadcrumb({
      message: 'Data processing failed',
      category: 'processing',
      level: 'error',
      data: { error: (error as Error).message },
    });

    throw error;
  }
}
