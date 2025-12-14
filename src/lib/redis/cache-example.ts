/**
 * Cache Usage Examples
 *
 * Demonstrates how to use the Redis caching layer for tool responses.
 * This file shows various patterns and best practices.
 */

import {
  withCache,
  generateCacheKey,
  getCached,
  setCache,
  invalidateCache,
  cacheWeather,
  cacheCurrency,
  cacheNews,
  cacheWebSearch,
  cachePlace,
  getCacheStats,
  isCacheHealthy,
  CACHE_TTL,
} from './cache';

/**
 * Example 1: Using withCache (Recommended Pattern)
 *
 * The withCache function handles the cache-aside pattern automatically:
 * - Checks cache first
 * - Executes fetcher on miss
 * - Stores result in cache
 */
async function example1_withCache() {
  console.log('\n=== Example 1: Using withCache ===');

  // Example: Caching weather data
  const city = 'New York';
  const cacheKey = generateCacheKey('weather', { city });

  const weatherData = await withCache(
    cacheKey,
    CACHE_TTL.WEATHER, // 10 minutes
    async () => {
      console.log('Fetching weather from API...');
      // Simulate API call
      return {
        city,
        temperature: 72,
        condition: 'Sunny',
        timestamp: new Date().toISOString(),
      };
    }
  );

  console.log('Weather data:', weatherData);

  // Second call will use cache
  const cachedWeather = await withCache(
    cacheKey,
    CACHE_TTL.WEATHER,
    async () => {
      console.log('This will not be called - using cache');
      return null;
    }
  );

  console.log('Cached weather:', cachedWeather);
}

/**
 * Example 2: Using Tool-Specific Helpers
 *
 * Convenience functions with pre-configured TTLs and key generation
 */
async function example2_toolSpecificHelpers() {
  console.log('\n=== Example 2: Tool-Specific Helpers ===');

  // Weather helper
  const weather = await cacheWeather('London', async () => {
    return {
      city: 'London',
      temperature: 15,
      condition: 'Rainy',
    };
  });
  console.log('Weather:', weather);

  // Currency helper
  const exchangeRate = await cacheCurrency('USD', 'EUR', async () => {
    return {
      from: 'USD',
      to: 'EUR',
      rate: 0.85,
      timestamp: Date.now(),
    };
  });
  console.log('Exchange rate:', exchangeRate);

  // News helper
  const news = await cacheNews('technology', async () => {
    return {
      articles: [
        { title: 'AI Breakthrough', source: 'Tech News' },
        { title: 'New Framework Released', source: 'Dev Blog' },
      ],
    };
  });
  console.log('News:', news);

  // Web search helper
  const searchResults = await cacheWebSearch('best restaurants near me', async () => {
    return {
      results: [
        { name: 'Restaurant A', rating: 4.5 },
        { name: 'Restaurant B', rating: 4.8 },
      ],
    };
  });
  console.log('Search results:', searchResults);

  // Place helper
  const placeData = await cachePlace('ChIJD7fiBh9u5kcRYJSMaMOCCwQ', async () => {
    return {
      name: 'Eiffel Tower',
      location: 'Paris, France',
      rating: 4.7,
    };
  });
  console.log('Place data:', placeData);
}

/**
 * Example 3: Manual Cache Operations
 *
 * Using getCached and setCache for fine-grained control
 */
async function example3_manualOperations() {
  console.log('\n=== Example 3: Manual Cache Operations ===');

  const key = 'cache:tool:custom:example';

  // Set cache manually
  await setCache(
    key,
    { message: 'Hello from cache', timestamp: Date.now() },
    300 // 5 minutes
  );

  // Get from cache
  const cached = await getCached<{ message: string; timestamp: number }>(key);
  console.log('Retrieved from cache:', cached);

  // Try to get non-existent key
  const missing = await getCached('cache:tool:nonexistent');
  console.log('Non-existent key:', missing); // null
}

/**
 * Example 4: Cache Key Generation
 *
 * Creating deterministic cache keys for different scenarios
 */
async function example4_cacheKeyGeneration() {
  console.log('\n=== Example 4: Cache Key Generation ===');

  // Simple key
  const key1 = generateCacheKey('weather', { city: 'Paris' });
  console.log('Weather key:', key1);

  // Complex arguments
  const key2 = generateCacheKey('search', {
    query: 'restaurants',
    location: { lat: 40.7128, lng: -74.0060 },
    radius: 5000,
    filters: ['open_now', 'highly_rated'],
  });
  console.log('Search key:', key2);

  // Same arguments produce same key (deterministic)
  const key3 = generateCacheKey('search', {
    filters: ['open_now', 'highly_rated'],
    radius: 5000,
    query: 'restaurants',
    location: { lng: -74.0060, lat: 40.7128 },
  });
  console.log('Keys match:', key2 === key3);
}

