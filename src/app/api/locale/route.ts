import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    locale?: string;
  } | null;
  if (body?.locale !== "fr" && body?.locale !== "en")
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set("NEXT_LOCALE", body.locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
