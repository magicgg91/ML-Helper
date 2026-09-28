import { getLocale, getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { requireCapability } from "@/auth/require-session";
import { PageHeader } from "@/components/admin-page-header";
import {
  AdminReferencesList,
  type AdminReferenceRow,
} from "@/components/admin-references-list";
import {
  adminReferenceEditHref,
  toolUsingReference,
} from "@/lib/admin-tool-sources";
import { referenceToolSlugs } from "@/lib/admin-tools";
import { prisma } from "@/lib/prisma";
import { hiddenPublicLocales } from "@/lib/locale-settings";
import { parseToolDescription } from "@/lib/tool-description";
import { launchLocales } from "@/lib/translations";

export default async function ReferentielsAdminPage() {
  const session = await requireCapability("references.read");
  const [t, messages, locale, languages, hiddenLocales] = await Promise.all([
    getTranslations("admin.referentiels"),
    // The tool that reads a reference is named from the public catalogue,
    // the same source the Outils screen labels its rows from.
    getTranslations(),
    getLocale(),
    getTranslations("admin.config.languages"),
    hiddenPublicLocales(),
  ]);
  const references = await prisma.calculator.findMany({
    where: { slug: { in: [...referenceToolSlugs] } },
  });

  const rows: AdminReferenceRow[] = references
    .map((reference) => {
      const tool = toolUsingReference(reference.slug);
      return {
        id: reference.slug,
        title: t(`references.${reference.slug}`),
        active: reference.active,
        editHref: adminReferenceEditHref(reference.slug),
        usedBy: tool ? messages(`${tool}.name`) : null,
        // Bloc 130: editorial content, stored per language on the row
        // itself — not a key in messages/*.json.
        description: parseToolDescription(reference.description),
      };
    })
    // Bloc 62/C: alphabetical by the displayed title, in the admin's own
    // language — kept from the screen this replaces.
    .sort((a, b) => a.title.localeCompare(b.title, locale));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <AdminReferencesList
        rows={rows}
        canWrite={can(session.user.role, "references.write")}
        hiddenLocales={hiddenLocales}
        languageNames={Object.fromEntries(
          launchLocales.map((code) => [
            code,
            languages.has(code) ? languages(code) : code.toUpperCase(),
          ]),
        )}
      />
    </div>
  );
}