/**
 * Example 5: Cache Invalidation
 *
 * Clearing caches when data becomes stale
 */
async function example5_invalidation() {
  console.log('\n=== Example 5: Cache Invalidation ===');

  // Set some weather caches
  await setCache('cache:tool:weather:ny', { temp: 72 }, 600);
  await setCache('cache:tool:weather:la', { temp: 85 }, 600);
  await setCache('cache:tool:currency:usd-eur', { rate: 0.85 }, 300);

  // Invalidate all weather caches
  await invalidateCache('cache:tool:weather:*');
  console.log('Invalidated all weather caches');

  // Verify weather caches are gone
  const nyCached = await getCached('cache:tool:weather:ny');
  console.log('NY weather after invalidation:', nyCached); // null

  // Currency cache should still exist
  const currencyCached = await getCached('cache:tool:currency:usd-eur');
  console.log('Currency after invalidation:', currencyCached); // { rate: 0.85 }
}

/**
 * Example 6: Monitoring and Statistics
 *
 * Tracking cache performance
 */
async function example6_statistics() {
  console.log('\n=== Example 6: Monitoring and Statistics ===');

  // Perform some cache operations
  await withCache('cache:stat:test1', 60, async () => ({ data: 'test1' }));
  await withCache('cache:stat:test1', 60, async () => ({ data: 'test1' })); // Hit
  await withCache('cache:stat:test2', 60, async () => ({ data: 'test2' }));
  await getCached('cache:stat:nonexistent'); // Miss

  // Get statistics
  const stats = getCacheStats();
  console.log('Cache statistics:', stats);
  console.log(`Hit rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)}%`);
}

/**
 * Example 7: Health Check
 *
 * Verifying cache system is working
 */
async function example7_healthCheck() {
  console.log('\n=== Example 7: Health Check ===');

  const healthy = await isCacheHealthy();
  console.log('Cache system healthy:', healthy);

  if (!healthy) {
    console.warn('Cache system is not functioning properly!');
    console.warn('Application will continue without caching.');
  }
}

/**
 * Example 8: Real-World Tool Integration
 *
 * Demonstrating how to integrate caching into actual tool implementations
 */
interface WeatherAPIResponse {
  city: string;
  temperature: number;
  humidity: number;
  condition: string;
}

async function fetchWeatherFromAPI(city: string): Promise<WeatherAPIResponse> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    city,
    temperature: Math.floor(Math.random() * 30) + 50,
    humidity: Math.floor(Math.random() * 50) + 30,
    condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
  };
}

async function getWeatherWithCache(city: string): Promise<WeatherAPIResponse> {
  return cacheWeather(city, () => fetchWeatherFromAPI(city));
}

async function example8_realWorldIntegration() {
  console.log('\n=== Example 8: Real-World Integration ===');

  console.time('First call (cache miss)');
  const weather1 = await getWeatherWithCache('Tokyo');
  console.timeEnd('First call (cache miss)');
  console.log('Weather:', weather1);

  console.time('Second call (cache hit)');
  const weather2 = await getWeatherWithCache('Tokyo');
  console.timeEnd('Second call (cache hit)');
  console.log('Weather:', weather2);
}

/**
 * Example 9: Error Handling
 *
 * Cache failures don't break the application
 */
async function example9_errorHandling() {
  console.log('\n=== Example 9: Error Handling ===');

  try {
    // Even if cache fails, the fetcher will still execute
    const result = await withCache(
      'cache:error:test',
      60,
      async () => {
        console.log('Fetcher executed despite any cache errors');
        return { success: true };
      }
    );

    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Run all examples
 */
export async function runCacheExamples() {
  console.log('========================================');
  console.log('Redis Cache Layer - Usage Examples');
  console.log('========================================');

  try {
    await example1_withCache();
    await example2_toolSpecificHelpers();
    await example3_manualOperations();
    await example4_cacheKeyGeneration();
    await example5_invalidation();
    await example6_statistics();
    await example7_healthCheck();
    await example8_realWorldIntegration();
    await example9_errorHandling();

    console.log('\n========================================');
    console.log('All examples completed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

/**
 * Uncomment to run examples
 */
// runCacheExamples().catch(console.error);
