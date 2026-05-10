const express = require("express");
const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const requireRole = require("../../middlewares/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

// GET /api/v1/admin/newsletter — list subscriptions (subscribed, unsubscribed, dates)
router.get(
  "/newsletter",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status; // 'subscribed' | 'unsubscribed' | omit = all
    const skip = (page - 1) * limit;

    const where = {};
    if (status === "subscribed") where.subscribed = true;
    if (status === "unsubscribed") where.subscribed = false;

    const [items, total] = await Promise.all([
      prisma.newsletterSubscription.findMany({
        where,
        orderBy: [{ subscribed: "desc" }, { subscribedAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          subscribed: true,
          subscribedAt: true,
          unsubscribedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.newsletterSubscription.count({ where }),
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

module.exports = router;
