const express = require("express");
const { z } = require("zod");
const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const requireRole = require("../../middlewares/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

// All role routes: super_admin + admin only (editor cannot see/use)
router.use(requireAdminAuth);
router.use(requireRole("super_admin", "admin"));

const reassignSchema = z
  .object({
    fromUserId: z.string().uuid(),
    toUserId: z.string().uuid(),
    contentType: z.enum(["casino", "page", "casino_article", "game", "game_article", "blog", "news", "bonus", "bonus_article", "all"]),
    ids: z.array(z.string().uuid()).optional(),
  })
  .strict();

// GET /api/v1/admin/role/history – list role assignment/revoke history (who assigned/updated/revoked whom)
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const userId = req.query.userId; // optional: filter by target user
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = userId ? { targetUserId: userId } : {};

    const [items, total] = await Promise.all([
      prisma.adminRoleHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          previousRole: true,
          newRole: true,
          createdAt: true,
          performedBy: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, email: true } },
          reassignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.adminRoleHistory.count({ where }),
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

// GET /api/v1/admin/role/editors – list editors (and admins) for reassign dropdown
router.get(
  "/editors",
  asyncHandler(async (req, res) => {
    const users = await prisma.adminUser.findMany({
      where: {
        role: { in: ["editor", "seo_editor", "admin"] },
        isActive: true,
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    return ok(res, users);
  })
);

// POST /api/v1/admin/role/reassign – transfer content ownership (e.g. Aman left → assign to Veer)
router.post(
  "/reassign",
  asyncHandler(async (req, res) => {
    const parsed = reassignSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const { fromUserId, toUserId, contentType, ids } = parsed.data;

    if (fromUserId === toUserId) {
      return fail(res, 400, "VALIDATION_ERROR", "fromUserId and toUserId must be different");
    }

    const [fromUser, toUser] = await Promise.all([
      prisma.adminUser.findUnique({ where: { id: fromUserId } }),
      prisma.adminUser.findUnique({ where: { id: toUserId } }),
    ]);

    if (!fromUser || !toUser) {
      return fail(res, 404, "NOT_FOUND", "One or both users not found");
    }
    if (!fromUser.isActive || !toUser.isActive) {
      return fail(res, 400, "BAD_REQUEST", "Both users must be active");
    }

    const whereCasino = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };
    const wherePage = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };
    const whereCasinoArticle = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };
    const whereGame = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };
    const whereGameArticle = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };
    const whereBlog = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };
    const whereNews = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };
    const whereBonus = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };
    const whereBonusArticle = ids
      ? { id: { in: ids }, createdById: fromUserId }
      : { createdById: fromUserId };

    let casinosUpdated = 0;
    let pagesUpdated = 0;
    let casinoArticlesUpdated = 0;
    let gamesUpdated = 0;
    let gameArticlesUpdated = 0;
    let blogsUpdated = 0;
    let newsUpdated = 0;
    let bonusesUpdated = 0;
    let bonusArticlesUpdated = 0;

    if (contentType === "casino" || contentType === "all") {
      const r = await prisma.casino.updateMany({
        where: whereCasino,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      casinosUpdated = r.count;
    }

    if (contentType === "page" || contentType === "all") {
      const r = await prisma.page.updateMany({
        where: wherePage,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      pagesUpdated = r.count;
    }

    if (contentType === "casino_article" || contentType === "all") {
      const r = await prisma.casinoArticle.updateMany({
        where: whereCasinoArticle,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      casinoArticlesUpdated = r.count;
    }

    if (contentType === "game" || contentType === "all") {
      const r = await prisma.game.updateMany({
        where: whereGame,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      gamesUpdated = r.count;
    }

    if (contentType === "game_article" || contentType === "all") {
      const r = await prisma.gameArticle.updateMany({
        where: whereGameArticle,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      gameArticlesUpdated = r.count;
    }

    if (contentType === "blog" || contentType === "all") {
      const r = await prisma.blog.updateMany({
        where: whereBlog,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      blogsUpdated = r.count;
    }

    if (contentType === "news" || contentType === "all") {
      const r = await prisma.news.updateMany({
        where: whereNews,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      newsUpdated = r.count;
    }

    if (contentType === "bonus" || contentType === "all") {
      const r = await prisma.bonus.updateMany({
        where: whereBonus,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      bonusesUpdated = r.count;
    }

    if (contentType === "bonus_article" || contentType === "all") {
      const r = await prisma.bonusArticle.updateMany({
        where: whereBonusArticle,
        data: { createdById: toUserId, updatedById: toUserId },
      });
      bonusArticlesUpdated = r.count;
    }

    const totalReassigned = casinosUpdated + pagesUpdated + casinoArticlesUpdated + gamesUpdated + gameArticlesUpdated + blogsUpdated + newsUpdated + bonusesUpdated + bonusArticlesUpdated;
    const fromLabel = fromUser.name || fromUser.email || fromUserId;
    const toLabel = toUser.name || toUser.email || toUserId;

    const parts = [];
    if (casinosUpdated) parts.push(`${casinosUpdated} casino(s)`);
    if (pagesUpdated) parts.push(`${pagesUpdated} page(s)`);
    if (casinoArticlesUpdated) parts.push(`${casinoArticlesUpdated} casino article(s)`);
    if (gamesUpdated) parts.push(`${gamesUpdated} game(s)`);
    if (gameArticlesUpdated) parts.push(`${gameArticlesUpdated} game article(s)`);
    if (blogsUpdated) parts.push(`${blogsUpdated} blog(s)`);
    if (newsUpdated) parts.push(`${newsUpdated} news item(s)`);
    if (bonusesUpdated) parts.push(`${bonusesUpdated} bonus(es)`);
    if (bonusArticlesUpdated) parts.push(`${bonusArticlesUpdated} bonus article(s)`);
    const contentSummary = parts.length ? parts.join(", ") : "no content";

    const message =
      totalReassigned > 0
        ? `Successfully reassigned ${contentSummary} from "${fromLabel}" to "${toLabel}". "${toLabel}" can now edit and delete these items (they will appear as owner in their list).`
        : `No content was reassigned. "${fromLabel}" may not have had any content of the selected type.`;

    return ok(res, {
      reassigned: true,
      message,
      summary: {
        fromUser: { id: fromUserId, name: fromUser.name, email: fromUser.email },
        toUser: { id: toUserId, name: toUser.name, email: toUser.email },
        casinosUpdated,
        pagesUpdated,
        casinoArticlesUpdated,
        gamesUpdated,
        gameArticlesUpdated,
        blogsUpdated,
        newsUpdated,
        bonusesUpdated,
        bonusArticlesUpdated,
        totalReassigned,
      },
      fromUserId,
      toUserId,
      casinosUpdated,
      pagesUpdated,
      casinoArticlesUpdated,
      gamesUpdated,
      gameArticlesUpdated,
      blogsUpdated,
      newsUpdated,
      bonusesUpdated,
      bonusArticlesUpdated,
    });
  })
);

module.exports = router;
