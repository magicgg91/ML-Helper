import { revalidatePath } from "next/cache";
import { getActiveLocales } from "./locale-settings";

/**
 * Bloc 125 §9: after an admin saves, every language's copy of the page the
 * save changed is dropped from the cache — not just the one the admin
 * happened to be editing in.
 *
 * Nothing in the app caches these pages today: there is no `revalidateTag`,
 * no `unstable_cache`, and the public reference and guide routes force a
 * per-request render (`await connection()`). The cache was, in other words,
 * not the cause of the bug this bloc went after — that was the editors
 * writing into the wrong column, fixed where the columns are chosen.
 *
 * This still belongs here. The routes below are one `export const revalidate`
 * away from being cached, and the failure that would follow is a silent one:
 * an admin saves, the French page updates because it is the one they reload,
 * and the four other languages keep serving yesterday's text with nothing
 * anywhere saying so. One call, at every save, makes that impossible — and
 * `revalidatePath` on an uncached path is a no-op, so it costs nothing until
 * the day it matters.
 */

/** What an admin screen saves, and the public path each one is read at. */
export const contentResources = {
  guides: (slug?: string) => (slug ? `/guides/${slug}` : "/guides"),
  references: (slug?: string) =>
    slug ? `/referentiels/${slug}` : "/referentiels",
  tools: (slug?: string) => (slug ? `/tools/${slug}` : "/tools"),
  legal: () => "/legal",
  // Bloc 132 §4 : la sélection « Mis en avant » ne change que l'accueil,
  // qui n'a pas d'index au-dessus de lui — d'où le chemin vide, qui donne
  // « /fr », « /en »…
  home: () => "",
} as const;

export type ContentResource = keyof typeof contentResources;

/**
 * The paths a save invalidates: one per active public language, plus the
 * index the resource is listed on.
 */
export async function contentPathsToRevalidate(
  resource: ContentResource,
  slug?: string,
): Promise<string[]> {
  const locales = await getActiveLocales();
  const build = contentResources[resource];
  const paths = new Set<string>();
  for (const locale of locales) {
    paths.add(`/${locale}${build(slug)}`);
    // The list the item is on changes with it — a renamed guide is a new
    // title in the index too.
    if (slug) paths.add(`/${locale}${build()}`);
  }
  return [...paths];
}

/**
 * Called by every admin save. Failures are swallowed on purpose and only
 * here: the write has already succeeded and been logged at this point, and
 * refusing the response because a cache hint failed would tell the admin
 * their change was lost when it was not.
 */
export async function revalidateContent(
  resource: ContentResource,
  slug?: string,
): Promise<void> {
  try {
    for (const path of await contentPathsToRevalidate(resource, slug))
      revalidatePath(path);
  } catch (error) {
    console.error("revalidateContent failed", { resource, slug, error });
  }
}
