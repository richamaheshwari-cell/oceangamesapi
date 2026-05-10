const express = require("express");
const { z } = require("zod");

const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const requireRole = require("../../middlewares/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");
const { canModifyContent } = require("../../utils/contentOwner");
const { deleteUploadedImage } = require("../../utils/deleteUploadedImage");

const includeCreator = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
};

const includeCasinos = {
  casinos: {
    select: {
      casino: { select: { id: true, casinoName: true, slug: true } },
    },
  },
};

const router = express.Router();
const statusEnum = z.enum(["published", "draft", "pending"]);

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional().transform((v) => (v === "" ? null : v ?? null));
const optionalStringMax200 = z.union([z.string().max(200), z.literal("")]).optional().transform((v) => (v === "" ? null : v ?? null));

const createGameSchema = z
  .object({
    title: z.string().min(2).max(200),
    slug: z.string().min(2).max(200),
    casinoIds: z.array(z.string().uuid()).min(1).max(100),
    featureImg: optionalUrl,
    tag: z.string().max(80).optional().nullable(),
    gameProvider: z.array(z.string().min(1).max(120)).optional().default([]),
    gameDetails: z.array(z.string().min(1).max(200)).optional().default([]),
    clientLink: optionalUrl,
    status: statusEnum.optional().default("draft"),
    seoTitle: optionalStringMax200,
    seoDesc: z.union([z.string().max(500), z.literal("")]).optional().transform((v) => (v === "" ? null : v ?? null)),
    focusKeywords: z.array(z.string().min(1).max(80)).optional().default([]),
    content: z.any().optional().nullable(),
  })
  .strict();

const listSchema = z
  .object({
    q: z.string().optional(),
    status: statusEnum.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const updateGameSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    slug: z.string().min(2).max(200).optional(),
    casinoIds: z.array(z.string().uuid()).min(1).max(100).optional(),
    featureImg: optionalUrl,
    tag: z.string().max(80).optional().nullable(),
    gameProvider: z.array(z.string().min(1).max(120)).optional(),
    gameDetails: z.array(z.string().min(1).max(200)).optional(),
    clientLink: optionalUrl,
    status: statusEnum.optional(),
    seoTitle: optionalStringMax200,
    seoDesc: z.union([z.string().max(500), z.literal("")]).optional().transform((v) => (v === "" ? null : v ?? null)),
    focusKeywords: z.array(z.string().min(1).max(80)).optional(),
    content: z.any().optional().nullable(),
  })
  .strict();

function normalizeSlug(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapGame(game) {
  if (!game) return game;
  const { casinos: rows, ...rest } = game;
  return {
    ...rest,
    casinos: (rows || []).map((r) => r.casino),
  };
}

async function assertCasinosExist(casinoIds) {
  const unique = [...new Set(casinoIds)];
  const count = await prisma.casino.count({ where: { id: { in: unique } } });
  if (count !== unique.length) {
    return { ok: false, unique };
  }
  return { ok: true, unique };
}

router.post(
  "/games",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = createGameSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const data = parsed.data;
    const slug = normalizeSlug(data.slug);

    const { ok: casinosOk, unique: casinoIds } = await assertCasinosExist(data.casinoIds);
    if (!casinosOk) {
      return fail(res, 400, "INVALID_CASINOS", "One or more casino ids do not exist");
    }

    try {
      const game = await prisma.game.create({
        data: {
          title: data.title.trim(),
          slug,
          featureImg: data.featureImg ?? null,
          tag: data.tag ?? null,
          gameProvider: data.gameProvider ?? [],
          gameDetails: data.gameDetails ?? [],
          clientLink: data.clientLink ?? null,
          status: data.status ?? "draft",
          seoTitle: data.seoTitle ?? null,
          seoDesc: data.seoDesc ?? null,
          focusKeywords: data.focusKeywords ?? [],
          content: data.content ?? null,
          createdById: req.admin.sub,
          updatedById: req.admin.sub,
          casinos: {
            create: casinoIds.map((casinoId) => ({ casino: { connect: { id: casinoId } } })),
          },
        },
        include: { ...includeCreator, ...includeCasinos },
      });
      return ok(res, mapGame(game));
    } catch (e) {
      if (String(e?.code) === "P2002") return fail(res, 409, "SLUG_EXISTS", "Slug already exists");
      throw e;
    }
  })
);

router.get(
  "/games",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid query params", parsed.error.flatten());
    }
    const { q, status, page, limit } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { tag: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { ...includeCreator, ...includeCasinos },
      }),
      prisma.game.count({ where }),
    ]);
    return ok(res, {
      items: items.map(mapGame),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// GET one game by slug (admin) – before /games/:id
router.get(
  "/game/:slug",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({
      where: { slug: req.params.slug },
      include: { ...includeCreator, ...includeCasinos },
    });
    if (!game) return fail(res, 404, "NOT_FOUND", "Game not found");
    return ok(res, mapGame(game));
  })
);

router.get(
  "/games/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: { ...includeCreator, ...includeCasinos },
    });
    if (!game) return fail(res, 404, "NOT_FOUND", "Game not found");
    return ok(res, mapGame(game));
  })
);

router.put(
  "/games/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = updateGameSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const target = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Game not found");
    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only edit content you created");
    }
    const data = { ...parsed.data };
    if (typeof data.slug === "string") data.slug = normalizeSlug(data.slug);

    let casinoIds = null;
    if (data.casinoIds !== undefined) {
      const check = await assertCasinosExist(data.casinoIds);
      if (!check.ok) {
        return fail(res, 400, "INVALID_CASINOS", "One or more casino ids do not exist");
      }
      casinoIds = check.unique;
      delete data.casinoIds;
    }

    data.updatedById = req.admin.sub;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        if (casinoIds) {
          await tx.gameCasino.deleteMany({ where: { gameId: req.params.id } });
          await tx.gameCasino.createMany({
            data: casinoIds.map((casinoId) => ({ gameId: req.params.id, casinoId })),
          });
        }
        return tx.game.update({
          where: { id: req.params.id },
          data,
          include: { ...includeCreator, ...includeCasinos },
        });
      });
      return ok(res, mapGame(updated));
    } catch (e) {
      if (String(e?.code) === "P2002") return fail(res, 409, "SLUG_EXISTS", "Slug already exists");
      throw e;
    }
  })
);

router.patch(
  "/games/:id/status",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = z.object({ status: statusEnum }).safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const target = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Game not found");
    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only update content you created");
    }
    const updated = await prisma.game.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status, updatedById: req.admin.sub },
      include: { ...includeCreator, ...includeCasinos },
    });
    return ok(res, mapGame(updated));
  })
);

router.delete(
  "/games/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const target = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Game not found");
    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only delete content you created");
    }
    if (target.featureImg) deleteUploadedImage(target.featureImg);
    await prisma.game.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

module.exports = router;
