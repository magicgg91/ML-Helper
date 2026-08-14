import { PrismaClient } from "@prisma/client";
import { bootstrapSuperAdmin } from "../src/services/bootstrap-superadmin";

const prisma = new PrismaClient();

async function main() {
  const created = await bootstrapSuperAdmin(prisma, {
    username: process.env.SUPERADMIN_USERNAME,
    password: process.env.SUPERADMIN_PASSWORD,
  });
  console.log(
    created
      ? "Bootstrap Super Admin created."
      : "Bootstrap Super Admin already exists.",
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});
