"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { referenceCatalog, referenceHref } from "@/lib/reference-catalog";

// Bloc 50/E: promoted from an inline nav inside the [slug] detail page to
// the section-level header nav of the whole /referentiels route (rendered
// by src/app/(public)/referentiels/layout.tsx, above both the index and
// every detail page). Since a shared layout has no access to the page's
// own route params, `aria-current` is derived from the current pathname
// instead of a `reference.slug` prop passed down — same pattern as
// tool-category-nav.tsx for /tools. Keeps the exact same classNames
// (reference-switcher/category-nav/category-btn) driving existing CSS
// (Bloc 40/A, Bloc 41/C).
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
  return (
    <nav
      className="reference-switcher category-nav"
      aria-label={t("tabs-label")}
    >
      {sorted.map((item) =>
        active[item.calculatorSlug] ? (
          <Link
            className="category-btn"
            key={item.slug}
            href={referenceHref(item.slug)}
            aria-current={
              pathname === `/referentiels/${item.slug}` ? "page" : undefined
            }
          >
            {t(`catalog.${item.slug}`)}
          </Link>
        ) : (
          <span
            className="category-btn category-btn-unavailable"
            key={item.slug}
            aria-disabled="true"
            title={tools("unavailable")}
          >
            <span className="category-btn-label">
              {t(`catalog.${item.slug}`)}
            </span>
            <span className="tool-unavailable">{tools("comingSoon")}</span>
          </span>
        ),
      )}
    </nav>
  );
}
