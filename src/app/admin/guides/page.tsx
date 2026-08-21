import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideStatusList } from "@/components/guide-status-list";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { localizedText } from "@/lib/translations";

export default async function GuidesAdminPage() {
  const session = await requireCapability("guides.read");
  const guides = await prisma.guide.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">Contenu éditorial</p>
      <h1>Guides</h1>
      <div className="admin-section-heading">
        <p>Crée, traduis et soumets les guides à validation.</p>
        {can(session.user.role, "guides.write") && (
          <Link className="primary-action" href="/admin/guides/new">
            Nouveau
          </Link>
        )}
      </div>
      {guides.length ? (
        <GuideStatusList
          rows={guides.map((guide) => ({
            id: guide.id,
            slug: guide.slug,
            title: localizedText(guide.title, "fr"),
            author: guide.author,
            createdAt: guide.createdAt.toLocaleDateString("fr-FR"),
            updatedAt: guide.updatedAt.toLocaleDateString("fr-FR"),
            status: guide.status,
            active: guide.active,
          }))}
          canPublish={can(session.user.role, "guides.publish")}
          canDelete={can(session.user.role, "guides.delete")}
          canWrite={can(session.user.role, "guides.write")}
        />
      ) : (
        <p className="admin-empty">Aucun guide créé.</p>
      )}
    </main>
  );
}
