-- Enable trigram extension for similarity() and typo tolerance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- casino_articles: full-text search vector + indexes
ALTER TABLE "casino_articles"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce("shortDesc", '') || ' ' ||
      coalesce(content::text, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS "casino_articles_search_tsv_idx" ON "casino_articles" USING GIN("search_tsv");
CREATE INDEX IF NOT EXISTS "casino_articles_title_trgm_idx" ON "casino_articles" USING GIN("title" gin_trgm_ops);

-- game_articles: full-text search vector + indexes
ALTER TABLE "game_articles"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce("shortDesc", '') || ' ' ||
      coalesce(content::text, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS "game_articles_search_tsv_idx" ON "game_articles" USING GIN("search_tsv");
CREATE INDEX IF NOT EXISTS "game_articles_title_trgm_idx" ON "game_articles" USING GIN("title" gin_trgm_ops);

-- blogs: full-text search vector + indexes
ALTER TABLE "blogs"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce("shortDesc", '') || ' ' ||
      coalesce(content::text, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS "blogs_search_tsv_idx" ON "blogs" USING GIN("search_tsv");
CREATE INDEX IF NOT EXISTS "blogs_title_trgm_idx" ON "blogs" USING GIN("title" gin_trgm_ops);
