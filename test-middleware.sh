#!/bin/bash

# Test script for middleware/proxy security headers and CORS
# Usage: ./test-middleware.sh [URL]
# Default: http://localhost:3000

URL="${1:-http://localhost:3000}"

echo "================================================"
echo "Testing Middleware Security Headers and CORS"
echo "================================================"
echo ""

echo "1. Testing Security Headers on Homepage..."
echo "-------------------------------------------"
curl -s -I "$URL" | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Referrer-Policy|Content-Security-Policy|Permissions-Policy|X-Request-ID|Strict-Transport-Security)"
echo ""

echo "2. Testing CORS Preflight (OPTIONS) on API..."
echo "----------------------------------------------"
curl -s -X OPTIONS "$URL/api/health" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I | grep -E "(Access-Control|X-Request-ID|HTTP)"
echo ""

echo "3. Testing CORS on API GET Request..."
echo "--------------------------------------"
curl -s "$URL/api/health" \
  -H "Origin: http://localhost:3000" \
  -I | grep -E "(Access-Control|X-Request-ID)"
echo ""

echo "4. Checking Request ID Uniqueness..."
echo "------------------------------------"
echo "Request 1:"
curl -s -I "$URL" | grep "X-Request-ID"
echo "Request 2:"
curl -s -I "$URL" | grep "X-Request-ID"
echo "Request 3:"
curl -s -I "$URL" | grep "X-Request-ID"
echo ""

echo "================================================"
echo "Test Complete"
echo "================================================"
