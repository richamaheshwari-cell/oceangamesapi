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
const BONUSES_BELOW_LIMIT = 8;

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

async function getMixedBonusArticleFeed({ excludeBonusArticleId } = {}) {
  const [blogs, casinoArticles, gameArticles, bonusArticles, news] =
    await Promise.all([
      prisma.blog.findMany({
        where: { status: "published", showInBonusArticle: true },
        select: mixedFeedFields,
      }),
      prisma.casinoArticle.findMany({
        where: { status: "published", showInBonusArticle: true },
        select: mixedFeedFields,
      }),
      prisma.gameArticle.findMany({
        where: { status: "published", showInBonusArticle: true },
        select: mixedFeedFields,
      }),
      prisma.bonusArticle.findMany({
        where: {
          status: "published",
          showInBonusArticle: true,
          ...(excludeBonusArticleId
            ? { id: { not: excludeBonusArticleId } }
            : {}),
        },
        select: mixedFeedFields,
      }),
      prisma.news.findMany({
        where: { status: "published", showInBonusArticle: true },
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

router.get(
  "/bonus-articles",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const bonusId = req.query.bonusId;

    if (bonusId) {
      const skip = (page - 1) * limit;
      const where = { status: "published", bonusId };
      const [items, total] = await Promise.all([
        prisma.bonusArticle.findMany({
          where,
          select: {
            ...listFields,
            bonus: { select: { id: true, title: true, slug: true } },
          },
          orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
          skip,
          take: limit,
        }),
        prisma.bonusArticle.count({ where }),
      ]);

      return ok(res, {
        items,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }

    const mixed = await getMixedBonusArticleFeed();
    return ok(res, paginate(mixed, page, limit));
  }),
);

router.get(
  "/bonus-articles/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;

    const article = await prisma.bonusArticle.findFirst({
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
        bonus: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!article) return fail(res, 404, "NOT_FOUND", "Bonus article not found");

    const articleId = article.id;

    // latestArticleBonus: 6 latest bonus articles (exclude current)
    // latestArticleGames: 6 latest game articles
    // bonus: 8 bonuses (below the article)
    const [relatedBonusFeed, latestArticleGames, bonus] = await Promise.all([
      getMixedBonusArticleFeed({ excludeBonusArticleId: articleId }),
      prisma.gameArticle.findMany({
        where: { status: "published" },
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        take: RELATED_LIMIT,
      }),
      prisma.bonus.findMany({
        where: { status: "published" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          clientLink: true,
          highlight: true,
          bonusType: true,
          iconKey: true,
        },
        orderBy: { createdAt: "desc" },
        take: BONUSES_BELOW_LIMIT,
      }),
    ]);

    const latestArticleBonus = relatedBonusFeed.slice(0, RELATED_LIMIT);

    const { createdBy, updatedBy, ...rest } = article;
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
      latestArticleBonus,
      latestArticleGames,
      bonus,
    });
  }),
);

module.exports = router;
