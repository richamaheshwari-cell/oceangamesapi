const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");

const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

router.post(
  "/auth/change-password",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.adminUser.findUnique({ where: { id: req.admin.sub } });
    if (!user) return fail(res, 404, "NOT_FOUND", "Admin not found");

    const okPass = await bcrypt.compare(currentPassword, user.password);
    if (!okPass) return fail(res, 401, "INVALID_CREDENTIALS", "Current password is incorrect");

    const hash = await bcrypt.hash(newPassword, 12);

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    });

    return ok(res, { changed: true });
  })
);

module.exports = router;
