# Cache Integration Guide

This guide shows how to integrate the Redis caching layer with the existing bakame-ai tools.

## Overview

The caching layer is now available and can significantly improve tool performance by caching expensive API calls. Here's how to integrate it with your existing tools.

## Quick Integration

### Step 1: Import Cache Functions

Add cache imports to `/home/bahati/bakame-ai/src/lib/tools/executors.ts`:

```typescript
// At the top of executors.ts, add:
import {
  cacheWeather,
  cacheCurrency,
  cacheNews,
  cacheWebSearch,
  cachePlace,
  withCache,
  generateCacheKey,
  CACHE_TTL,
} from '@/lib/redis';
```

### Step 2: Update Tool Functions

#### Weather Tool (get_weather)

**Before:**
```typescript
async function getWeather(args: ToolArgs): Promise<ToolResult> {
  const location = args.location as string;
  const units = (args.units as string) || 'celsius';

  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  return { success: true, data };
}
```

**After (with caching):**
```typescript
async function getWeather(args: ToolArgs): Promise<ToolResult> {
  const location = args.location as string;
  const units = (args.units as string) || 'celsius';

  // Use cache helper - caches for 10 minutes
  const data = await cacheWeather(location, async () => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`;

    const response = await fetch(url);
    return await response.json();
  });

  return { success: true, data };
}
```

#### Currency Converter (convert_currency)

**Before:**
```typescript
async function convertCurrency(args: ToolArgs): Promise<ToolResult> {
  const amount = args.amount as number;
  const from = args.from_currency as string;
  const to = args.to_currency as string;

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  const url = `https://api.exchangerate-api.com/v4/latest/${from}`;

  const response = await fetch(url);
  const data = await response.json();

  const rate = data.rates[to];
  const converted = amount * rate;

  return {
    success: true,
    data: { amount, from, to, rate, converted }
  };
}
```

**After (with caching):**
```typescript
async function convertCurrency(args: ToolArgs): Promise<ToolResult> {
  const amount = args.amount as number;
  const from = args.from_currency as string;
  const to = args.to_currency as string;

  // Cache exchange rate for 5 minutes
  const data = await cacheCurrency(from, to, async () => {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const url = `https://api.exchangerate-api.com/v4/latest/${from}`;

    const response = await fetch(url);
    return await response.json();
  });

  const rate = data.rates[to];
  const converted = amount * rate;

  return {
    success: true,
    data: { amount, from, to, rate, converted }
  };
}
```

#### News Tool (get_news)

**Before:**
```typescript
async function getNews(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const category = args.category as string;

  const apiKey = process.env.NEWS_API_KEY;
  const url = `https://newsapi.org/v2/everything?q=${query}`;

  const response = await fetch(url);
  const data = await response.json();

  return { success: true, data };
}
```

**After (with caching):**
```typescript
async function getNews(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const category = args.category as string;

  // Cache news for 15 minutes
  const data = await cacheNews(query, async () => {
    const apiKey = process.env.NEWS_API_KEY;
    const url = `https://newsapi.org/v2/everything?q=${query}`;

    const response = await fetch(url);
    return await response.json();
  });

  return { success: true, data };
}
```

#### Web Search (search_web)

**Before:**
```typescript
async function searchWeb(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const numResults = (args.num_results as number) || 5;

  const apiKey = process.env.SEARCH_API_KEY;
  const url = `https://api.search.com/search?q=${query}&num=${numResults}`;

  const response = await fetch(url);
  const data = await response.json();

  return { success: true, data };
}
```

**After (with caching):**
```typescript
async function searchWeb(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const numResults = (args.num_results as number) || 5;

  // Cache search results for 30 minutes
  const data = await cacheWebSearch(query, async () => {
    const apiKey = process.env.SEARCH_API_KEY;
    const url = `https://api.search.com/search?q=${query}&num=${numResults}`;

    const response = await fetch(url);
    return await response.json();
  });

  return { success: true, data };
}
```

#### Places Search (search_places)

**Before:**
```typescript
async function searchPlaces(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const location = args.location as string;

  const apiKey = process.env.PLACES_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/search?query=${query}`;

  const response = await fetch(url);
  const data = await response.json();

  return { success: true, data };
}
```

**After (with caching):**
```typescript
async function searchPlaces(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const location = args.location as string;

  // Cache place data for 1 hour
  const data = await cachePlace(query, async () => {
    const apiKey = process.env.PLACES_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/search?query=${query}`;

    const response = await fetch(url);
    return await response.json();
  });

  return { success: true, data };
}
```

## Advanced Integration with Custom TTLs

For tools that don't have pre-built helpers, use `withCache`:

```typescript
async function customTool(args: ToolArgs): Promise<ToolResult> {
  const key = generateCacheKey('customTool', args);

  const data = await withCache(
    key,
    CACHE_TTL.DEFAULT, // or custom value in seconds
    async () => {
      // Your expensive operation here
      return await fetchFromAPI(args);
    }
  );

  return { success: true, data };
}
```

## Cache Invalidation

If data needs to be refreshed on demand:

```typescript
import { invalidateCache } from '@/lib/redis';

