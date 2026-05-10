const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");

const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const requireRole = require("../../middlewares/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

// Allowed roles for creation/updation via API
// NOTE: super_admin cannot be created/assigned via API
const ALLOWED_ROLES = ["admin", "editor", "seo_editor"];

const createSchema = z
  .object({
    name: z.string().min(2).max(80).optional().nullable(),
    email: z.string().email(),
    role: z.enum(ALLOWED_ROLES).default("admin"),
    password: z.string().min(8).max(200),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().min(2).max(80).optional().nullable(),
    role: z.enum(ALLOWED_ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const resetPasswordSchema = z
  .object({
    password: z.string().min(8).max(200),
  })
  .strict();

const revokeSchema = z
  .object({
    reassignToUserId: z.string().uuid().optional(),
  })
  .strict();

// SUPER_ADMIN: create admin/editor/seo_editor. ADMIN: create editor only (for "create new editor by email and password")
router.post(
  "/admin-users",
  requireAdminAuth,
  requireRole("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    let { name, email, role, password, isActive } = parsed.data;

    // Admin can only create editors
    if (req.admin.role === "admin") {
      if (role !== "editor" && role !== "seo_editor") {
        return fail(res, 403, "FORBIDDEN", "Admin can only create editors");
      }
      role = role || "editor";
    }

    const hash = await bcrypt.hash(password, 12);

    try {
      const user = await prisma.adminUser.create({
        data: {
          name: name ?? null,
          email,
          role,
          isActive: isActive ?? true,
          password: hash,
          mustChangePassword: true,
          isSystem: false,
          createdById: req.admin.sub,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          isSystem: true,
          createdAt: true,
        },
      });

      await prisma.adminRoleHistory.create({
        data: {
          performedById: req.admin.sub,
          targetUserId: user.id,
          action: "assigned",
          newRole: user.role,
        },
      });

      return ok(res, user);
    } catch (e) {
      if (e?.code === "P2002") {
        return fail(res, 409, "EMAIL_EXISTS", "Email already exists");
      }
      throw e;
    }
  })
);

// SUPER_ADMIN + ADMIN: List admins (admin needs this for reassign dropdown; editor cannot access)
router.get(
  "/admin-users",
  requireAdminAuth,
  requireRole("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const users = await prisma.adminUser.findMany({
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isSystem: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok(res, users);
  })
);

// SUPER ADMIN ONLY: Update admin user
// Rules:
// - System user (super admin) cannot be changed or deactivated
// - super_admin role cannot be assigned via API (schema already blocks)
router.put(
  "/admin-users/:id",
  requireAdminAuth,
  requireRole("super_admin"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Admin user not found");

    // lock super admin/system account completely
    if (target.isSystem) {
      if (parsed.data.role || parsed.data.isActive === false || parsed.data.name) {
        return fail(res, 400, "SYSTEM_USER_LOCKED", "Super admin cannot be changed or deactivated");
      }
    }

    const updated = await prisma.adminUser.update({
      where: { id: req.params.id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isSystem: true,
        mustChangePassword: true,
        updatedAt: true,
      },
    });

    if (parsed.data.role !== undefined && parsed.data.role !== target.role) {
      await prisma.adminRoleHistory.create({
        data: {
          performedById: req.admin.sub,
          targetUserId: target.id,
          action: "role_updated",
          previousRole: target.role,
          newRole: parsed.data.role,
        },
      });
    }

    return ok(res, updated);
  })
);

// SUPER ADMIN ONLY: Reset password for an admin
// - cannot delete super admin, but can reset others
router.put(
  "/admin-users/:id/reset-password",
  requireAdminAuth,
  requireRole("super_admin"),
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Admin user not found");

    if (target.isSystem) {
      return fail(res, 400, "SYSTEM_USER_LOCKED", "Super admin password should be changed via change-password flow");
    }

    const hash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.adminUser.update({
      where: { id: req.params.id },
      data: { password: hash, mustChangePassword: true },
    });

    return ok(res, { reset: true });
  })
);

