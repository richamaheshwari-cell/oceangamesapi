-- CreateIndex (composite index for admin news list: filter by status, isBreaking, order by publishDate desc)
CREATE INDEX "news_status_isBreaking_publishDate_idx" ON "news"("status", "isBreaking", "publishDate" DESC);
