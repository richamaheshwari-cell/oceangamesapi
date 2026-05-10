const express = require("express");

const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

// GET /public/pages/:slug (published only)
router.get(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });

    if (!page || !page.isPublished) {
      return fail(res, 404, "NOT_FOUND", "Page not found");
    }

    return ok(res, page);
  })
);

module.exports = router;
