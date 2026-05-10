const express = require("express");
const { z } = require("zod");

const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const requireRole = require("../../middlewares/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");
const { canModifyContent } = require("../../utils/contentOwner");

const includeCreator = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
};

const router = express.Router();

const createSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  title: z.string().min(2).max(200),
  contentHtml: z.string().min(1),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDesc: z.string().max(500).optional().nullable(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateSchema = createSchema.partial();

// CREATE: all roles; ownership set to current user
router.post(
  "/pages",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const page = await prisma.page.create({
      data: {
        ...parsed.data,
        createdById: req.admin.sub,
        updatedById: req.admin.sub,
      },
      include: includeCreator,
    });
    return ok(res, page);
  })
);

// LIST
router.get(
  "/pages",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const pages = await prisma.page.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: includeCreator,
    });
    return ok(res, pages);
  })
);

// DETAIL
router.get(
  "/pages/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findUnique({
      where: { id: req.params.id },
      include: includeCreator,
    });
    if (!page) return fail(res, 404, "NOT_FOUND", "Page not found");
    return ok(res, page);
  })
);

// UPDATE: super_admin/admin any; editor only own
router.put(
  "/pages/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const target = await prisma.page.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Page not found");

    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only edit content you created");
    }

    const updated = await prisma.page.update({
      where: { id: req.params.id },
      data: { ...parsed.data, updatedById: req.admin.sub },
      include: includeCreator,
    });
    return ok(res, updated);
  })
);

// DELETE: super_admin/admin any; editor only own
router.delete(
  "/pages/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const target = await prisma.page.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Page not found");

    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(res, 403, "FORBIDDEN", "You can only delete content you created");
    }

    await prisma.page.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

module.exports = router;
