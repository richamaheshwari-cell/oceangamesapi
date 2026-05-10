const express = require("express");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

const listFields = {
  id: true,
  title: true,
  slug: true,
  featureImg: true,
  description: true,
  clientLink: true,
  highlight: true,
  bonusType: true,
  iconKey: true,
};

router.get(
  "/bonuses",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const where = { status: "published" };

    const [items, total] = await Promise.all([
      prisma.bonus.findMany({
        where,
        select: listFields,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.bonus.count({ where }),
    ]);

    return ok(res, { items, page, limit, total, totalPages: Math.ceil(total / limit) });
  })
);

router.get(
  "/bonuses/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;
    const bonus = await prisma.bonus.findFirst({
      where: { slug, status: "published" },
      select: {
        ...listFields,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true, bio: true, profilePublic: true, showEmailPublicly: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!bonus) return fail(res, 404, "NOT_FOUND", "Bonus not found");

    const { createdBy, updatedBy, ...rest } = bonus;
    const editor = createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          avatarUrl: createdBy.avatarUrl,
          bio: createdBy.bio,
          profilePublic: createdBy.profilePublic,
          ...(createdBy.showEmailPublicly && createdBy.email ? { email: createdBy.email } : {}),
        }
      : null;
    const updatedByInfo = updatedBy ? { id: updatedBy.id, name: updatedBy.name, email: updatedBy.email } : null;

    return ok(res, { ...rest, createdBy: editor, updatedBy: updatedByInfo });
  })
);

module.exports = router;
