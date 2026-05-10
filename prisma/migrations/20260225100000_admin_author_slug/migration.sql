-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "authorSlug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_authorSlug_key" ON "admin_users"("authorSlug");
