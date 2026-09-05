import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { ReferenceStatusList } from "@/components/reference-status-list";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { adminToolEditHref, referenceToolSlugs } from "@/lib/admin-tools";

export default async function ReferentielsAdminPage() {
  const session = await requireCapability("references.read");
  const [t, locale] = await Promise.all([
    getTranslations("admin.referentiels"),
    getLocale(),
  ]);
  const references = await prisma.calculator.findMany({
    where: { slug: { in: [...referenceToolSlugs] } },
  });
  // Bloc 62/C: alphabetical by the displayed title (the active admin UI
  // locale), replacing the previous slug-based order.
  const rows = references
    .map((reference) => ({
      id: reference.slug,
      slug: reference.slug,
      title: t(`references.${reference.slug}`),
      active: reference.active,
      editHref:
        adminToolEditHref(reference.slug) ??
        `/admin/referentiels/reference-${reference.slug}`,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, locale));
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <ReferenceStatusList
        rows={rows}
        canWrite={can(session.user.role, "references.write")}
      />
    </main>
  );
}
