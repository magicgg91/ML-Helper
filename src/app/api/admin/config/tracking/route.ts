import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";
import {
  trackingScriptUrlKey,
  trackingWebsiteIdKey,
} from "@/lib/site-settings";
import { parseTrackingScriptUrl, parseTrackingWebsiteId } from "@/lib/tracking";

const payloadSchema = z.object({
  url: z.string(),
  // Bloc 101: optional in the payload so an older client still works.
  websiteId: z.string().optional(),
});

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

  // Bloc 101: the identifier is optional — plenty of trackers need none — but
  // a non-empty value that does not look like one is refused rather than
  // stored, same as the URL above.
  const submittedId = (parsed.data.websiteId ?? "").trim();
  const websiteId = parseTrackingWebsiteId(submittedId);
  if (submittedId && !websiteId)
    return NextResponse.json({ error: "invalid_website_id" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // Revue Codex (PR #127): read the previous value inside the transaction.
    // Read outside it, two concurrent saves would both see the same old value
    // and the later one would record an audit diff from a value it never
    // actually replaced.
    const stored = new Map(
      (
        await tx.siteSetting.findMany({
          where: { key: { in: [trackingScriptUrlKey, trackingWebsiteIdKey] } },
          select: { key: true, value: true },
        })
      ).map((row) => [row.key, row.value]),
    );
    const before = {
      url: stored.get(trackingScriptUrlKey) ?? "",
      websiteId: stored.get(trackingWebsiteIdKey) ?? "",
    };
    // Every write here goes through `tx`, never the global client: SQLite
    // serialises writers, so a query issued on the global client inside an
    // interactive transaction waits for a lock the transaction itself holds,
    // until the transaction times out (5 s) and the request 500s.
    // Clearing removes the row rather than storing an empty string, so "not
    // configured" has a single representation.
    for (const [key, value] of [
      [trackingScriptUrlKey, url],
      [trackingWebsiteIdKey, websiteId],
    ] as const) {
      if (value)
        await tx.siteSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      else await tx.siteSetting.deleteMany({ where: { key } });
    }
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        ...auditMessageColumns(
          auditMessage(`tracking.${url ? "update" : "delete"}`, {
            actor: session.user.name ?? session.user.id,
          }),
        ),
        action: url ? "update" : "delete",
        entityType: "site_setting",
        entityId: trackingScriptUrlKey,
        diff: {
          before,
          after: { url: url ?? "", websiteId: websiteId ?? "" },
        },
      },
    });
  });

  return NextResponse.json({ url: url ?? "", websiteId: websiteId ?? "" });
}