// SUPER_ADMIN or ADMIN: Revoke access (deactivate). Optionally reassign target's content to another user (rollback).
// super_admin: can revoke anyone except system. admin: can revoke only editor/seo_editor.
router.post(
  "/admin-users/:id/revoke",
  requireAdminAuth,
  requireRole("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const parsed = revokeSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Admin user not found");

    if (target.isSystem) {
      return fail(res, 400, "SYSTEM_USER_LOCKED", "Super admin cannot be revoked");
    }

    if (req.admin.role === "admin" && target.role !== "editor" && target.role !== "seo_editor") {
      return fail(res, 403, "FORBIDDEN", "Admin can only revoke editors");
    }

    const { reassignToUserId } = parsed.data;
    let casinosUpdated = 0;
    let pagesUpdated = 0;
    let casinoArticlesUpdated = 0;
    let gamesUpdated = 0;
    let gameArticlesUpdated = 0;
    let blogsUpdated = 0;
    let newsUpdated = 0;
    let bonusesUpdated = 0;
    let bonusArticlesUpdated = 0;

    if (reassignToUserId && reassignToUserId !== target.id) {
      const toUser = await prisma.adminUser.findUnique({ where: { id: reassignToUserId } });
      if (!toUser) return fail(res, 404, "NOT_FOUND", "Reassign target user not found");
      if (!toUser.isActive) return fail(res, 400, "BAD_REQUEST", "Reassign target must be active");

      const [rCasino, rPage, rArticle, rGame, rGameArticle, rBlog, rNews, rBonus, rBonusArticle] = await Promise.all([
        prisma.casino.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
        prisma.page.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
        prisma.casinoArticle.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
        prisma.game.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
        prisma.gameArticle.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
        prisma.blog.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
        prisma.news.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
        prisma.bonus.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
        prisma.bonusArticle.updateMany({
          where: { createdById: target.id },
          data: { createdById: reassignToUserId, updatedById: reassignToUserId },
        }),
      ]);
      casinosUpdated = rCasino.count;
      pagesUpdated = rPage.count;
      casinoArticlesUpdated = rArticle.count;
      gamesUpdated = rGame.count;
      gameArticlesUpdated = rGameArticle.count;
      blogsUpdated = rBlog.count;
      newsUpdated = rNews.count;
      bonusesUpdated = rBonus.count;
      bonusArticlesUpdated = rBonusArticle.count;
    }

    await prisma.adminUser.update({
      where: { id: target.id },
      data: { isActive: false },
    });

    await prisma.adminRoleHistory.create({
      data: {
        performedById: req.admin.sub,
        targetUserId: target.id,
        action: "revoked",
        previousRole: target.role,
        newRole: target.role,
        reassignedToId: reassignToUserId || null,
      },
    });

    const message = reassignToUserId
      ? `Access revoked. ${casinosUpdated + pagesUpdated + casinoArticlesUpdated + gamesUpdated + gameArticlesUpdated + blogsUpdated + newsUpdated + bonusesUpdated + bonusArticlesUpdated} item(s) reassigned. User is now inactive.`
      : "Access revoked. User is now inactive.";

    return ok(res, {
      revoked: true,
      message,
      casinosReassigned: casinosUpdated,
      pagesReassigned: pagesUpdated,
      casinoArticlesReassigned: casinoArticlesUpdated,
      gamesReassigned: gamesUpdated,
      gameArticlesReassigned: gameArticlesUpdated,
      blogsReassigned: blogsUpdated,
      newsReassigned: newsUpdated,
      bonusesReassigned: bonusesUpdated,
      bonusArticlesReassigned: bonusArticlesUpdated,
    });
  })
);

// SUPER ADMIN ONLY: Delete admin user (blocked for system user)
router.delete(
  "/admin-users/:id",
  requireAdminAuth,
  requireRole("super_admin"),
  asyncHandler(async (req, res) => {
    const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } });
    if (!target) return fail(res, 404, "NOT_FOUND", "Admin user not found");

    if (target.isSystem) {
      return fail(res, 400, "SYSTEM_USER_LOCKED", "Super admin cannot be deleted");
    }

    await prisma.adminUser.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

module.exports = router;
