import Link from "next/link";
import { requireCapability } from "@/auth/require-session";
import { getTranslations } from "next-intl/server";

export default async function ReferencesAdminPage() {
  await requireCapability("references.read");
  const [t, messages] = await Promise.all([
    getTranslations("admin.references"),
    getTranslations(),
  ]);
  const references = [
    ["/admin/references/combat", messages("combat-equipment.name"), t("combat-detail")],
    ["/admin/references/expedition", messages("expedition-equipment.name"), t("expedition-detail")],
    ["/admin/references/templars", messages("templars.name"), t("templars-detail")],
  ];
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <div className="admin-card-grid">
        {references.map(([href, label, detail]) => (
          <Link className="admin-link-card" href={href} key={href}>
            <strong>{label}</strong>
            <span>{detail}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
