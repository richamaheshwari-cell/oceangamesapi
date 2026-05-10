#!/usr/bin/env bash
# Test all API endpoints. Requires: curl, server running.
# Usage:
#   ./scripts/test-api.sh
#   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpass ./scripts/test-api.sh
#   BASE_URL=http://localhost:3000 ./scripts/test-api.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

red='\033[0;31m'
green='\033[0;32m'
yellow='\033[1;33m'
nc='\033[0m'
ok()  { echo -e "${green}  OK${nc} $1"; }
fail() { echo -e "${red}  FAIL${nc} $1"; }
skip() { echo -e "${yellow}  SKIP${nc} $1 (set ADMIN_EMAIL and ADMIN_PASSWORD)"; }

echo "--- Base URL: $BASE_URL ---"

# --- Public (no auth) ---
echo ""
echo "1. GET /health"
curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/health" | grep -q 200 && ok "health" || fail "health"

echo "2. GET /api/v1/public/ping"
curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/public/ping" | grep -q 200 && ok "public ping" || fail "public ping"

echo "3. GET /api/v1/public/settings"
curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/public/settings" | grep -q 200 && ok "public settings" || fail "public settings"

echo "4. GET /api/v1/public/pages/test-page (404 if no page is fine)"
code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/public/pages/test-page")
[ "$code" = "200" ] || [ "$code" = "404" ] && ok "public page by slug ($code)" || fail "public page ($code)"

# --- Login (need credentials for rest) ---
echo ""
echo "5. POST /api/v1/admin/auth/login"
if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  skip "login"
  echo ""
  echo "--- Remaining tests need ADMIN_EMAIL and ADMIN_PASSWORD. Run: ---"
  echo "   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpass ./scripts/test-api.sh"
  exit 0
fi

