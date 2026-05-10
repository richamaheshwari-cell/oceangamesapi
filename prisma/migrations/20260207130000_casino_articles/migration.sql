-- CreateTable
CREATE TABLE "casino_articles" (
    "id" TEXT NOT NULL,
    "casinoId" TEXT NOT NULL,
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
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "casino_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "casino_articles_slug_key" ON "casino_articles"("slug");
CREATE INDEX "casino_articles_casinoId_idx" ON "casino_articles"("casinoId");
CREATE INDEX "casino_articles_status_idx" ON "casino_articles"("status");
CREATE INDEX "casino_articles_publishDate_idx" ON "casino_articles"("publishDate");
CREATE INDEX "casino_articles_createdById_idx" ON "casino_articles"("createdById");

-- AddForeignKey
ALTER TABLE "casino_articles" ADD CONSTRAINT "casino_articles_casinoId_fkey" FOREIGN KEY ("casinoId") REFERENCES "casinos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "casino_articles" ADD CONSTRAINT "casino_articles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "casino_articles" ADD CONSTRAINT "casino_articles_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
