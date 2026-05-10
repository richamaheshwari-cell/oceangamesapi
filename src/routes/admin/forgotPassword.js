const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");
const {
  newPasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiry,
} = require("../../utils/tokens");
const { sendPasswordResetEmail } = require("../../utils/mailer");

const router = express.Router();

const forgotSchema = z.object({
  email: z.string().email(),
});

// GET /api/v1/admin/auth/test-smtp — dev only: try sending a test email, return success or exact error
router.get("/auth/test-smtp", asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return fail(res, 404, "NOT_FOUND", "Not available");
  }
  const { sendMail } = require("../../utils/mailer");
  const to = process.env.SMTP_USER || "test@example.com";
  try {
    await sendMail({
      from: process.env.RESET_PASSWORD_FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject: "TOG Backend SMTP test",
      text: "If you see this, SMTP is working.",
    });
    return ok(res, { success: true, message: "Test email sent to " + to });
  } catch (err) {
    const detail = [err?.message, err?.code, err?.response].filter(Boolean).join(" | ");
    console.error("[test-smtp]", detail, err);
    return ok(res, {
      success: false,
      error: detail || String(err),
      hint:
        "Gmail: use App Password (not your normal password), SMTP_PORT=587, SMTP_SECURE=false. Office365: use SMTP auth and allow less secure apps or app password.",
    });
  }
}));

const resetSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8).max(200),
});

// POST /api/v1/admin/auth/forgot-password — request reset (sends email if admin exists)
// No auth. Rate-limited. Always returns same message to avoid email enumeration.
router.post(
  "/auth/forgot-password",
  asyncHandler(async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const { email } = parsed.data;

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.isActive) {
      return ok(res, { message: "If that email is registered, you will receive a reset link." });
    }

    const token = newPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = passwordResetExpiry();

    await prisma.adminPasswordResetToken.create({
      data: { adminId: admin.id, tokenHash, expiresAt },
    });

    const baseUrl =
      (process.env.RESET_PASSWORD_LINK_BASE || "").replace(/\/$/, "") || "http://localhost:5173";
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const isDevNoSmtp = process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST;
    if (isDevNoSmtp) {
      console.log("[dev] Password reset link (SMTP not configured):", resetLink);
      return ok(res, {
        message: "If that email is registered, you will receive a reset link.",
        ...(process.env.NODE_ENV !== "production" && { resetLink }),
      });
    }

    try {
      await sendPasswordResetEmail(admin.email, resetLink);
    } catch (err) {
      await prisma.adminPasswordResetToken.deleteMany({
        where: { adminId: admin.id, tokenHash },
      });
      const isConfig = err?.message?.includes("not configured");
      const errDetail =
        process.env.NODE_ENV !== "production"
          ? [err?.message, err?.code, err?.response].filter(Boolean).join(" | ")
          : null;
      // In development: return 200 with link AND include smtpError so you can see why send failed
      if (process.env.NODE_ENV !== "production") {
        console.log("[dev] Send failed, returning link in response:", resetLink);
        return ok(res, {
          message: "If that email is registered, you will receive a reset link.",
          resetLink,
          ...(errDetail && { smtpError: errDetail }),
        });
      }
      return fail(
        res,
        503,
        "EMAIL_FAILED",
        isConfig ? "Password reset email is not configured." : "Could not send reset email. Try again later."
      );
    }

    return ok(res, { message: "If that email is registered, you will receive a reset link." });
  })
);

// POST /api/v1/admin/auth/reset-password — set new password using token (no auth)
router.post(
  "/auth/reset-password",
  asyncHandler(async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    const { token, newPassword } = parsed.data;
    const tokenHash = hashPasswordResetToken(token);

    const row = await prisma.adminPasswordResetToken.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });
    if (!row) return fail(res, 400, "INVALID_TOKEN", "Invalid or expired reset token");
    if (row.usedAt) return fail(res, 400, "INVALID_TOKEN", "Reset token already used");
    if (row.expiresAt < new Date()) return fail(res, 400, "INVALID_TOKEN", "Reset token expired");
    if (!row.admin?.isActive) return fail(res, 403, "FORBIDDEN", "Account is inactive");

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: row.adminId },
        data: { password: hash, mustChangePassword: false },
      }),
      prisma.adminPasswordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return ok(res, { message: "Password has been reset. You can log in with your new password." });
  })
);

module.exports = router;
