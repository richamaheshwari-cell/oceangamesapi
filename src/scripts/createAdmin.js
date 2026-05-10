require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log("✅ Admin already exists:", email);
    return;
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
  const hash = await bcrypt.hash(password, rounds);

  await prisma.adminUser.create({
    data: {
      email,
      password: hash,
      role: "super_admin",
      isActive: true,
      isSystem: true,
      name: process.env.ADMIN_NAME || null,
    },
  });

  console.log("✅ Admin created:", email);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
