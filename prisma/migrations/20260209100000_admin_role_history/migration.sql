-- CreateEnum
CREATE TYPE "RoleHistoryAction" AS ENUM ('assigned', 'role_updated', 'revoked');

-- CreateTable
CREATE TABLE "admin_role_history" (
    "id" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" "RoleHistoryAction" NOT NULL,
    "previousRole" "AdminRole",
    "newRole" "AdminRole",
    "reassignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_role_history_targetUserId_idx" ON "admin_role_history"("targetUserId");

-- CreateIndex
CREATE INDEX "admin_role_history_performedById_idx" ON "admin_role_history"("performedById");

-- CreateIndex
CREATE INDEX "admin_role_history_createdAt_idx" ON "admin_role_history"("createdAt");

-- AddForeignKey
ALTER TABLE "admin_role_history" ADD CONSTRAINT "admin_role_history_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_history" ADD CONSTRAINT "admin_role_history_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_history" ADD CONSTRAINT "admin_role_history_reassignedToId_fkey" FOREIGN KEY ("reassignedToId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
