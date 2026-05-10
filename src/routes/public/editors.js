const express = require("express");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

// GET /api/v1/public/editors/:id – public editor/author profile (for "view profile" from article/casino byline)
// Returns 404 if editor has profilePublic = false
router.get(
  "/editors/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const editor = await prisma.adminUser.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatarUrl: true,
        profilePublic: true,
        showEmailPublicly: true,
      },
    });

    if (!editor || !editor.profilePublic) {
      return fail(res, 404, "NOT_FOUND", "Editor profile not found or not public");
    }

    const [pagesCount, casinosCount, articlesCount, gamesCount, gameArticlesCount, blogsCount, newsCount, bonusesCount, bonusArticlesCount] = await Promise.all([
      prisma.page.count({ where: { createdById: id } }),
      prisma.casino.count({ where: { createdById: id } }),
      prisma.casinoArticle.count({ where: { status: "published", createdById: id } }),
      prisma.game.count({ where: { createdById: id } }),
      prisma.gameArticle.count({ where: { status: "published", createdById: id } }),
      prisma.blog.count({ where: { status: "published", createdById: id } }),
      prisma.news.count({ where: { status: "published", createdById: id } }),
      prisma.bonus.count({ where: { status: "published", createdById: id } }),
      prisma.bonusArticle.count({ where: { status: "published", createdById: id } }),
    ]);

    const profile = {
      id: editor.id,
      name: editor.name,
      avatarUrl: editor.avatarUrl,
      bio: editor.bio,
      ...(editor.showEmailPublicly && editor.email ? { email: editor.email } : {}),
      stats: {
        pagesCreated: pagesCount,
        casinosCreated: casinosCount,
        casinoArticlesCreated: articlesCount,
        gamesCreated: gamesCount,
        gameArticlesCreated: gameArticlesCount,
        blogsCreated: blogsCount,
        newsCreated: newsCount,
        bonusesCreated: bonusesCount,
        bonusArticlesCreated: bonusArticlesCount,
      },
    };

    return ok(res, profile);
  })
);

module.exports = router;
