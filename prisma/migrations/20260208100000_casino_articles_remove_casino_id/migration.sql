-- Drop FK and column so articles are independent of casino
ALTER TABLE "casino_articles" DROP CONSTRAINT IF EXISTS "casino_articles_casinoId_fkey";
DROP INDEX IF EXISTS "casino_articles_casinoId_idx";
ALTER TABLE "casino_articles" DROP COLUMN IF EXISTS "casinoId";
