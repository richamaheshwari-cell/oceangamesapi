# TOG Backend – Public API

All public endpoints (no authentication). Base URL: `http://localhost:3000`. Prefix: `/api/v1/public`.

---

## Base

| Item | Value |
|------|--------|
| **Success** | `{ "data": <payload> }` |
| **Error** | `{ "error": { "code", "message", "details"?: object } }` |

---

## Health (no prefix)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check. `{ ok, service, time }`. |

---

## Quick route table

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/public/ping` | Ping. `{ data: { ok: true } }`. |
| GET | `/api/v1/public/settings` | Site settings (id 1). |
| GET | `/api/v1/public/pages/:slug` | One published page by slug. |
| GET | `/api/v1/public/casinos` | List published casinos. Query: **page**, **limit**. Returns `{ items, page, limit, total, totalPages }`. Each item: id, casinoName, slug, featureImg, rating, reviewCount, bonusAmt, bonusDetails, totalGames, tags, payoutSpeed, clientLink. |
| GET | `/api/v1/public/casinos/:slug/games` | **Games for this casino** (published only). Query: **page**, **limit** (default **6**, max 100). Optional **excludeSlug** or **excludeId** — omit the open game when showing “other games from this casino” on a game detail page. See **Casino games list (public)** below. |
| GET | `/api/v1/public/casinos/:slug` | One published casino by slug. Returns list fields plus **seoTitle**, **seoDesc**, **content** (TipTap JSON) for the casino page. |
| GET | `/api/v1/public/casino-articles` | List published casino articles. Query: **page**, **limit**. Returns `{ items, page, limit, total, totalPages }`. |
| GET | `/api/v1/public/casino-articles/:slug` | One casino article + editor + **relatedArticleCasino** (6 latest casino articles) + **relatedArticleGames** (6 latest game articles) + **casino** (8 casinos below). |
| **GET** | **`/api/v1/public/games`** | **List published games. Query: page, limit. Returns `{ items, page, limit, total, totalPages }`. Each item: id, title, slug, featureImg, tag, gameProvider, gameDetails, clientLink.** |
| **GET** | **`/api/v1/public/games/:slug`** | **One game by slug. Returns: id, title, slug, featureImg, tag, gameProvider, gameDetails, clientLink, **seoTitle**, **seoDesc**, **focusKeywords**, **content** (TipTap), **casinos** (linked casinos: id, casinoName, slug, featureImg).** |
| **GET** | **`/api/v1/public/game-articles`** | **List published game articles. Query: page, limit. Returns `{ items, page, limit, total, totalPages }`.** |
| **GET** | **`/api/v1/public/game-articles/:slug`** | **One game article + editor + relatedArticleGames (6 latest) + relatedArticleBonus (6 latest) + games (8 below).** |
| **GET** | **`/api/v1/public/blogs`** | **List published blogs. Query: page, limit. Returns `{ items, page, limit, total, totalPages }`. Each item includes isFeatured.** |
| **GET** | **`/api/v1/public/blogs/:slug`** | **One blog + editor + relatedArticleBlog (6 featured) + latestArticleNews (6 latest).** |
| **GET** | **`/api/v1/public/featuredBlogs`** | **List published featured blogs (isFeatured = true). Query: page, limit.** |
| **GET** | **`/api/v1/public/featuredBlogs/:slug`** | **One featured blog by slug + editor + relatedFeatured.** |
| **GET** | **`/api/v1/public/news`** | **List published news. Query: page, limit. Returns `{ items, page, limit, total, totalPages }`. Each item includes isTrending.** |
| **GET** | **`/api/v1/public/news/:slug`** | **One news + editor + latestArticleNews (6 latest) + latestArticleBlogs (6 latest).** |
| **GET** | **`/api/v1/public/trendingNews`** | **List published trending news (isTrending = true). Query: page, limit.** |
| **GET** | **`/api/v1/public/trendingNews/:slug`** | **One trending news by slug + editor + relatedTrending.** |
| **GET** | **`/api/v1/public/bonuses`** | **List published bonuses. Query: page, limit. Returns `{ items, page, limit, total, totalPages }`. Each item: id, title, slug, featureImg, description, **clientLink** (may be `null`), highlight, bonusType, iconKey.** |
| **GET** | **`/api/v1/public/bonuses/:slug`** | **One bonus by slug + createdBy, updatedBy (author info). Includes featureImg.** |
| **GET** | **`/api/v1/public/bonus-articles`** | **List published bonus articles. Query: page, limit, bonusId (optional). Returns items with bonus (id, title, slug).** |
| **GET** | **`/api/v1/public/bonus-articles/:slug`** | **One bonus article + editor + latestArticleBonus (6 latest) + latestArticleGames (6 latest) + bonus (8 below).** |
| **GET** | **`/api/v1/public/search`** | **Search with typo tolerance. Query: q (2–80 chars). Returns results (id, type, title, slug, path, score) + suggestions (query-dependent, max 5). Use path to link to the page.** |
| GET | `/api/v1/public/author/:slug/posts` | **Author’s published posts** (by **authorSlug**). Query: **type** (`all` \| `casino-articles` \| `game-articles` \| `blog` \| `news` \| `bonus-articles`), **page**, **limit** (default **12**). Each item: **id**, **type**, **title**, **slug**, **path** (open on site as `/${path}`), **publishDate**. See **Author (by slug)** below. |
| GET | `/api/v1/public/author/:slug` | **Author profile** by **authorSlug** (public URL **`/author/:slug`** on your site). 404 if slug missing, profile not public, or inactive. Returns **authorSlug**, name, avatar, bio, **stats** (counts per post type + postsTotal). |
| GET | `/api/v1/public/editors/:id` | Legacy editor profile by **UUID**. Prefer **`/author/:slug`** when **authorSlug** is set. |
| POST | `/api/v1/public/newsletter/subscribe` | Body: `email`. Subscribe to newsletter. Sends confirmation email (nodemailer). Returns `{ data: { message, subscribed } }`. Rate-limited. |
| POST | `/api/v1/public/newsletter/unsubscribe` | Body: `email`. Unsubscribe. Sends confirmation email. Returns `{ data: { message, subscribed: false } }`. Rate-limited. |

---

### Summary — Casino page + game page (public)

| Step | API | Purpose |
|------|-----|---------|
| **1. Casino detail** | `GET /api/v1/public/casinos/:slug` | One casino (SEO + TipTap **content** for the casino landing page). |
| **2. Games on that casino** | `GET /api/v1/public/casinos/:slug/games?page=&limit=` | Paginated list of **published** games linked to that casino (default **6** per page). Same card shape as global games list. |
| **3. Open one game** | `GET /api/v1/public/games/:slug` | Full game: **content**, **seoTitle**, **seoDesc**, **focusKeywords**, **casinos** (linked casinos for “which casino” / URLs). |
| **4. Other games (same casino)** | `GET /api/v1/public/casinos/:casinoSlug/games?excludeSlug=:gameSlug&page=&limit=` | Same as (2) but **excludes** the current game; use **`casinoSlug`** from step 3’s `casinos[].slug`. |

**Also:** `GET /api/v1/public/games` — all published games (not filtered by casino). No auth on any of the above.

---

### Author (by slug) — how it works

1. **Set the URL slug in admin** — Each user sets **`authorSlug`** via **PUT /api/v1/admin/me** (see Admin API). Example: `"authorSlug": "jane-smith"`. Must be unique; normalized to lowercase + hyphens (min 2 chars). Clear with `""`.

2. **Public site routes (your frontend)**  
   - Author page: **`/author/{authorSlug}`** (e.g. `/author/jane-smith`) — not the API path.  
   - Load profile: **`GET /api/v1/public/author/jane-smith`**.  
   - Load posts: **`GET /api/v1/public/author/jane-smith/posts?type=all&page=1&limit=12`**.

3. **Tabs** — Query **`type`**:  
   - **`all`** — all five content types mixed, sorted by **publishDate** desc, paginated (12/page default).  
   - **`casino-articles`**, **`game-articles`**, **`blog`**, **`news`**, **`bonus-articles`** — only that type, same pagination.

4. **Opening a post** — Each item includes **`path`** (e.g. `casino-articles/my-slug`, `blogs/other-slug`). Navigate to **`/${path}`** on your site (same as search results).

5. **Legacy** — **`GET /api/v1/public/editors/:id`** still works by user id; use **author slug** for shareable URLs when available.

---

## Newsletter

- **Subscribe** — POST .../newsletter/subscribe. Body: email. Creates or re-activates subscription; optional confirmation email (configure NEWSLETTER_SMTP_* or SMTP_* in .env). Same endpoint is rate-limited (default 10 requests per 15 min per IP).
- **Unsubscribe** — POST .../newsletter/unsubscribe. Body: email. Sets subscribed to false and unsubscribedAt. Optional confirmation email.
- **New news emails:** When a **news** post is created or updated to **published** in the admin, all subscribed newsletter emails receive a formatted “Oceans Game” newsletter email with the featured article (title, image, short desc, link to the news), “Visit Oceans Game” button, and “Unsubscribe” link. Links use **NEWSLETTER_SITE_URL** — set to `http://localhost:3001` for local and `https://theoceansgame.com` for production. Unsubscribe link: `{NEWSLETTER_SITE_URL}/newsletter/unsubscribe`.
- **Security:** Newsletter endpoints are rate-limited. Too many requests return **429** with `error.code === "TOO_MANY_REQUESTS"`. See `.env.example` for `RATE_LIMIT_NEWSLETTER_*`.

