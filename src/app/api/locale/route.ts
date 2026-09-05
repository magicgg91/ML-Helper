import { NextResponse } from "next/server";
import { isAvailableLocale } from "@/i18n/config";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    locale?: string;
  } | null;
  if (!body?.locale || !(await isAvailableLocale(body.locale)))
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set("NEXT_LOCALE", body.locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
