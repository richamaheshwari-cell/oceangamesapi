-- CreateTable bonuses
CREATE TABLE "bonuses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientLink" TEXT NOT NULL,
    "highlight" TEXT NOT NULL,
    "bonusType" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bonuses_slug_key" ON "bonuses"("slug");
CREATE INDEX "bonuses_status_idx" ON "bonuses"("status");
CREATE INDEX "bonuses_createdById_idx" ON "bonuses"("createdById");

ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable bonus_articles
CREATE TABLE "bonus_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "featureImg" TEXT,
    "shortDesc" TEXT NOT NULL,
    "publishDate" TIMESTAMP(3) NOT NULL,
    "readTime" TEXT NOT NULL,
    "content" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gameSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoTitle" TEXT,
    "seoDesc" TEXT,
    "focusKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "bonusId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonus_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bonus_articles_slug_key" ON "bonus_articles"("slug");
CREATE INDEX "bonus_articles_status_idx" ON "bonus_articles"("status");
CREATE INDEX "bonus_articles_publishDate_idx" ON "bonus_articles"("publishDate");
CREATE INDEX "bonus_articles_bonusId_idx" ON "bonus_articles"("bonusId");
CREATE INDEX "bonus_articles_createdById_idx" ON "bonus_articles"("createdById");

ALTER TABLE "bonus_articles" ADD CONSTRAINT "bonus_articles_bonusId_fkey" FOREIGN KEY ("bonusId") REFERENCES "bonuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bonus_articles" ADD CONSTRAINT "bonus_articles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bonus_articles" ADD CONSTRAINT "bonus_articles_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
