/**
 * Next.js Proxy - Auth, Security Headers & CORS Configuration (Next.js 16)
 *
 * This proxy provides comprehensive functionality for the Bakame AI application:
 * - Supabase SSR auth token refresh (CRITICAL for auth to work)
 * - Security headers for all responses (XSS, clickjacking, MIME sniffing protection)
 * - CORS configuration for API routes
 * - Request ID generation for tracing
 *
 * CRITICAL: This proxy is required for Supabase SSR auth to work!
 * It refreshes expired auth tokens and syncs cookies between server and client.
 * Based on official Supabase Next.js 16 documentation.
 *
 * @module proxy
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ===========================================
// Configuration
// ===========================================

/**
 * Allowed CORS origins
 * Defaults to localhost in development, uses NEXT_PUBLIC_APP_URL in production
 */
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];

  // Add configured app URL if available
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    origins.push(appUrl);
  }

  // Add development origins
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    );
  }

  return origins;
};

/**
 * Allowed CORS methods for API routes
 */
const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'];

/**
 * Content Security Policy
 * Balanced policy that allows Next.js features while maintaining security
 */
const getContentSecurityPolicy = (): string => {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const directives = [
    "default-src 'self'",
    // Allow scripts from self, inline scripts (for Next.js), and eval (for development)
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    // Allow styles from self and inline styles (for styled-components, Tailwind, etc.)
    "style-src 'self' 'unsafe-inline'",
    // Allow images from self, data URIs, and common CDNs
    "img-src 'self' data: blob: https:",
    // Allow fonts from self and data URIs
    "font-src 'self' data:",
    // Allow connections to self, Supabase, OpenAI, and other APIs
    `connect-src 'self' ${supabaseUrl} https://api.openai.com https://openrouter.ai https://*.supabase.co wss://*.supabase.co`,
    // Allow media from self and blob URIs (for uploaded content)
    "media-src 'self' blob: data:",
    // Allow objects from nowhere (disable Flash, Java, etc.)
    "object-src 'none'",
    // Allow iframes from self only
    "frame-src 'self'",
    // Allow form submissions to self
    "form-action 'self'",
    // Require HTTPS in production
    isProd ? 'upgrade-insecure-requests' : '',
  ].filter(Boolean);

  return directives.join('; ');
};

/**
 * Permissions Policy
 * Disables unnecessary browser features to reduce attack surface
 */
const PERMISSIONS_POLICY = [
  'camera=(self)',
  'microphone=(self)',
  'geolocation=()',
  'interest-cohort=()', // Disable FLoC
  'payment=()',
  'usb=()',
  'bluetooth=()',
  'magnetometer=()',
  'accelerometer=()',
  'gyroscope=()',
].join(', ');

// ===========================================
// Utility Functions
// ===========================================

/**
 * Generate a unique request ID for tracing
 * Format: timestamp-random
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomPart}`;
}

/**
 * Check if origin is allowed for CORS
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();

  // Allow any localhost in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return true;
      }
    } catch {
      // Invalid URL, continue to check against allowed origins
    }
  }

  return allowedOrigins.includes(origin);
}

/**
 * Check if path is an API route
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// ===========================================
// CORS Handling
// ===========================================

/**
 * Add CORS headers to response
 */
function addCorsHeaders(
  response: NextResponse,
  request: NextRequest
): void {
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Add allowed methods
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));

  // Add allowed headers (echo back requested headers)
  const requestedHeaders = request.headers.get('access-control-request-headers');
  if (requestedHeaders) {
    response.headers.set('Access-Control-Allow-Headers', requestedHeaders);
  } else {
    // Default allowed headers
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Request-ID'
    );
  }

  // Cache preflight for 1 hour
  response.headers.set('Access-Control-Max-Age', '3600');
}

/**
 * Handle CORS preflight requests
 */
function handlePreflight(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  const requestId = generateRequestId();

  response.headers.set('X-Request-ID', requestId);
  addCorsHeaders(response, request);
  addSecurityHeaders(response);

  return response;
}

// ===========================================
// Security Headers
// ===========================================

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  response.headers.set('Content-Security-Policy', getContentSecurityPolicy());

  // Permissions Policy (Feature Policy)
  response.headers.set('Permissions-Policy', PERMISSIONS_POLICY);

  // Strict Transport Security (HTTPS only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

// ===========================================
// Main Proxy Function
// ===========================================

/**
 * Next.js Proxy Entry Point (Next.js 16)
 *
 * Handles:
 * 1. CORS preflight requests
 * 2. Supabase auth token refresh
 * 3. Security headers
 * 4. CORS headers for API routes
 * 5. Request ID generation
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests for API routes
  if (request.method === 'OPTIONS' && isApiRoute(pathname)) {
    return handlePreflight(request);
  }

  // Generate unique request ID for tracing
  const requestId = generateRequestId();

  // Create a response that we'll modify
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create Supabase client for auth token refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // First set cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Then create a new response with cookies set
          supabaseResponse = NextResponse.next({
            request,
          });
          // Set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: DO NOT use getSession() here as it's not reliable
  // Use getUser() to validate the auth token with Supabase server
  // This also refreshes the session if needed, updating cookies automatically
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Log for debugging (can be removed in production)
  if (pathname === '/') {
    console.log('[PROXY] User:', user?.email || 'guest');
  }

  // Add request ID to all responses
  supabaseResponse.headers.set('X-Request-ID', requestId);

  // Add CORS headers to API routes
  if (isApiRoute(pathname)) {
    addCorsHeaders(supabaseResponse, request);
  }

  // Add security headers to all responses
  addSecurityHeaders(supabaseResponse);

  // CRITICAL: Return the supabaseResponse with updated cookies and headers
  // If you don't return this response, the browser and server will go out of sync
  return supabaseResponse;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
