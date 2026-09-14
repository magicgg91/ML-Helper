import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Forbidden() {
  const t = await getTranslations("admin.forbidden");
  return (
    <main className="admin-main forbidden-page">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <Link className="category-btn" href="/admin">
        {t("back")}
      </Link>
    </main>
  );
}
