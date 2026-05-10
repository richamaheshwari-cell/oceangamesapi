# TOG Backend – Admin API

All admin endpoints. Base URL: `http://localhost:3000`. Prefix: `/api/v1/admin`.  
**Auth:** `Authorization: Bearer <accessToken>` on every route except login, refresh, logout.  
**Token refresh:** If a request returns **401** with `error.code === "TOKEN_EXPIRED"`, call **POST /api/v1/admin/auth/refresh** with body `{ "refreshToken": "<stored_refresh_token>" }`, then retry the request with the new `accessToken`.

---

## Base

| Item | Value |
|------|--------|
| **Success** | `{ "data": <payload> }` |
| **Error** | `{ "error": { "code", "message", "details"?: object } }` |

**Author object:** `{ id, name, email }` — returned as **createdBy** and **updatedBy** on Pages, Casinos, Casino articles, Games, Game articles, Blogs, News, **Bonuses**, **Bonus articles**.

---

## Quick route table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/admin/auth/login` | No | Body: `email`, `password`. Returns `accessToken`, `refreshToken`, `user`. Updates **lastLoginAt**. Rate-limited. |
| POST | `/api/v1/admin/auth/refresh` | No | Body: `refreshToken`. |
| POST | `/api/v1/admin/auth/logout` | No | Body: `refreshToken`. |
| POST | `/api/v1/admin/auth/forgot-password` | No | Body: `email`. Sends reset link by email (nodemailer). Same response whether email exists. Rate-limited. |
| POST | `/api/v1/admin/auth/reset-password` | No | Body: `token`, `newPassword`. Sets new password from email link. Rate-limited. |
| POST | `/api/v1/admin/auth/change-password` | Bearer | Body: `currentPassword`, `newPassword`. |
| GET | `/api/v1/admin/me` | Bearer | Current user profile + **authorSlug** (public `/author/:slug`), **lastLoginAt**, **createdAt**, **createdBy** + stats + profilePublic, showEmailPublicly. |
| PUT | `/api/v1/admin/me` | Bearer | Update profile. Body: name, bio, avatarUrl, **authorSlug** (URL slug for public author page; `""` to clear; min 2 chars when set; unique), profilePublic, showEmailPublicly (all optional). **409** if slug taken. |
| GET | `/api/v1/admin/dashboard` | Bearer | **Dashboard data (role-based).** super_admin/admin: global totals, global + my status summary, recent content (all), recent logins, editors directory (with postCount), subscribers count. editor/seo_editor: my status summary, my recent content, editors directory. See **Dashboard** section below. |
| POST | `/api/v1/admin/upload/image` | Bearer | Upload image. Multipart field `image` (JPEG/PNG/GIF/WebP, max 5MB). Returns `{ data: { url } }`. |
| DELETE | `/api/v1/admin/upload/image` | Bearer | Delete image by path. Query `?path=/uploads/images/xxx.jpg` or body `{ path }` or `{ url }`. Returns `{ data: { deleted: true\|false } }`. Only files under `uploads/images/` are allowed. |
| GET | `/api/v1/admin/settings` | Bearer | Get site settings. |
| PUT | `/api/v1/admin/settings` | Bearer | Update. Body: siteName, logoUrl, faviconUrl, primaryColor, supportEmail, socials, maintenanceMode (all optional). |
| GET | `/api/v1/admin/pages` | Bearer | List pages. |
| POST | `/api/v1/admin/pages` | Bearer | Create. Body: slug, title, contentHtml; optional seoTitle, seoDesc, isPublished, sortOrder. |
| GET | `/api/v1/admin/pages/:id` | Bearer | One page. |
| PUT | `/api/v1/admin/pages/:id` | Bearer | Update (partial). Editor: only own. |
| DELETE | `/api/v1/admin/pages/:id` | Bearer | Delete. Editor: only own. |
| GET | `/api/v1/admin/casinos` | Bearer | List. Query: page, limit, status, q. |
| POST | `/api/v1/admin/casinos` | Bearer | Create. Body: **required** casinoName (2–120), slug (2–140); optional fields with limits — see **Casinos – validation** below. |
| GET | `/api/v1/admin/casino/:slug` | Bearer | One casino by slug (e.g. `/api/v1/admin/casino/royal-vegas`). Full details including seoTitle, seoDesc, content. |
| GET | `/api/v1/admin/casinos/:id` | Bearer | One casino by id. |
| PUT | `/api/v1/admin/casinos/:id` | Bearer | Update (partial). Optional **seoTitle**, **seoDesc**, **content**. Editor: only own. |
| PATCH | `/api/v1/admin/casinos/:id/status` | Bearer | Body: `{ "status": "published" \| "draft" \| "pending" }`. |
| DELETE | `/api/v1/admin/casinos/:id` | Bearer | Delete. Editor: only own. |
| GET | `/api/v1/admin/casino-articles` | Bearer | List. Query: status, page, limit, q. |
| POST | `/api/v1/admin/casino-articles` | Bearer | Create. Body: title, slug, shortDesc, publishDate, readTime; optional featureImg, content, tags, gameSlugs, seoTitle, seoDesc, focusKeywords, status. |
| GET | `/api/v1/admin/casino-articles/:id` | Bearer | One casino article. |
| PUT | `/api/v1/admin/casino-articles/:id` | Bearer | Update (partial). Editor: only own. |
| DELETE | `/api/v1/admin/casino-articles/:id` | Bearer | Delete. Editor: only own. |
| **GET** | **`/api/v1/admin/games`** | **Bearer** | **List games. Query: page, limit, status, q. Each item includes **casinos** (linked casinos: id, casinoName, slug).** |
| **POST** | **`/api/v1/admin/games`** | **Bearer** | **Create game. Required: title, slug, **casinoIds** (array of UUID, min 1, max 100). Optional: featureImg, tag, gameProvider[], gameDetails[], clientLink, status, **seoTitle**, **seoDesc**, **focusKeywords**[], **content** (TipTap). See **Games – validation**.** |
| **GET** | **`/api/v1/admin/game/:slug`** | **Bearer** | **One game by slug (full fields + **casinos**).** |
| **GET** | **`/api/v1/admin/games/:id`** | **Bearer** | **One game by id.** |
| **PUT** | **`/api/v1/admin/games/:id`** | **Bearer** | **Update (partial). Optional **casinoIds** (replaces links; min 1 when sent). Editor: only own.** |
| **PATCH** | **`/api/v1/admin/games/:id/status`** | **Bearer** | **Body: `{ "status": "published" \| "draft" \| "pending" }`.** |
| **DELETE** | **`/api/v1/admin/games/:id`** | **Bearer** | **Delete. Editor: only own.** |
| **GET** | **`/api/v1/admin/game-articles`** | **Bearer** | **List game articles. Query: status, page, limit, q.** |
| **POST** | **`/api/v1/admin/game-articles`** | **Bearer** | **Create game article. Body: same as casino article (title, slug, shortDesc, publishDate, readTime; optional featureImg, content, tags, gameSlugs, seoTitle, seoDesc, focusKeywords, status).** |
| **GET** | **`/api/v1/admin/game-articles/:id`** | **Bearer** | **One game article.** |
| **PUT** | **`/api/v1/admin/game-articles/:id`** | **Bearer** | **Update (partial). Editor: only own.** |
| **DELETE** | **`/api/v1/admin/game-articles/:id`** | **Bearer** | **Delete. Editor: only own.** |
| **GET** | **`/api/v1/admin/blogs`** | **Bearer** | **List blogs. Query: status, isFeatured (true/false), page, limit, q.** |
| **POST** | **`/api/v1/admin/blogs`** | **Bearer** | **Create blog. Body: title, slug, shortDesc, publishDate, readTime; optional featureImg, content, tags, seoTitle, seoDesc, focusKeywords, isFeatured, status.** |
| **GET** | **`/api/v1/admin/blogs/:id`** | **Bearer** | **One blog.** |
| **PUT** | **`/api/v1/admin/blogs/:id`** | **Bearer** | **Update (partial). Editor: only own.** |
| **DELETE** | **`/api/v1/admin/blogs/:id`** | **Bearer** | **Delete. Editor: only own.** |
| **GET** | **`/api/v1/admin/news`** | **Bearer** | **List news. Query: status, isTrending (true/false), page, limit, q.** |
| **POST** | **`/api/v1/admin/news`** | **Bearer** | **Create news. Body: title, slug, shortDesc, publishDate, readTime; optional featureImg, content, tags, seoTitle, seoDesc, focusKeywords, isTrending, status.** |
| **GET** | **`/api/v1/admin/news/:id`** | **Bearer** | **One news.** |
| **PUT** | **`/api/v1/admin/news/:id`** | **Bearer** | **Update (partial). Editor: only own.** |
| **DELETE** | **`/api/v1/admin/news/:id`** | **Bearer** | **Delete. Editor: only own.** |
| **GET** | **`/api/v1/admin/bonuses`** | **Bearer** | **List bonuses. Query: status, page, limit, q. Returns createdBy, updatedBy.** |
| **POST** | **`/api/v1/admin/bonuses`** | **Bearer** | **Create bonus. Body: title, slug, highlight, bonusType, iconKey; optional description[], **clientLink** (URL; omit or `""`/`null` if not set yet), featureImg (URL from upload), status.** |
| **GET** | **`/api/v1/admin/bonuses/:id`** | **Bearer** | **One bonus.** |
| **PUT** | **`/api/v1/admin/bonuses/:id`** | **Bearer** | **Update (partial). Optional featureImg (URL or null to clear). Editor: only own.** |
| **DELETE** | **`/api/v1/admin/bonuses/:id`** | **Bearer** | **Delete bonus and its feature image file. Editor: only own.** |
| **GET** | **`/api/v1/admin/bonus-articles`** | **Bearer** | **List bonus articles. Query: status, bonusId, page, limit, q. Returns createdBy, updatedBy, bonus.** |
| **POST** | **`/api/v1/admin/bonus-articles`** | **Bearer** | **Create bonus article. Body: same as casino article (title, slug, shortDesc, publishDate, readTime; optional featureImg, content, tags, gameSlugs, seoTitle, seoDesc, focusKeywords, status). No bonusId — independent like casino articles.** |
| **GET** | **`/api/v1/admin/bonus-articles/:id`** | **Bearer** | **One bonus article (by id).** |
| **PUT** | **`/api/v1/admin/bonus-articles/:id`** | **Bearer** | **Update (partial). Optional bonusId to link to a bonus. Editor: only own.** |
| **DELETE** | **`/api/v1/admin/bonus-articles/:id`** | **Bearer** | **Delete. Editor: only own.** |
| GET | `/api/v1/admin/role/editors` | Bearer | List users for reassign (super_admin/admin only). |
| GET | `/api/v1/admin/role/history` | Bearer | Role assignment history. Query: userId, page, limit. |
| POST | `/api/v1/admin/role/reassign` | Bearer | Reassign content. Body: fromUserId, toUserId, contentType ("casino" \| "page" \| "casino_article" \| "game" \| "game_article" \| "blog" \| "news" \| **"bonus"** \| **"bonus_article"** \| "all"), optional ids. Show data.message. |
| GET | `/api/v1/admin/admin-users` | Bearer | List admin users (super_admin/admin only). Each item includes **lastLoginAt** (last login time). |
| POST | `/api/v1/admin/admin-users` | Bearer | Create user. Body: email, password, role; optional name, isActive. |
| PUT | `/api/v1/admin/admin-users/:id` | Bearer | Update (super_admin only). |
| POST | `/api/v1/admin/admin-users/:id/revoke` | Bearer | Revoke access. Body: reassignToUserId (optional). Reassigns games, game articles, blogs, news, bonuses, bonus articles too. |
| PUT | `/api/v1/admin/admin-users/:id/reset-password` | Bearer | Force-set password (super_admin only). |
| DELETE | `/api/v1/admin/admin-users/:id` | Bearer | Delete (super_admin only). |
| GET | `/api/v1/admin/newsletter` | Bearer | List newsletter subscriptions. Query: **page**, **limit**, **status** (`subscribed` \| `unsubscribed`). Returns items (email, subscribed, subscribedAt, unsubscribedAt, createdAt, updatedAt). |

