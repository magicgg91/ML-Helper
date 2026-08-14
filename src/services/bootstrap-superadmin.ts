import { hash } from "bcryptjs";

type BootstrapUser = { id: string };

export type BootstrapPrisma = {
  user: {
    findUnique(args: {
      where: { username: string };
    }): Promise<BootstrapUser | null>;
    create(args: {
      data: { username: string; passwordHash: string; role: "super_admin" };
    }): Promise<BootstrapUser>;
  };
};

type BootstrapOptions = {
  username?: string;
  password?: string;
};

export async function bootstrapSuperAdmin(
  prisma: BootstrapPrisma,
  { username, password }: BootstrapOptions,
): Promise<boolean> {
  if (!username || !password || password.length < 12) {
    throw new Error(
      "SUPERADMIN_USERNAME and a 12+ character SUPERADMIN_PASSWORD are required",
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) return false;

  await prisma.user.create({
    data: {
      username,
      passwordHash: await hash(password, 12),
      role: "super_admin",
    },
  });

  return true;
}
