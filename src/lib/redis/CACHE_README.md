# Redis Cache Layer for Tool Responses

A production-ready caching layer for expensive tool calls in the bakame-ai project. This module provides intelligent caching with graceful fallbacks, comprehensive logging, and tool-specific helpers.

## Features

- **Automatic Cache-Aside Pattern**: `withCache` handles all caching logic automatically
- **Tool-Specific Helpers**: Pre-configured caching for common tool types
- **Graceful Degradation**: Falls back to no caching if Redis is unavailable
- **Cache Statistics**: Monitor hit/miss rates and performance
- **Type-Safe**: Full TypeScript support with generics
- **Deterministic Keys**: SHA-256 hashing for consistent cache keys
- **Health Checks**: Built-in health monitoring
- **Production-Ready**: Error handling and logging built-in

## Cache TTL Configuration

Default cache durations for different tool types:

| Tool Type    | TTL      | Reason                           |
|--------------|----------|----------------------------------|
| Weather      | 10 min   | Weather data changes gradually   |
| Currency     | 5 min    | Exchange rates fluctuate often   |
| News         | 15 min   | News updates frequently          |
| Web Search   | 30 min   | Search results relatively stable |
| Places       | 1 hour   | Location data rarely changes     |

## Quick Start

### Basic Usage with `withCache`

The recommended way to use caching (cache-aside pattern):

```typescript
import { withCache, generateCacheKey, CACHE_TTL } from '@/lib/redis';

// Cache weather data
const weather = await withCache(
  generateCacheKey('weather', { city: 'New York' }),
  CACHE_TTL.WEATHER,
  async () => {
    // This function only runs on cache miss
    return await fetchWeatherFromAPI('New York');
  }
);
```

### Tool-Specific Helpers

Convenience functions with pre-configured TTLs:

```typescript
import { cacheWeather, cacheCurrency, cacheNews } from '@/lib/redis';

// Weather (10 minutes)
const weather = await cacheWeather('London', async () => {
  return await fetchWeatherAPI('London');
});

// Currency rates (5 minutes)
const rate = await cacheCurrency('USD', 'EUR', async () => {
  return await fetchExchangeRate('USD', 'EUR');
});

// News articles (15 minutes)
const news = await cacheNews('technology', async () => {
  return await fetchNewsAPI('technology');
});

// Web search (30 minutes)
const results = await cacheWebSearch('best restaurants', async () => {
  return await searchWeb('best restaurants');
});

// Place data (1 hour)
const place = await cachePlace('place-id-123', async () => {
  return await fetchPlaceAPI('place-id-123');
});
```

## API Reference

### Core Functions

#### `withCache<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T>`

High-level caching wrapper implementing the cache-aside pattern.

**Parameters:**
- `key`: Cache key (use `generateCacheKey()` to create)
- `ttl`: Time to live in seconds
- `fetcher`: Async function to execute on cache miss

**Returns:** Cached or freshly fetched value

**Example:**
```typescript
const data = await withCache(
  'cache:tool:myTool:abc123',
  600,
  async () => await expensiveOperation()
);
```

#### `generateCacheKey(toolName: string, args?: unknown): string`

Generates a deterministic cache key from tool name and arguments.

**Parameters:**
- `toolName`: Name of the tool
- `args`: Tool arguments (will be JSON serialized and hashed)

**Returns:** Cache key in format `cache:tool:{toolName}:{hash(args)}`

**Example:**
```typescript
const key = generateCacheKey('weather', { city: 'Paris', units: 'metric' });
// Returns: "cache:tool:weather:a1b2c3d4..."
```

#### `getCached<T>(key: string): Promise<T | null>`

Retrieves a cached value by key.

**Parameters:**
- `key`: Cache key to retrieve

**Returns:** Cached value or `null` if not found/expired

**Example:**
```typescript
const cached = await getCached<WeatherData>('cache:tool:weather:abc123');
if (cached) {
  console.log('Cache hit!', cached);
}
```

