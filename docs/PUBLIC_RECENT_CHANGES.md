# Public API — recent changes (reference)

Prefix: **`/api/v1/public`**. No authentication.

---

## Casino

| Method | Path | Notes |
|--------|------|--------|
| GET | `/casinos/:slug` | One **published** casino. Includes **seoTitle**, **seoDesc**, **content** (TipTap). |
| GET | `/casinos/:slug/games` | Games linked to this casino (published). Query: **page**, **limit** (default **6**, max 100). Optional **excludeSlug** / **excludeId** to omit the open game on a game detail page. |

---

## Games

| Method | Path | Notes |
|--------|------|--------|
| GET | `/games/:slug` | One **published** game. Includes **seoTitle**, **seoDesc**, **focusKeywords**, **content**, **casinos** (id, casinoName, slug, featureImg). |
| GET | `/casinos/:casinoSlug/games` | Same as row above (games for one casino); use with **excludeSlug** for “other games” block. |

**Site routes (your frontend):** e.g. `/casino/:slug`, `/games/:slug` — call these APIs with the same slugs.

---

## Author (by slug)

Requires **authorSlug** to be set in admin (**PUT /api/v1/admin/me**). Public site URL pattern: **`/author/:slug`** (not user id).

| Method | Path | Notes |
|--------|------|--------|
| GET | `/author/:slug` | Profile: name, avatar, bio, **stats** (counts by post type). **404** if slug missing / not public / inactive. |
| GET | `/author/:slug/posts` | Published posts only: casino-articles, game-articles, blogs, news, bonus-articles. Query: **type** (`all` \| `casino-articles` \| `game-articles` \| `blog` \| `news` \| `bonus-articles`), **page**, **limit** (default **12**). Each item: **path** — navigate to **`/${path}`**. |

---

## Legacy editor profile

| Method | Path | Notes |
|--------|------|--------|
| GET | `/editors/:id` | Still works (by UUID). Prefer **`/author/:slug`** when **authorSlug** is set. |

---

## Flow summaries

- **Casino page → games → game detail → other games:** see **PublicApi.md** → *Summary — Casino page + game page* and *Casino games list (public)*.
- **Author page → tabs → open post:** see **PublicApi.md** → *Author (by slug) — how it works*.

---

Full route table: **`docs/PublicApi.md`**.
