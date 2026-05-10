-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN "profilePublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admin_users" ADD COLUMN "showEmailPublicly" BOOLEAN NOT NULL DEFAULT false;
