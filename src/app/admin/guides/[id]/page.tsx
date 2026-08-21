import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideEditor } from "@/components/guide-editor";
import { prisma } from "@/lib/prisma";
import { translationRecord } from "@/lib/translations";
import { getTranslations } from "next-intl/server";
import { AdminBackLink } from "@/components/admin-back-link";
import { CombatReferenceAdmin, ExpeditionReferenceAdmin } from "@/components/reference-admin-editors";
import { getCombatReferenceRows, getExpeditionReferenceRows } from "@/lib/reference-equipment-server";

export default async function EditGuidePage({
  params,
}: PageProps<"/admin/guides/[id]">) {
  const session = await requireCapability("guides.write");
  const t = await getTranslations("admin.guides");
  const { id } = await params;
  if (id === "reference-combat-equipment" || id === "reference-expedition-equipment") {
    await requireCapability("references.write");
    const combat = id === "reference-combat-equipment";
    return <main className="admin-main"><AdminBackLink href="/admin/guides" /><h1>{combat ? t("reference-combat") : t("reference-expedition")}</h1>{combat ? <CombatReferenceAdmin initialRows={await getCombatReferenceRows()} /> : <ExpeditionReferenceAdmin initialRows={await getExpeditionReferenceRows()} />}</main>;
  }
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide) notFound();
  const title = translationRecord(guide.title),
    excerpt = translationRecord(guide.excerpt),
    content = translationRecord(guide.content);
  return (
    <main className="admin-main">
      <AdminBackLink href="/admin/guides" /><p className="eyebrow">{t("title")}</p>
      <h1>{t("edit-title")}</h1>
      <GuideEditor
        canPublish={can(session.user.role, "guides.publish")}
        initial={{
          id: guide.id,
          slug: guide.slug,
          category: guide.category,
          coverImage: guide.coverImage ?? "",
          status: guide.status,
          translations: {
            fr: {
              title: title.fr ?? "",
              excerpt: excerpt.fr ?? "",
              content: content.fr ?? "",
            },
            en: {
              title: title.en ?? "",
              excerpt: excerpt.en ?? "",
              content: content.en ?? "",
            },
          },
        }}
      />
    </main>
  );
}
