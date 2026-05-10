const prisma = require("../lib/prisma");

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL missing");

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) throw new Error("Super admin not found");

  const updated = await prisma.adminUser.update({
    where: { email },
    data: {
      role: "super_admin",
      isSystem: true,
      isActive: true,
    },
    select: { id: true, email: true, role: true, isSystem: true },
  });

  console.log("✅ Super admin locked:", updated);
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
