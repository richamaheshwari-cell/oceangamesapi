# Admin login troubleshooting

If you **cannot log in** to the admin panel, check the following.

---

## 1. Request format

- **URL:** `POST /api/v1/admin/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  { "email": "your@email.com", "password": "yourpassword" }
  ```
- **Success response:** `200` with `{ "data": { "accessToken", "refreshToken", "user" } }`

Wrong content-type or missing/invalid body → **400 VALIDATION_ERROR**.

---

## 2. Create an admin user (first time)

If no admin exists yet, the API returns **401 INVALID_CREDENTIALS** for any email/password.

1. In `.env` set:
   ```env
   ADMIN_EMAIL=your@email.com
   ADMIN_PASSWORD=your_secure_password
   ```
2. Run (with DB running and migrations applied):
   ```bash
   node src/scripts/createAdmin.js
   ```
3. Log in with that email and password.

---

## 3. Environment variables

Login and token issuance require:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Must be correct; DB must be running. |
| `ACCESS_TOKEN_SECRET` | Min 32 characters. If missing → 500 after password match. |
| `REFRESH_TOKEN_SECRET` | Min 32 characters. If missing → 500 after password match. |

Check `.env` and restart the server after changes.

---

## 4. User is inactive

If the admin user has **isActive = false**, login returns **401 INVALID_CREDENTIALS** (same as wrong password).  
Fix in DB or via another admin: set `isActive = true` for that user.

---

## 5. IP blocked (too many failed attempts)

After many failed logins from the same IP, the server returns **403 IP_BLOCKED** with message *"Too many failed attempts. Try again later."*

- Default: block after 10 fails in 15 minutes, for 1 hour.
- Env: `RATE_LIMIT_BLOCK_AFTER_FAILS`, `RATE_LIMIT_BLOCK_DURATION_MS`, `RATE_LIMIT_FAIL_WINDOW_MS`.
- Workaround: wait for the block to expire, or run the backend from another IP/network.

---

## 6. CORS (browser only)

If the **admin frontend** runs on a different origin (e.g. `http://localhost:3001`) and you see CORS errors in the browser console:

- In backend `.env` set **CORS_ORIGIN** to include that origin, e.g.:
  ```env
  CORS_ORIGIN=http://localhost:5173,http://localhost:3001
  ```
- Restart the backend.

---

## 7. Test login with curl

From the project root (backend running and DB up):

```bash
curl -s -X POST http://localhost:3000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | jq
```

- **401** + `INVALID_CREDENTIALS` → wrong email/password or user inactive or no user.
- **400** + `VALIDATION_ERROR` → body invalid (check email format, non-empty password).
- **403** + `IP_BLOCKED` → too many failed attempts from this IP.
- **500** → check server logs (often missing `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` or DB error).

If you get **200** and `accessToken` in the response, the backend login works; the issue is then on the frontend (URL, body, or CORS).

---

## 8. Docker and 500 errors

If you use **Docker** and get **500** on (almost) every request, it’s usually one of these.

### A. Database host when the app runs in Docker

If the **Node app runs inside a container**, `localhost` in `DATABASE_URL` points to the container itself, not the host. Postgres is in another container, so the app can’t connect → Prisma throws → **500**.

**Fix:** use the **Postgres service name** as host.

- In `docker-compose.yml` the Postgres service is named **`db`**.
- So inside the app container, use:
  ```env
  DATABASE_URL="postgresql://tiwarigaman:123456@db:5432/tog_db?schema=public"
  ```
- Not `localhost` (that would be the Node container).

If you run **only Postgres in Docker** and the **Node app on your machine** (e.g. `npm run dev`), then `localhost` is correct:
  ```env
  DATABASE_URL="postgresql://tiwarigaman:123456@localhost:5432/tog_db?schema=public"
  ```

### B. Migrations not applied

If the DB is new or was recreated, run migrations **after** the DB is up:

- **App on host:** `npx prisma migrate deploy`
- **App in Docker:** run the same inside the app container, or run it once from the host with `DATABASE_URL` pointing at the DB (e.g. `localhost:5432` if Postgres port is published).

Missing tables → Prisma errors → **500**.

### C. Env vars not passed into the container

If the app runs in Docker, `.env` on the host is not automatically used. Pass env into the container, e.g.:

- `docker run --env-file .env ...` or
- In `docker-compose`: `env_file: .env` and/or `environment: - DATABASE_URL=...`

Missing `ACCESS_TOKEN_SECRET` or `REFRESH_TOKEN_SECRET` → **500** when login succeeds and the server tries to issue tokens.

### D. Check server logs

The backend logs the real error for 500s (method, path, message, stack). Check the terminal or container logs to see whether it’s:

- **DB connection** (e.g. “Can’t reach database server”)
- **Missing env** (e.g. “ACCESS_TOKEN_SECRET is missing”)
- **Prisma** (e.g. “Table does not exist”)

That will tell you whether the issue is Docker (host) or env or migrations.
