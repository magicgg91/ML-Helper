import { NextResponse } from "next/server";
import { requireApiSession } from "@/auth/api-authorization";
import { disableTotp, enableTotp } from "@/services/totp-profile";

export async function PATCH(request: Request) {
  const session = await requireApiSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await enableTotp(session.user.id, session.user.role, await request.json());
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "invalid_totp" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireApiSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await disableTotp(session.user.id, session.user.role, await request.json());
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "invalid_totp" }, { status: 400 });
  }
}
