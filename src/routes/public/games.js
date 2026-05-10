const express = require("express");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

// GET /api/v1/public/games – list published games with pagination
router.get(
  "/games",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = { status: "published" };

    const [items, total] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
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
      }),
      prisma.game.count({ where }),
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

// GET /api/v1/public/games/:slug – single game by slug (SEO + TipTap + linked casinos)
router.get(
  "/games/:slug",
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findFirst({
      where: { slug: req.params.slug, status: "published" },
      select: {
        id: true,
        title: true,
        slug: true,
        featureImg: true,
        tag: true,
        gameProvider: true,
        gameDetails: true,
        clientLink: true,
        seoTitle: true,
        seoDesc: true,
        focusKeywords: true,
        content: true,
        casinos: {
          select: {
            casino: {
              select: { id: true, casinoName: true, slug: true, featureImg: true },
            },
          },
        },
      },
    });
    if (!game) return fail(res, 404, "NOT_FOUND", "Game not found");
    const { casinos: rows, ...rest } = game;
    return ok(res, {
      ...rest,
      casinos: (rows || []).map((r) => r.casino),
    });
  })
);

module.exports = router;
