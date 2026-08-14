import { getTranslations } from "next-intl/server";
export default async function AdminPage() {
  const t = await getTranslations("Admin");
  return (
    <main>
      <h1>{t("dashboard")}</h1>
      <p>{t("empty")}</p>
    </main>
  );
}
