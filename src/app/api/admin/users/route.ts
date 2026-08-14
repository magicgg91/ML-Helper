import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth/options";
import { prisma } from "@/lib/prisma";
import { createAdminUser } from "@/services/users";

async function superAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user.role === "super_admin" ? session : null;
}
export async function GET() {
  if (!(await superAdmin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(
    await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { username: "asc" },
    }),
  );
}
export async function POST(request: Request) {
  const session = await superAdmin();
  if (!session)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const user = await createAdminUser(session.user.id, await request.json());
    return NextResponse.json(
      { id: user.id, username: user.username, role: user.role },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "invalid_user" }, { status: 400 });
  }
}
