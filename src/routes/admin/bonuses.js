const express = require("express");
const { z } = require("zod");
const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const requireRole = require("../../middlewares/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");
const { canModifyContent } = require("../../utils/contentOwner");
const { deleteUploadedImage } = require("../../utils/deleteUploadedImage");

const router = express.Router();
const includeCreator = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
};

const statusEnum = z.enum(["published", "draft", "pending"]);

/** Omit, null, empty string, or valid URL → stored as null or URL (same idea as games). */
const optionalUrl = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === null ? null : v ?? null));

const createSchema = z
  .object({
    title: z.string().min(2).max(200),
    slug: z.string().min(2).max(200),
    featureImg: z.string().url().optional().nullable(),
    description: z.array(z.string().min(1).max(500)).optional().default([]),
    clientLink: optionalUrl,
    highlight: z.string().min(1).max(80),
    bonusType: z.string().min(1).max(60),
    iconKey: z.string().min(1).max(80),
    status: statusEnum.optional().default("draft"),
  })
  .strict();

const updateSchema = createSchema.partial();

const listSchema = z
  .object({
    status: statusEnum.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().optional(),
  })
  .strict();

function normalizeSlug(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

router.post(
  "/bonuses",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const data = parsed.data;
    const slug = normalizeSlug(data.slug);
    try {
      const bonus = await prisma.bonus.create({
        data: {
          title: data.title.trim(),
          slug,
          featureImg: data.featureImg?.trim() || null,
          description: data.description ?? [],
          clientLink: data.clientLink ?? null,
          highlight: data.highlight.trim(),
          bonusType: data.bonusType.trim(),
          iconKey: data.iconKey.trim(),
          status: data.status ?? "draft",
          createdById: req.admin.sub,
          updatedById: req.admin.sub,
        },
        include: includeCreator,
      });
      return ok(res, bonus);
    } catch (e) {
      if (String(e?.code) === "P2002") return fail(res, 409, "SLUG_EXISTS", "Slug already exists");
      throw e;
    }
  })
);

router.get(
  "/bonuses",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid query", parsed.error.flatten());
    }
    const { status, page, limit, q } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.bonus.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
        include: includeCreator,
      }),
      prisma.bonus.count({ where }),
    ]);
    return ok(res, { items, page, limit, total, totalPages: Math.ceil(total / limit) });
  })
);

router.get(
  "/bonuses/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const bonus = await prisma.bonus.findUnique({
      where: { id: req.params.id },
      include: includeCreator,
    });
    if (!bonus) return fail(res, 404, "NOT_FOUND", "Bonus not found");
    return ok(res, bonus);
  })
);

router.put(
  "/bonuses/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const target = await prisma.bonus.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Bonus not found");
    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only edit content you created");
    }
    const data = { ...parsed.data };
    if (typeof data.slug === "string") data.slug = normalizeSlug(data.slug);
    if (data.featureImg !== undefined) data.featureImg = data.featureImg?.trim() || null;
    data.updatedById = req.admin.sub;
    try {
      const updated = await prisma.bonus.update({
        where: { id: req.params.id },
        data,
        include: includeCreator,
      });
      return ok(res, updated);
    } catch (e) {
      if (String(e?.code) === "P2002") return fail(res, 409, "SLUG_EXISTS", "Slug already exists");
      throw e;
    }
  })
);

router.delete(
  "/bonuses/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const target = await prisma.bonus.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Bonus not found");
    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only delete content you created");
    }
    if (target.featureImg) deleteUploadedImage(target.featureImg);
    await prisma.bonus.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

module.exports = router;
