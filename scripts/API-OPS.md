# API operations checklist

All operations implemented and how to verify them.

**Base:** `http://localhost:3000`  
**Auth:** Set `ACCESS_TOKEN` after login (see step 1).

---

## 1. Login (get token)

```bash
RES=$(cat <<'JSON' | curl -s -X POST http://localhost:3000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" --data-binary @-
{"email":"admin@local.test","password":"c6IRZ8sRWScSHpc8RBTmHsnC"}
JSON
)
export ACCESS_TOKEN=$(echo "$RES" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
export REFRESH_TOKEN=$(echo "$RES" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
echo "$RES"
```

---

## 2. Auth

| Op    | Method | Endpoint | Verify |
|-------|--------|----------|--------|
| Me    | GET    | `/api/v1/admin/me` | `curl -s http://localhost:3000/api/v1/admin/me -H "Authorization: Bearer $ACCESS_TOKEN"` |
| Refresh | POST | `/api/v1/admin/auth/refresh` | Body: `{"refreshToken":"$REFRESH_TOKEN"}` |
| Logout | POST | `/api/v1/admin/auth/logout` | Body: `{"refreshToken":"$REFRESH_TOKEN"}` |
| Change password | POST | `/api/v1/admin/auth/change-password` | Body: `{"currentPassword":"...","newPassword":"..."}` |

---

## 3. Settings (singleton: GET + PUT only)

| Op  | Method | Endpoint | Verify |
|-----|--------|----------|--------|
| Get | GET    | `/api/v1/admin/settings` | `curl -s http://localhost:3000/api/v1/admin/settings -H "Authorization: Bearer $ACCESS_TOKEN"` |
| Update | PUT | `/api/v1/admin/settings` | Body: `{"siteName":"My Site","maintenanceMode":false}` |

---

## 4. Pages (full CRUD)

| Op    | Method | Endpoint | Verify |
|-------|--------|----------|--------|
| List  | GET    | `/api/v1/admin/pages` | `curl -s http://localhost:3000/api/v1/admin/pages -H "Authorization: Bearer $ACCESS_TOKEN"` |
| Create | POST | `/api/v1/admin/pages` | Body: `{"slug":"about-us","title":"About","contentHtml":"<p>Hi</p>"}` |
| Get one | GET | `/api/v1/admin/pages/:id` | Use id from create |
| Update | PUT | `/api/v1/admin/pages/:id` | Body: `{"title":"About Us"}` |
| Delete | DELETE | `/api/v1/admin/pages/:id` | `curl -s -X DELETE .../pages/:id -H "Authorization: Bearer $ACCESS_TOKEN"` |

---

## 5. Casinos (full CRUD + PATCH status)

| Op    | Method | Endpoint | Verify |
|-------|--------|----------|--------|
| List  | GET    | `/api/v1/admin/casinos?page=1&limit=10` | Add query params as needed |
| Create | POST | `/api/v1/admin/casinos` | Body: `{"casinoName":"X","slug":"x-casino","status":"draft"}` |
| Get one | GET | `/api/v1/admin/casinos/:id` | |
| Update | PUT | `/api/v1/admin/casinos/:id` | Partial body ok |
| Patch status | PATCH | `/api/v1/admin/casinos/:id/status` | Body: `{"status":"published"}` |
| Delete | DELETE | `/api/v1/admin/casinos/:id` | super_admin only |

---

## 6. Admin users (super_admin only: full CRUD + reset-password)

| Op    | Method | Endpoint | Verify |
|-------|--------|----------|--------|
| List  | GET    | `/api/v1/admin/admin-users` | |
| Create | POST | `/api/v1/admin/admin-users` | Body: `{"email":"e@x.com","password":"pass","role":"editor"}` |
| Update | PUT | `/api/v1/admin/admin-users/:id` | Body: `{"name":"X","role":"editor","isActive":true}` |
| Reset password | PUT | `/api/v1/admin/admin-users/:id/reset-password` | Body: `{"password":"newpass"}` |
| Delete | DELETE | `/api/v1/admin/admin-users/:id` | Not allowed for system user |

---

## 7. Public (no auth)

| Op   | Method | Endpoint | Verify |
|------|--------|----------|--------|
| Health | GET | `/health` | `curl -s http://localhost:3000/health` |
| Ping | GET | `/api/v1/public/ping` | |
| Settings | GET | `/api/v1/public/settings` | |
| Page by slug | GET | `/api/v1/public/pages/:slug` | Published pages only |

---

## One-command verify (all operations)

```bash
./scripts/verify-all-apis.sh
```

Or with custom credentials:

```bash
ADMIN_EMAIL=admin@local.test ADMIN_PASSWORD=c6IRZ8sRWScSHpc8RBTmHsnC ./scripts/verify-all-apis.sh
```
