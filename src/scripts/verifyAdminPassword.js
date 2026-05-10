require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    console.log("❌ Admin not found:", email);
    return;
  }

  const ok = await bcrypt.compare(password, user.password);
  console.log("Admin found:", email);
  console.log("Password matches DB hash?", ok);
}

main()
  .catch((e) => console.error("❌ Error:", e))
  .finally(async () => prisma.$disconnect());
