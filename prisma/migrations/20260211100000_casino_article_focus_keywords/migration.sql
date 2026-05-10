-- AlterTable
ALTER TABLE "casino_articles" ADD COLUMN "focusKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