---

## Search

**Universal search** across all content. **Priority order:** articles first (casino articles → game articles → blogs → bonus articles), then news → games → bonuses → pages.

- **GET /api/v1/public/search**  
  **Query:** `q` (required, 2–80 characters, trimmed and lowercased internally).  
  **Response:** `{ data: { results, suggestions } }`.
  - **results:** Up to 20 items. Each: `{ id, type, title, slug, path, score }`. **type** is one of: `casino_article`, `game_article`, `blog`, `bonus_article`, `news`, `game`, `bonus`, `page`. **path** is the relative path to open on your site (e.g. `news/some-slug`, `games/some-game`) — use `/${path}`. **score** is hybrid relevance. Sorted by type priority above, then by score.
  - **suggestions:** Up to 5 titles that match the query (typo-tolerant), from any content type. Query-dependent only.

**Suggestions while typing:**  
Use the **same endpoint** as the user types. Call **GET /api/v1/public/search?q=** with the current input (show after 4 characters; debounce 300–400 ms — see *Implementing search on the public website* below). Use the **suggestions** array as a dropdown under the search box; use **results** when they submit or click a suggestion. There is no separate “suggestions only” API — one request returns both results and suggestions.

- **Validation:** 400 if `q` missing, &lt; 2 chars, or &gt; 80 chars.
- **Behaviour:** Full-text search + trigram (hybrid ranking). Index-based; no full table scan.

