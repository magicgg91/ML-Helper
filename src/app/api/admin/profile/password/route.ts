import { NextResponse } from "next/server";
import { requireApiSession } from "@/auth/api-authorization";
import { changeOwnPassword } from "@/services/password";

export async function PATCH(request: Request) {
  const session = await requireApiSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await changeOwnPassword(
      session.user.id,
      session.user.role,
      await request.json(),
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_password";
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
