import { getLocale, getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { requireCapability } from "@/auth/require-session";
import { PageHeader } from "@/components/admin-page-header";
import {
  AdminToolsList,
  type AdminToolRow,
  type AdminToolSource,
} from "@/components/admin-tools-list";
import { toolParameterSource } from "@/lib/admin-tool-sources";
import { referenceToolSlugs } from "@/lib/admin-tools";
import { prisma } from "@/lib/prisma";

export default async function ToolsAdminPage() {
  const session = await requireCapability("calculators.read");
  const [t, references, messages, locale] = await Promise.all([
    getTranslations("admin.tools"),
    // The reference a tool reads is named where references are named, so the
    // two screens call it the same thing.
    getTranslations("admin.referentiels.references"),
    getTranslations(),
    getLocale(),
  ]);
  const tools = await prisma.calculator.findMany({
    where: { slug: { notIn: [...referenceToolSlugs] } },
  });
  const canOpenReferences = can(session.user.role, "references.read");

  const rows: AdminToolRow[] = tools
    .map((tool) => {
      const source = toolParameterSource(tool.slug);
      // Resolved here rather than in the client component: the reference's
      // name is a server-side translation, and the source itself is derived
      // from a module the browser has no reason to carry.
      const resolved: AdminToolSource =
        source.kind === "reference"
          ? {
              kind: "reference",
              href: source.href,
              referenceLabel: references(source.reference),
            }
          : source.kind === "shared"
            ? {
                kind: "shared",
                href: source.href,
                sharedCount: source.tools.length,
              }
            : source.kind === "own"
              ? { kind: "own", href: source.href }
              : { kind: "none" };
      return {
        id: tool.id,
        slug: tool.slug,
        label: messages(`${tool.slug}.name`),
        category: tool.category,
        active: tool.active,
        source: resolved,
      };
    })
    // Bloc 62/C: alphabetical by the label actually shown, in the admin's own
    // language — kept from the screen this replaces.
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
      />
      <AdminToolsList
        rows={rows}
        canEdit={can(session.user.role, "calculators.write")}
        canToggle={can(session.user.role, "calculators.toggle")}
        canOpenReferences={canOpenReferences}
      />
    </div>
  );
}