---

### Implementing search on the public website

**Flow**

1. User types in the search box.
2. **After 4 characters**, call the search API and show **suggestions** in a dropdown below the input.
3. **If user clicks a suggestion** → go to search: **navigate to that item's page** using the matching result's **path** (e.g. `navigate(\`/\${result.path}\`)`). So: click suggestion → go directly to `/${path}`. Alternatively, set the input to the suggestion text and run search to show the **results** list; user then clicks a result to go.
4. **If user presses Enter** (or Search button) → call the same API with the current query, show **results**; clicking a result navigates to `/${result.path}`.

**Reducing API calls**

- **Minimum length:** Call **GET /api/v1/public/search?q=...** only when the query has **at least 4 characters**. For 1–3 characters, do not call the API; hide the suggestions dropdown. Reduces unnecessary requests.
- **Debounce:** Wait **300–400 ms** after the user stops typing before sending the request. One request per "burst" of typing instead of every keystroke.
- **Skip duplicate q:** If the current `q` is the same as the last requested `q`, do not call again.
- **One response, two uses:** The same response has both **results** and **suggestions**. Use **suggestions** for the dropdown; use **results** for the results page. When user clicks a suggestion, you can navigate using the matching result's **path** from the response you already have — no extra request.
- **Optional:** Cache responses in memory (e.g. by `q`) for the session so typing the same query again does not hit the API.

**Example (pseudo)**

