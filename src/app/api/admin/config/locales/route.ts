import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage } from "@/lib/audit-message";
import { isAlwaysActiveLocale } from "@/lib/locale-settings";
import { prisma } from "@/lib/prisma";
import { launchLocales } from "@/lib/translations";

const payloadSchema = z.object({
  locale: z.string(),
  active: z.boolean(),
});

// Bloc 90/B+D: toggle a launched locale's public visibility. Gated on
// configuration.write (admin/super_admin only — the 4 other roles are
// rejected here with 403 even if they forge the request), and EN/FR can
// never be deactivated.
export async function PATCH(request: Request) {
  const session = await authorizedSession("configuration.write");
  if (!session) return forbiddenResponse();

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const { locale, active } = parsed.data;

  // Only the 5 launched locales exist to be toggled.
  if (!(launchLocales as readonly string[]).includes(locale))
    return NextResponse.json({ error: "unknown_locale" }, { status: 400 });

  // Bloc 90/D: EN and FR are the always-active base languages — a forged
  // request to deactivate one is rejected before it can touch the DB.
  // (Re-activating them is a harmless no-op and allowed.)
  if (isAlwaysActiveLocale(locale) && !active)
    return NextResponse.json({ error: "locale_locked" }, { status: 422 });

  const before = await prisma.localeSetting.findUnique({ where: { locale } });
  const beforeActive = before?.active ?? true;

  const setting = await prisma.$transaction(async (tx) => {
    const updated = await tx.localeSetting.upsert({
      where: { locale },
      create: { locale, active },
      update: { active },
    });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        message: auditMessage(
          session.user.name ?? session.user.id,
          active ? "activate" : "deactivate",
          `la langue ${locale.toUpperCase()}`,
        ),
        action: active ? "activate" : "deactivate",
        entityType: "locale",
        entityId: locale,
        diff: { before: { active: beforeActive }, after: { active } },
      },
    });
    return updated;
  });

  return NextResponse.json({ locale: setting.locale, active: setting.active });
}
