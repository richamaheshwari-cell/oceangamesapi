# Handover: Public API (TOG Backend)

**Document purpose:** Onboard another developer to the **public (website) API** — no login, used by the Next.js/Vite/etc. frontend that visitors see.  
**Companion:** `HANDOVER_ADMIN_API.md` (CMS API).  
**Exhaustive reference:** `PublicApi.md` (full tables and search behaviour).

---

## 1. Base URL

- **Local:** `http://localhost:3000`
- **Production:** e.g. `https://api.theoceangame.com`
- **All public routes** are under:  
  **`/api/v1/public`**

**Authentication:** None. These endpoints are meant to be called from the browser or SSR.

**CORS:** The backend only allows origins listed in **`CORS_ORIGIN`** in `.env` (comma-separated). Include your public site origin(s) or the browser will block responses.

---

## 2. Response shape

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
    "code": "NOT_FOUND",
    "message": "…"
  }
}
```

Almost all **list** endpoints return pagination metadata:

```json
{
  "data": {
    "items": [ … ],
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 3. Health check (outside `/public`)

For uptime monitors:

`GET /health`  
→ `{ ok, service, time }`  
(No `/api/v1` prefix.)

---

## 4. Site configuration and static pages

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/public/settings` | Site name, logo, favicon, colors, etc. (single row). |
| `GET /api/v1/public/pages/:slug` | One **published** static page by slug. |

---

## 5. Casinos and casino-page games

### Casino detail (landing page)

`GET /api/v1/public/casinos/:slug`

Returns the **published** casino card fields plus **`seoTitle`**, **`seoDesc`**, and TipTap **`content`** for the main body of the casino page.

### Games that belong to this casino

`GET /api/v1/public/casinos/:slug/games`

- **Query:** `page`, `limit` (default **6** games per page, max 100).
- Only **published** games that are **linked** to this casino in the CMS.
- **Optional:** `excludeSlug` or `excludeId` — hide the game the user is currently viewing (for an “other games from this casino” block on a **game** detail page).

### Global casino directory

`GET /api/v1/public/casinos` — paginated list of published casinos (summary fields only, no large `content`).

### Typical frontend flow (casino → game → related)

1. User opens **`/casino/royal-vegas`** (your route) → load **`GET …/casinos/royal-vegas`** and **`GET …/casinos/royal-vegas/games`**.
2. User opens a game **`/games/starburst`** → load **`GET …/games/starburst`** (includes **`casinos`** array).
3. “More from this casino” → **`GET …/casinos/{casinoSlug}/games?excludeSlug=starburst`** using a `casinos[].slug` from step 2.

---

## 6. Games (product/slot pages)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/public/games` | All **published** games (paginated). Lean fields for cards. |
| `GET /api/v1/public/games/:slug` | Full **published** game: SEO, TipTap **`content`**, **`focusKeywords`**, and **`casinos`** linked in admin (id, name, slug, feature image). |

Games here are **catalogue/slot titles**, not long-form **game articles** (those are under **`/game-articles`**).

---

## 7. Long-form articles

All of these are **published** only on the public API.

| Content | List | Single |
|---------|------|--------|
| Casino articles | `GET /casino-articles` | `GET /casino-articles/:slug` |
| Game articles | `GET /game-articles` | `GET /game-articles/:slug` |
| Blogs | `GET /blogs` | `GET /blogs/:slug` |
| Featured blogs | `GET /featuredBlogs` | `GET /featuredBlogs/:slug` |
| News | `GET /news` | `GET /news/:slug` |
| Trending news | `GET /trendingNews` | `GET /trendingNews/:slug` |
| Bonuses | `GET /bonuses` | `GET /bonuses/:slug` |
| Bonus articles | `GET /bonus-articles` ? `bonusId` | `GET /bonus-articles/:slug` |

Single-item responses include **editor/author** blocks (for bylines), related posts, and other curated lists as documented in **`PublicApi.md`**.

---

## 8. Search

`GET /api/v1/public/search?q=` (required, 2–80 characters)

Returns **results** (up to 20) and **suggestions** (up to 5). Each result has a **`path`** such as `news/my-slug` or `games/my-game`. **Navigate the user to `/${path}`** on your site, then load the matching detail endpoint for that content type.

Implementation tips (debounce, min length): **`PublicApi.md`** → *Implementing search on the public website*.

---

## 9. Authors (writers — not “gamers”)

**Authors** are **CMS users** who write articles. They are **not** the same as **games** or players.

### Public profile URL (nice links)

Editors set **`authorSlug`** in the admin profile (**PUT /api/v1/admin/me**). Your frontend can use:

- **`/author/jane-smith`** (example) as the **website** route.

### APIs

**`GET /api/v1/public/author/:slug`**  
- Resolves by **`authorSlug`**.  
- Returns display name, avatar, bio (and email only if they opted in), plus **stats** (counts by content type).  
- **404** if the slug is not set, user is inactive, or **`profilePublic`** is false.

**`GET /api/v1/public/author/:slug/posts`**  
- **Only published** posts **authored** by that user, in these types:  
  **casino-articles**, **game-articles**, **blogs**, **news**, **bonus-articles** (no standalone “games” catalogue in this list — those are not editorial articles).  
- **Query `type`:**  
  - **`all`** — mix all five types, sorted by publish date, paginated (default **12** per page).  
  - Or one of: `casino-articles`, `game-articles`, `blog`, `news`, `bonus-articles`.  
- Each item includes **`path`** (e.g. `blogs/my-post`) → open **`/${path}`**.

### Legacy

**`GET /api/v1/public/editors/:id`** — still works with internal **UUID**. Prefer **`/author/:slug`** for shareable links when **`authorSlug`** is configured.

---

## 10. Newsletter (public)

| Endpoint | Body | Notes |
|----------|------|--------|
| `POST …/newsletter/subscribe` | `{ "email" }` | Rate-limited. |
| `POST …/newsletter/unsubscribe` | `{ "email" }` | Rate-limited. |

---

## 11. Quick reference — common patterns

- **Pagination:** Always send `page` and optionally `limit` where lists are supported.
- **Published-only:** The public API never returns draft content.
- **Linking from lists:** Use **`slug`** + the correct path prefix, or use **`path`** from search/author-posts responses as **`/${path}`**.

---

## 12. Where the code lives

- Mount: `src/routes/index.js` → `src/routes/public/index.js`
- Per area: `src/routes/public/*.js` (`casinos.js`, `games.js`, `author.js`, `search.js`, …)

---

## 13. Further reading

- **`PublicApi.md`** — Full route table, search behaviour, newsletter, error codes.
- **`HANDOVER_ADMIN_API.md`** — CMS side (creating content, linking games to casinos, setting **authorSlug**).

---

*End of Public API handover.*
