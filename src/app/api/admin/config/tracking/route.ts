import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";
import { trackingScriptUrlKey } from "@/lib/site-settings";
import { parseTrackingScriptUrl } from "@/lib/tracking";

const payloadSchema = z.object({ url: z.string() });

// Bloc 100/A: set or clear the visit-tracking script URL.
//
// Gated on configuration.scripts, which only super_admin holds — not on
// configuration.write like the locales route next door (revue Codex, PR #127).
// The difference is what the value does: it becomes a <script src> executed in
// this origin, with a valid nonce, on every page of the site. An `admin` who
// could set it would have arbitrary code running on the next page a Super
// Admin loads, and that code can call the admin API with their session — which
// is exactly the users.manage / content.write that the role matrix denies
// `admin`. A forged request from any other role is rejected here with 403.
export async function PUT(request: Request) {
  const session = await authorizedSession("configuration.scripts");
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

  await prisma.$transaction(async (tx) => {
    // Revue Codex (PR #127): read the previous value inside the transaction.
    // Read outside it, two concurrent saves would both see the same old value
    // and the later one would record an audit diff from a value it never
    // actually replaced.
    const before =
      (
        await tx.siteSetting.findUnique({
          where: { key: trackingScriptUrlKey },
          select: { value: true },
        })
      )?.value ?? "";
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
