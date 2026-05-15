#!/bin/bash
# DuBaoMatRung - Full System Test Script
# Tests all services and key functionality

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
section() { echo -e "\n${YELLOW}▸ $1${NC}"; }

check() {
  local desc="$1"
  local url="$2"
  local expected="${3:-200}"
  local response
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null)
  if [ "$http_code" = "$expected" ]; then
    pass "$desc (HTTP $http_code)"
  else
    fail "$desc (expected $expected, got $http_code) - $url"
  fi
}

check_json() {
  local desc="$1"
  local url="$2"
  local key="$3"
  local response
  response=$(curl -s --max-time 10 "$url" 2>/dev/null)
  if echo "$response" | grep -q "\"$key\""; then
    pass "$desc"
  else
    fail "$desc (key '$key' not found in response)"
  fi
}

echo "=========================================="
echo " DuBaoMatRung - System Test"
echo " Target: $BASE_URL"
echo "=========================================="

# ──────────────────────────────────────────────
section "1. Gateway Health"
check "Gateway /health" "$BASE_URL/health"
check_json "Gateway returns status ok" "$BASE_URL/health" "status"
check "Swagger API Docs" "$BASE_URL/api-docs"

# ──────────────────────────────────────────────
section "2. Frontend"
check "Frontend HTML served" "$BASE_URL/"

# ──────────────────────────────────────────────
section "3. Auth Service"
check "Auth login endpoint (OPTIONS)" "$BASE_URL/api/auth/login" "200"

# Test login with seed user
LOGIN_RESPONSE=$(curl -s --max-time 10 -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
  pass "Auth login returns JWT token"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
elif echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
  pass "Auth login returns accessToken"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
  fail "Auth login failed - check admin credentials in seed data"
  TOKEN=""
fi

# ──────────────────────────────────────────────
section "4. GIS Service"
check "Mat rung list endpoint" "$BASE_URL/api/mat-rung"
check_json "Mat rung returns success/data" "$BASE_URL/api/mat-rung" "success"

# ──────────────────────────────────────────────
section "5. Admin Service"
check "Dropdown endpoint" "$BASE_URL/api/dropdown/tinh"
check "Hanhchinh endpoint" "$BASE_URL/api/hanhchinh"

# ──────────────────────────────────────────────
section "6. Search Service"
check "Search endpoint" "$BASE_URL/api/search"

# ──────────────────────────────────────────────
section "7. MapServer Service"
check "MapServer health via gateway" "$BASE_URL/api/mapserver/health"
MAP_WMS="$BASE_URL/api/mapserver/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0"
check "WMS GetCapabilities" "$MAP_WMS"

# ──────────────────────────────────────────────
section "8. Report Service (requires auth)"
if [ -n "$TOKEN" ]; then
  REPORT_RESPONSE=$(curl -s --max-time 15 "$BASE_URL/api/bao-cao" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  if echo "$REPORT_RESPONSE" | grep -q '"success"'; then
    pass "Report endpoint with auth"
  else
    fail "Report endpoint - unexpected response"
  fi
else
  echo -e "  ${YELLOW}⚠${NC} Skipping report test (no auth token)"
fi

# ──────────────────────────────────────────────
section "9. Docker Container Health"
if command -v docker &>/dev/null; then
  for container in dubao_postgres dubao_redis dubao_auth dubao_gis dubao_admin dubao_gateway dubao_mapserver; do
    status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "not_found")
    if [ "$status" = "healthy" ]; then
      pass "Container $container is healthy"
    elif [ "$status" = "not_found" ]; then
      echo -e "  ${YELLOW}⚠${NC} Container $container not found (not running in Docker?)"
    else
      fail "Container $container status: $status"
    fi
  done
else
  echo -e "  ${YELLOW}⚠${NC} Docker not available, skipping container checks"
fi

# ──────────────────────────────────────────────
echo ""
echo "=========================================="
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "=========================================="

[ $FAIL -eq 0 ] && exit 0 || exit 1
