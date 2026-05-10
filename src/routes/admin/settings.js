const express = require("express");
const { z } = require("zod");

const prisma = require("../../lib/prisma");
const requireAdminAuth = require("../../middlewares/requireAdminAuth");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

const updateSchema = z.object({
  siteName: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().min(3).max(20).optional().nullable(), // allow "#fff" / "#ffffff"
  supportEmail: z.string().email().optional().nullable(),
  socials: z.record(z.string(), z.string()).optional().nullable(),
  maintenanceMode: z.boolean().optional(),
});

// GET /admin/settings
router.get(
  "/settings",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const data = await prisma.siteSetting.findUnique({ where: { id: 1 } });

    // if not created yet, return defaults (from schema) by creating it once
    if (!data) {
      const created = await prisma.siteSetting.create({ data: { id: 1 } });
      return ok(res, created);
    }

    return ok(res, data);
  })
);

// PUT /admin/settings
router.put(
  "/settings",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }

    const payload = parsed.data;

    const updated = await prisma.siteSetting.upsert({
      where: { id: 1 },
      create: { id: 1, ...payload },
      update: payload,
    });

    return ok(res, updated);
  })
);

module.exports = router;
