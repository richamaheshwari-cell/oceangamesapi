const express = require("express");

const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok } = require("../../utils/http");

const router = express.Router();

// GET /public/settings
router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const data = await prisma.siteSetting.findUnique({ where: { id: 1 } });

    if (!data) {
      const created = await prisma.siteSetting.create({ data: { id: 1 } });
      return ok(res, created);
    }

    // If maintenanceMode is true, frontend can show maintenance UI
    return ok(res, data);
  })
);

module.exports = router;