---

## Dashboard

**GET /api/v1/admin/dashboard** returns role-based data for the Admin and Editor dashboards. All four roles (super_admin, admin, editor, seo_editor) are allowed.

### super_admin / admin response

| Field | Type | Description |
|-------|------|--------------|
| **role** | string | `super_admin` or `admin`. |
| **globalTotals** | object | Counts: `pages`, `casinos`, `casinoArticles`, `games`, `gameArticles`, `blogs`, `news`, `bonuses`, `bonusArticles`, `subscribers`. |
| **globalStatusSummary** | array | Per content type: `{ type, label, draft, pending, published }`. Pages use `published`/`draft` only (pending = 0). |
| **myStatusSummary** | array | Same shape as globalStatusSummary but only for content **created by the current user**. |
| **recentUpdated** | array | Up to 20 most recently updated items across all types. Each: `{ id, type, title, status, updatedAt, updatedBy: { id, name, email } }`. `type` is one of: `pages`, `casinos`, `casino_articles`, `games`, `game_articles`, `blogs`, `news`, `bonuses`, `bonus_articles`. |
| **recentLogins** | array | Up to 10 admin users with **lastLoginAt** set, sorted by last login (most recent first). Each: `{ id, name, email, role, lastLoginAt }`. |
| **editorsDirectory** | array | Editors, SEO editors, and admins (active only). Each: `{ id, name, email, role, postCount }`. Sorted by **postCount** descending (most active first). |
| **subscribersCount** | number | Count of newsletter subscriptions where `subscribed === true`. |

