import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { referenceCatalog } from "@/lib/reference-catalog";
import { canonicalUrl, languageAlternates } from "@/lib/site-url";
import { defaultLaunchLocale } from "@/lib/translations";

// Bloc 42/J: /tools/[slug] only ever resolves these 4 category slugs
// (src/app/(public)/tools/[slug]/page.tsx) — individual calculators don't
// have their own route, they're grouped by category on these 4 pages.
const toolCategoryPaths = ["villes", "combat", "classement", "competences"];

function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  return {
    // Bloc 91/E1: the canonical URL is the default-locale (FR) prefixed one;
    // the other 4 languages ride along as hreflang alternates.
    url: canonicalUrl(defaultLaunchLocale, path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    alternates: { languages: languageAlternates(path) },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Published guides and active calculators/référentiels change at
  // runtime (admin-editable) — same reason every other prisma-touching
  // public page (home, guides list, guide detail) calls connection()
  // first: without it Next tries to statically prerender this route once
  // at build time, baking in whatever the DB holds (or doesn't yet hold)
  // at image-build time instead of the live content.
  await connection();
  const [active, guides] = await Promise.all([
    getCalculatorAvailability(),
    prisma.guide.findMany({
      where: { status: "published", active: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    entry("/", "weekly"),
    entry("/tools", "weekly"),
    entry("/guides", "weekly"),
    entry("/referentiels", "weekly"),
    entry("/contact", "yearly"),
    entry("/legal", "yearly"),
    ...toolCategoryPaths.map((category) =>
      entry(`/tools/${category}`, "monthly"),
    ),
    ...guides.map((guide) =>
      entry(`/guides/${guide.slug}`, "monthly", guide.updatedAt),
    ),
    ...referenceCatalog
      .filter((reference) => active[reference.calculatorSlug])
      .map((reference) => entry(`/referentiels/${reference.slug}`, "monthly")),
  ];
}
