# Handover: Admin API (TOG Backend)

**Document purpose:** Onboard another developer to the **admin (CMS) API** — how authentication works, how responses are shaped, and how to call each group of endpoints.  
**Companion:** `HANDOVER_PUBLIC_API.md` (public website API).  
**Exhaustive reference:** `AdminApi.md` (full route tables and validation).

---

## 1. Base URL and environment

- **Local:** `http://localhost:3000` (or whatever `PORT` is in `.env`).
- **Production:** Your API host, e.g. `https://api.theoceangame.com`.
- **All admin routes** are under:  
  **`/api/v1/admin`**

Example login URL:

`POST https://api.example.com/api/v1/admin/auth/login`

Required environment variables for admin auth (see `.env.example`): `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, SMTP settings if you use forgot-password or newsletters, etc.

---

## 2. Authentication

Almost every admin route expects an **access token** in the header:

```http
Authorization: Bearer <accessToken>
```

**Exceptions (no Bearer token):**

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

**Typical frontend flow**

1. User logs in → save `accessToken` and `refreshToken` securely.
2. Attach `Authorization: Bearer …` to all CMS requests.
3. If a call returns **401** with `error.code === "TOKEN_EXPIRED"` → call **`POST /auth/refresh`** with body `{ "refreshToken": "…" }` → replace stored tokens → retry the original request.

**Rate limiting and lockouts:** Failed logins are tracked per IP. Too many failures can return **403** with `IP_BLOCKED`. See `AdminApi.md` → Security.

---

## 3. Response shape

Success:

```json
{
  "data": { … }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "…",
    "details": { … }
  }
}
```

**Content ownership:** Most create/update/delete routes enforce “editors only edit **their own** content”; `super_admin` and `admin` can usually edit anyone’s. Lists and detail responses often include **`createdBy`** and **`updatedBy`** as `{ id, name, email }` for the UI.

---

## 4. Authentication and profile

| What | Method | Path | Notes |
|------|--------|------|--------|
| Login | POST | `/auth/login` | Body: `email`, `password`. Returns `accessToken`, `refreshToken`, `user`. |
| Refresh | POST | `/auth/refresh` | Body: `refreshToken`. |
| Logout | POST | `/auth/logout` | Body: `refreshToken`. |
| Forgot password | POST | `/auth/forgot-password` | Body: `email`. Email contains reset link (SMTP configured in `.env`). |
| Reset password | POST | `/auth/reset-password` | Body: `token`, `newPassword`. |
| Change password | POST | `/auth/change-password` | Bearer. Body: `currentPassword`, `newPassword`. |
| Current user | GET | `/me` | Bearer. Profile, **authorSlug** (for public author URL), stats, `lastLoginAt`, `createdBy`. |
| Update profile | PUT | `/me` | Bearer. Optional: `name`, `bio`, `avatarUrl`, **`authorSlug`** (public `/author/:slug`; unique), `profilePublic`, `showEmailPublicly`. **409** if `authorSlug` taken. Images: upload first via **`POST /upload/image`**, then set `avatarUrl` to returned URL. |

---

## 5. Dashboard

**GET `/dashboard`** (Bearer; all roles: `super_admin`, `admin`, `editor`, `seo_editor`)

Used to build the admin dashboard UI.

- **Super admin / admin:** Global content counts, draft/pending/published summaries (global + “mine”), recent activity across the site, recent logins, editors directory (with activity counts), newsletter subscriber count.
- **Editor / SEO editor:** Their own status summary, their own recent updates, and an editors directory (without admin-only metrics).

Detailed field list: **`AdminApi.md`** → Dashboard.

---

## 6. Media upload

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/upload/image` | Multipart field **`image`**. JPEG/PNG/GIF/WebP, max 5MB. Response: `{ data: { url } }`. Use that URL in `featureImg`, `avatarUrl`, site logo, etc. |
| DELETE | `/upload/image` | Query `?path=/uploads/images/file.jpg` or JSON body `{ "path": "…" }` or `{ "url": "…" }`. Only paths under `uploads/images/` are allowed. |

When you **delete** a casino, article, game, blog, news item, bonus, or bonus article via the CMS, the server also **deletes the feature image file** from disk if one was stored.

---

## 7. Site settings and static pages

