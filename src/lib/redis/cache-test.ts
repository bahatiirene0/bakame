/**
 * Cache Layer Test Suite
 *
 * Quick verification that the cache implementation works correctly.
 * Run this file to test all cache functionality.
 */

import {
  withCache,
  generateCacheKey,
  getCached,
  setCache,
  getCacheStats,
  resetCacheStats,
  isCacheHealthy,
  cacheWeather,
  CACHE_TTL,
} from './cache';

/**
 * Test utilities
 */
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    testsFailed++;
  }
}

async function assertAsync(
  fn: () => Promise<boolean>,
  message: string
): Promise<void> {
  try {
    const result = await fn();
    assert(result, message);
  } catch (error) {
    console.error(`✗ ${message} - Error:`, error);
    testsFailed++;
  }
}

/**
 * Test 1: Health Check
 */
async function test_healthCheck() {
  console.log('\n--- Test 1: Health Check ---');
  await assertAsync(
    async () => {
      const healthy = await isCacheHealthy();
      return healthy === true;
    },
    'Cache system should be healthy'
  );
}

/**
 * Test 2: Cache Key Generation
 */
async function test_keyGeneration() {
  console.log('\n--- Test 2: Cache Key Generation ---');

  const key1 = generateCacheKey('weather', { city: 'Paris' });
  assert(
    key1.startsWith('cache:tool:weather:'),
    'Key should have correct prefix'
  );

  const key2 = generateCacheKey('weather', { city: 'Paris' });
  assert(
    key1 === key2,
    'Same arguments should produce same key (deterministic)'
  );

  // Test with reordered arguments
  const key3 = generateCacheKey('test', { b: 2, a: 1 });
  const key4 = generateCacheKey('test', { a: 1, b: 2 });
  assert(
    key3 === key4,
    'Argument order should not affect key (deterministic)'
  );
}

/**
 * Test 3: Set and Get Cache
 */
async function test_setAndGet() {
  console.log('\n--- Test 3: Set and Get Cache ---');

  const key = 'cache:tool:test:setget';
  const testData = { message: 'Hello Cache', timestamp: Date.now() };

  await setCache(key, testData, 60);
  const retrieved = await getCached<typeof testData>(key);

  assert(
    retrieved !== null,
    'Should retrieve cached value'
  );

  assert(
    retrieved?.message === testData.message,
    'Retrieved data should match stored data'
  );
}

/**
 * Test 4: Cache Miss
 */
async function test_cacheMiss() {
  console.log('\n--- Test 4: Cache Miss ---');

  const nonExistentKey = 'cache:tool:test:nonexistent:' + Date.now();
  const result = await getCached(nonExistentKey);

  assert(
    result === null,
    'Non-existent key should return null'
  );
}

/**
 * Test 5: withCache Function
 */
async function test_withCache() {
  console.log('\n--- Test 5: withCache Function ---');

  let executionCount = 0;
  const key = 'cache:tool:test:withcache:' + Date.now();

  const fetcher = async () => {
    executionCount++;
    return { value: 'test', count: executionCount };
  };

  // First call - cache miss
  const result1 = await withCache(key, 60, fetcher);
  assert(
    executionCount === 1,
    'Fetcher should execute on first call (cache miss)'
  );

  // Second call - cache hit
  const result2 = await withCache(key, 60, fetcher);
  assert(
    executionCount === 1,
    'Fetcher should NOT execute on second call (cache hit)'
  );

  assert(
    result1.count === result2.count,
    'Both calls should return same cached data'
  );
}

/**
 * Test 6: Tool-Specific Helper
 */
async function test_toolHelper() {
  console.log('\n--- Test 6: Tool-Specific Helper ---');

  let fetchCount = 0;
  const city = 'TestCity_' + Date.now();

  const fetcher = async () => {
    fetchCount++;
    return { temperature: 72, city };
  };

  // First call
  const weather1 = await cacheWeather(city, fetcher);
  assert(
    fetchCount === 1,
    'Weather fetcher should execute on first call'
  );

  // Second call
  const weather2 = await cacheWeather(city, fetcher);
  assert(
    fetchCount === 1,
    'Weather fetcher should use cache on second call'
  );

  assert(
    weather1.temperature === weather2.temperature,
    'Weather data should be consistent'
  );
}

