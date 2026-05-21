const express = require("express");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

const listFields = {
  id: true,
  title: true,
  featureImg: true,
  shortDesc: true,
  publishDate: true,
  readTime: true,
  slug: true,
  isFeatured: true,
};

const mixedFeedFields = {
  id: true,
  title: true,
  featureImg: true,
  shortDesc: true,
  publishDate: true,
  readTime: true,
  slug: true,
  createdAt: true,
};

const RELATED_LIMIT = 6;

function compareByPublishDateDesc(left, right) {
  const leftTime = new Date(left.publishDate ?? left.createdAt ?? 0).getTime();
  const rightTime = new Date(
    right.publishDate ?? right.createdAt ?? 0,
  ).getTime();

  return rightTime - leftTime;
}

function paginate(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const skip = (safePage - 1) * limit;

  return {
    items: items.slice(skip, skip + limit),
    page: safePage,
    limit,
    total,
    totalPages,
  };
}

// GET /api/v1/public/blogs/content – mixed published content marked for the blog page
router.get(
  "/blogs/content",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );

    const [blogs, casinoArticles, gameArticles, bonusArticles, news] =
      await Promise.all([
        prisma.blog.findMany({
          where: { status: "published", showInBlog: true },
          select: {
            ...mixedFeedFields,
            createdBy: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                bio: true,
                // add other fields as needed
              },
            },
          },
        }),
        prisma.casinoArticle.findMany({
          where: { status: "published", showInBlog: true },
          select: {
            ...mixedFeedFields,
            createdBy: {
              select: {
                id: true,
                name: true,

                avatarUrl: true,
                bio: true,
                // add other fields as needed
              },
            },
          },
        }),
        prisma.gameArticle.findMany({
          where: { status: "published", showInBlog: true },
          select: {
            ...mixedFeedFields,
            createdBy: {
              select: {
                id: true,
                name: true,

                avatarUrl: true,
                bio: true,
                // add other fields as needed
              },
            },
          },
        }),
        prisma.bonusArticle.findMany({
          where: { status: "published", showInBlog: true },
          select: {
            ...mixedFeedFields,
            createdBy: {
              select: {
                id: true,
                name: true,

                avatarUrl: true,
                bio: true,
                // add other fields as needed
              },
            },
          },
        }),
        prisma.news.findMany({
          where: { status: "published", showInBlog: true },
          select: {
            ...mixedFeedFields,
            createdBy: {
              select: {
                id: true,
                name: true,

                avatarUrl: true,
                bio: true,
                // add other fields as needed
              },
            },
          },
        }),
      ]);

    const merged = [
      ...blogs.map((item) => ({
        ...item,
        contentType: "blog",
        href: `/blog/${item.slug}`,
        author: item.createdBy
          ? {
              name: item.createdBy.name,
              image: item.createdBy.avatarUrl,
              description: item.createdBy.bio,
            }
          : undefined,
      })),
      ...casinoArticles.map((item) => ({
        ...item,
        contentType: "casino-article",
        href: `/casino-articles/${item.slug}`,
        author: item.createdBy
          ? {
              name: item.createdBy.name,
              image: item.createdBy.avatarUrl,
              description: item.createdBy.bio,
            }
          : undefined,
      })),
      ...gameArticles.map((item) => ({
        ...item,
        contentType: "game-article",
        href: `/game-articles/${item.slug}`,
        author: item.createdBy
          ? {
              name: item.createdBy.name,
              image: item.createdBy.avatarUrl,
              description: item.createdBy.bio,
            }
          : undefined,
      })),
      ...bonusArticles.map((item) => ({
        ...item,
        contentType: "bonus-article",
        href: `/bonus-articles/${item.slug}`,
        author: item.createdBy
          ? {
              name: item.createdBy.name,
              image: item.createdBy.avatarUrl,
              description: item.createdBy.bio,
            }
          : undefined,
      })),
      ...news.map((item) => ({
        ...item,
        contentType: "news",
        href: `/news/${item.slug}`,
        author: item.createdBy
          ? {
              name: item.createdBy.name,
              image: item.createdBy.avatarUrl,
              description: item.createdBy.bio,
            }
          : undefined,
      })),
    ].sort(compareByPublishDateDesc);
    console.log("Merged content count:", merged);
    return ok(res, paginate(merged, page, limit));
  }),
);

// GET /api/v1/public/blogs – list published blogs (pagination)
router.get(
  "/blogs",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    const where = { status: "published" };

    const [items, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.blog.count({ where }),
    ]);

    return ok(res, {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

// GET /api/v1/public/blogs/:slug – single blog by slug with editor and related
router.get(
  "/blogs/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;

    const blog = await prisma.blog.findFirst({
      where: { slug, status: "published" },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            profilePublic: true,
            showEmailPublicly: true,
          },
        },
      },
    });

    if (!blog) return fail(res, 404, "NOT_FOUND", "Blog not found");

    const blogId = blog.id;

    // relatedArticleBlog: 6 featured blogs (exclude current)
    // latestArticleNews: 6 latest news
    const [relatedArticleBlog, latestArticleNews] = await Promise.all([
      prisma.blog.findMany({
        where: { status: "published", isFeatured: true, id: { not: blogId } },
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        take: RELATED_LIMIT,
      }),
      prisma.news.findMany({
        where: { status: "published" },
        select: {
          id: true,
          title: true,
          featureImg: true,
          shortDesc: true,
          publishDate: true,
          readTime: true,
          slug: true,
          isTrending: true,
        },
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        take: RELATED_LIMIT,
      }),
    ]);

    const { createdBy, ...rest } = blog;
    const editor = createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          avatarUrl: createdBy.avatarUrl,
          bio: createdBy.bio,
          profilePublic: createdBy.profilePublic,
          ...(createdBy.showEmailPublicly && createdBy.email
            ? { email: createdBy.email }
            : {}),
        }
      : null;

    return ok(res, {
      ...rest,
      editor,
      relatedArticleBlog,
      latestArticleNews,
    });
  }),
);

// GET /api/v1/public/featuredBlogs – list published featured blogs
router.get(
  "/featuredBlogs",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    const where = { status: "published", isFeatured: true };

    const [items, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        select: listFields,
        orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.blog.count({ where }),
    ]);

    return ok(res, {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

// GET /api/v1/public/featuredBlogs/:slug – single featured blog by slug (with editor and related)
router.get(
  "/featuredBlogs/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;

    const blog = await prisma.blog.findFirst({
      where: { slug, status: "published", isFeatured: true },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            profilePublic: true,
            showEmailPublicly: true,
          },
        },
      },
    });

    if (!blog) return fail(res, 404, "NOT_FOUND", "Featured blog not found");

    const blogId = blog.id;
    const tags = blog.tags?.length ? blog.tags : [];

    const relatedFeatured = await prisma.blog.findMany({
      where: { status: "published", isFeatured: true, id: { not: blogId } },
      select: listFields,
      orderBy: { publishDate: "desc" },
      take: RELATED_LIMIT,
    });

    const { createdBy, ...rest } = blog;
    const editor = createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          avatarUrl: createdBy.avatarUrl,
          bio: createdBy.bio,
          profilePublic: createdBy.profilePublic,
          ...(createdBy.showEmailPublicly && createdBy.email
            ? { email: createdBy.email }
            : {}),
        }
      : null;

    return ok(res, {
      ...rest,
      editor,
      relatedFeatured,
    });
  }),
);

module.exports = router;
