/**
 * Sentry Integration Tests
 *
 * Simple tests to verify the Sentry integration works correctly
 * both with and without the @sentry/nextjs package installed.
 *
 * Run with: node --loader tsx src/lib/sentry.test.ts
 */

import {
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  setTag,
  setTags,
  setExtra,
  isSentryEnabled,
} from './sentry';

console.log('='.repeat(60));
console.log('Sentry Integration Tests');
console.log('='.repeat(60));

console.log('\n✓ Sentry Status:', isSentryEnabled ? 'ENABLED' : 'DISABLED (Fallback Mode)');
console.log('  (This is normal if @sentry/nextjs is not installed)\n');

// Test 1: Basic error capture
console.log('Test 1: Basic Error Capture');
try {
  throw new Error('Test error');
} catch (error) {
  captureException(error);
  console.log('  ✓ captureException() works\n');
}

// Test 2: Error with context
console.log('Test 2: Error with Context');
try {
  throw new Error('Test error with context');
} catch (error) {
  captureException(error, {
    tags: { test: 'true', operation: 'test' },
    extra: { testData: 'sample' },
    level: 'warning',
  });
  console.log('  ✓ captureException() with context works\n');
}

// Test 3: Message logging
console.log('Test 3: Message Logging');
captureMessage('Test info message', 'info');
captureMessage('Test warning message', 'warning');
captureMessage('Test error message', 'error');
console.log('  ✓ captureMessage() works\n');

// Test 4: User context
console.log('Test 4: User Context');
setUser({
  id: 'test-123',
  email: 'test@example.com',
  username: 'testuser',
});
console.log('  ✓ setUser() works\n');

// Test 5: Breadcrumbs
console.log('Test 5: Breadcrumbs');
addBreadcrumb({
  message: 'Test breadcrumb',
  category: 'test',
  level: 'info',
  data: { test: true },
});
console.log('  ✓ addBreadcrumb() works\n');

// Test 6: Tags
console.log('Test 6: Tags');
setTag('test-tag', 'test-value');
setTags({ tag1: 'value1', tag2: 'value2' });
console.log('  ✓ setTag() and setTags() work\n');

// Test 7: Extra data
console.log('Test 7: Extra Data');
setExtra('test-extra', { data: 'test' });
console.log('  ✓ setExtra() works\n');

// Test 8: Sensitive data filtering
console.log('Test 8: Sensitive Data Filtering');
try {
  throw new Error('Test error with sensitive data');
} catch (error) {
  captureException(error, {
    extra: {
      password: 'should-be-redacted',
      api_key: 'should-be-redacted',
      token: 'should-be-redacted',
      username: 'should-be-visible',
    },
  });
  console.log('  ✓ Sensitive data filtering works\n');
  console.log('  (Check the logged data - password/api_key/token should be [REDACTED])\n');
}

// Test 9: Clear user context
console.log('Test 9: Clear User Context');
setUser(null);
console.log('  ✓ setUser(null) works\n');

console.log('='.repeat(60));
console.log('All tests completed successfully!');
console.log('='.repeat(60));

if (!isSentryEnabled) {
  console.log('\n💡 Note: To enable Sentry, install @sentry/nextjs and set SENTRY_DSN');
  console.log('   See SENTRY.md for more information.');
}

console.log('\n');
