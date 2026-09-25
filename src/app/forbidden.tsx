import { getTranslations } from "next-intl/server";
import { Button } from "@/components/button";

export default async function Forbidden() {
  const t = await getTranslations("admin.forbidden");
  return (
    <main className="admin-main forbidden-page">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      {/* Bloc 132 §8 : ce lien empruntait `.category-btn` au bandeau des
          catégories d'outils, seul reste d'un style que le §8 a remplacé.
          Il prend le bouton secondaire du §2, celui de toutes les actions
          de repli du site. */}
      <Button variant="secondary" href="/admin">
        {t("back")}
      </Button>
    </main>
  );
}
