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

const mixedFeedFields = {
  id: true,
  title: true,
  featureImg: true,
  shortDesc: true,
  publishDate: true,
  readTime: true,
  slug: true,
  createdAt: true,
};

const RELATED_LIMIT = 6;
const GAMES_BELOW_LIMIT = 8;

function compareByPublishDateDesc(left, right) {
  const leftTime = new Date(left.publishDate ?? left.createdAt ?? 0).getTime();
  const rightTime = new Date(
    right.publishDate ?? right.createdAt ?? 0,
  ).getTime();

  return rightTime - leftTime;
}

function paginate(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const skip = (safePage - 1) * limit;

  return {
    items: items.slice(skip, skip + limit),
    page: safePage,
    limit,
    total,
    totalPages,
  };
}

async function getMixedGameArticleFeed({ excludeGameArticleId } = {}) {
  const [blogs, casinoArticles, gameArticles, bonusArticles, news] =
    await Promise.all([
      prisma.blog.findMany({
        where: { status: "published", showInGameArticle: true },
        select: mixedFeedFields,
      }),
      prisma.casinoArticle.findMany({
        where: { status: "published", showInGameArticle: true },
        select: mixedFeedFields,
      }),
      prisma.gameArticle.findMany({
        where: {
          status: "published",
          showInGameArticle: true,
          ...(excludeGameArticleId
            ? { id: { not: excludeGameArticleId } }
            : {}),
        },
        select: mixedFeedFields,
      }),
      prisma.bonusArticle.findMany({
        where: { status: "published", showInGameArticle: true },
        select: mixedFeedFields,
      }),
      prisma.news.findMany({
        where: { status: "published", showInGameArticle: true },
        select: mixedFeedFields,
      }),
    ]);

  return [
    ...blogs.map((item) => ({
      ...item,
      contentType: "blog",
      href: `/blog/${item.slug}`,
    })),
    ...casinoArticles.map((item) => ({
      ...item,
      contentType: "casino-article",
      href: `/casino-articles/${item.slug}`,
    })),
    ...gameArticles.map((item) => ({
      ...item,
      contentType: "game-article",
      href: `/game-articles/${item.slug}`,
    })),
    ...bonusArticles.map((item) => ({
      ...item,
      contentType: "bonus-article",
      href: `/bonus-articles/${item.slug}`,
    })),
    ...news.map((item) => ({
      ...item,
      contentType: "news",
      href: `/news/${item.slug}`,
    })),
  ].sort(compareByPublishDateDesc);
}

// GET /api/v1/public/game-articles/content – mixed published content marked for the game insights page
router.get(
  "/game-articles/content",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );

    const merged = await getMixedGameArticleFeed();

    return ok(res, paginate(merged, page, limit));
  }),
);

// GET /api/v1/public/game-articles – list mixed published content marked for game articles
router.get(
  "/game-articles",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );

    const merged = await getMixedGameArticleFeed();

    return ok(res, paginate(merged, page, limit));
  }),
);

// GET /api/v1/public/game-articles/:slug – single game article with editor and related
router.get(
  "/game-articles/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;

    const article = await prisma.gameArticle.findFirst({
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

    if (!article) return fail(res, 404, "NOT_FOUND", "Game article not found");

    const articleId = article.id;

    // relatedArticleGames: 6 latest game articles (exclude current)
    // relatedArticleBonus: 6 latest bonus articles
    // games: 8 games (below the article)
    const [relatedGamesFeed, relatedArticleBonus, games] = await Promise.all([
      getMixedGameArticleFeed({ excludeGameArticleId: articleId }),
      prisma.bonusArticle.findMany({
        where: { status: "published" },
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        take: RELATED_LIMIT,
      }),
      prisma.game.findMany({
        where: { status: "published" },
        select: {
          id: true,
          title: true,
          slug: true,
          featureImg: true,
          tag: true,
          gameProvider: true,
          gameDetails: true,
          clientLink: true,
        },
        orderBy: { createdAt: "desc" },
        take: GAMES_BELOW_LIMIT,
      }),
    ]);

    const relatedArticleGames = relatedGamesFeed.slice(0, RELATED_LIMIT);

    const { createdBy, ...rest } = article;
    const editor = createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          avatarUrl: createdBy.avatarUrl,
          bio: createdBy.bio,
          profilePublic: createdBy.profilePublic,
          ...(createdBy.showEmailPublicly && createdBy.email
            ? { email: createdBy.email }
            : {}),
        }
      : null;

    return ok(res, {
      ...rest,
      editor,
      relatedArticleGames,
      relatedArticleBonus,
      games,
    });
  }),
);

module.exports = router;
