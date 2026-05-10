# Admin API — recent changes (reference)

Prefix: **`/api/v1/admin`**. All routes need **`Authorization: Bearer <accessToken>`** unless noted.

---

## Casino

| Method | Path | Notes |
|--------|------|--------|
| GET | `/casino/:slug` | One casino by **slug** (seoTitle, seoDesc, content TipTap, createdBy, updatedBy). |
| POST | `/casinos` | Create. Optional **seoTitle**, **seoDesc**, **content**. Validation: see **AdminApi.md** → *Casinos – validation*. |
| PUT | `/casinos/:id` | Partial update; optional SEO + content fields. |
| GET | `/casinos`, `/casinos/:id` | Unchanged list / by id. |

---

## Games

| Method | Path | Notes |
|--------|------|--------|
| GET | `/game/:slug` | One game by **slug** (SEO, **content**, linked **casinos**). |
| POST | `/games` | **Required:** **casinoIds** — array of casino UUIDs (min **1**, max **100**). Optional **seoTitle**, **seoDesc**, **focusKeywords**, **content** (TipTap). |
| PUT | `/games/:id` | Optional **casinoIds** replaces all links (min 1 when sent). |
| GET | `/games`, `/games/:id` | List / by id include linked **casinos** on each game. |

Use **GET /casinos** to load casinos; send their **id** values in **casinoIds**, not slugs.

---

## Profile / author URL

| Method | Path | Notes |
|--------|------|--------|
| GET | `/me` | Response includes **authorSlug** (for public `/author/:slug`). |
| PUT | `/me` | Body may include **authorSlug** (unique URL segment; `""` clears). **409** if taken. |

---

## Dashboard

| Method | Path | Notes |
|--------|------|--------|
| GET | `/dashboard` | Role-based: super_admin/admin get global totals, status summaries, recent updates, recent logins, editors directory (+ post counts), subscribers count. editor/seo_editor get my status summary, my recent updates, editors directory. |

---

## Uploads

| Method | Path | Notes |
|--------|------|--------|
| DELETE | `/upload/image` | Delete image by **path** or **url** (query or body). Admin only. |

---

## Bonus (create / list)

| Field / route | Notes |
|----------------|--------|
| POST `/bonuses` | Optional **featureImg** (URL from upload). |
| PUT `/bonuses/:id` | Optional **featureImg**; null clears. |

---

## Content delete behaviour

Deleting casino, casino article, game, game article, blog, news, bonus, or bonus article removes the **feature image file** from disk when **featureImg** was set.

---

Full route tables and validation details: **`docs/AdminApi.md`**.
