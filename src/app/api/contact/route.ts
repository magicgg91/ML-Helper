import { NextResponse } from "next/server";
import {
  ContactNotConfiguredError,
  sendContactMessage,
} from "@/services/contact";

export async function POST(request: Request) {
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
