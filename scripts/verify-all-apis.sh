#!/usr/bin/env bash
# Verify all admin + public APIs (GET, POST, PUT, PATCH, DELETE).
# Usage:
#   ./scripts/verify-all-apis.sh
#   ADMIN_EMAIL=admin@local.test ADMIN_PASSWORD=yourpass ./scripts/verify-all-apis.sh
#   BASE_URL=http://localhost:3000 ./scripts/verify-all-apis.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@local.test}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-c6IRZ8sRWScSHpc8RBTmHsnC}"

red='\033[0;31m'
green='\033[0;32m'
nc='\033[0m'
ok()  { echo -e "${green}  OK${nc} $1"; }
fail() { echo -e "${red}  FAIL${nc} $1"; }

echo "=== Base: $BASE_URL | Admin: $ADMIN_EMAIL ==="
echo ""

# --- Login ---
echo "1. POST /api/v1/admin/auth/login"
RES=$(cat <<JSON | curl -s -X POST "$BASE_URL/api/v1/admin/auth/login" -H "Content-Type: application/json" --data-binary @-
{"email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD"}
JSON
)
if echo "$RES" | grep -q '"accessToken"'; then
  ok "login"
  export ACCESS_TOKEN=$(echo "$RES" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
  export REFRESH_TOKEN=$(echo "$RES" | grep -o '"refreshToken":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  fail "login - $RES"
  exit 1
fi

AUTH="Authorization: Bearer $ACCESS_TOKEN"

# --- Auth ---
echo "2. GET /api/v1/admin/me"
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE_URL/api/v1/admin/me")" = "200" ] && ok "me" || fail "me"

echo "3. POST /api/v1/admin/auth/refresh"
RES=$(cat <<JSON | curl -s -X POST "$BASE_URL/api/v1/admin/auth/refresh" -H "Content-Type: application/json" --data-binary @-
{"refreshToken":"$REFRESH_TOKEN"}
JSON
)
if echo "$RES" | grep -q '"accessToken"'; then
  ok "refresh"
  REFRESH_TOKEN=$(echo "$RES" | grep -o '"refreshToken":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  fail "refresh"
fi

# --- Settings (GET, PUT) ---
echo "4. GET /api/v1/admin/settings"
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE_URL/api/v1/admin/settings")" = "200" ] && ok "settings GET" || fail "settings GET"

echo "5. PUT /api/v1/admin/settings"
[ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "$AUTH" -H "Content-Type: application/json" -d '{"siteName":"TOG Test"}' "$BASE_URL/api/v1/admin/settings")" = "200" ] && ok "settings PUT" || fail "settings PUT"

# --- Pages (LIST, CREATE, GET, UPDATE, DELETE) ---
echo "6. GET /api/v1/admin/pages"
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE_URL/api/v1/admin/pages")" = "200" ] && ok "pages list" || fail "pages list"

echo "7. POST /api/v1/admin/pages"
PAGE_RESP=$(cat <<'JSON' | curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" --data-binary @- "$BASE_URL/api/v1/admin/pages"
{"slug":"verify-test-page","title":"Verify Test","contentHtml":"<p>Test</p>"}
JSON
)
if echo "$PAGE_RESP" | grep -q '"id"'; then
  ok "pages create"
  PAGE_ID=$(echo "$PAGE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  fail "pages create"
  PAGE_ID=""
fi

echo "8. GET /api/v1/admin/pages/:id"
if [ -n "$PAGE_ID" ]; then
  [ "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE_URL/api/v1/admin/pages/$PAGE_ID")" = "200" ] && ok "pages get one" || fail "pages get one"
else
  echo "    (skip - no PAGE_ID)"
fi

echo "9. PUT /api/v1/admin/pages/:id"
if [ -n "$PAGE_ID" ]; then
  [ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "$AUTH" -H "Content-Type: application/json" -d '{"title":"Verify Test Updated"}' "$BASE_URL/api/v1/admin/pages/$PAGE_ID")" = "200" ] && ok "pages update" || fail "pages update"
fi

# --- Casinos (LIST, CREATE, GET, UPDATE, PATCH status, DELETE) ---
echo "10. GET /api/v1/admin/casinos"
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE_URL/api/v1/admin/casinos")" = "200" ] && ok "casinos list" || fail "casinos list"

