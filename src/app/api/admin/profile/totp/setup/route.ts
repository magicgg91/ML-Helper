import { NextResponse } from "next/server";
import { requireApiSession } from "@/auth/api-authorization";
import { startTotpEnrollment } from "@/services/totp-profile";

const privateResponseHeaders = { "cache-control": "no-store" };

export async function POST() {
  const session = await requireApiSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await startTotpEnrollment(session.user.id), {
      headers: privateResponseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "totp_setup_failed" },
      { status: 400, headers: privateResponseHeaders },
    );
  }
}
