"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
export function ReferenceSwitcherNav({
  active,
  t,
}: {
  active: Record<string, boolean>;
  t: (key: string) => string;
}) {
  const pathname = usePathname();
  return (
    <nav
      className="reference-switcher category-nav"
      aria-label={t("tabs-label")}
    >
      {referenceCatalog
        .filter((item) => active[item.calculatorSlug])
        .map((item) => (
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
        ))}
    </nav>
  );
}
