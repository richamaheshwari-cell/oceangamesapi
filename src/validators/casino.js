const { z } = require("zod");

const PublishStatus = z.enum(["published", "draft", "pending"]);

const casinoCreateSchema = z.object({
  casinoName: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),

  featureImg: z.string().url().optional().nullable(),
  status: PublishStatus.default("draft"),

  reviewCount: z.number().int().min(0).optional().default(0),

  bonusAmt: z.string().max(200).optional().nullable(),
  bonusDetails: z.array(z.string().min(1).max(80)).max(50).optional().nullable(),

  totalGames: z.number().int().min(0).optional().default(0),

  tags: z.array(z.string().min(1).max(30)).max(50).optional().nullable(),

  payoutSpeed: z.string().max(80).optional().nullable(),
  clientLink: z.string().url().optional().nullable(),
});

const casinoUpdateSchema = casinoCreateSchema.partial().strict();

module.exports = { casinoCreateSchema, casinoUpdateSchema };
