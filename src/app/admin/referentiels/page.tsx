import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { ReferenceStatusList } from "@/components/reference-status-list";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { adminToolEditHref, referenceToolSlugs } from "@/lib/admin-tools";

export default async function ReferentielsAdminPage() {
  const session = await requireCapability("references.read");
  const t = await getTranslations("admin.referentiels");
  const references = await prisma.calculator.findMany({
    where: { slug: { in: [...referenceToolSlugs] } },
    orderBy: { slug: "asc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <ReferenceStatusList
        rows={references.map((reference) => ({
          id: reference.slug,
          slug: reference.slug,
          title: t(`references.${reference.slug}`),
          active: reference.active,
          editHref:
            adminToolEditHref(reference.slug) ??
            `/admin/referentiels/reference-${reference.slug}`,
        }))}
        canWrite={can(session.user.role, "references.write")}
      />
    </main>
  );
}
