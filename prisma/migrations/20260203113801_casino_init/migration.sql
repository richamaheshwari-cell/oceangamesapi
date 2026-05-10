-- CreateEnum
CREATE TYPE "public"."PublishStatus" AS ENUM ('published', 'draft', 'pending');

-- CreateTable
CREATE TABLE "public"."casinos" (
    "id" TEXT NOT NULL,
    "casinoName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "featureImg" TEXT,
    "status" "public"."PublishStatus" NOT NULL DEFAULT 'draft',
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "bonusAmt" TEXT,
    "bonusDetails" JSONB,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "tags" JSONB,
    "payoutSpeed" TEXT,
    "clientLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "casinos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "casinos_slug_key" ON "public"."casinos"("slug");
