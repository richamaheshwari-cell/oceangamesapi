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
};

const RELATED_LIMIT = 6;
const CASINOS_BELOW_LIMIT = 8;

// GET /api/v1/public/casino-articles – list published articles (independent of casino)
// Query: page, limit
router.get(
  "/casino-articles",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = { status: "published" };

    const [items, total] = await Promise.all([
      prisma.casinoArticle.findMany({
        where,
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.casinoArticle.count({ where }),
    ]);

    return ok(res, {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// GET /api/v1/public/casino-articles/:slug – single article with related and editor
router.get(
  "/casino-articles/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;

    const article = await prisma.casinoArticle.findFirst({
      where: { slug, status: "published" },
      include: {
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

    if (!article) return fail(res, 404, "NOT_FOUND", "Article not found");

    const articleId = article.id;

    // relatedArticleCasino: 6 latest casino articles (exclude current)
    // relatedArticleGames: 6 latest game articles
    // casino: 8 casinos (below the article)
    const [relatedArticleCasino, relatedArticleGames, casino] = await Promise.all([
      prisma.casinoArticle.findMany({
        where: { status: "published", id: { not: articleId } },
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        take: RELATED_LIMIT,
      }),
      prisma.gameArticle.findMany({
        where: { status: "published" },
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        take: RELATED_LIMIT,
      }),
      prisma.casino.findMany({
        where: { status: "published" },
        select: {
          id: true,
          casinoName: true,
          slug: true,
          featureImg: true,
          rating: true,
          bonusAmt: true,
          clientLink: true,
        },
        orderBy: { createdAt: "desc" },
        take: CASINOS_BELOW_LIMIT,
      }),
    ]);

    const { createdBy, ...rest } = article;
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
      editor: editor,
      relatedArticleCasino,
      relatedArticleGames,
      casino,
    });
  })
);

module.exports = router;