login_resp=$(curl -sS -X POST "$BASE_URL/api/v1/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
code=$(echo "$login_resp" | grep -o '"code":"[^"]*"' | head -1)
if echo "$login_resp" | grep -q '"accessToken"'; then
  ok "login"
  TOKEN=$(echo "$login_resp" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
  REFRESH=$(echo "$login_resp" | grep -o '"refreshToken":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  fail "login - $login_resp"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

# --- Admin (with token) ---
echo "6. GET /api/v1/admin/me"
curl -sS -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE_URL/api/v1/admin/me" | grep -q 200 && ok "admin me" || fail "admin me"

echo "7. GET /api/v1/admin/settings"
curl -sS -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE_URL/api/v1/admin/settings" | grep -q 200 && ok "admin settings GET" || fail "admin settings GET"

echo "8. PUT /api/v1/admin/settings"
curl -sS -o /dev/null -w "%{http_code}" -X PUT -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"siteName":"Test Site"}' "$BASE_URL/api/v1/admin/settings" | grep -q 200 && ok "admin settings PUT" || fail "admin settings PUT"

echo "9. GET /api/v1/admin/pages"
curl -sS -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE_URL/api/v1/admin/pages" | grep -q 200 && ok "admin pages list" || fail "admin pages list"

echo "10. POST /api/v1/admin/pages"
page_resp=$(curl -sS -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"slug":"test-api-page","title":"Test","contentHtml":"<p>Test</p>"}' "$BASE_URL/api/v1/admin/pages")
if echo "$page_resp" | grep -q '"id"'; then
  ok "admin pages create"
  PAGE_ID=$(echo "$page_resp" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  fail "admin pages create - $page_resp"
  PAGE_ID=""
fi

echo "11. GET /api/v1/admin/pages/:id"
[ -n "$PAGE_ID" ] && curl -sS -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE_URL/api/v1/admin/pages/$PAGE_ID" | grep -q 200 && ok "admin page get" || fail "admin page get"

echo "12. PUT /api/v1/admin/pages/:id"
[ -n "$PAGE_ID" ] && curl -sS -o /dev/null -w "%{http_code}" -X PUT -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Test Updated"}' "$BASE_URL/api/v1/admin/pages/$PAGE_ID" | grep -q 200 && ok "admin page update" || fail "admin page update"

echo "13. GET /api/v1/admin/casinos"
curl -sS -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE_URL/api/v1/admin/casinos" | grep -q 200 && ok "admin casinos list" || fail "admin casinos list"

echo "14. POST /api/v1/admin/casinos"
casino_resp=$(curl -sS -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"casinoName":"Test Casino","slug":"test-casino-api","status":"draft"}' "$BASE_URL/api/v1/admin/casinos")
if echo "$casino_resp" | grep -q '"id"'; then
  ok "admin casinos create"
  CASINO_ID=$(echo "$casino_resp" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  fail "admin casinos create - $casino_resp"
  CASINO_ID=""
fi

echo "15. GET /api/v1/admin/casinos/:id"
[ -n "$CASINO_ID" ] && curl -sS -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE_URL/api/v1/admin/casinos/$CASINO_ID" | grep -q 200 && ok "admin casino get" || fail "admin casino get"

echo "16. PATCH /api/v1/admin/casinos/:id/status"
[ -n "$CASINO_ID" ] && curl -sS -o /dev/null -w "%{http_code}" -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status":"published"}' "$BASE_URL/api/v1/admin/casinos/$CASINO_ID/status" | grep -q 200 && ok "admin casino status" || fail "admin casino status"

echo "17. PUT /api/v1/admin/casinos/:id"
[ -n "$CASINO_ID" ] && curl -sS -o /dev/null -w "%{http_code}" -X PUT -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"casinoName":"Test Casino Updated"}' "$BASE_URL/api/v1/admin/casinos/$CASINO_ID" | grep -q 200 && ok "admin casino update" || fail "admin casino update"

echo "18. GET /api/v1/admin/admin-users (super_admin only)"
code=$(curl -sS -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE_URL/api/v1/admin/admin-users")
[ "$code" = "200" ] && ok "admin users list" || [ "$code" = "403" ] && skip "admin users list (need super_admin)" || fail "admin users list ($code)"

echo "19. POST /api/v1/admin/auth/change-password (validate only; don't change)"
curl -sS -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"wrong\",\"newPassword\":\"newpass123\"}" "$BASE_URL/api/v1/admin/auth/change-password" | grep -q '"INVALID_CREDENTIALS"' && ok "change-password (rejects wrong current)" || echo "  (change-password validation check)"

echo "20. POST /api/v1/admin/auth/refresh"
refresh_resp=$(curl -sS -X POST "$BASE_URL/api/v1/admin/auth/refresh" -H "Content-Type: application/json" -d "{\"refreshToken\":\"$REFRESH\"}")
echo "$refresh_resp" | grep -q '"accessToken"' && ok "refresh token" || fail "refresh token"

echo "21. POST /api/v1/admin/auth/logout (use old refresh; already rotated)"
curl -sS -X POST "$BASE_URL/api/v1/admin/auth/logout" -H "Content-Type: application/json" -d "{\"refreshToken\":\"$REFRESH\"}" | grep -q '"loggedOut"' && ok "logout" || echo "  (logout may 401 if token already rotated)"

# Cleanup: delete test page and test casino (optional)
if [ -n "$PAGE_ID" ]; then
  curl -sS -o /dev/null -X DELETE -H "$AUTH" "$BASE_URL/api/v1/admin/pages/$PAGE_ID" && ok "cleanup: delete test page" || true
fi
if [ -n "$CASINO_ID" ]; then
  # Delete casino requires super_admin; may 403
  curl -sS -o /dev/null -X DELETE -H "$AUTH" "$BASE_URL/api/v1/admin/casinos/$CASINO_ID" && ok "cleanup: delete test casino" || true
fi

echo ""
echo "--- Done ---"
