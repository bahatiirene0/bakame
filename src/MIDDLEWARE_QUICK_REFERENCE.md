# Middleware Quick Reference

## 🔒 Security Headers Applied

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-XSS-Protection | 1; mode=block | Enable XSS filtering (legacy) |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer info |
| Content-Security-Policy | See below | Prevent XSS/injection |
| Permissions-Policy | See below | Disable unnecessary features |
| Strict-Transport-Security | max-age=31536000 (prod only) | Force HTTPS |
| X-Request-ID | {timestamp}-{random} | Request tracing |

## 🌐 CORS Configuration

### Allowed Origins
- **Development**: All localhost/127.0.0.1 origins
- **Production**: `NEXT_PUBLIC_APP_URL` environment variable

### Allowed Methods
- GET
- POST
- OPTIONS

### Allowed Headers
- Content-Type
- Authorization
- X-Request-ID
- Any requested via `Access-Control-Request-Headers`

### Features
- Credentials allowed: ✅ Yes
- Preflight cache: 1 hour (3600s)
- Applied to: `/api/*` routes only

## 📝 Content Security Policy

```csp
default-src 'self';
script-src 'self' 'unsafe-inline' ['unsafe-eval' in dev];
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' {SUPABASE} https://api.openai.com https://openrouter.ai;
media-src 'self' blob: data:;
object-src 'none';
frame-src 'self';
form-action 'self';
upgrade-insecure-requests [prod only];
```

## 🎯 Permissions Policy

```
camera=(self)
microphone=(self)
geolocation=()
interest-cohort=()
payment=()
usb=()
bluetooth=()
magnetometer=()
accelerometer=()
gyroscope=()
```

## 🛠️ Configuration

### Environment Variables Required
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com  # For CORS
NEXT_PUBLIC_SUPABASE_URL=...                # For CSP
NEXT_PUBLIC_SUPABASE_ANON_KEY=...           # For Supabase auth
```

### Path Matcher
Applies to all paths **except**:
- `_next/static/*` - Static files
- `_next/image/*` - Image optimization
- `favicon.ico`, `robots.txt`, `sitemap.xml`
- Files: `.jpg`, `.png`, `.css`, `.js`, `.woff`, etc.

## 🧪 Testing

```bash
# Run test script
./test-middleware.sh

# Manual tests
curl -I http://localhost:3000                          # Check security headers
curl -X OPTIONS http://localhost:3000/api/health       # Check CORS preflight
curl -H "Origin: http://localhost:3000" \
     http://localhost:3000/api/health                  # Check CORS
```

## 🔧 Customization

### Add Allowed Origin
```typescript
// src/proxy.ts - getAllowedOrigins()
origins.push('https://your-domain.com');
```

### Add CSP Domain
```typescript
// src/proxy.ts - getContentSecurityPolicy()
`connect-src 'self' ... https://your-api.com`,
```

### Add Allowed Method
```typescript
// src/proxy.ts
const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS', 'PUT'];
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Check `NEXT_PUBLIC_APP_URL` and origin whitelist |
| CSP violation | Add domain to appropriate CSP directive |
| Auth not working | Don't modify Supabase code in proxy |
| Headers missing | Check path matcher config |

## 📚 Related Files

- `/src/proxy.ts` - Main middleware implementation
- `/src/MIDDLEWARE.md` - Full documentation
- `/test-middleware.sh` - Test script
- `/src/lib/rateLimit.ts` - Rate limiting (handled in API routes)

## ⚠️ Important Notes

1. **Next.js 16**: Uses `proxy.ts`, not `middleware.ts`
2. **Supabase Auth**: Critical - don't modify auth code
3. **Rate Limiting**: Handled by API routes, not middleware
4. **Static Files**: Excluded for performance
5. **Development**: More permissive CSP (unsafe-eval allowed)
6. **Production**: HSTS enabled, stricter CSP

## 🔗 Resources

- [Next.js Proxy Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)
- [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