#### `setCache(key: string, value: unknown, ttlSeconds: number): Promise<void>`

Stores a value in cache with TTL.

**Parameters:**
- `key`: Cache key to set
- `value`: Value to cache (will be JSON serialized)
- `ttlSeconds`: Time to live in seconds

**Example:**
```typescript
await setCache('cache:tool:weather:abc123', weatherData, 600);
```

#### `invalidateCache(pattern: string): Promise<void>`

Invalidates cache entries matching a pattern.

**Parameters:**
- `pattern`: Pattern to match (e.g., `"cache:tool:weather:*"`)

**Example:**
```typescript
// Invalidate all weather caches
await invalidateCache('cache:tool:weather:*');

// Invalidate all caches for a specific tool
await invalidateCache('cache:tool:myTool:*');
```

### Tool-Specific Helpers

#### `cacheWeather<T>(city: string, fetcher: () => Promise<T>): Promise<T>`

Cache weather data (TTL: 10 minutes)

#### `cacheCurrency<T>(from: string, to: string, fetcher: () => Promise<T>): Promise<T>`

Cache currency exchange rates (TTL: 5 minutes)

#### `cacheNews<T>(query: string, fetcher: () => Promise<T>): Promise<T>`

Cache news articles (TTL: 15 minutes)

#### `cacheWebSearch<T>(query: string, fetcher: () => Promise<T>): Promise<T>`

Cache web search results (TTL: 30 minutes)

#### `cachePlace<T>(placeId: string, fetcher: () => Promise<T>): Promise<T>`

Cache place/location data (TTL: 1 hour)

### Monitoring Functions

#### `getCacheStats(): Readonly<CacheStats>`

Returns cache hit/miss/error statistics.

**Returns:**
```typescript
{
  hits: number;
  misses: number;
  errors: number;
}
```

**Example:**
```typescript
const stats = getCacheStats();
const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;
console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);
```

#### `resetCacheStats(): void`

Resets cache statistics to zero.

#### `isCacheHealthy(): Promise<boolean>`

Tests cache functionality by performing a set/get operation.

**Returns:** `true` if cache is working correctly

**Example:**
```typescript
const healthy = await isCacheHealthy();
if (!healthy) {
  console.warn('Cache system is not functioning properly');
}
```

## Cache Key Format

Cache keys follow this format:
```
cache:tool:{toolName}:{hash(args)}
```

**Components:**
- `cache:tool:` - Namespace prefix
- `{toolName}` - Name of the tool (e.g., 'weather', 'currency')
- `{hash(args)}` - SHA-256 hash of serialized arguments (first 16 chars)

**Example:**
```typescript
generateCacheKey('weather', { city: 'Paris' })
// Returns: "cache:tool:weather:5e7f8a9b1c2d3e4f"
```

## Integration Examples

### Integrating Cache into a Tool

```typescript
import { cacheWeather } from '@/lib/redis';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
}

async function fetchWeatherAPI(city: string): Promise<WeatherData> {
  const response = await fetch(`https://api.weather.com/data?city=${city}`);
  return response.json();
}

// Tool implementation with caching
export async function getWeather(city: string): Promise<WeatherData> {
  return cacheWeather(city, () => fetchWeatherAPI(city));
}
```

### Custom TTL for Specific Use Case

```typescript
import { withCache, generateCacheKey } from '@/lib/redis';

// Cache for 2 hours
const cacheKey = generateCacheKey('reports', { reportId: '123', year: 2024 });
const report = await withCache(
  cacheKey,
  7200, // 2 hours in seconds
  async () => await generateExpensiveReport('123', 2024)
);
```

### Manual Cache Management

```typescript
import { getCached, setCache, invalidateCache } from '@/lib/redis';

// Check cache manually
const cached = await getCached<MyData>('cache:tool:myTool:key');

if (cached) {
  return cached;
}

