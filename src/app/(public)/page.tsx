import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSuperAdmin } from "../../services/setup-superadmin";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  await connection();
  if (!(await hasSuperAdmin())) redirect("/admin/setup");
  const t = await getTranslations("Home");
  return (
    <main className="public-main">
      <section className="hero">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
        <div className="hero-actions">
          <Link className="primary-link" href="/tools">
            {t("tools")}
          </Link>
          <Link href="/guides">{t("guides")}</Link>
        </div>
      </section>
    </main>
  );
}
