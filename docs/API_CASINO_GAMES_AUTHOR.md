# Latest APIs — Casino, Games & Author

Reference for APIs added or extended for **casinos** (SEO + content), **games** (SEO, TipTap, casino links), and **authors** (slug-based profile + posts).  
Base URLs: **Admin** `http://localhost:3000/api/v1/admin` (Bearer token), **Public** `http://localhost:3000/api/v1/public` (no auth).

---

## Casino (admin)

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/casino/:slug` | One casino by **slug** (full record: **seoTitle**, **seoDesc**, **content** TipTap, **createdBy**, **updatedBy**). |
| **POST** | `/casinos` | Create. Required: **casinoName**, **slug**. Optional: **featureImg**, **seoTitle**, **seoDesc**, **content**, … (see AdminApi — Casinos validation). |
| **PUT** | `/casinos/:id` | Update (partial). Optional **seoTitle**, **seoDesc**, **content**. |
| **GET** | `/casinos` | List (pagination, search). |
| **GET** | `/casinos/:id` | One casino by **id**. |

---

## Casino (public)

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/casinos` | List published casinos (pagination). |
| **GET** | `/casinos/:slug` | One published casino: list fields + **seoTitle**, **seoDesc**, **content**. |
| **GET** | `/casinos/:slug/games` | Games linked to this casino (published only). Query: **page**, **limit** (default **6**). Optional **excludeSlug** / **excludeId** to hide the current game on a game detail page. |

---

## Games (admin)

| Method | Path | Description |
|--------|------|-------------|
| **POST** | `/games` | Create. Required: **title**, **slug**, **casinoIds** (UUID array, min **1**, max 100). Optional: **seoTitle**, **seoDesc**, **focusKeywords**, **content** (TipTap), featureImg, tag, gameProvider, gameDetails, clientLink, status. |
| **PUT** | `/games/:id` | Update (partial). Optional **casinoIds** (replaces links; min 1 when sent). |
| **GET** | `/game/:slug` | One game by **slug** (includes **casinos** `[{ id, casinoName, slug }]`). |
| **GET** | `/games` | List games (each item includes linked **casinos**). |
| **GET** | `/games/:id` | One game by **id**. |
| **PATCH** | `/games/:id/status` | Change status. |
| **DELETE** | `/games/:id` | Delete game (+ feature image file if set). |

---

## Games (public)

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/games` | List all published games (pagination). |
| **GET** | `/games/:slug` | One game: **seoTitle**, **seoDesc**, **focusKeywords**, **content**, **casinos** (id, casinoName, slug, featureImg), … |

---

## Author (public)

Requires **authorSlug** to be set in admin (**PUT /api/v1/admin/me**). Public site URL pattern: **`/author/{authorSlug}`** (frontend); API paths below.

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/author/:slug` | Author profile: name, avatar, bio, **authorSlug**, **stats** (counts per post type + **postsTotal**). **404** if slug missing, user inactive, or **profilePublic** false. |
| **GET** | `/author/:slug/posts` | Paginated **published** posts by this author only. |

**Query on `/author/:slug/posts`**

| Param | Values / default |
|--------|-------------------|
| **type** | `all` (default) — mix of casino-articles, game-articles, blogs, news, bonus-articles. Or one of: `casino-articles`, `game-articles`, `blog`, `news`, `bonus-articles`. |
| **page** | Default `1`. |
| **limit** | Default **12**, max 100. |

**Each post item:** `id`, `type`, `title`, `slug`, **`path`** (e.g. `blogs/my-slug` — open as `/${path}` on the site), `publishDate`.

---

## Author (admin)

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/me` | Current user includes **authorSlug** (may be `null`). |
| **PUT** | `/me` | Body may include **authorSlug** (public URL segment; unique; `""` clears). **409** if slug taken. |

---

## Legacy (still available)

| Method | Path | Note |
|--------|------|------|
| **GET** | `/public/editors/:id` | Editor profile by **UUID**. Prefer **`/public/author/:slug`** when **authorSlug** is set. |

---

## Full documentation

- **Admin:** [AdminApi.md](./AdminApi.md) — casinos validation, games validation, `/me`.
- **Public:** [PublicApi.md](./PublicApi.md) — route table, casino+games summary, author section.

---

## Deploy checklist

After pulling code, run migrations so DB has casino SEO columns, **game_casinos**, game SEO columns, and **admin_users.authorSlug**:

```bash
npx prisma migrate deploy
npx prisma generate
```