### editor / seo_editor response

| Field | Type | Description |
|-------|------|--------------|
| **role** | string | `editor` or `seo_editor`. |
| **myStatusSummary** | array | Draft/pending/published breakdown **for content created by the current user** only. Same shape as above. |
| **recentUpdated** | array | Up to 20 most recently updated items **created by the current user** only. Same shape as above. |
| **editorsDirectory** | array | Same as admin (editors, seo_editors, admins; no **postCount** in this response). |

**My stats (totals by type)** are already returned by **GET /api/v1/admin/me** in `stats` (e.g. `pagesCreated`, `casinosCreated`, …). Use the dashboard for status breakdown and recent activity; use **/me** for simple totals.

---

## Security (rate limiting and IP blocking)

- **Admin auth paths** (`/api/v1/admin/auth/*`): Rate limit applies (default 20 requests per 15 min per IP). After **too many failed logins** from the same IP, that IP is **blocked** for a period (default 1 hour). Blocked requests get **403** with `error.code === "IP_BLOCKED"`. Configure via env: `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_BLOCK_AFTER_FAILS`, `RATE_LIMIT_BLOCK_DURATION_MS`, `RATE_LIMIT_FAIL_WINDOW_MS`.
- **Public newsletter** (`/api/v1/public/newsletter/*`): Rate limit (default 10 requests per 15 min per IP). Over limit returns **429** with `error.code === "TOO_MANY_REQUESTS"`.
- All limits and block duration are configurable in `.env` (see `.env.example`).

