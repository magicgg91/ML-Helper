import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";
import { getSiteSetting, trackingScriptUrlKey } from "@/lib/site-settings";
import { parseTrackingScriptUrl } from "@/lib/tracking";

const payloadSchema = z.object({ url: z.string() });

// Bloc 100/A: set or clear the visit-tracking script URL. Gated on
// configuration.write like the locales route next door, so the 4 other roles
// are rejected here with 403 even if they forge the request — this value ends
// up as a <script src> on every page of the site, public and admin.
export async function PUT(request: Request) {
  const session = await authorizedSession("configuration.write");
  if (!session) return forbiddenResponse();

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const submitted = parsed.data.url.trim();
  const url = parseTrackingScriptUrl(submitted);
  // An empty field is how tracking is turned off; anything else that is not a
  // usable http(s) URL is a typo, and is refused rather than stored.
  if (submitted && !url)
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const before = (await getSiteSetting(trackingScriptUrlKey)) ?? "";

  await prisma.$transaction(async (tx) => {
    // Every write here goes through `tx`, never the global client: SQLite
    // serialises writers, so a query issued on the global client inside an
    // interactive transaction waits for a lock the transaction itself holds,
    // until the transaction times out (5 s) and the request 500s.
    if (url)
      await tx.siteSetting.upsert({
        where: { key: trackingScriptUrlKey },
        create: { key: trackingScriptUrlKey, value: url },
        update: { value: url },
      });
    // Clearing removes the row rather than storing an empty string, so "not
    // configured" has a single representation.
    else
      await tx.siteSetting.deleteMany({ where: { key: trackingScriptUrlKey } });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        message: auditMessage(
          session.user.name ?? session.user.id,
          url ? "update" : "delete",
          "l'URL de suivi des visites",
        ),
        action: url ? "update" : "delete",
        entityType: "site_setting",
        entityId: trackingScriptUrlKey,
        diff: { before: { url: before }, after: { url: url ?? "" } },
      },
    });
  });

  return NextResponse.json({ url: url ?? "" });
}
