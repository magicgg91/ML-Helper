import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SUPERADMIN_USERNAME;
  if (!username) throw new Error("SUPERADMIN_USERNAME is required");

  const users = await prisma.user.findMany({ where: { username } });
  if (users.length !== 1 || users[0].role !== "super_admin") {
    throw new Error("Bootstrap must produce exactly one Super Admin");
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