- **GET/PUT `/settings`** — Site name, logo, favicon, colors, support email, socials, maintenance flag.
- **GET/POST/GET /pages/:id/PUT/DELETE** — Static HTML pages (`contentHtml`, `slug`, SEO fields). Editors may only modify pages they created (unless admin).

---

## 8. Casinos

Casinos have a **landing-page body** and SEO fields (TipTap **`content`**, **`seoTitle`**, **`seoDesc`**) in addition to ratings, bonuses metadata, etc.

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/casinos` ? `page`, `limit`, `status`, `q` |
| Create | POST | `/casinos` |
| By slug (editing deep link) | GET | **`/casino/:slug`** |
| By id | GET | `/casinos/:id` |
| Update | PUT | `/casinos/:id` |
| Publish state | PATCH | `/casinos/:id/status` |
| Delete | DELETE | `/casinos/:id` |

**Validation** (lengths, required fields): see **`AdminApi.md`** → *Casinos – validation*. Sending unknown JSON keys returns **400** (strict schema).

---

## 9. Games (slot/catalogue titles, not “game articles”)

Games are linked to **one or more casinos** via UUIDs **`casinoIds`**.

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/games` |
| Create | POST | `/games` — **required:** `title`, `slug`, **`casinoIds`** (array of casino UUIDs, at least one). Optional SEO + TipTap **`content`**, **`focusKeywords`**, etc. |
| By slug | GET | **`/game/:slug`** |
| By id | GET | `/games/:id` |
| Update | PUT | `/games/:id` — optional **`casinoIds`** replaces all links (still ≥1 when sent) |
| Status | PATCH | `/games/:id/status` |
| Delete | DELETE | `/games/:id` |

**How to populate `casinoIds`:** Call **GET `/casinos`**, let the user pick casinos, send each row’s **`id`** (not slug). Invalid or missing casino IDs return **400** `INVALID_CASINOS`.

List/detail responses include **`casinos`**: `[{ id, casinoName, slug }, …]`.

---

## 10. Articles and editorial content

These follow the same pattern: list with filters, create, get by id, update, delete. **Editor** users only touch rows where they are `createdById` (unless `super_admin`/`admin`).

- **Casino articles** — `/casino-articles`
- **Game articles** (long-form about games) — `/game-articles`
- **Blogs** — `/blogs` (featured flag on list filter)
- **News** — `/news` (trending flag on list filter)
- **Bonuses** — `/bonuses` (optional **`featureImg`**)
- **Bonus articles** — `/bonus-articles`

Each article-like type supports TipTap **`content`**, **`seoTitle`**, **`seoDesc`**, **`focusKeywords`**, scheduling via **`publishDate`**, etc. See **`AdminApi.md`** per model.

---

## 11. User management and roles (restricted)

- **`/role/editors`**, **`/role/history`**, **`POST /role/reassign`** — **`super_admin`** and **`admin`** only. Used to move content between users.
- **`/admin-users`** — Create/list/update/revoke/delete staff accounts per role rules in **`AdminApi.md`** → Roles.

---

## 12. Newsletter (CMS side)

**GET `/newsletter`** — Paginated list of subscribers (`subscribed` / `unsubscribed` filter). Public subscribe/unsubscribe lives on the **public** API.

---

## 13. Roles at a glance

| Role | Typical use |
|------|-------------|
| **super_admin** | Full system access; user management. |
| **admin** | Manage editors, all content, reassign. |
| **editor** / **seo_editor** | Create/edit **own** content only; no user admin routes. |

---

## 14. Where the code lives

- Route mounting: `src/routes/index.js` → `src/routes/admin/index.js`
- Auth: `src/routes/admin/auth.js`
- Per resource: `src/routes/admin/*.js` (e.g. `casinos.js`, `games.js`, `me.js`)
- Prisma schema: `prisma/schema.prisma`

---

## 15. Further reading

- **`AdminApi.md`** — Complete route table, dashboard fields, validation tables, error codes.
- **`DEPLOYMENT.md`** — How to run on a VPS (Node, PM2, Nginx, migrations).
- **`LOGIN_TROUBLESHOOTING.md`** — If login or Docker DB connection fails.

---

*End of Admin API handover. For the public website consumer API, open **`HANDOVER_PUBLIC_API.md`**.*