---

## Games (model)

**Fields:** id, title, slug, featureImg, **tag** (single string), **gameProvider** (string[]), **gameDetails** (string[]), clientLink, status, **seoTitle**, **seoDesc**, **focusKeywords** (string[]), **content** (TipTap JSON), **casinos** (array of `{ id, casinoName, slug }` — games are linked to 1+ casinos), createdBy, updatedBy, createdAt, updatedAt.

- POST body required: **title**, **slug**, **casinoIds** (UUID array, 1–100 unique casinos; all must exist or **400 INVALID_CASINOS**). Optional: featureImg, tag, gameProvider, gameDetails, clientLink, status (default draft), seoTitle, seoDesc, focusKeywords, content.
- PUT: optional **casinoIds** — when sent, replaces all casino links (must still be min 1).
- **GET /api/v1/admin/game/:slug** — fetch one game by slug (same shape as get-by-id).
- Same ownership rules as casinos: editor can only edit/delete own; admin/super_admin can any.

### Games – validation (Admin UI)

| Field | Create | Update | Rules |
|-------|--------|--------|-------|
| **title** | Required | Optional | 2–200 chars |
| **slug** | Required | Optional | 2–200 chars (normalized server-side) |
| **casinoIds** | **Required** | Optional | Array of UUID strings, **min 1**, max 100 |
| **featureImg** / **clientLink** | Optional | Optional | Valid URL or omit / `""` → null |
| **tag** | Optional | Optional | max 80 chars or null |
| **gameProvider** / **gameDetails** | Optional | Optional | string arrays (per-item min 1, max 120 / 200) |
| **status** | Optional | Optional | `draft` (default) / `published` / `pending` |
| **seoTitle** | Optional | Optional | max 200; `""` → null |
| **seoDesc** | Optional | Optional | max 500; `""` → null |
| **focusKeywords** | Optional | Optional | array of strings, each 1–80 chars |
| **content** | Optional | Optional | TipTap JSON or null |

