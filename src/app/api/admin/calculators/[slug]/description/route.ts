import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";
import { isReferenceCalculatorSlug } from "@/lib/admin-tools";
import { prisma } from "@/lib/prisma";
import { revalidateContent } from "@/lib/revalidate-content";
import {
  toolDescriptionMaxLength,
  toolDescriptionToStore,
} from "@/lib/tool-description";
import { launchLocales } from "@/lib/translations";

/**
 * Bloc 130: the one-line description of a tool or a reference.
 *
 * One route for both, because both are rows of the same table — but not one
 * permission: a tool's description answers to `calculators.write` and a
 * reference's to `references.write`, the same split the two visibility
 * routes already draw (Bloc 86/M1). A guides_manager may describe the
 * Boutique; they may not describe the Classement.
 *
 * Keyed by slug rather than id, like the reference visibility route: the
 * slug is what the catalogue, the URLs and the audit log all name a tool by.
 */

// `partialRecord`, not `record`: over an enum key, Zod 4's `record` demands
// every locale be present, so a caller sending only the language it changed
// got a 400. The panel happens to send all five, which is exactly why this
// had to be caught by asking the route rather than by using the screen.
// Unknown locales are still refused, so a key the site does not ship cannot
// be written into the row.
const schema = z.object({
  description: z.partialRecord(
    z.enum(launchLocales),
    z.string().max(toolDescriptionMaxLength),
  ),
});

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/calculators/[slug]/description">,
) {
  const { slug } = await params;
  const isReference = isReferenceCalculatorSlug(slug);
  const session = await authorizedSession(
    isReference ? "references.write" : "calculators.write",
  );
  if (!session) return forbiddenResponse();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_description" }, { status: 400 });

  const before = await prisma.calculator.findUnique({ where: { slug } });
  if (!before)
    return NextResponse.json(
      { error: "calculator_not_found" },
      { status: 404 },
    );

  const description = toolDescriptionToStore(parsed.data.description);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.calculator.update({
      where: { slug },
      data: { description },
    });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        ...auditMessageColumns(
          auditMessage(`${isReference ? "reference" : "tool"}.describe`, {
            actor: session.user.name ?? session.user.id,
            slug,
          }),
        ),
        action: "update",
        entityType: isReference ? "reference_table" : "tool",
        entityId: slug,
        // The languages it now carries, not the sentences: the log says a
        // description was written and in which languages, and the rest is
        // the record itself.
        diff: {
          before: { locales: Object.keys(before.description ?? {}).sort() },
          after: { locales: Object.keys(description).sort() },
        },
      },
    });
    return row;
  });

  // Nothing public reads this field yet (Bloc 129 will), but the tool and
  // reference pages are where it will land, so the invalidation is wired
  // with the write rather than bolted on later.
  await revalidateContent(isReference ? "references" : "tools", slug);
  return NextResponse.json({ description: updated.description });
}
