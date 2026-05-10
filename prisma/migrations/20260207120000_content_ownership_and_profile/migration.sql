-- AlterTable admin_users: profile
ALTER TABLE "admin_users" ADD COLUMN "bio" TEXT;
ALTER TABLE "admin_users" ADD COLUMN "avatarUrl" TEXT;

-- AlterTable casinos: ownership
ALTER TABLE "casinos" ADD COLUMN "createdById" TEXT;
ALTER TABLE "casinos" ADD COLUMN "updatedById" TEXT;

-- AlterTable pages: ownership
ALTER TABLE "pages" ADD COLUMN "createdById" TEXT;
ALTER TABLE "pages" ADD COLUMN "updatedById" TEXT;

-- AddForeignKey casinos
ALTER TABLE "casinos" ADD CONSTRAINT "casinos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "casinos" ADD CONSTRAINT "casinos_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey pages
ALTER TABLE "pages" ADD CONSTRAINT "pages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pages" ADD CONSTRAINT "pages_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "casinos_createdById_idx" ON "casinos"("createdById");
CREATE INDEX "pages_createdById_idx" ON "pages"("createdById");