/**
 * Test 7: Cache Statistics
 */
async function test_statistics() {
  console.log('\n--- Test 7: Cache Statistics ---');

  resetCacheStats();
  const initialStats = getCacheStats();

  assert(
    initialStats.hits === 0 && initialStats.misses === 0,
    'Stats should be reset to zero'
  );

  // Perform some cache operations
  const key = 'cache:tool:test:stats:' + Date.now();
  await setCache(key, { data: 'test' }, 60);
  await getCached(key); // Hit
  await getCached('cache:tool:test:nonexistent'); // Miss

  const stats = getCacheStats();
  assert(
    stats.hits >= 1,
    'Should record cache hits'
  );

  assert(
    stats.misses >= 1,
    'Should record cache misses'
  );
}

/**
 * Test 8: Cache TTL Configuration
 */
async function test_ttlConfig() {
  console.log('\n--- Test 8: Cache TTL Configuration ---');

  assert(
    CACHE_TTL.WEATHER === 600,
    'Weather TTL should be 10 minutes (600 seconds)'
  );

  assert(
    CACHE_TTL.CURRENCY === 300,
    'Currency TTL should be 5 minutes (300 seconds)'
  );

  assert(
    CACHE_TTL.NEWS === 900,
    'News TTL should be 15 minutes (900 seconds)'
  );

  assert(
    CACHE_TTL.WEB_SEARCH === 1800,
    'Web search TTL should be 30 minutes (1800 seconds)'
  );

  assert(
    CACHE_TTL.PLACES === 3600,
    'Places TTL should be 1 hour (3600 seconds)'
  );
}

/**
 * Test 9: Type Safety
 */
async function test_typeSafety() {
  console.log('\n--- Test 9: Type Safety ---');

  interface TestData {
    id: number;
    name: string;
    active: boolean;
  }

  const key = 'cache:tool:test:typed:' + Date.now();
  const testData: TestData = {
    id: 123,
    name: 'Test Item',
    active: true,
  };

  await setCache(key, testData, 60);
  const retrieved = await getCached<TestData>(key);

  assert(
    typeof retrieved?.id === 'number',
    'Type should be preserved (number)'
  );

  assert(
    typeof retrieved?.name === 'string',
    'Type should be preserved (string)'
  );

  assert(
    typeof retrieved?.active === 'boolean',
    'Type should be preserved (boolean)'
  );
}

/**
 * Test 10: Error Resilience
 */
async function test_errorResilience() {
  console.log('\n--- Test 10: Error Resilience ---');

  let fetcherExecuted = false;

  try {
    // Even if cache has issues, fetcher should still work
    const result = await withCache(
      'cache:tool:test:resilience:' + Date.now(),
      60,
      async () => {
        fetcherExecuted = true;
        return { success: true };
      }
    );

    assert(
      fetcherExecuted === true,
      'Fetcher should execute even if cache has issues'
    );

    assert(
      result.success === true,
      'Should return fetcher result'
    );
  } catch (error) {
    testsFailed++;
    console.error('✗ Cache should not throw errors:', error);
  }
}

/**
 * Run all tests
 */
export async function runCacheTests() {
  console.log('\n========================================');
  console.log('Cache Layer Test Suite');
  console.log('========================================');

  testsPassed = 0;
  testsFailed = 0;

  try {
    await test_healthCheck();
    await test_keyGeneration();
    await test_setAndGet();
    await test_cacheMiss();
    await test_withCache();
    await test_toolHelper();
    await test_statistics();
    await test_ttlConfig();
    await test_typeSafety();
    await test_errorResilience();
  } catch (error) {
    console.error('\nTest suite error:', error);
  }

  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total:  ${testsPassed + testsFailed}`);
  console.log('========================================\n');

  if (testsFailed === 0) {
    console.log('✓ All tests passed! Cache layer is working correctly.\n');
  } else {
    console.log('✗ Some tests failed. Please review the errors above.\n');
  }

  return testsFailed === 0;
}

/**
 * Uncomment to run tests
 */
// runCacheTests().catch(console.error);
