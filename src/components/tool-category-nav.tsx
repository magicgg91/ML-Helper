"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const categories = [
  { label: "Villes", slug: "villes", available: true },
  { label: "Classement", slug: "classement", available: true },
  { label: "Compétences", slug: "competences", available: true },
  { label: "Référentiels", slug: "referentiels", available: true },
] as const;

export function ToolCategoryNav() {
  const pathname = usePathname();
  return (
    <nav className="category-nav" aria-label="Catégories de simulateurs">
      {categories.map((category) =>
        category.available ? (
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