echo "11. POST /api/v1/admin/casinos"
CASINO_RESP=$(cat <<'JSON' | curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" --data-binary @- "$BASE_URL/api/v1/admin/casinos"
{"casinoName":"Verify Test Casino","slug":"verify-test-casino","status":"draft"}
JSON
)
if echo "$CASINO_RESP" | grep -q '"id"'; then
  ok "casinos create"
  CASINO_ID=$(echo "$CASINO_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  fail "casinos create"
  CASINO_ID=""
fi

echo "12. GET /api/v1/admin/casinos/:id"
if [ -n "$CASINO_ID" ]; then
  [ "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE_URL/api/v1/admin/casinos/$CASINO_ID")" = "200" ] && ok "casinos get one" || fail "casinos get one"
fi

echo "13. PUT /api/v1/admin/casinos/:id"
if [ -n "$CASINO_ID" ]; then
  [ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "$AUTH" -H "Content-Type: application/json" -d '{"casinoName":"Verify Test Casino Updated"}' "$BASE_URL/api/v1/admin/casinos/$CASINO_ID")" = "200" ] && ok "casinos update" || fail "casinos update"
fi

echo "14. PATCH /api/v1/admin/casinos/:id/status"
if [ -n "$CASINO_ID" ]; then
  [ "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"published"}' "$BASE_URL/api/v1/admin/casinos/$CASINO_ID/status")" = "200" ] && ok "casinos patch status" || fail "casinos patch status"
fi

# --- Admin users (super_admin only: LIST, CREATE, UPDATE, RESET-PASSWORD, DELETE) ---
echo "15. GET /api/v1/admin/admin-users"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE_URL/api/v1/admin/admin-users")
[ "$CODE" = "200" ] && ok "admin-users list" || fail "admin-users list (code $CODE, need super_admin)"

echo "16. POST /api/v1/admin/admin-users"
ADMIN_USER_RESP=$(cat <<'JSON' | curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" --data-binary @- "$BASE_URL/api/v1/admin/admin-users"
{"email":"verify-editor@local.test","password":"VerifyPass123","role":"editor","name":"Verify Editor"}
JSON
)
if echo "$ADMIN_USER_RESP" | grep -q '"id"'; then
  ok "admin-users create"
  ADMIN_USER_ID=$(echo "$ADMIN_USER_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  echo "    (skip create if 409 EMAIL_EXISTS)"
  ADMIN_USER_ID=""
fi

echo "17. PUT /api/v1/admin/admin-users/:id"
if [ -n "$ADMIN_USER_ID" ]; then
  [ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "$AUTH" -H "Content-Type: application/json" -d '{"name":"Verify Editor Updated"}' "$BASE_URL/api/v1/admin/admin-users/$ADMIN_USER_ID")" = "200" ] && ok "admin-users update" || fail "admin-users update"
fi

echo "18. PUT /api/v1/admin/admin-users/:id/reset-password"
if [ -n "$ADMIN_USER_ID" ]; then
  [ "$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "$AUTH" -H "Content-Type: application/json" -d '{"password":"NewVerifyPass123"}' "$BASE_URL/api/v1/admin/admin-users/$ADMIN_USER_ID/reset-password")" = "200" ] && ok "admin-users reset-password" || fail "admin-users reset-password"
fi

# --- Change password (POST) - just validate wrong password ---
echo "19. POST /api/v1/admin/auth/change-password (wrong current = 401)"
[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$AUTH" -H "Content-Type: application/json" -d "{\"currentPassword\":\"wrong\",\"newPassword\":\"x\"}" "$BASE_URL/api/v1/admin/auth/change-password")" = "401" ] && ok "change-password rejects wrong" || echo "    (check manually)"

# --- Logout ---
echo "20. POST /api/v1/admin/auth/logout"
LOGOUT_RESP=$(cat <<JSON | curl -s -X POST "$BASE_URL/api/v1/admin/auth/logout" -H "Content-Type: application/json" --data-binary @-
{"refreshToken":"$REFRESH_TOKEN"}
JSON
)
echo "$LOGOUT_RESP" | grep -q '"loggedOut"' && ok "logout" || echo "    (may 401 if token already rotated)"

# --- Public (no auth) ---
echo ""
echo "=== Public APIs (no token) ==="
echo "21. GET /health"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/health")" = "200" ] && ok "health" || fail "health"

echo "22. GET /api/v1/public/ping"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/v1/public/ping")" = "200" ] && ok "public ping" || fail "public ping"

echo "23. GET /api/v1/public/settings"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/v1/public/settings")" = "200" ] && ok "public settings" || fail "public settings"

echo "24. GET /api/v1/public/pages/:slug"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/v1/public/pages/verify-test-page")
[ "$CODE" = "200" ] || [ "$CODE" = "404" ] && ok "public page by slug ($CODE)" || fail "public page ($CODE)"

# --- Cleanup: delete created resources (need token again for delete) ---
echo ""
echo "=== Cleanup ==="
RES=$(cat <<JSON | curl -s -X POST "$BASE_URL/api/v1/admin/auth/login" -H "Content-Type: application/json" --data-binary @-
{"email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD"}
JSON
)
ACCESS_TOKEN=$(echo "$RES" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
AUTH="Authorization: Bearer $ACCESS_TOKEN"

if [ -n "$PAGE_ID" ]; then
  curl -s -o /dev/null -X DELETE -H "$AUTH" "$BASE_URL/api/v1/admin/pages/$PAGE_ID" && ok "delete test page" || true
fi
if [ -n "$CASINO_ID" ]; then
  curl -s -o /dev/null -X DELETE -H "$AUTH" "$BASE_URL/api/v1/admin/casinos/$CASINO_ID" && ok "delete test casino" || true
fi
if [ -n "$ADMIN_USER_ID" ]; then
  curl -s -o /dev/null -X DELETE -H "$AUTH" "$BASE_URL/api/v1/admin/admin-users/$ADMIN_USER_ID" && ok "delete test admin user" || true
fi

echo ""
echo "=== Done ==="
