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

const router = express.Router();

const statusEnum = z.enum(["published", "draft", "pending"]);

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional().transform((v) => (v === "" ? null : v ?? null));
const optionalStringMax200 = z.union([z.string().max(200), z.literal("")]).optional().transform((v) => (v === "" ? null : v ?? null));

const createCasinoSchema = z.object({
  casinoName: z.string().min(2).max(120),
  slug: z.string().min(2).max(140),
  featureImg: optionalUrl,
  status: statusEnum.default("draft"),
  rating: z.number().min(0).max(5).optional().nullable(),
  reviewCount: z.number().int().min(0).optional().default(0),
  bonusAmt: z.string().max(120).optional().nullable(),
  bonusDetails: z.array(z.string().min(1).max(80)).optional().default([]),
  totalGames: z.number().int().min(0).optional().default(0),
  tags: z.array(z.string().min(1).max(40)).optional().default([]),
  payoutSpeed: z.string().max(60).optional().nullable(),
  clientLink: optionalUrl,
  seoTitle: optionalStringMax200,
  seoDesc: z.union([z.string().max(500), z.literal("")]).optional().transform((v) => (v === "" ? null : v ?? null)),
  content: z.any().optional().nullable(),
}).strict();

const listSchema = z.object({
  q: z.string().optional(),
  status: statusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

// SUPER_ADMIN + ADMIN + EDITOR: create casino (ownership set to current user)
router.post(
  "/casinos",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = createCasinoSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const data = parsed.data;
    const slug = data.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    try {
      const casino = await prisma.casino.create({
        data: {
          casinoName: data.casinoName.trim(),
          slug,
          featureImg: data.featureImg ?? null,
          status: data.status,
          rating: data.rating ?? null,
          reviewCount: data.reviewCount ?? 0,
          bonusAmt: data.bonusAmt ?? null,
          bonusDetails: data.bonusDetails ?? [],
          totalGames: data.totalGames ?? 0,
          tags: data.tags ?? [],
          payoutSpeed: data.payoutSpeed ?? null,
          clientLink: data.clientLink ?? null,
          seoTitle: data.seoTitle ?? null,
          seoDesc: data.seoDesc ?? null,
          content: data.content ?? null,
          createdById: req.admin.sub,
          updatedById: req.admin.sub,
        },
        include: includeCreator,
      });

      return ok(res, casino);
    } catch (e) {
      if (String(e?.code) === "P2002") {
        return fail(res, 409, "SLUG_EXISTS", "Slug already exists");
      }
      throw e;
    }
  })
);

// ALL ADMIN ROLES: list casinos
router.get(
  "/casinos",
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
              { casinoName: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.casino.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: includeCreator,
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

const updateCasinoSchema = z.object({
  casinoName: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(140).optional(),
  featureImg: optionalUrl,
  status: statusEnum.optional(),
  rating: z.number().min(0).max(5).optional().nullable(),
  reviewCount: z.number().int().min(0).optional(),
  bonusAmt: z.string().max(120).optional().nullable(),
  bonusDetails: z.array(z.string().min(1).max(80)).optional(),
  totalGames: z.number().int().min(0).optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  payoutSpeed: z.string().max(60).optional().nullable(),
  clientLink: optionalUrl,
  seoTitle: optionalStringMax200,
  seoDesc: z.union([z.string().max(500), z.literal("")]).optional().transform((v) => (v === "" ? null : v ?? null)),
  content: z.any().optional().nullable(),
}).strict();

// GET single by slug (admin) – /casino/:slug e.g. /api/v1/admin/casino/royal-vegas
router.get(
  "/casino/:slug",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const casino = await prisma.casino.findUnique({
      where: { slug: req.params.slug },
      include: includeCreator,
    });
    if (!casino) return fail(res, 404, "NOT_FOUND", "Casino not found");
    return ok(res, casino);
  })
);

// GET single by id (admin)
router.get(
  "/casinos/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const casino = await prisma.casino.findUnique({
      where: { id: req.params.id },
      include: includeCreator,
    });
    if (!casino) return fail(res, 404, "NOT_FOUND", "Casino not found");
    return ok(res, casino);
  })
);

// UPDATE: super_admin/admin can edit any; editor only own content
router.put(
  "/casinos/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = updateCasinoSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const target = await prisma.casino.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Casino not found");

    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only edit content you created");
    }

    const data = { ...parsed.data };
    if (typeof data.slug === "string") {
      data.slug = data.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    data.updatedById = req.admin.sub;

    try {
      const updated = await prisma.casino.update({
        where: { id: req.params.id },
        data,
        include: includeCreator,
      });
      return ok(res, updated);
    } catch (e) {
      if (String(e?.code) === "P2002") {
        return fail(res, 409, "SLUG_EXISTS", "Slug already exists");
      }
      throw e;
    }
  })
);

// PATCH status: same ownership rules as UPDATE
router.patch(
  "/casinos/:id/status",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = z.object({ status: statusEnum }).safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const target = await prisma.casino.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Casino not found");

    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only update content you created");
    }

    const updated = await prisma.casino.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status, updatedById: req.admin.sub },
      include: includeCreator,
    });
    return ok(res, updated);
  })
);

// DELETE: super_admin can delete any; admin can delete any; editor only own
router.delete(
  "/casinos/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const target = await prisma.casino.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Casino not found");

    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only delete content you created");
    }

    if (target.featureImg) deleteUploadedImage(target.featureImg);
    await prisma.casino.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

module.exports = router;
