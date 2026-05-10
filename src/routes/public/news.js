const express = require("express");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

const listFields = {
  id: true,
  title: true,
  featureImg: true,
  shortDesc: true,
  publishDate: true,
  readTime: true,
  slug: true,
  isTrending: true,
};

const RELATED_LIMIT = 6;

// GET /api/v1/public/news – list published news (pagination)
router.get(
  "/news",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = { status: "published" };

    const [items, total] = await Promise.all([
      prisma.news.findMany({
        where,
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.news.count({ where }),
    ]);

    return ok(res, { items, page, limit, total, totalPages: Math.ceil(total / limit) });
  })
);

// GET /api/v1/public/news/:slug – single news by slug with editor and related (parallel queries for speed)
router.get(
  "/news/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;

    const news = await prisma.news.findFirst({
      where: { slug, status: "published" },
      select: {
        id: true,
        title: true,
        slug: true,
        featureImg: true,
        shortDesc: true,
        publishDate: true,
        readTime: true,
        content: true,
        tags: true,
        seoTitle: true,
        seoDesc: true,
        isTrending: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            profilePublic: true,
            showEmailPublicly: true,
          },
        },
      },
    });

    if (!news) return fail(res, 404, "NOT_FOUND", "News not found");

    const newsId = news.id;

    // latestArticleNews: 6 latest news (exclude current)
    // latestArticleBlogs: 6 latest blogs
    const [latestArticleNews, latestArticleBlogs] = await Promise.all([
      prisma.news.findMany({
        where: { status: "published", id: { not: newsId } },
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        take: RELATED_LIMIT,
      }),
      prisma.blog.findMany({
        where: { status: "published" },
        select: {
          id: true,
          title: true,
          featureImg: true,
          shortDesc: true,
          publishDate: true,
          readTime: true,
          slug: true,
          isFeatured: true,
        },
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        take: RELATED_LIMIT,
      }),
    ]);

    const { createdBy, ...rest } = news;
    const editor = createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          avatarUrl: createdBy.avatarUrl,
          bio: createdBy.bio,
          profilePublic: createdBy.profilePublic,
          ...(createdBy.showEmailPublicly && createdBy.email ? { email: createdBy.email } : {}),
        }
      : null;

    return ok(res, {
      ...rest,
      editor,
      latestArticleNews,
      latestArticleBlogs,
    });
  })
);

// GET /api/v1/public/trendingNews – list published trending news
router.get(
  "/trendingNews",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = { status: "published", isTrending: true };

    const [items, total] = await Promise.all([
      prisma.news.findMany({
        where,
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.news.count({ where }),
    ]);

    return ok(res, { items, page, limit, total, totalPages: Math.ceil(total / limit) });
  })
);

// GET /api/v1/public/trendingNews/:slug – single trending news by slug (with editor and related)
router.get(
  "/trendingNews/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;

    const news = await prisma.news.findFirst({
      where: { slug, status: "published", isTrending: true },
      select: {
        id: true,
        title: true,
        slug: true,
        featureImg: true,
        shortDesc: true,
        publishDate: true,
        readTime: true,
        content: true,
        tags: true,
        seoTitle: true,
        seoDesc: true,
        isTrending: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            profilePublic: true,
            showEmailPublicly: true,
          },
        },
      },
    });

    if (!news) return fail(res, 404, "NOT_FOUND", "Trending news not found");

    const newsId = news.id;

    const relatedTrending = await prisma.news.findMany({
      where: { status: "published", isTrending: true, id: { not: newsId } },
      select: listFields,
      orderBy: { publishDate: "desc" },
      take: RELATED_LIMIT,
    });

    const { createdBy, ...rest } = news;
    const editor = createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          avatarUrl: createdBy.avatarUrl,
          bio: createdBy.bio,
          profilePublic: createdBy.profilePublic,
          ...(createdBy.showEmailPublicly && createdBy.email ? { email: createdBy.email } : {}),
        }
      : null;

    return ok(res, {
      ...rest,
      editor,
      relatedTrending,
    });
  })
);

module.exports = router;