// Invalidate specific tool caches
await invalidateCache('cache:tool:weather:*');
await invalidateCache('cache:tool:currency:*');
```

## Complete Updated executors.ts Example

Here's what the top of your `executors.ts` should look like:

```typescript
/**
 * Tool Executor Functions
 *
 * Each function implements the actual logic for a tool.
 * These are called when OpenAI decides to use a tool.
 */

import { TOOL_NAMES } from './definitions';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';

// Import cache functions
import {
  cacheWeather,
  cacheCurrency,
  cacheNews,
  cacheWebSearch,
  cachePlace,
  withCache,
  generateCacheKey,
  CACHE_TTL,
} from '@/lib/redis';

// ... rest of your code
```

## Benefits

After integrating caching, you'll see:

1. **Faster Response Times**: Cached responses return in milliseconds instead of seconds
2. **Reduced API Costs**: Fewer external API calls means lower costs
3. **Better User Experience**: Instant responses for repeated queries
4. **Improved Reliability**: Cache serves as fallback if APIs are slow/down
5. **Rate Limit Protection**: Reduces risk of hitting API rate limits

## Monitoring Cache Performance

Add cache statistics to your monitoring dashboard:

```typescript
import { getCacheStats } from '@/lib/redis';

// In your admin/monitoring endpoint
export async function GET() {
  const stats = getCacheStats();
  const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;

  return Response.json({
    cache: {
      hits: stats.hits,
      misses: stats.misses,
      errors: stats.errors,
      hitRate: `${hitRate.toFixed(2)}%`,
    },
  });
}
```

## Health Checks

Add cache health to your system health check:

```typescript
import { isCacheHealthy } from '@/lib/redis';

export async function checkSystemHealth() {
  const cacheHealthy = await isCacheHealthy();

  return {
    cache: {
      status: cacheHealthy ? 'healthy' : 'degraded',
      message: cacheHealthy
        ? 'Cache is working correctly'
        : 'Cache is not available - using direct API calls',
    },
  };
}
```

## Testing the Integration

1. **Run the test suite**:
   ```typescript
   import { runCacheTests } from '@/lib/redis/cache-test';
   await runCacheTests();
   ```

2. **Test a specific tool**:
   ```typescript
   // First call - should be slow (cache miss)
   console.time('First call');
   const result1 = await getWeather({ location: 'Kigali' });
   console.timeEnd('First call');

   // Second call - should be fast (cache hit)
   console.time('Second call');
   const result2 = await getWeather({ location: 'Kigali' });
   console.timeEnd('Second call');
   ```

3. **Check cache statistics**:
   ```typescript
   import { getCacheStats } from '@/lib/redis';
   console.log(getCacheStats());
   ```

## Rollout Strategy

1. **Phase 1**: Enable caching for read-heavy tools (weather, currency, news)
2. **Phase 2**: Monitor cache hit rates and adjust TTLs
3. **Phase 3**: Enable caching for remaining tools
4. **Phase 4**: Optimize TTLs based on real usage patterns

## Troubleshooting

### Cache not working?

1. Check Redis health:
   ```typescript
   const healthy = await isCacheHealthy();
   console.log('Cache healthy:', healthy);
   ```

2. Check environment variables:
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

3. Check logs for cache operations:
   ```
   [Cache] HIT - ...
   [Cache] MISS - ...
   [Cache] SET - ...
   ```

### Low hit rate?

1. Check if cache keys are consistent
2. Verify TTLs aren't too short
3. Monitor for cache evictions

## Next Steps

1. ✅ Cache layer created
2. ✅ Documentation complete
3. ⬜ Integrate with weather tool
4. ⬜ Integrate with currency tool
5. ⬜ Integrate with news tool
6. ⬜ Integrate with web search tool
7. ⬜ Integrate with places tool
8. ⬜ Monitor and optimize TTLs

## Support

For questions or issues:
- See [CACHE_README.md](./CACHE_README.md) for detailed API documentation
- See [cache-example.ts](./cache-example.ts) for usage examples
- See [cache-test.ts](./cache-test.ts) for testing examples
