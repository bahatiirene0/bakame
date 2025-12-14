/**
 * Rate Limiter Demo Script
 *
 * Run this file to see the rate limiter in action.
 * Usage: npx tsx src/lib/redis/demo.ts
 */

import { checkRateLimit, getRateLimitStatus, resetRateLimit } from './rateLimit';

/**
 * Demo: Simulate multiple requests to see rate limiting in action
 */
async function demoRateLimiting() {
  console.log('=== Rate Limiting Demo ===\n');

  const testUser = 'demo-user-123';
  const isAuthenticated = false; // Guest user (30 requests/min limit)

  console.log('Testing Chat API rate limiting for guest user...');
  console.log('Limit: 30 requests per minute\n');

  // Simulate 35 requests to trigger rate limiting
  for (let i = 1; i <= 35; i++) {
    const result = await checkRateLimit('chat', testUser, isAuthenticated);

    if (result.allowed) {
      console.log(
        `✓ Request ${i}: ALLOWED | Remaining: ${result.remaining} | ` +
        `Reset: ${new Date(result.resetTime).toLocaleTimeString()}`
      );
    } else {
      console.log(
        `✗ Request ${i}: RATE LIMITED | Retry after: ${result.retryAfter}s | ` +
        `Reset: ${new Date(result.resetTime).toLocaleTimeString()}`
      );
    }

    // Add small delay to simulate real requests
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log('\n--- Final Status Check ---');
  const status = await getRateLimitStatus('chat', testUser, isAuthenticated);
  console.log(`Remaining: ${status.remaining}`);
  console.log(`Allowed: ${status.allowed}`);
  console.log(`Reset Time: ${new Date(status.resetTime).toLocaleString()}`);

  // Cleanup
  console.log('\n--- Cleaning Up ---');
  await resetRateLimit('chat', testUser);
  console.log('Rate limit reset for demo user');
}

/**
 * Demo: Compare authenticated vs guest limits
 */
async function demoUserTypes() {
  console.log('\n\n=== Authenticated vs Guest User Demo ===\n');

  const guestUser = 'guest-123';
  const authUser = 'auth-456';

  // Make 40 requests for each user type
  console.log('Making 40 requests for both user types...\n');

  let guestAllowed = 0;
  let authAllowed = 0;

  for (let i = 1; i <= 40; i++) {
    const [guestResult, authResult] = await Promise.all([
      checkRateLimit('chat', guestUser, false),
      checkRateLimit('chat', authUser, true),
    ]);

    if (guestResult.allowed) guestAllowed++;
    if (authResult.allowed) authAllowed++;

    if (i % 10 === 0) {
      console.log(
        `After ${i} requests - Guest: ${guestAllowed} allowed | Auth: ${authAllowed} allowed`
      );
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Guest User (30/min limit): ${guestAllowed}/40 requests allowed`);
  console.log(`Authenticated User (100/min limit): ${authAllowed}/40 requests allowed`);

  // Cleanup
  await Promise.all([
    resetRateLimit('chat', guestUser),
    resetRateLimit('chat', authUser),
  ]);
  console.log('\nRate limits reset');
}

/**
 * Demo: Different endpoints (chat vs upload)
 */
async function demoEndpoints() {
  console.log('\n\n=== Different Endpoints Demo ===\n');

  const user = 'endpoint-test-user';
  const isAuth = false;

  console.log('Testing Chat endpoint (30/min for guests)...');
  let chatAllowed = 0;
  for (let i = 0; i < 35; i++) {
    const result = await checkRateLimit('chat', user, isAuth);
    if (result.allowed) chatAllowed++;
  }
  console.log(`Chat requests: ${chatAllowed}/35 allowed\n`);

  console.log('Testing Upload endpoint (5/min for guests)...');
  let uploadAllowed = 0;
  for (let i = 0; i < 10; i++) {
    const result = await checkRateLimit('upload', user, isAuth);
    if (result.allowed) uploadAllowed++;
  }
  console.log(`Upload requests: ${uploadAllowed}/10 allowed\n`);

  // Cleanup
  await Promise.all([
    resetRateLimit('chat', user),
    resetRateLimit('upload', user),
  ]);
  console.log('Rate limits reset');
}

/**
 * Demo: Sliding window behavior
 */
async function demoSlidingWindow() {
  console.log('\n\n=== Sliding Window Demo ===\n');

  const user = 'sliding-window-test';
  const isAuth = false; // 30 requests/min

  console.log('Making 30 requests rapidly...');
  for (let i = 0; i < 30; i++) {
    await checkRateLimit('chat', user, isAuth);
  }

  const status1 = await getRateLimitStatus('chat', user, isAuth);
  console.log(`Status after 30 requests: ${status1.remaining} remaining`);

  console.log('\nWaiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const status2 = await getRateLimitStatus('chat', user, isAuth);
  console.log(`Status after 2s wait: ${status2.remaining} remaining`);

  console.log('\nNote: With sliding window, oldest requests start expiring');
  console.log('allowing new requests even before the full minute is up.');

  // Cleanup
  await resetRateLimit('chat', user);
}

/**
 * Run all demos
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Redis Rate Limiter - Interactive Demo             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Check if running in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Running in development mode - rate limiting is DISABLED');
      console.log('Set NODE_ENV=production to test actual rate limiting\n');
    }

    await demoRateLimiting();
    await demoUserTypes();
    await demoEndpoints();
    await demoSlidingWindow();

    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║     Demo Complete!                                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Demo error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { demoRateLimiting, demoUserTypes, demoEndpoints, demoSlidingWindow };
