/*
  Warnings:

  - The `role` column on the `admin_users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."AdminRole" AS ENUM ('super_admin', 'admin', 'editor', 'seo_editor');

-- AlterTable
ALTER TABLE "public"."admin_users" DROP COLUMN "role",
ADD COLUMN     "role" "public"."AdminRole" NOT NULL DEFAULT 'admin';

-- CreateTable
CREATE TABLE "public"."admin_refresh_tokens" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_tokens_tokenHash_key" ON "public"."admin_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_adminId_idx" ON "public"."admin_refresh_tokens"("adminId");

-- AddForeignKey
ALTER TABLE "public"."admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