// Fetch and cache manually
const fresh = await fetchFromAPI();
await setCache('cache:tool:myTool:key', fresh, 600);

// Invalidate when data changes
await invalidateCache('cache:tool:myTool:*');
```

## Logging

The cache layer includes comprehensive logging:

```
[Cache] HIT - cache:tool:weather:5e7f8a9b1c2d3e4f
[Cache] MISS - cache:tool:currency:9f8e7d6c5b4a3210
[Cache] SET - cache:tool:news:1a2b3c4d5e6f7890 (TTL: 900s)
[Cache] Executing fetcher for cache:tool:places:a1b2c3d4e5f67890
[Cache] INVALIDATE - cache:tool:weather:* (5 keys deleted)
```

Monitor these logs to understand cache performance and troubleshoot issues.

## Error Handling

The cache layer is designed to **never break your application**:

- Redis connection failures → Falls back to executing fetcher directly
- Serialization errors → Logs error and returns null
- Expired keys → Returns null (cache miss)
- Invalid patterns → Logs warning and continues

**Example:**
```typescript
// This will ALWAYS return a result, even if Redis is down
const weather = await withCache(
  'cache:tool:weather:nyc',
  600,
  async () => await fetchWeatherAPI('NYC')
);
```

## Environment Setup

The cache uses the same Redis client as other modules:

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

If Redis credentials are not available, the cache automatically uses an in-memory fallback.

## Best Practices

1. **Use `withCache` for most cases** - It handles all the complexity
2. **Generate consistent keys** - Always use `generateCacheKey()` with sorted arguments
3. **Choose appropriate TTLs** - Balance freshness vs. performance
4. **Monitor cache statistics** - Use `getCacheStats()` to optimize TTLs
5. **Handle cache misses gracefully** - The fetcher function should always work
6. **Invalidate when needed** - Clear caches when underlying data changes
7. **Use tool-specific helpers** - They have pre-configured optimal TTLs

## Performance Tips

1. **Cache expensive operations first** - API calls, database queries, computations
2. **Use longer TTLs for static data** - Location data, historical information
3. **Monitor hit rates** - Aim for >70% hit rate for frequently accessed data
4. **Batch cache invalidations** - Use pattern matching to clear related caches
5. **Test with production data** - Verify TTLs match real-world update frequencies

## Testing

```typescript
import { resetCacheStats, getCacheStats, isCacheHealthy } from '@/lib/redis';

// Health check
const healthy = await isCacheHealthy();
expect(healthy).toBe(true);

// Reset stats before tests
resetCacheStats();

// Test cache behavior
await withCache('test-key', 60, async () => ({ data: 'test' }));
await withCache('test-key', 60, async () => ({ data: 'test' }));

const stats = getCacheStats();
expect(stats.hits).toBe(1);
expect(stats.misses).toBe(1);
```

## Troubleshooting

### Cache not working

1. Check Redis connection:
   ```typescript
   const healthy = await isCacheHealthy();
   console.log('Cache healthy:', healthy);
   ```

2. Verify environment variables:
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

3. Check logs for errors:
   ```
   [Cache] Error getting key "cache:tool:...": <error details>
   ```

### Poor hit rate

1. Check cache statistics:
   ```typescript
   const stats = getCacheStats();
   console.log('Hit rate:', stats.hits / (stats.hits + stats.misses));
   ```

2. Verify keys are deterministic:
   ```typescript
   const key1 = generateCacheKey('tool', args);
   const key2 = generateCacheKey('tool', args);
   console.log('Keys match:', key1 === key2); // Should be true
   ```

3. Increase TTL if appropriate:
   ```typescript
   await withCache(key, 1800, fetcher); // Try 30 minutes
   ```

## Related Documentation

- [Redis Client Documentation](./README.md)
- [Rate Limiting Documentation](./rateLimit.ts)
- [Usage Examples](./cache-example.ts)

## License

Part of the bakame-ai project.
