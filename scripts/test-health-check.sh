#!/bin/bash

# Health Check Test Script
# Tests both health endpoints and verifies responses

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="$BASE_URL/api/health"
LIVE_ENDPOINT="$BASE_URL/api/health/live"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Bakame AI - Health Check Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Liveness Probe
echo -e "${YELLOW}[1/4] Testing Liveness Probe${NC}"
echo -e "Endpoint: $LIVE_ENDPOINT"
echo ""

LIVE_RESPONSE=$(curl -s -w "\n%{http_code}" "$LIVE_ENDPOINT")
LIVE_BODY=$(echo "$LIVE_RESPONSE" | head -n -1)
LIVE_STATUS=$(echo "$LIVE_RESPONSE" | tail -n 1)

if [ "$LIVE_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ Liveness check passed (HTTP $LIVE_STATUS)${NC}"
    echo "$LIVE_BODY" | jq '.' 2>/dev/null || echo "$LIVE_BODY"
else
    echo -e "${RED}✗ Liveness check failed (HTTP $LIVE_STATUS)${NC}"
    echo "$LIVE_BODY"
    exit 1
fi
echo ""

# Test 2: Full Health Check
echo -e "${YELLOW}[2/4] Testing Full Health Check${NC}"
echo -e "Endpoint: $HEALTH_ENDPOINT"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT")
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n 1)

if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ Health check passed - All systems healthy (HTTP $HEALTH_STATUS)${NC}"
elif [ "$HEALTH_STATUS" -eq 207 ]; then
    echo -e "${YELLOW}⚠ Health check partial - Some systems degraded (HTTP $HEALTH_STATUS)${NC}"
elif [ "$HEALTH_STATUS" -eq 503 ]; then
    echo -e "${RED}✗ Health check failed - Systems unhealthy (HTTP $HEALTH_STATUS)${NC}"
else
    echo -e "${RED}✗ Unexpected status code: HTTP $HEALTH_STATUS${NC}"
fi

echo "$HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"
echo ""

# Test 3: Validate Response Structure
echo -e "${YELLOW}[3/4] Validating Response Structure${NC}"

# Check for required fields
REQUIRED_FIELDS=("status" "timestamp" "version" "uptime" "services")
ALL_VALID=true

for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$HEALTH_BODY" | jq -e ".$field" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Field '$field' present${NC}"
    else
        echo -e "${RED}✗ Field '$field' missing${NC}"
        ALL_VALID=false
    fi
done

if [ "$ALL_VALID" = true ]; then
    echo -e "${GREEN}✓ All required fields present${NC}"
else
    echo -e "${RED}✗ Some required fields missing${NC}"
fi
echo ""

# Test 4: Service Status
echo -e "${YELLOW}[4/4] Checking Service Status${NC}"

# Extract service statuses
DB_STATUS=$(echo "$HEALTH_BODY" | jq -r '.services.database.status' 2>/dev/null || echo "unknown")
REDIS_STATUS=$(echo "$HEALTH_BODY" | jq -r '.services.redis.status // "not-configured"' 2>/dev/null || echo "unknown")
OPENAI_STATUS=$(echo "$HEALTH_BODY" | jq -r '.services.openai.status' 2>/dev/null || echo "unknown")

# Database
if [ "$DB_STATUS" = "healthy" ]; then
    DB_LATENCY=$(echo "$HEALTH_BODY" | jq -r '.services.database.latency' 2>/dev/null)
    echo -e "${GREEN}✓ Database: $DB_STATUS (${DB_LATENCY}ms)${NC}"
elif [ "$DB_STATUS" = "degraded" ]; then
    echo -e "${YELLOW}⚠ Database: $DB_STATUS${NC}"
else
    echo -e "${RED}✗ Database: $DB_STATUS${NC}"
fi

# Redis
if [ "$REDIS_STATUS" = "healthy" ]; then
    REDIS_LATENCY=$(echo "$HEALTH_BODY" | jq -r '.services.redis.latency' 2>/dev/null)
    echo -e "${GREEN}✓ Redis: $REDIS_STATUS (${REDIS_LATENCY}ms)${NC}"
elif [ "$REDIS_STATUS" = "degraded" ]; then
    echo -e "${YELLOW}⚠ Redis: $REDIS_STATUS (in-memory fallback)${NC}"
elif [ "$REDIS_STATUS" = "not-configured" ]; then
    echo -e "${BLUE}ℹ Redis: not configured (optional)${NC}"
else
    echo -e "${RED}✗ Redis: $REDIS_STATUS${NC}"
fi

# OpenAI
if [ "$OPENAI_STATUS" = "healthy" ]; then
    OPENAI_LATENCY=$(echo "$HEALTH_BODY" | jq -r '.services.openai.latency' 2>/dev/null)
    echo -e "${GREEN}✓ OpenAI: $OPENAI_STATUS (${OPENAI_LATENCY}ms)${NC}"
elif [ "$OPENAI_STATUS" = "degraded" ]; then
    echo -e "${YELLOW}⚠ OpenAI: $OPENAI_STATUS${NC}"
else
    echo -e "${RED}✗ OpenAI: $OPENAI_STATUS${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

OVERALL_STATUS=$(echo "$HEALTH_BODY" | jq -r '.status' 2>/dev/null || echo "unknown")
VERSION=$(echo "$HEALTH_BODY" | jq -r '.version' 2>/dev/null || echo "unknown")
UPTIME=$(echo "$HEALTH_BODY" | jq -r '.uptime' 2>/dev/null || echo "0")

echo "Overall Status: $OVERALL_STATUS"
echo "Version: $VERSION"
echo "Uptime: ${UPTIME}s"
echo ""

if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ All health checks passed!${NC}"
    exit 0
elif [ "$HEALTH_STATUS" -eq 207 ]; then
    echo -e "${YELLOW}⚠ Health checks passed with warnings (degraded services)${NC}"
    exit 0
else
    echo -e "${RED}✗ Health checks failed${NC}"
    exit 1
fi