---

## Game articles (model)

Same shape as **Casino articles**: id, title, slug, featureImg, shortDesc, publishDate, readTime, content, tags, gameSlugs, seoTitle, seoDesc, focusKeywords, status, createdBy, updatedBy, createdAt, updatedAt.

- POST body required: title, slug, shortDesc, publishDate, readTime. Optional: featureImg, content, tags, gameSlugs, seoTitle, seoDesc, focusKeywords, status.
- Same ownership as casino articles.

---

## Blogs (model)

Same shape as **articles** (no gameSlugs): id, title, slug, featureImg, shortDesc, publishDate, readTime, content, tags, seoTitle, seoDesc, focusKeywords, **isFeatured** (boolean), status, createdBy, updatedBy, createdAt, updatedAt.

- **List filter:** Query **isFeatured** (`true` / `false`) to filter by featured blogs. Also **status**, **q** (search title/slug), **page**, **limit**.
- POST body required: title, slug, shortDesc, publishDate, readTime. Optional: featureImg, content, tags, seoTitle, seoDesc, focusKeywords, **isFeatured** (default false), status.
- Same ownership as articles: editor can only edit/delete own; admin/super_admin can any.

---

## News (model)

Same shape as **articles** (no gameSlugs): id, title, slug, featureImg, shortDesc, publishDate, readTime, content, tags, seoTitle, seoDesc, focusKeywords, **isTrending** (boolean), status, createdBy, updatedBy, createdAt, updatedAt.

- **List filter:** Query **isTrending** (`true` / `false`) to filter by trending news. Also **status**, **q** (search title/slug), **page**, **limit**.
- POST body required: title, slug, shortDesc, publishDate, readTime. Optional: featureImg, content, tags, seoTitle, seoDesc, focusKeywords, **isTrending** (default false), status.
- Same ownership as articles: editor can only edit/delete own; admin/super_admin can any.
- **Performance:** List endpoint returns lean payload (no `content`); single-item and create/update return full record.

---

## Bonus (model)

**Fields:** id, title, slug, **featureImg** (optional URL), description (string[]), **clientLink** (optional URL), highlight, bonusType, iconKey, status, createdBy, updatedBy, createdAt, updatedAt.

- **List filter:** Query **status**, **q** (search title/slug), **page**, **limit**. All list/get responses include **createdBy** and **updatedBy** (Author object).
- POST body required: **title**, **slug**, **highlight**, **bonusType**, **iconKey**. Optional: **clientLink** (valid URL, or omit / `""` / `null` for no link yet), **featureImg** (URL from upload), description (array, default []), status (default draft).
- PUT: optional **clientLink** (URL, or `null` / `""` to clear). Optional **featureImg** (URL or null to clear). Deleting a bonus also deletes its feature image file from disk.
- Same ownership: editor can only edit/delete own; admin/super_admin can any.

---

## Bonus articles (model)

Same shape as **Casino articles** plus **bonusId**: id, title, slug, featureImg, shortDesc, publishDate, readTime, content, tags, gameSlugs, seoTitle, seoDesc, focusKeywords, status, bonusId, createdBy, updatedBy, createdAt, updatedAt.

