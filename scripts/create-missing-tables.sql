-- Create site_settings and pages if they don't exist (run via Docker or Prisma)
CREATE TABLE IF NOT EXISTS "public"."site_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "siteName" TEXT NOT NULL DEFAULT 'TheOceanGames',
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "primaryColor" TEXT,
  "supportEmail" TEXT,
  "socials" JSONB,
  "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."pages" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contentHtml" TEXT NOT NULL,
  "seoTitle" TEXT,
  "seoDesc" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pages_slug_key" ON "public"."pages"("slug");
