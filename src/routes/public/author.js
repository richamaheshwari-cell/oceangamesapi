/**
 * Public author profile by slug: /api/v1/public/author/:slug
 * Posts: casino-articles, game-articles, blogs, news, bonus-articles only (published).
 */
const express = require("express");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

const POST_TABS = ["all", "casino-articles", "game-articles", "blog", "news", "bonus-articles"];

const PATH_BY_TAB = {
  "casino-articles": "casino-articles",
  "game-articles": "game-articles",
  blog: "blogs",
  news: "news",
  "bonus-articles": "bonus-articles",
};

function normalizeSlugParam(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapRowToItem(tab, row) {
  const prefix = PATH_BY_TAB[tab];
  return {
    id: row.id,
    type: tab,
    title: row.title,
    slug: row.slug,
    path: `${prefix}/${row.slug}`,
    publishDate: row.publishDate,
  };
}

// GET /api/v1/public/author/:slug/posts — must be before GET /author/:slug
router.get(
  "/author/:slug/posts",
  asyncHandler(async (req, res) => {
    const slug = normalizeSlugParam(req.params.slug);
    if (!slug) return fail(res, 400, "BAD_REQUEST", "Invalid author slug");

    const type = typeof req.query.type === "string" ? req.query.type.trim() : "all";
    if (!POST_TABS.includes(type)) {
      return fail(res, 400, "BAD_REQUEST", `type must be one of: ${POST_TABS.join(", ")}`);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const author = await prisma.adminUser.findFirst({
      where: { authorSlug: slug, isActive: true, profilePublic: true },
      select: { id: true },
    });
    if (!author) {
      return fail(res, 404, "NOT_FOUND", "Author not found or profile not public");
    }

    const authorId = author.id;
    const selectLean = { id: true, title: true, slug: true, publishDate: true };
    const wherePub = { status: "published", createdById: authorId };

    if (type !== "all") {
      let items = [];
      let total = 0;
      switch (type) {
        case "casino-articles":
          [items, total] = await Promise.all([
            prisma.casinoArticle.findMany({
              where: wherePub,
              orderBy: { publishDate: "desc" },
              skip,
              take: limit,
              select: selectLean,
            }),
            prisma.casinoArticle.count({ where: wherePub }),
          ]);
          break;
        case "game-articles":
          [items, total] = await Promise.all([
            prisma.gameArticle.findMany({
              where: wherePub,
              orderBy: { publishDate: "desc" },
              skip,
              take: limit,
              select: selectLean,
            }),
            prisma.gameArticle.count({ where: wherePub }),
          ]);
          break;
        case "blog":
          [items, total] = await Promise.all([
            prisma.blog.findMany({
              where: wherePub,
              orderBy: { publishDate: "desc" },
              skip,
              take: limit,
              select: selectLean,
            }),
            prisma.blog.count({ where: wherePub }),
          ]);
          break;
        case "news":
          [items, total] = await Promise.all([
            prisma.news.findMany({
              where: wherePub,
              orderBy: { publishDate: "desc" },
              skip,
              take: limit,
              select: selectLean,
            }),
            prisma.news.count({ where: wherePub }),
          ]);
          break;
        case "bonus-articles":
          [items, total] = await Promise.all([
            prisma.bonusArticle.findMany({
              where: wherePub,
              orderBy: { publishDate: "desc" },
              skip,
              take: limit,
              select: selectLean,
            }),
            prisma.bonusArticle.count({ where: wherePub }),
          ]);
          break;
        default:
          break;
      }
      const mapped = items.map((row) => mapRowToItem(type, row));
      return ok(res, {
        items: mapped,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        type,
      });
    }

    // type === all: merged by publishDate via raw SQL
    const countRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS c FROM (
        SELECT id FROM casino_articles WHERE status = 'published' AND "createdById" = ${authorId}
        UNION ALL
        SELECT id FROM game_articles WHERE status = 'published' AND "createdById" = ${authorId}
        UNION ALL
        SELECT id FROM blogs WHERE status = 'published' AND "createdById" = ${authorId}
        UNION ALL
        SELECT id FROM news WHERE status = 'published' AND "createdById" = ${authorId}
        UNION ALL
        SELECT id FROM bonus_articles WHERE status = 'published' AND "createdById" = ${authorId}
      ) AS u
    `;
    const total = countRows[0]?.c ?? 0;

    const rows = await prisma.$queryRaw`
      SELECT * FROM (
        SELECT id, slug, title, 'casino-articles'::text AS tab, "publishDate" AS d
        FROM casino_articles WHERE status = 'published' AND "createdById" = ${authorId}
        UNION ALL
        SELECT id, slug, title, 'game-articles'::text, "publishDate"
        FROM game_articles WHERE status = 'published' AND "createdById" = ${authorId}
        UNION ALL
        SELECT id, slug, title, 'blog'::text, "publishDate"
        FROM blogs WHERE status = 'published' AND "createdById" = ${authorId}
        UNION ALL
        SELECT id, slug, title, 'news'::text, "publishDate"
        FROM news WHERE status = 'published' AND "createdById" = ${authorId}
        UNION ALL
        SELECT id, slug, title, 'bonus-articles'::text, "publishDate"
        FROM bonus_articles WHERE status = 'published' AND "createdById" = ${authorId}
      ) AS merged
      ORDER BY d DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const items = rows.map((r) => ({
      id: r.id,
      type: r.tab,
      title: r.title,
      slug: r.slug,
      path: `${PATH_BY_TAB[r.tab]}/${r.slug}`,
      publishDate: r.d,
    }));

    return ok(res, {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      type: "all",
    });
  })
);

// GET /api/v1/public/author/:slug — profile (by authorSlug)
router.get(
  "/author/:slug",
  asyncHandler(async (req, res) => {
    const slug = normalizeSlugParam(req.params.slug);
    if (!slug) return fail(res, 400, "BAD_REQUEST", "Invalid author slug");

    const editor = await prisma.adminUser.findFirst({
      where: { authorSlug: slug, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatarUrl: true,
        authorSlug: true,
        profilePublic: true,
        showEmailPublicly: true,
      },
    });

    if (!editor || !editor.profilePublic) {
      return fail(res, 404, "NOT_FOUND", "Author not found or profile not public");
    }

    const id = editor.id;
    const [casinoArticlesCount, gameArticlesCount, blogsCount, newsCount, bonusArticlesCount] = await Promise.all([
      prisma.casinoArticle.count({ where: { status: "published", createdById: id } }),
      prisma.gameArticle.count({ where: { status: "published", createdById: id } }),
      prisma.blog.count({ where: { status: "published", createdById: id } }),
      prisma.news.count({ where: { status: "published", createdById: id } }),
      prisma.bonusArticle.count({ where: { status: "published", createdById: id } }),
    ]);

    const profile = {
      id: editor.id,
      authorSlug: editor.authorSlug,
      name: editor.name,
      avatarUrl: editor.avatarUrl,
      bio: editor.bio,
      ...(editor.showEmailPublicly && editor.email ? { email: editor.email } : {}),
      stats: {
        casinoArticles: casinoArticlesCount,
        gameArticles: gameArticlesCount,
        blogs: blogsCount,
        news: newsCount,
        bonusArticles: bonusArticlesCount,
        postsTotal:
          casinoArticlesCount + gameArticlesCount + blogsCount + newsCount + bonusArticlesCount,
      },
    };

    return ok(res, profile);
  })
);

module.exports = router;
