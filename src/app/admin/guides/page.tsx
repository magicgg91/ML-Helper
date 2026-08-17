import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideStatusList } from "@/components/guide-status-list";
import { prisma } from "@/lib/prisma";

export default async function GuidesAdminPage() {
  const session = await requireCapability("guides.read");
  const guides = await prisma.guide.findMany({
    select: { id: true, slug: true, status: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">Contenu éditorial</p>
      <h1>Guides</h1>
      <p className="lead">
        La gestion éditoriale complète arrivera dans la phase dédiée.
      </p>
      {guides.length ? (
        <GuideStatusList
          rows={guides}
          canPublish={can(session.user.role, "guides.publish")}
        />
      ) : (
        <p className="admin-empty">Aucun guide créé.</p>
      )}
    </main>
  );
}
