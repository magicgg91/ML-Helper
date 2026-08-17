import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideEditor } from "@/components/guide-editor";
import { prisma } from "@/lib/prisma";
import { translationRecord } from "@/lib/translations";

export default async function EditGuidePage({
  params,
}: PageProps<"/admin/guides/[id]">) {
  const session = await requireCapability("guides.write");
  const { id } = await params;
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide) notFound();
  const title = translationRecord(guide.title),
    excerpt = translationRecord(guide.excerpt),
    content = translationRecord(guide.content);
  return (
    <main className="admin-main">
      <p className="eyebrow">Guides</p>
      <h1>Éditer le guide</h1>
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
