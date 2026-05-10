-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "featureImg" TEXT,
    "tag" TEXT,
    "gameProvider" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gameDetails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientLink" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_articles" (
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
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_createdById_idx" ON "games"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "game_articles_slug_key" ON "game_articles"("slug");

-- CreateIndex
CREATE INDEX "game_articles_status_idx" ON "game_articles"("status");

-- CreateIndex
CREATE INDEX "game_articles_publishDate_idx" ON "game_articles"("publishDate");

-- CreateIndex
CREATE INDEX "game_articles_createdById_idx" ON "game_articles"("createdById");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_articles" ADD CONSTRAINT "game_articles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_articles" ADD CONSTRAINT "game_articles_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
