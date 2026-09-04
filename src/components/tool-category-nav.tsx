"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TabLabel } from "./tab-label";

const categories = [
  { label: "cities", slug: "villes" },
  { label: "combat", slug: "combat" },
  { label: "ranking", slug: "classement" },
  { label: "skills", slug: "competences" },
] as const;

export function ToolCategoryNav({
  availability,
}: {
  availability: Record<string, boolean>;
}) {
  const pathname = usePathname();
  const t = useTranslations("tools");
  return (
    <nav className="category-nav" aria-label={t("navigation-label")}>
      {categories.map((category) =>
        availability[category.slug] ? (
          <Link
            className="category-btn"
            aria-current={
              pathname === `/tools/${category.slug}` ? "page" : undefined
            }
            href={`/tools/${category.slug}`}
            key={category.slug}
          >
            {t(category.label)}
          </Link>
        ) : (
          <button
            className="category-btn"
            disabled
            key={category.slug}
            title={t("unavailable")}
          >
            <TabLabel label={t(category.label)} badge={t("unavailable")} />
          </button>
        ),
      )}
    </nav>
  );
}
