import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClassName } from "@/components/button";

export default async function Forbidden() {
  const t = await getTranslations("admin.forbidden");
  return (
    <main className="admin-main forbidden-page">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      {/* Bloc 132 §8 : ce lien empruntait `.category-btn` au bandeau des
          catégories d'outils, seul reste d'un style que le §8 a remplacé.
          Il prend l'apparence du bouton secondaire du §2.

          Retour de revue : sa classe seulement, pas le composant `Button`,
          qui passe par le `Link` localisé de `@/i18n/navigation`. Cette page
          est rendue sous une URL `/admin/…` sans préfixe de langue, et un
          `/fr/admin` n'existe pas — le repli ne mènerait nulle part. C'est la
          règle que `src/i18n/navigation.ts` énonce et que tout le reste de
          l'administration suit : `next/link` ici. */}
      <Link className={buttonClassName("secondary")} href="/admin">
        {t("back")}
      </Link>
    </main>
  );
}
