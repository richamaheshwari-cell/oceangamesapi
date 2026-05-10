/*
  Warnings:

  - The `bonusDetails` column on the `casinos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tags` column on the `casinos` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."casinos" ADD COLUMN     "rating" DOUBLE PRECISION,
DROP COLUMN "bonusDetails",
ADD COLUMN     "bonusDetails" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "tags",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "casinos_status_idx" ON "public"."casinos"("status");

-- CreateIndex
CREATE INDEX "casinos_createdAt_idx" ON "public"."casinos"("createdAt");
