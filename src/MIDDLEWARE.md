# Next.js Proxy Middleware - Security & CORS

## Overview

The `/src/proxy.ts` file implements Next.js 16's proxy middleware with comprehensive security headers and CORS configuration for the Bakame AI application.

## Features

### 1. Security Headers

All responses include production-ready security headers:

- **X-Frame-Options: DENY** - Prevents clickjacking attacks by disallowing the page to be embedded in iframes
- **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing
- **X-XSS-Protection: 1; mode=block** - Enables XSS filtering in legacy browsers
- **Referrer-Policy: strict-origin-when-cross-origin** - Controls referrer information sent with requests
- **Content-Security-Policy** - Restricts resource loading to prevent XSS and injection attacks
- **Permissions-Policy** - Disables unnecessary browser features (camera, geolocation, etc.)
- **Strict-Transport-Security** - Forces HTTPS in production (HSTS)

### 2. CORS Configuration

API routes (`/api/*`) include CORS headers:

- **Access-Control-Allow-Origin** - Configurable allowed origins
- **Access-Control-Allow-Credentials: true** - Allows cookies and auth headers
- **Access-Control-Allow-Methods** - GET, POST, OPTIONS
- **Access-Control-Allow-Headers** - Content-Type, Authorization, X-Request-ID
- **Access-Control-Max-Age: 3600** - Caches preflight requests for 1 hour

#### Allowed Origins

Development:
- http://localhost:3000
- http://localhost:3001
- http://127.0.0.1:3000
- http://127.0.0.1:3001
- Any localhost domain (for flexibility)

Production:
- Value from `NEXT_PUBLIC_APP_URL` environment variable

### 3. Request ID Generation

Every request receives a unique `X-Request-ID` header:
- Format: `{timestamp}-{random}`
- Example: `lp5k2j-a7b9c2d`
- Useful for request tracing and debugging

### 4. Preflight Request Handling

OPTIONS requests to API routes are handled efficiently:
- Returns 204 No Content
- Includes all necessary CORS headers
- Includes security headers
- Includes request ID

### 5. Supabase Auth Integration

**CRITICAL**: The proxy maintains Supabase SSR authentication:
- Refreshes expired auth tokens automatically
- Syncs cookies between server and client
- Uses `getUser()` for reliable auth validation
- Updates auth state on every request

## Content Security Policy

The CSP is balanced for security and Next.js functionality:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' (dev) / 'unsafe-inline' (prod);
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' {supabase} https://api.openai.com https://openrouter.ai;
media-src 'self' blob: data:;
object-src 'none';
frame-src 'self';
form-action 'self';
upgrade-insecure-requests (production only);
```

### Why These Directives?

- `unsafe-inline` for scripts/styles: Required for Next.js and Tailwind CSS
- `unsafe-eval` (dev only): Required for React DevTools and hot reloading
- `https:` for images: Allows images from any HTTPS source (CDNs, user uploads)
- `blob:` and `data:`: Allows inline images and media (for uploaded content)
- Specific `connect-src` domains: Whitelists API endpoints (Supabase, OpenAI, OpenRouter)

## Permissions Policy

Disables unnecessary browser features to reduce attack surface:

```
camera=(self)           - Only allow camera if same origin
microphone=(self)       - Only allow microphone if same origin
geolocation=()          - Disable geolocation
interest-cohort=()      - Disable FLoC tracking
payment=()              - Disable payment APIs
usb=()                  - Disable USB access
bluetooth=()            - Disable Bluetooth
magnetometer=()         - Disable magnetometer
accelerometer=()        - Disable accelerometer
gyroscope=()            - Disable gyroscope
```

## Configuration

### Environment Variables

Set `NEXT_PUBLIC_APP_URL` in your environment:

```bash
# .env.local (development)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env.production (production)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Path Matcher

