import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!username || !password || password.length < 12)
    throw new Error(
      "SUPER_ADMIN_USERNAME and a 12+ character SUPER_ADMIN_PASSWORD are required",
    );
  await prisma.user.upsert({
    where: { username },
    update: { role: "super_admin", passwordHash: await hash(password, 12) },
    create: {
      username,
      role: "super_admin",
      passwordHash: await hash(password, 12),
    },
  });
  await prisma.$disconnect();
}
main().catch(async (error) => {
  await prisma.$disconnect();
  throw error;
});
