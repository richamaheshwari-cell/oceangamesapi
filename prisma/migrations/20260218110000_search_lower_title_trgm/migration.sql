-- GIN trigram indexes on lower(title) for case-insensitive search/suggestions
-- (similarity(lower(title), $query) can use these indexes)
CREATE INDEX IF NOT EXISTS "casino_articles_title_lower_trgm_idx" ON "casino_articles" USING GIN(lower("title") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "game_articles_title_lower_trgm_idx" ON "game_articles" USING GIN(lower("title") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "blogs_title_lower_trgm_idx" ON "blogs" USING GIN(lower("title") gin_trgm_ops);