- **List filter:** Query **status**, **bonusId** (optional), **page**, **limit**, **q**. Responses include **createdBy**, **updatedBy**, and **bonus** (id, title, slug) when linked.
- POST body: same as **Casino articles** (title, slug, shortDesc, publishDate, readTime; optional featureImg, content, tags, gameSlugs, seoTitle, seoDesc, focusKeywords, status). No bonusId — bonus articles are independent like casino articles.
- Same ownership as casino articles: editor can only edit/delete own; admin/super_admin can any.

---

## Image upload

- **POST** `/api/v1/admin/upload/image` — multipart field **image** (JPEG/PNG/GIF/WebP, max 5MB). Returns `{ data: { url } }`. Use for logoUrl, faviconUrl, featureImg (casinos, articles, games, blogs, news, **bonuses**), avatarUrl.
- **DELETE** `/api/v1/admin/upload/image` — delete image file by path. Query `?path=/uploads/images/xxx.jpg` or body `{ path }` or `{ url }`. Admin auth required. Returns `{ data: { deleted: true|false } }`. Only paths under `uploads/images/` are allowed.
- **Cascade delete:** When you delete a casino, casino article, game, game article, blog, news, bonus, or bonus article, its **feature image file** is automatically deleted from disk (if one was set).

---

## Auth & profile

- **Login** — POST .../auth/login. Body: email, password. Data: accessToken, refreshToken, user. Server stores **lastLoginAt** on success. Failed attempts are counted per IP; too many can **block** the IP (see Security).
- **Refresh** — POST .../auth/refresh. Body: refreshToken.
- **Logout** — POST .../auth/logout. Body: refreshToken.
- **Forgot password** — POST .../auth/forgot-password. Body: email. If the email is a registered admin, sends a reset link by email (nodemailer; SMTP in .env). Response is the same whether the email exists or not. Link points to your frontend (RESET_PASSWORD_LINK_BASE) with `?token=...`.
- **Reset password** — POST .../auth/reset-password. Body: token (from email link), newPassword. Invalid/expired/used token returns 400 INVALID_TOKEN.
- **Change password** — POST .../auth/change-password. Body: currentPassword, newPassword (authenticated).
- **GET /me** — id, email, name, role, isActive, bio, avatarUrl, **authorSlug** (for public `/author/:slug`), profilePublic, showEmailPublicly, mustChangePassword, **lastLoginAt**, **createdAt**, **createdBy**, stats (…).
- **PUT /me** — optional **authorSlug**: public profile URL segment; empty string clears; **409 SLUG_TAKEN** if duplicate.
- **PUT /me** — Body: name, bio, avatarUrl, profilePublic, showEmailPublicly (all optional).

When an admin is **created** via POST .../admin-users, the creating admin's id is stored as **createdBy**; GET /me returns that creator info.

---

## Settings, Pages, Casinos, Casino articles

See route table above. Same patterns: list with pagination, create, get one, update, delete; editors only own content.

**Casinos (model):** In addition to casinoName, slug, featureImg, rating, status, etc., casinos support **seoTitle**, **seoDesc**, and **content** (TipTap JSON). Use **GET /api/v1/admin/casino/:slug** to fetch one casino by slug.

### Casinos – validation for Admin UI (avoid `VALIDATION_ERROR`)

Use these rules in the admin form so the API does not return **400 Invalid request body**.

#### POST `/api/v1/admin/casinos` (create)

| Field | Required | Min chars | Max chars / range | Notes |
|-------|:--------:|:---------:|-------------------|-------|
| **casinoName** | ✅ Yes | 2 | 120 | Trimmed on save. |
| **slug** | ✅ Yes | 2 | 140 | Server normalizes to lowercase, `a-z0-9` and hyphens only. |
| **status** | No | — | — | Default `draft`. One of: `published`, `draft`, `pending`. |
| **featureImg** | No | — | — | Valid URL, or omit / empty string → `null`. |
| **clientLink** | No | — | — | Valid URL, or omit / empty string → `null`. |
| **rating** | No | — | 0–5 (number) | Omit or `null` allowed. |
| **reviewCount** | No | — | integer ≥ 0 | Default `0`. |
| **totalGames** | No | — | integer ≥ 0 | Default `0`. |
| **bonusAmt** | No | — | 120 | If sent as string, max length 120; can be `null`. |
| **bonusDetails** | No | per item: 1–80 | array of strings | Each string 1–80 chars; default `[]`. |
| **tags** | No | per tag: 1–40 | array of strings | Each tag 1–40 chars; default `[]`. |
| **payoutSpeed** | No | — | 60 | Max 60 chars; can be `null`. |
| **seoTitle** | No | — | 200 | Empty string → `null`. |
| **seoDesc** | No | — | 500 | Empty string → `null`. |
| **content** | No | — | — | TipTap JSON object/array or `null`; no length check server-side. |

