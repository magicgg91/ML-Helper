import { Link } from "@/i18n/navigation";
import type { getTranslations } from "next-intl/server";
import type {
  CalculatorAvailability,
  CalculatorSlug,
} from "@/lib/calculator-catalog";
import { sortByLabel } from "@/lib/sort-by-label";
import { GameImage } from "./game-image";

// Bloc 33/A: shared between /tools (unchanged) and the homepage (now a
// direct 1-click entry point instead of a marketing teaser linking to
// /tools) — same categories/layout, reused rather than duplicated.
// Bloc 36/B: `image` is the real AI-generated illustration delivered for
// each category (single source of truth for both pages).
// Bloc 104: the placeholder icon that used to sit beside it is gone — see
// reference-catalog.ts for why (deleted files, and a preload hint for an
// element that never rendered).
export const toolCategories: Array<{
  label: "cities" | "combat" | "ranking" | "skills";
  slug: string;
  calculators: CalculatorSlug[];
  image: string;
}> = [
  {
    label: "cities",
    slug: "villes",
    calculators: [
      "city-cost",
      "city-max-level",
      "city-production",
      "city-rewards",
    ],
    image: "/tools/cities.webp",
  },
  {
    label: "combat",
    slug: "combat",
    calculators: ["xp-gain-rate", "demo-attack-troops"],
    image: "/tools/fight.webp",
  },
  {
    label: "ranking",
    slug: "classement",
    calculators: ["ranking"],
    image: "/tools/ranking.webp",
  },
  {
    label: "skills",
    slug: "competences",
    calculators: [
      "stuff-simulator",
      "expedition-equipment-simulator",
      "gems",
      "templars",
    ],
    image: "/tools/skills.webp",
  },
];

export type CategoryToolLink = { href: string; label: string };

export function ToolCategoryGrid({
  active,
  locale,
  t,
  toolLinks,
  order,
}: {
  active: CalculatorAvailability;
  // Bloc 64/A: the tiles are ordered by the label actually shown, so the
  // sort needs the visitor's locale (accents, collation) — same rule the
  // admin lists got at Bloc 62/C.
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"tools">>>;
  /**
   * Bloc 129 §3.2 : sur l'index Outils, la carte d'une catégorie liste ses
   * outils, un lien par outil. L'accueil (§3.1) montre les mêmes cartes
   * sans cette liste — d'où un paramètre, plutôt qu'une seconde grille qui
   * dupliquerait la mise en page.
   */
  toolLinks?: Record<string, CategoryToolLink[]>;
  /**
   * L'ordre imposé par le §3.2 (Villes, Compétences, Combat, Classement).
   * Sans lui, les cartes restent triées par libellé traduit (Bloc 64/A).
   */
  order?: readonly string[];
}) {
  const ordered = order
    ? [...toolCategories].sort(
        (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
      )
    : sortByLabel(toolCategories, (item) => t(item.label), locale);
  return (
    <div className="tool-category-grid">
      {ordered.map((category, index) => {
        const count = category.calculators.filter(
          (slug) => active[slug],
        ).length;
        const available = count > 0;
        const content = (
          <>
            <div className="tool-category-image">
              <GameImage
                src={category.image}
                alt=""
                width={500}
                height={500}
                // Bloc 64/A review: whichever tile the sort puts first is
                // the LCP image, so eager-loading follows the rendered
                // position — it used to name Villes, which is only first
                // while the order is the catalog's own.
                eager={index === 0}
                // Bloc 104: nothing, rather than a placeholder image. The
                // illustration ships with the repo, so it cannot go
                // missing on its own; and an <img> here is serialised into
                // the RSC payload and preloaded whether or not it renders.
                // The .tool-category-image box keeps its square footprint
                // either way, so a failed load leaves a gap, not a reflow.
                fallback={null}
              />
            </div>
            <div className="tool-category-copy">
              <h2>{t(category.label)}</h2>
              <strong className="tool-count">{t("count", { count })}</strong>
              {!available && (
                <span className="tool-unavailable">{t("comingSoon")}</span>
              )}
            </div>
          </>
        );
        const links = toolLinks?.[category.slug] ?? [];
        // Une carte qui liste ses outils ne peut pas être elle-même un
        // lien : on n'imbrique pas un lien dans un lien. Le lien de
        // catégorie couvre alors l'image et le titre, et chaque outil
        // porte le sien.
        if (available && links.length > 0)
          return (
            <article className="tool-category-card" key={category.slug}>
              <Link
                className="tool-category-head"
                href={`/tools/${category.slug}`}
                prefetch={false}
              >
                {content}
              </Link>
              <ul className="tool-category-tools">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} prefetch={false}>
                      <span>{link.label}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          );
        return available ? (
          <Link
            className="tool-category-card"
            href={`/tools/${category.slug}`}
            key={category.slug}
            // Bloc 91/F6: skip the per-card RSC prefetch on this grid.
            prefetch={false}
          >
            {content}
          </Link>
        ) : (
          <article
            className="tool-category-card public-card-disabled"
            key={category.slug}
            data-disabled
            title={t("unavailable")}
          >
            {content}
          </article>
        );
      })}
    </div>
  );
}
