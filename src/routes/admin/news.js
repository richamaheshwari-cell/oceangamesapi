const express = require("express");
const { z } = require("zod");
const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const requireRole = require("../../middlewares/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");
const { canModifyContent } = require("../../utils/contentOwner");
const { sendNewsletterNewNewsEmail } = require("../../utils/newsletterMailer");
const { deleteUploadedImage } = require("../../utils/deleteUploadedImage");

const router = express.Router();

/** Send "new news" email to all subscribed newsletter emails (runs in background). */
function notifySubscribersOfNewNews(news) {
  const payload = {
    title: news.title,
    slug: news.slug,
    featureImg: news.featureImg ?? null,
    shortDesc: news.shortDesc ?? "",
  };
  setImmediate(async () => {
    try {
      const subs = await prisma.newsletterSubscription.findMany({
        where: { subscribed: true },
        select: { email: true },
      });
      for (const { email } of subs) {
        try {
          await sendNewsletterNewNewsEmail(email, payload);
        } catch (err) {
          console.error("[newsletter] Send to", email, "failed:", err?.message);
        }
      }
    } catch (err) {
      console.error("[newsletter] Notify subscribers failed:", err);
    }
  });
}
const statusEnum = z.enum(["published", "draft", "pending"]);

const includeCreator = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
};

// List: omit heavy content (content, seo*) for faster response
const listSelect = {
  id: true,
  title: true,
  slug: true,
  featureImg: true,
  shortDesc: true,
  publishDate: true,
  readTime: true,
  tags: true,
  isTrending: true,
  status: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
};

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? null : (v ?? null)));

const createSchema = z
  .object({
    title: z.string().min(2).max(200),
    slug: z.string().min(2).max(200),
    featureImg: optionalUrl,
    shortDesc: z.string().min(1).max(500),
    publishDate: z.coerce.date(),
    readTime: z.string().min(1).max(30),
    content: z.any().optional().nullable(),
    tags: z.array(z.string().min(1).max(60)).optional().default([]),
    seoTitle: z
      .union([z.string().max(200), z.literal("")])
      .optional()
      .transform((v) => (v === "" ? null : (v ?? null))),
    seoDesc: z
      .union([z.string().max(500), z.literal("")])
      .optional()
      .transform((v) => (v === "" ? null : (v ?? null))),
    focusKeywords: z.array(z.string().min(1).max(80)).optional().default([]),
    isTrending: z.boolean().optional().default(false),
    showInBlog: z.boolean().optional().default(false),
    showInGameArticle: z.boolean().optional().default(false),
    showInBonusArticle: z.boolean().optional().default(false),
    showInCasinoArticle: z.boolean().optional().default(false),
    showInNews: z.boolean().optional().default(false),
    status: statusEnum.optional().default("draft"),
  })
  .strict();

const updateSchema = createSchema.partial();

const listSchema = z
  .object({
    status: statusEnum.optional(),
    isTrending: z
      .string()
      .optional()
      .transform((v) =>
        v === "true" ? true : v === "false" ? false : undefined,
      ),
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

router.get(
  "/news",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid query",
        parsed.error.flatten(),
      );
    }
    const { status, isTrending, page, limit, q } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
      ...(status ? { status } : {}),
      ...(typeof isTrending === "boolean" ? { isTrending } : {}),
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
      prisma.news.findMany({
        where,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: listSelect,
      }),
      prisma.news.count({ where }),
    ]);
    return ok(res, {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

router.post(
  "/news",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid request body",
        parsed.error.flatten(),
      );
    }
    const data = parsed.data;
    const slug = normalizeSlug(data.slug);
    try {
      const news = await prisma.news.create({
        data: {
          title: data.title.trim(),
          slug,
          featureImg: data.featureImg ?? null,
          shortDesc: data.shortDesc.trim(),
          publishDate: data.publishDate,
          readTime: data.readTime.trim(),
          content: data.content ?? null,
          tags: data.tags ?? [],
          seoTitle: data.seoTitle ?? null,
          seoDesc: data.seoDesc ?? null,
          focusKeywords: data.focusKeywords ?? [],
          isTrending: data.isTrending ?? false,
          showInBlog: data.showInBlog ?? false,
          showInGameArticle: data.showInGameArticle ?? false,
          showInBonusArticle: data.showInBonusArticle ?? false,
          showInCasinoArticle: data.showInCasinoArticle ?? false,
          showInNews: data.showInNews ?? false,
          status: data.status ?? "draft",
          createdById: req.admin.sub,
          updatedById: req.admin.sub,
        },
        include: includeCreator,
      });
      if (news.status === "published") {
        notifySubscribersOfNewNews(news);
      }
      return ok(res, news);
    } catch (e) {
      if (String(e?.code) === "P2002")
        return fail(res, 409, "SLUG_EXISTS", "Slug already exists");
      throw e;
    }
  }),
);

router.get(
  "/news/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const news = await prisma.news.findUnique({
      where: { id: req.params.id },
      include: includeCreator,
    });
    if (!news) return fail(res, 404, "NOT_FOUND", "News not found");
    return ok(res, news);
  }),
);

router.put(
  "/news/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid request body",
        parsed.error.flatten(),
      );
    }
    const target = await prisma.news.findUnique({
      where: { id: req.params.id },
    });
    if (!target) return fail(res, 404, "NOT_FOUND", "News not found");
    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(
        res,
        403,
        "FORBIDDEN",
        "You can only edit content you created",
      );
    }
    const data = { ...parsed.data };
    if (typeof data.slug === "string") data.slug = normalizeSlug(data.slug);
    data.updatedById = req.admin.sub;
    try {
      const updated = await prisma.news.update({
        where: { id: req.params.id },
        data,
        include: includeCreator,
      });
      if (target.status !== "published" && updated.status === "published") {
        notifySubscribersOfNewNews(updated);
      }
      return ok(res, updated);
    } catch (e) {
      if (String(e?.code) === "P2002")
        return fail(res, 409, "SLUG_EXISTS", "Slug already exists");
      throw e;
    }
  }),
);

router.delete(
  "/news/:id",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const target = await prisma.news.findUnique({
      where: { id: req.params.id },
    });
    if (!target) return fail(res, 404, "NOT_FOUND", "News not found");
    if (!canModifyContent(req.admin.role, target.createdById, req.admin.sub)) {
      return fail(
        res,
        403,
        "FORBIDDEN",
        "You can only delete content you created",
      );
    }
    if (target.featureImg) deleteUploadedImage(target.featureImg);
    await prisma.news.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  }),
);

module.exports = router;