- **onInput:** Trim `q`. If `q.length < 4` → hide dropdown; else schedule debounced request (300 ms).
- **Debounced handler:** If `q === lastRequestedQ` return. Set `lastRequestedQ = q`. **GET /api/v1/public/search?q=** + encodeURIComponent(q). On success: store `data.results` and `data.suggestions`; show **suggestions** in dropdown.
- **onSuggestionClick(suggestionText):** From stored `results`, find the item whose `title === suggestionText` (or take first result). **Navigate to \`/\${thatResult.path}\`** (direct to page).
- **onSubmit (Enter):** Call search with current input (or use cached response). Show **results**; on result click → navigate to `/${result.path}`.

---

**How redirect works (this API is backend-only):**  
This backend does **not** serve the actual page at `/casino-articles/new-articles`. It only returns **data**. The **path** tells your **frontend app** which URL to open when the user clicks a result.

1. **User clicks a search result** → Your frontend navigates to `/${result.path}` (e.g. `/news/some-slug`, `/bonuses/some-bonus`).
2. **Your frontend route** loads full content from the API using `result.type` and `result.slug`:  
   `casino_article` → GET /api/v1/public/casino-articles/:slug  
   `game_article` → GET /api/v1/public/game-articles/:slug  
   `blog` → GET /api/v1/public/blogs/:slug  
   `bonus_article` → GET /api/v1/public/bonus-articles/:slug  
   `news` → GET /api/v1/public/news/:slug  
   `game` → GET /api/v1/public/games/:slug  
   `bonus` → GET /api/v1/public/bonuses/:slug  
   `page` → GET /api/v1/public/pages/:slug  
3. The "page" that opens is the screen your frontend renders at that URL with the API data.

So: **path** = where to go in your app. **slug** = what to pass to the public API for that type.

---

## Casino games list (public)

**GET /api/v1/public/casinos/:casinoSlug/games**

| Query | Default | Description |
|--------|---------|-------------|
| **page** | 1 | Page number. |
| **limit** | 6 | Items per page (max 100). |
| **excludeSlug** | — | Slug of the **current** game to hide from the list (so the “other games” strip does not repeat the open game). |
| **excludeId** | — | Same as excludeSlug but by game **id** (use either, not required to send both). |

**Example — casino page (all games):**  
`GET /api/v1/public/casinos/royal-vegas/games?page=1&limit=6`

**Example — game detail page** (`/games/starburst` belongs to casino `royal-vegas`):  
`GET /api/v1/public/casinos/royal-vegas/games?excludeSlug=starburst&page=1&limit=6`  
Returns only **other** published games linked to that casino.

**Frontend flow**

1. Load the game: **GET /api/v1/public/games/:slug** → response includes **`casinos`** (array). Pick the casino you use for the URL (e.g. first, or match route param).
2. Load “more from this casino”: **GET /api/v1/public/casinos/{casinoSlug}/games?excludeSlug={currentGameSlug}&limit=6**  
   Use **`casinoSlug`** from the game’s `casinos[].slug` and **`currentGameSlug`** from the page URL.

**Admin panel**

- No new admin API is required for this. In admin you already **link games to casinos** via **casinoIds** on create/update. The public site uses those links; **excludeSlug** / **excludeId** are **public API only** for the website (or a preview that calls the public API).

---

## Games

- **GET /api/v1/public/games**  
  **Query:** `page` (default 1), `limit` (default 20, max 100).  
  **Response:** `{ items, page, limit, total, totalPages }`.  
  **Each item:** id, title, slug, featureImg, tag (single string), gameProvider (array), gameDetails (array), clientLink (use as href for “Play” etc.).

- **GET /api/v1/public/games/:slug**  
  **Response:** Single game + SEO + **casinos** (see route table). Use **casinos[].slug** with **GET …/casinos/:slug/games?excludeSlug=…** for “other games from this casino”. 404 if not found or not published.

---

## Blogs

- **GET /api/v1/public/blogs**  
  **Query:** `page`, `limit`.  
  **Response:** `{ items, page, limit, total, totalPages }`. Each item: id, title, slug, featureImg, shortDesc, publishDate, readTime, isFeatured. Only **published** blogs.

- **GET /api/v1/public/blogs/:slug**  
  **Response:** Full blog + **editor** (id, name, avatarUrl, bio, profilePublic; email if showEmailPublicly) + **relatedBlogs** (6 recent) + **relatedByTag** (6 by shared tags). 404 if not found or not published.

---

## News

- **GET /api/v1/public/news**  
  **Query:** `page`, `limit`.  
  **Response:** `{ items, page, limit, total, totalPages }`. Each item: id, title, slug, featureImg, shortDesc, publishDate, readTime, isTrending. Only **published** news. Lean list for fast response.

- **GET /api/v1/public/news/:slug**  
  **Response:** Full news + **editor** (id, name, avatarUrl, bio, profilePublic; email if showEmailPublicly) + **relatedNews** (6 recent) + **relatedByTag** (6 by shared tags). 404 if not found or not published. Related queries run in parallel.

---

## Trending news

- **GET /api/v1/public/trendingNews**  
  **Query:** `page`, `limit`.  
  **Response:** Same shape as news list, but only news where **isTrending = true** and status = published.

- **GET /api/v1/public/trendingNews/:slug**  
  **Response:** Single trending news by slug + editor + **relatedTrending** (6 other trending news). 404 if not found, not published, or not trending.

---

## Bonuses

- **GET /api/v1/public/bonuses**  
  **Query:** `page`, `limit`.  
  **Response:** `{ items, page, limit, total, totalPages }`. Each item: id, title, slug, description, clientLink (may be `null`), highlight, bonusType, iconKey. Only **published** bonuses.

- **GET /api/v1/public/bonuses/:slug**  
  **Response:** Full bonus + **createdBy** (author: id, name, avatarUrl, bio, profilePublic; email if showEmailPublicly) + **updatedBy** (id, name, email). 404 if not found or not published.

---

## Bonus articles

- **GET /api/v1/public/bonus-articles**  
  **Query:** `page`, `limit`, **bonusId** (optional – filter by bonus).  
  **Response:** `{ items, page, limit, total, totalPages }`. Each item includes **bonus** (id, title, slug). Only **published** bonus articles.

- **GET /api/v1/public/bonus-articles/:slug**  
  **Response:** Full bonus article + **editor** (createdBy: id, name, avatarUrl, bio, profilePublic; email if showEmailPublicly) + **bonus** (id, title, slug) + **relatedBonusArticles** (6 recent) + **relatedByTagOrGame** (6 by shared tags/gameSlugs). 404 if not found or not published.

---

## Featured blogs

- **GET /api/v1/public/featuredBlogs**  
  **Query:** `page`, `limit`.  
  **Response:** Same shape as blogs list, but only blogs where **isFeatured = true** and status = published.

- **GET /api/v1/public/featuredBlogs/:slug**  
  **Response:** Single featured blog by slug + editor + **relatedFeatured** (6 other featured blogs). 404 if not found, not published, or not featured.

---

## Game articles

- **GET /api/v1/public/game-articles**  
  **Query:** `page`, `limit`.  
  **Response:** `{ items, page, limit, total, totalPages }`.  
  **Each item:** id, title, featureImg, shortDesc, publishDate, readTime, slug.

- **GET /api/v1/public/game-articles/:slug**  
  **Response:** Full game article + **editor** (id, name, avatarUrl, bio, profilePublic; email if showEmailPublicly) + **relatedArticleGame** (6 recent game articles) + **relatedByTagOrGame** (6 by shared tags/gameSlugs). 404 if not found or not published.

---

## Casino articles

- **GET /api/v1/public/casino-articles** — List published. Query: page, limit.
- **GET /api/v1/public/casino-articles/:slug** — One article + editor + relatedArticleCasino + relatedArticleGames.

---

## Settings & pages

- **GET /api/v1/public/settings** — Single settings object (siteName, logoUrl, faviconUrl, etc.).
- **GET /api/v1/public/pages/:slug** — One published page by slug.

---

## Editor profile

- **GET /api/v1/public/editors/:id** — Public profile for an author/editor. Use when user clicks “View profile” on an article, game, blog, or news byline. Returns 404 if that user has profilePublic = false or is inactive. **stats** includes pagesCreated, casinosCreated, casinoArticlesCreated, gamesCreated, gameArticlesCreated, blogsCreated, **newsCreated**.

---

## Error codes

| Code | HTTP | Meaning |
|------|------|--------|
| NOT_FOUND | 404 | Resource not found or not published. |
| VALIDATION_ERROR | 400 | Invalid query; use error.details. |
| INTERNAL_ERROR | 500 | Server error. |
