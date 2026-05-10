-- Make bonusId optional on bonus_articles (independent like casino articles)
ALTER TABLE "bonus_articles" DROP CONSTRAINT IF EXISTS "bonus_articles_bonusId_fkey";
ALTER TABLE "bonus_articles" ALTER COLUMN "bonusId" DROP NOT NULL;
ALTER TABLE "bonus_articles" ADD CONSTRAINT "bonus_articles_bonusId_fkey" FOREIGN KEY ("bonusId") REFERENCES "bonuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
