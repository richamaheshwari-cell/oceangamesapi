-- Universal search: add FTS + trigram to news, bonus_articles, pages; trigram to games, bonuses

-- news: full-text + trigram
ALTER TABLE "news"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce("shortDesc", '') || ' ' ||
      coalesce(content::text, '')
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS "news_search_tsv_idx" ON "news" USING GIN("search_tsv");
CREATE INDEX IF NOT EXISTS "news_title_trgm_idx" ON "news" USING GIN("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "news_title_lower_trgm_idx" ON "news" USING GIN(lower("title") gin_trgm_ops);

-- bonus_articles: full-text + trigram
ALTER TABLE "bonus_articles"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce("shortDesc", '') || ' ' ||
      coalesce(content::text, '')
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS "bonus_articles_search_tsv_idx" ON "bonus_articles" USING GIN("search_tsv");
CREATE INDEX IF NOT EXISTS "bonus_articles_title_trgm_idx" ON "bonus_articles" USING GIN("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "bonus_articles_title_lower_trgm_idx" ON "bonus_articles" USING GIN(lower("title") gin_trgm_ops);

-- pages: full-text + trigram (title + contentHtml)
ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce("contentHtml", '')
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS "pages_search_tsv_idx" ON "pages" USING GIN("search_tsv");
CREATE INDEX IF NOT EXISTS "pages_title_lower_trgm_idx" ON "pages" USING GIN(lower("title") gin_trgm_ops);

-- games: trigram only (no search_tsv)
CREATE INDEX IF NOT EXISTS "games_title_lower_trgm_idx" ON "games" USING GIN(lower("title") gin_trgm_ops);

-- bonuses: trigram only
CREATE INDEX IF NOT EXISTS "bonuses_title_lower_trgm_idx" ON "bonuses" USING GIN(lower("title") gin_trgm_ops);
