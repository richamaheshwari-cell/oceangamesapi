-- Rename isBreaking to isTrending (trending news)
ALTER TABLE "news" RENAME COLUMN "isBreaking" TO "isTrending";

-- Drop old composite index (column renamed)
DROP INDEX IF EXISTS "news_status_isBreaking_publishDate_idx";

-- Drop old single column index (from initial news migration)
DROP INDEX IF EXISTS "news_isBreaking_idx";

-- Recreate indexes for isTrending
CREATE INDEX "news_isTrending_idx" ON "news"("isTrending");
CREATE INDEX "news_status_isTrending_publishDate_idx" ON "news"("status", "isTrending", "publishDate" DESC);
