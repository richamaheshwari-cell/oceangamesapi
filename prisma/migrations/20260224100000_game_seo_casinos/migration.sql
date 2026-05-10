-- AlterTable
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "seoDesc" TEXT;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "focusKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "content" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "game_casinos" (
    "gameId" TEXT NOT NULL,
    "casinoId" TEXT NOT NULL,

    CONSTRAINT "game_casinos_pkey" PRIMARY KEY ("gameId","casinoId"),
    CONSTRAINT "game_casinos_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_casinos_casinoId_fkey" FOREIGN KEY ("casinoId") REFERENCES "casinos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "game_casinos_casinoId_idx" ON "game_casinos"("casinoId");
