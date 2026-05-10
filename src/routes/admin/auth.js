const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");
const { signAccessToken, newRefreshToken, hashRefreshToken, refreshExpiryDate } = require("../../utils/tokens");
const { recordFail, clearSuccess } = require("../../middlewares/blockList");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(20),
});

// ------------------------------------
// POST /api/v1/admin/auth/login
// returns: accessToken + refreshToken
// ------------------------------------
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    const user = await prisma.adminUser.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      recordFail(req);
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      recordFail(req);
      return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    clearSuccess(req);

    // update last login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // create tokens
    const accessToken = signAccessToken(user);
    const refreshToken = newRefreshToken();

    // store refresh token hash in DB (revocable)
    await prisma.adminRefreshToken.create({
      data: {
        adminId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshExpiryDate(),
      },
    });

    return ok(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        isSystem: user.isSystem,
        bio: user.bio ?? null,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  })
);

// ------------------------------------
// POST /api/v1/admin/auth/refresh
// rotate refresh token and issue new access token
// ------------------------------------
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const { refreshToken } = parsed.data;
    const tokenHash = hashRefreshToken(refreshToken);

    const row = await prisma.adminRefreshToken.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (!row) return fail(res, 401, "UNAUTHORIZED", "Invalid refresh token");
    if (row.revokedAt) return fail(res, 401, "UNAUTHORIZED", "Refresh token revoked");
    if (row.expiresAt < new Date()) return fail(res, 401, "UNAUTHORIZED", "Refresh token expired");
    if (!row.admin || !row.admin.isActive) return fail(res, 403, "FORBIDDEN", "Admin is inactive");

    // ROTATE: delete old token (deleteMany so no error if already deleted e.g. double refresh), create new one
    await prisma.adminRefreshToken.deleteMany({ where: { tokenHash } });

    const newRT = newRefreshToken();
    await prisma.adminRefreshToken.create({
      data: {
        adminId: row.adminId,
        tokenHash: hashRefreshToken(newRT),
        expiresAt: refreshExpiryDate(),
      },
    });

    const accessToken = signAccessToken(row.admin);

    return ok(res, {
      accessToken,
      refreshToken: newRT,
      user: {
        id: row.admin.id,
        email: row.admin.email,
        name: row.admin.name,
        role: row.admin.role,
        mustChangePassword: row.admin.mustChangePassword,
        isSystem: row.admin.isSystem,
        bio: row.admin.bio ?? null,
        avatarUrl: row.admin.avatarUrl ?? null,
      },
    });
  })
);

// ------------------------------------
// POST /api/v1/admin/auth/logout
// revokes refresh token (delete record)
// ------------------------------------
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const parsed = logoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const { refreshToken } = parsed.data;
    const tokenHash = hashRefreshToken(refreshToken);

    await prisma.adminRefreshToken.deleteMany({ where: { tokenHash } });

    return ok(res, { loggedOut: true });
  })
);

module.exports = router;
