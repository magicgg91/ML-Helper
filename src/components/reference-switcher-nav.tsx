"use client";

import { usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { referenceCatalog, referenceHref } from "@/lib/reference-catalog";
import { SelectionBanner, SelectionTab } from "./selection-banner";

// Bloc 50/E: promoted from an inline nav inside the [slug] detail page to
// the section-level header nav of the whole /referentiels route (rendered
// by src/app/(public)/referentiels/layout.tsx, above both the index and
// every detail page). Since a shared layout has no access to the page's
// own route params, `aria-current` is derived from the current pathname
// instead of a `reference.slug` prop passed down — same pattern as
// tool-category-nav.tsx for /tools. Bloc 132 §8: the two navs now share
// SelectionBanner, which supersedes the deliberately separate class names
// of Bloc 40/A and Bloc 41/C.
// The translator is read locally via useTranslations, not passed as a
// `t` prop from the server layout — a next-intl/server translator is a
// function, and Next.js forbids passing functions from a Server Component
// to a Client Component ("use server" boundary), which crashed this page
// at runtime despite passing every unit test (RTL doesn't enforce that
// boundary). Same pattern as tool-category-nav.tsx.
// Bloc 62/I: an inactive reference now gets its own non-clickable slot
// here instead of being filtered out — an internal teaser for visitors
// already on the site (Bloc 60's search/sitemap hiding is a separate,
// external-discovery rule, unaffected). Sorted alphabetically (the
// displayed label, active admin/public locale) instead of the catalog's
// own declaration order.
export function ReferenceSwitcherNav({
  active,
}: {
  active: Record<string, boolean>;
}) {
  const pathname = usePathname();
  const t = useTranslations("references");
  const tools = useTranslations("tools");
  const locale = useLocale();
  const sorted = [...referenceCatalog].sort((a, b) =>
    t(`catalog.${a.slug}`).localeCompare(t(`catalog.${b.slug}`), locale),
  );
  // Bloc 129 §3.9 : sept onglets sur une seule rangée, donc des libellés
  // courts là où le nom complet ne tient pas. Seuls les deux équipements en
  // ont un ; les autres gardent leur nom, sans clé à écrire pour rien.
  const label = (slug: string) =>
    t.has(`catalog-short.${slug}`)
      ? t(`catalog-short.${slug}`)
      : t(`catalog.${slug}`);
  return (
    // Bloc 129 §2.2 : son propre nom, distinct de « Référentiels » — le
    // pied de page nomme ainsi une de ses colonnes, et deux repères de
    // navigation portant le même nom ne se distinguent plus à l'oreille.
    // Bloc 132 §8 : la forme du bandeau est celle de SelectionBanner, la
    // même que celle des catégories d'outils.
    <SelectionBanner navLabel={t("nav-label")} columns={7}>
      {sorted.map((item) =>
        active[item.calculatorSlug] ? (
          <SelectionTab
            key={item.slug}
            href={referenceHref(item.slug)}
            image={item.image}
            label={label(item.slug)}
            current={pathname === `/referentiels/${item.slug}`}
          />
        ) : (
          // Bloc 62/I : un référentiel pas encore ouvert garde sa place au
          // lieu de disparaître — il n'a pas de page, donc pas de bouton
          // non plus, seulement une case inerte.
          <SelectionTab
            key={item.slug}
            element="span"
            title={tools("unavailable")}
            image={item.image}
            label={label(item.slug)}
            badge={tools("comingSoon")}
          />
        ),
      )}
    </SelectionBanner>
  );
}
