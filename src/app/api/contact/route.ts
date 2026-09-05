import { NextResponse } from "next/server";
import {
  ContactNotConfiguredError,
  sendContactMessage,
} from "@/services/contact";
import { clientIp } from "@/lib/client-ip";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

// M3: this public endpoint sends an email on each call (attacker-controlled
// reply-to + body). Cap it per IP so it can't be turned into an email
// relay / inbox-flood — 5 messages per rolling hour is well above any
// legitimate use.
const contactRateLimit = { max: 5, windowMs: 60 * 60 * 1000 } as const;

export async function POST(request: Request) {
  const ip = clientIp(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  );
  if (
    !(await consumeRateLimit(rateLimitKey("contact", ip), contactRateLimit))
  )
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    await sendContactMessage(await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ContactNotConfiguredError) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "invalid_contact" }, { status: 400 });
  }
}
