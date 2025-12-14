/**
 * Liveness Probe Endpoint
 *
 * Simple endpoint that returns 200 OK if the application is running.
 * Used by Kubernetes, Docker, and load balancers to determine if the
 * container/process should be restarted.
 *
 * This endpoint:
 * - Does NOT check external services (database, Redis, etc.)
 * - Returns immediately with minimal overhead
 * - Should always return 200 unless the process is completely dead
 *
 * For comprehensive health checks including service dependencies,
 * use GET /api/health instead.
 */

import { NextResponse } from 'next/server';

const APP_VERSION = process.env.npm_package_version || '0.1.0';
const startTime = Date.now();

/**
 * GET /api/health/live - Liveness probe
 *
 * Returns 200 OK if the application process is running.
 * This is a lightweight check with no external dependencies.
 */
export async function GET(): Promise<NextResponse> {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      uptime,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    }
  );
}
