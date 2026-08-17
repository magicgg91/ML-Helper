"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const categories = [
  { label: "Villes", slug: "villes" },
  { label: "Classement", slug: "classement" },
  { label: "Compétences", slug: "competences" },
  { label: "Référentiels", slug: "referentiels" },
] as const;

export function ToolCategoryNav({
  availability,
}: {
  availability: Record<string, boolean>;
}) {
  const pathname = usePathname();
  return (
    <nav className="category-nav" aria-label="Catégories de simulateurs">
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
            {category.label}
          </Link>
        ) : (
          <button className="category-btn" disabled key={category.slug}>
            {category.label}
          </button>
        ),
      )}
    </nav>
  );
}
