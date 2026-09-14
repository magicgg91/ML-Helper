import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { createAdminUser } from "@/services/users";

async function superAdmin() {
  return authorizedSession("users.manage");
}
export async function GET() {
  if (!(await authorizedSession("users.read"))) return forbiddenResponse();
  return NextResponse.json(
    await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { username: "asc" },
    }),
  );
}
export async function POST(request: Request) {
  const session = await superAdmin();
  if (!session) return forbiddenResponse();
  try {
    const user = await createAdminUser(
      session.user.id,
      session.user.role,
      await request.json(),
    );
    return NextResponse.json(
      { id: user.id, username: user.username, role: user.role },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "invalid_user" }, { status: 400 });
  }
}
