const express = require("express");
const { z } = require("zod");
const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

function normalizeAuthorSlug(s) {
  if (!s || typeof s !== "string") return null;
  const t = s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return t.length >= 2 ? t : null;
}

const profileUpdateSchema = z
  .object({
    name: z.string().min(2).max(80).optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
    authorSlug: z.union([z.string().max(120), z.literal("")]).optional(),
    profilePublic: z.boolean().optional(),
    showEmailPublicly: z.boolean().optional(),
  })
  .strict();

// GET /api/v1/admin/me – current user profile + content stats (pages, casinos, articles they created)
router.get(
  "/me",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const userId = req.admin.sub;

    const [user, pagesCount, casinosCount, articlesCount, gamesCount, gameArticlesCount, blogsCount, newsCount, bonusesCount, bonusArticlesCount] = await Promise.all([
      prisma.adminUser.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          bio: true,
          avatarUrl: true,
          profilePublic: true,
          showEmailPublicly: true,
          authorSlug: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.page.count({ where: { createdById: userId } }),
      prisma.casino.count({ where: { createdById: userId } }),
      prisma.casinoArticle.count({ where: { createdById: userId } }),
      prisma.game.count({ where: { createdById: userId } }),
      prisma.gameArticle.count({ where: { createdById: userId } }),
      prisma.blog.count({ where: { createdById: userId } }),
      prisma.news.count({ where: { createdById: userId } }),
      prisma.bonus.count({ where: { createdById: userId } }),
      prisma.bonusArticle.count({ where: { createdById: userId } }),
    ]);

    if (!user) return fail(res, 404, "NOT_FOUND", "Admin not found");

    const { createdBy, ...rest } = user;
    return ok(res, {
      ...rest,
      createdBy: createdBy ? { id: createdBy.id, name: createdBy.name, email: createdBy.email } : null,
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
    });
  })
);

// PUT /api/v1/admin/me – update own profile (name, bio, avatarUrl, profilePublic, showEmailPublicly)
// Avatar: upload via POST /admin/upload/image then set avatarUrl to data.url
router.put(
  "/me",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const data = { ...parsed.data };
    if (data.authorSlug !== undefined) {
      data.authorSlug = data.authorSlug === "" ? null : normalizeAuthorSlug(data.authorSlug);
      if (data.authorSlug === null && parsed.data.authorSlug && parsed.data.authorSlug !== "") {
        return fail(res, 400, "VALIDATION_ERROR", "authorSlug must be at least 2 characters after normalization");
      }
    }

    try {
      const updated = await prisma.adminUser.update({
        where: { id: req.admin.sub },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          bio: true,
          avatarUrl: true,
          authorSlug: true,
          profilePublic: true,
          showEmailPublicly: true,
          updatedAt: true,
        },
      });
      return ok(res, updated);
    } catch (e) {
      if (String(e?.code) === "P2002") {
        return fail(res, 409, "SLUG_TAKEN", "This author URL slug is already in use");
      }
      throw e;
    }
  })
);

module.exports = router;