The proxy runs on all paths except static files:

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|css|js|woff|woff2|ttf|eot)).*)',
  ],
};
```

**Excluded paths:**
- `_next/static/*` - Next.js static files
- `_next/image/*` - Image optimization files
- `favicon.ico`, `robots.txt`, `sitemap.xml` - Common public files
- Files with extensions: `.jpg`, `.png`, `.css`, `.js`, `.woff`, etc.

This improves performance by skipping middleware for static assets.

## Usage Examples

### Testing CORS

```bash
# Preflight request
curl -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# Should return 204 with CORS headers:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: GET, POST, OPTIONS
# Access-Control-Allow-Headers: Content-Type
# Access-Control-Max-Age: 3600
```

### Checking Security Headers

```bash
curl -I http://localhost:3000

# Should include:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Content-Security-Policy: ...
# Permissions-Policy: ...
# X-Request-ID: lp5k2j-a7b9c2d
```

### Request ID Tracing

```javascript
// In your API route or error handler
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id');

  logger.info('Processing request', { requestId });

  // Use request ID for tracing across services
  return NextResponse.json(
    { data: '...' },
    { headers: { 'X-Request-ID': requestId } }
  );
}
```

## Performance

The proxy is optimized for performance:

1. **Static file exclusion**: Skips middleware for images, CSS, JS, fonts
2. **Efficient path matching**: Single regex check via Next.js matcher
3. **Minimal overhead**: Only adds headers, no heavy computation
4. **Preflight caching**: OPTIONS responses cached for 1 hour
5. **No rate limiting duplication**: Rate limiting handled by API routes

## Security Best Practices

### In Production

1. **Enable HTTPS**: The proxy sets HSTS headers in production
2. **Set APP_URL**: Configure `NEXT_PUBLIC_APP_URL` for CORS
3. **Review CSP**: Audit Content-Security-Policy for your specific needs
4. **Monitor headers**: Use security scanners to verify headers
5. **Test CORS**: Ensure only allowed origins can access your API

### CSP Customization

To add additional allowed domains:

```typescript
// In proxy.ts - getContentSecurityPolicy()
const directives = [
  // ...
  `connect-src 'self' ${supabaseUrl} https://api.openai.com https://your-api.com`,
  // ...
];
```

### CORS Customization

To add additional allowed origins:

```typescript
// In proxy.ts - getAllowedOrigins()
const origins: string[] = [
  'https://your-frontend.com',
  'https://your-mobile-app.com',
];
```

## Troubleshooting

### CORS errors in console

**Problem**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution**:
1. Check that request is to an `/api/*` route
2. Verify `NEXT_PUBLIC_APP_URL` is set correctly
3. Check that origin is in allowed list (see `getAllowedOrigins()`)
4. In development, ensure you're using `localhost` or `127.0.0.1`

### CSP violations

**Problem**: "Refused to load script from... violates Content Security Policy"

**Solution**:
1. Check browser console for specific CSP violation
2. Add necessary domain to appropriate CSP directive
3. Avoid `unsafe-inline` in production if possible
4. Use nonces for inline scripts (advanced)

### Auth not working

**Problem**: User logged out unexpectedly or session not persisting

**Solution**:
1. **DO NOT MODIFY** the Supabase auth code in the proxy
2. Ensure proxy is running on all routes (check `config.matcher`)
3. Verify Supabase environment variables are set
4. Check that cookies are not blocked by browser

### Missing security headers

**Problem**: Security headers not appearing in response

**Solution**:
1. Check that path is not excluded by matcher config
2. Verify proxy is being called (check console logs)
3. Use `curl -I` to inspect raw headers
4. Check for conflicting headers set by API routes

## Rate Limiting

The proxy **does not** implement rate limiting to avoid duplication. Rate limiting is handled by individual API routes using:

- `/src/lib/rateLimit.ts` - In-memory rate limiter
- `/src/lib/redis/rateLimit.ts` - Redis-backed rate limiter (production)

This separation ensures:
- More granular control per endpoint
- Flexibility in rate limit configuration
- Better error messages for rate-limited requests
- Proper 429 status codes from API routes

## Testing

```bash
# Start development server
npm run dev

# Test security headers
curl -I http://localhost:3000

# Test CORS preflight
curl -X OPTIONS http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"

# Test API with CORS
curl http://localhost:3000/api/health \
  -H "Origin: http://localhost:3000"

# Check request ID
curl -I http://localhost:3000/api/health
```

## References

- [Next.js 16 Proxy Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)
- [MDN Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Migration Notes

This proxy replaces the traditional Next.js `middleware.ts` file. In Next.js 16+:

- ✅ Use `proxy.ts` (new)
- ❌ Don't use `middleware.ts` (old)

The functionality is the same, but the file name changed.
