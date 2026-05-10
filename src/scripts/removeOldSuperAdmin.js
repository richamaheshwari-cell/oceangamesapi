/**
 * One-off: Remove the old super admin admin@local.test.
 * Keeps only aman.tiwari@triplew.in as super admin.
 * Run once: node src/scripts/removeOldSuperAdmin.js
 */
require("dotenv").config();
const prisma = require("../lib/prisma");

const EMAIL_TO_REMOVE = "admin@local.test";

async function main() {
  const user = await prisma.adminUser.findUnique({ where: { email: EMAIL_TO_REMOVE } });
  if (!user) {
    console.log("No user with email", EMAIL_TO_REMOVE, "- nothing to remove.");
    return;
  }
  await prisma.adminUser.delete({ where: { email: EMAIL_TO_REMOVE } });
  console.log("Removed user:", EMAIL_TO_REMOVE);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
