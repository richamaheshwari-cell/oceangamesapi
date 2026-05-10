-- AlterTable: AdminUser - add lastLoginAt, createdById
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- CreateTable: admin_password_reset_tokens
CREATE TABLE "admin_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_password_reset_tokens_tokenHash_key" ON "admin_password_reset_tokens"("tokenHash");
CREATE INDEX "admin_password_reset_tokens_adminId_idx" ON "admin_password_reset_tokens"("adminId");
CREATE INDEX "admin_password_reset_tokens_tokenHash_idx" ON "admin_password_reset_tokens"("tokenHash");
CREATE INDEX "admin_password_reset_tokens_expiresAt_idx" ON "admin_password_reset_tokens"("expiresAt");

-- CreateTable: newsletter_subscriptions
CREATE TABLE "newsletter_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");
CREATE INDEX "newsletter_subscriptions_email_idx" ON "newsletter_subscriptions"("email");
CREATE INDEX "newsletter_subscriptions_subscribed_idx" ON "newsletter_subscriptions"("subscribed");

-- AddForeignKey: admin_users.createdById -> admin_users.id
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: admin_password_reset_tokens.adminId -> admin_users.id
ALTER TABLE "admin_password_reset_tokens" ADD CONSTRAINT "admin_password_reset_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
