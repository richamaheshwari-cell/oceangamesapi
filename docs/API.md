# TOG Backend – API Documentation

Base URL: `http://localhost:3000` (or your deployment URL).

---

## Documentation files

| File | Description |
|------|-------------|
| **[AdminApi.md](./AdminApi.md)** | All **admin** endpoints: auth, profile, upload, settings, pages, casinos, casino articles, games, game articles, blogs, news, **bonuses**, **bonus articles**, role, admin users. Use for the admin panel. |
| **[PublicApi.md](./PublicApi.md)** | All **public** endpoints: health, ping, settings, pages, casino articles, games, game articles, blogs, featuredBlogs, news, trendingNews, bonuses, bonus articles, **search** (typo tolerance + suggestions), editor profile. No auth. |

---

## Quick reference

- **Admin prefix:** `/api/v1/admin` — auth: `Authorization: Bearer <accessToken>` (except login, refresh, logout).
- **Public prefix:** `/api/v1/public` — no auth.
- **Success:** `{ "data": <payload> }`
- **Error:** `{ "error": { "code", "message", "details"?: object } }`

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check. `{ ok, service, time }`. |

---

*For full route lists, request/response shapes, and field details, see [AdminApi.md](./AdminApi.md) and [PublicApi.md](./PublicApi.md).*
