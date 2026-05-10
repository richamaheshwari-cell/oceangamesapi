const express = require("express");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

const listFields = {
  id: true,
  casinoName: true,
  slug: true,
  featureImg: true,
  rating: true,
  reviewCount: true,
  bonusAmt: true,
  bonusDetails: true,
  totalGames: true,
  tags: true,
  payoutSpeed: true,
  clientLink: true,
};

// GET /api/v1/public/casinos – list published casinos (pagination)
router.get(
  "/casinos",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = { status: "published" };

    const [items, total] = await Promise.all([
      prisma.casino.findMany({
        where,
        select: listFields,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.casino.count({ where }),
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

const gameListFieldsForCasino = {
  id: true,
  title: true,
  slug: true,
  featureImg: true,
  tag: true,
  gameProvider: true,
  gameDetails: true,
  clientLink: true,
};

// GET /api/v1/public/casinos/:slug/games – published games linked to this casino (pagination; default 6 per page)
router.get(
  "/casinos/:slug/games",
  asyncHandler(async (req, res) => {
    const casino = await prisma.casino.findFirst({
      where: { slug: req.params.slug, status: "published" },
      select: { id: true },
    });
    if (!casino) return fail(res, 404, "NOT_FOUND", "Casino not found");

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const skip = (page - 1) * limit;

    const excludeSlugRaw =
      typeof req.query.excludeSlug === "string" && req.query.excludeSlug.trim()
        ? req.query.excludeSlug.trim()
        : null;
    let excludeSlug = excludeSlugRaw
      ? excludeSlugRaw
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      : null;
    if (excludeSlug === "") excludeSlug = null;
    const excludeId =
      typeof req.query.excludeId === "string" && req.query.excludeId.trim()
        ? req.query.excludeId.trim()
        : null;

    const where = {
      status: "published",
      casinos: { some: { casinoId: casino.id } },
      ...(excludeSlug ? { slug: { not: excludeSlug } } : {}),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.game.findMany({
        where,
        select: gameListFieldsForCasino,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
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

// GET /api/v1/public/casinos/:slug – one casino by slug (includes seoTitle, seoDesc, content for the page)
router.get(
  "/casinos/:slug",
  asyncHandler(async (req, res) => {
    const casino = await prisma.casino.findFirst({
      where: { slug: req.params.slug, status: "published" },
      select: {
        ...listFields,
        seoTitle: true,
        seoDesc: true,
        content: true,
      },
    });
    if (!casino) return fail(res, 404, "NOT_FOUND", "Casino not found");
    return ok(res, casino);
  })
);

module.exports = router;
