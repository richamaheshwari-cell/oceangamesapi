/**
 * Dashboard API – role-based data for Admin (super_admin, admin) and Editor (editor, seo_editor) dashboards.
 *
 * super_admin / admin: global totals, global status summary, recent content (all), recent logins, editors directory, subscribers count.
 * editor / seo_editor: my status summary, my recent content, editors directory. (My stats also available from GET /me.)
 */
const express = require("express");
const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const requireRole = require("../../middlewares/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { ok } = require("../../utils/http");

const router = express.Router();

const CONTENT_TYPES = [
  { key: "pages", model: prisma.page, label: "Pages", titleField: "title", statusField: "isPublished", isPage: true },
  { key: "casinos", model: prisma.casino, label: "Casinos", titleField: "casinoName", statusField: "status", isPage: false },
  { key: "casino_articles", model: prisma.casinoArticle, label: "Casino Articles", titleField: "title", statusField: "status", isPage: false },
  { key: "games", model: prisma.game, label: "Games", titleField: "title", statusField: "status", isPage: false },
  { key: "game_articles", model: prisma.gameArticle, label: "Game Articles", titleField: "title", statusField: "status", isPage: false },
  { key: "blogs", model: prisma.blog, label: "Blogs", titleField: "title", statusField: "status", isPage: false },
  { key: "news", model: prisma.news, label: "News", titleField: "title", statusField: "status", isPage: false },
  { key: "bonuses", model: prisma.bonus, label: "Bonuses", titleField: "title", statusField: "status", isPage: false },
  { key: "bonus_articles", model: prisma.bonusArticle, label: "Bonus Articles", titleField: "title", statusField: "status", isPage: false },
];

const RECENT_LIMIT = 20;
const RECENT_PER_TYPE = 4;

async function getGlobalTotals() {
  const [pages, casinos, casinoArticles, games, gameArticles, blogs, news, bonuses, bonusArticles, subscribers] = await Promise.all([
    prisma.page.count(),
    prisma.casino.count(),
    prisma.casinoArticle.count(),
    prisma.game.count(),
    prisma.gameArticle.count(),
    prisma.blog.count(),
    prisma.news.count(),
    prisma.bonus.count(),
    prisma.bonusArticle.count(),
    prisma.newsletterSubscription.count({ where: { subscribed: true } }),
  ]);
  return {
    pages,
    casinos,
    casinoArticles,
    games,
    gameArticles,
    blogs,
    news,
    bonuses,
    bonusArticles,
    subscribers,
  };
}

async function getStatusSummary(createdById = null) {
  const where = createdById ? { createdById } : {};
  const summary = [];

  for (const { key, model, label, statusField, isPage } of CONTENT_TYPES) {
    if (isPage) {
      const [published, draft] = await Promise.all([
        model.count({ where: { ...where, isPublished: true } }),
        model.count({ where: { ...where, isPublished: false } }),
      ]);
      summary.push({ type: key, label, draft, pending: 0, published });
    } else {
      const [draft, pending, published] = await Promise.all([
        model.count({ where: { ...where, status: "draft" } }),
        model.count({ where: { ...where, status: "pending" } }),
        model.count({ where: { ...where, status: "published" } }),
      ]);
      summary.push({ type: key, label, draft, pending, published });
    }
  }
  return summary;
}

async function getRecentUpdated(createdById = null, limit = RECENT_LIMIT) {
  const where = createdById ? { createdById } : {};
  const rows = [];

  for (const { key, model, titleField, statusField, isPage } of CONTENT_TYPES) {
    const select = {
      id: true,
      [titleField]: true,
      updatedAt: true,
      updatedBy: { select: { id: true, name: true, email: true } },
    };
    if (isPage) select.isPublished = true;
    else select[statusField] = true;

    const items = await model.findMany({
      where,
      select,
      orderBy: { updatedAt: "desc" },
      take: RECENT_PER_TYPE,
    });

    for (const item of items) {
      const status = isPage ? (item.isPublished ? "published" : "draft") : item[statusField];
      rows.push({
        id: item.id,
        type: key,
        title: item[titleField],
        status,
        updatedAt: item.updatedAt,
        updatedBy: item.updatedBy ? { id: item.updatedBy.id, name: item.updatedBy.name, email: item.updatedBy.email } : null,
      });
    }
  }

  rows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return rows.slice(0, limit);
}

async function getRecentLogins(limit = 10) {
  const users = await prisma.adminUser.findMany({
    where: { lastLoginAt: { not: null } },
    orderBy: { lastLoginAt: "desc" },
    take: limit,
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
  });
  return users;
}

async function getEditorsDirectory(includePostCount = false) {
  const users = await prisma.adminUser.findMany({
    where: {
      role: { in: ["editor", "seo_editor", "admin"] },
      isActive: true,
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  if (!includePostCount || users.length === 0) return users;

  const withCounts = await Promise.all(
    users.map(async (u) => {
      const [p, c, ca, g, ga, b, n, bo, ba] = await Promise.all([
        prisma.page.count({ where: { createdById: u.id } }),
        prisma.casino.count({ where: { createdById: u.id } }),
        prisma.casinoArticle.count({ where: { createdById: u.id } }),
        prisma.game.count({ where: { createdById: u.id } }),
        prisma.gameArticle.count({ where: { createdById: u.id } }),
        prisma.blog.count({ where: { createdById: u.id } }),
        prisma.news.count({ where: { createdById: u.id } }),
        prisma.bonus.count({ where: { createdById: u.id } }),
        prisma.bonusArticle.count({ where: { createdById: u.id } }),
      ]);
      const postCount = p + c + ca + g + ga + b + n + bo + ba;
      return { ...u, postCount };
    })
  );
  withCounts.sort((a, b) => (b.postCount || 0) - (a.postCount || 0));
  return withCounts;
}

// GET /api/v1/admin/dashboard – role-based dashboard data
router.get(
  "/dashboard",
  requireAdminAuth,
  requireRole("super_admin", "admin", "editor", "seo_editor"),
  asyncHandler(async (req, res) => {
    const role = req.admin.role;
    const userId = req.admin.sub;
    const isAdminOrSuper = role === "super_admin" || role === "admin";

    if (isAdminOrSuper) {
      const [globalTotals, globalStatusSummary, myStatusSummary, recentUpdated, recentLogins, editorsDirectory, subscribersCount] = await Promise.all([
        getGlobalTotals(),
        getStatusSummary(null),
        getStatusSummary(userId),
        getRecentUpdated(null, RECENT_LIMIT),
        getRecentLogins(10),
        getEditorsDirectory(true),
        prisma.newsletterSubscription.count({ where: { subscribed: true } }),
      ]);

      return ok(res, {
        role,
        globalTotals,
        globalStatusSummary,
        myStatusSummary,
        recentUpdated,
        recentLogins,
        editorsDirectory,
        subscribersCount,
      });
    }

    // editor / seo_editor: only my data + editors directory
    const [myStatusSummary, recentUpdated, editorsDirectory] = await Promise.all([
      getStatusSummary(userId),
      getRecentUpdated(userId, RECENT_LIMIT),
      getEditorsDirectory(),
    ]);

    return ok(res, {
      role,
      myStatusSummary,
      recentUpdated,
      editorsDirectory,
    });
  })
);

module.exports = router;