**Body must be JSON only** (no extra keys). Unknown keys → validation error (`.strict()`).

#### PUT `/api/v1/admin/casinos/:id` (update)

Same limits as above for any field you send. **All fields optional** (partial update). If you send **casinoName** or **slug**, they must still meet min/max when present. **slug** min 2, max 140 when provided.

#### GET `/api/v1/admin/casinos` (list query)

| Query | Required | Rules |
|-------|:--------:|-------|
| **page** | No | integer ≥ 1, default `1`. |
| **limit** | No | integer 1–100, default `20`. |
| **status** | No | `published` \| `draft` \| `pending`. |
| **q** | No | search string (optional). |

---

## Role reassign & revoke

- **contentType** for reassign: `"casino"` \| `"page"` \| `"casino_article"` \| `"game"` \| `"game_article"` \| `"blog"` \| `"news"` \| **`"bonus"`** \| **`"bonus_article"`** \| `"all"`.
- **Revoke** reassigns all target user content (including games, game articles, blogs, news, bonuses, bonus articles) when reassignToUserId is provided.

---

## Roles

| Role | Capabilities |
|------|--------------|
| super_admin | Full access; manage users; reassign/revoke; edit/delete any content. |
| admin | Create editors; list users; reassign; revoke editors; edit/delete any content. |
| editor / seo_editor | Create content; edit/delete only own. No /role/* or admin-users. |

---

## CreatedBy / UpdatedBy – Admin checklist

All content APIs return **createdBy** and **updatedBy** (Author object: id, name, email) on list, get-one, create, and update so the admin UI can show “who created” and “who last updated”.

**If you add a new content type later**, update these places so createdBy/updatedBy and ownership stay consistent:

1. **Schema** — Model has `createdById`, `updatedById`; AdminUser has `relationCreated`, `relationUpdated`.
2. **Admin route** — Use `includeCreator` (createdBy, updatedBy select) on list, get-one, create, update.
3. **Reassign** — Add `contentType: "new_type"` and `"all"` in `role.js`; add `whereNewType` and `prisma.newType.updateMany`.
4. **Revoke** — In `adminUsers.js` revoke handler, add `prisma.newType.updateMany` and count in message/response.
5. **GET /me** — In `me.js`, add `prisma.newType.count({ where: { createdById: userId } })` and `newTypeCreated` in stats.
6. **Public editor profile** — In `public/editors.js`, add count for published items and `newTypeCreated` in stats.
7. **Docs** — Add route table rows, model section, Author object mention, reassign/revoke/me/editors mentions.

---

## Error codes

| Code | HTTP | Meaning |
|------|------|--------|
| UNAUTHORIZED | 401 | Refresh or login. |
| FORBIDDEN | 403 | Not allowed (role or not owner). |
| IP_BLOCKED | 403 | Too many failed attempts from this IP; try again later. |
| NOT_FOUND | 404 | Resource not found. |
| VALIDATION_ERROR | 400 | Invalid body/query; use error.details. |
| INVALID_TOKEN | 400 | Password reset token invalid, expired, or already used. |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded. |
| SLUG_EXISTS | 409 | Slug already in use. |
| EMAIL_EXISTS | 409 | Email already in use. |
| EMAIL_FAILED | 503 | Could not send email (e.g. SMTP not configured or send failed). |
| SYSTEM_USER_LOCKED | 400 | Super admin cannot be changed/deleted/revoked. |
| INTERNAL_ERROR | 500 | Server error. |
