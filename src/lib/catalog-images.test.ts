import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { referenceCatalog } from "./reference-catalog";
import { toolCategories } from "../components/tool-category-grid";

// Bloc 104: the homepage asked for five files that had not existed for
// months. They were the placeholder icons both catalogs carried beside their
// real illustration, deleted one by one once every entry had its own — while
// the paths naming them stayed behind. Nothing failed loudly, because the
// element they fed was only ever rendered if the real image failed; it still
// cost five 404s per visit, since React preloads any <img> it finds in the
// RSC payload whether or not the page renders it.
//
// So: every image path a catalog declares must name a file that actually
// ships. A path with no file behind it is either a 404 waiting to happen or
// a leftover of something deleted — this test refuses both, whichever way a
// future bloc introduces it.
const roots = ["public", "src/app"];

function servedFile(src: string): string | null {
  const name = src.replace(/^\//, "");
  for (const root of roots) {
    const candidate = path.join(root, name);
    if (existsSync(path.join(process.cwd(), candidate))) return candidate;
  }
  return null;
}

describe("catalog images", () => {
  const declared: Array<[string, string]> = [
    ...referenceCatalog.map(
      (entry) => [`reference "${entry.slug}"`, entry.image] as [string, string],
    ),
    ...toolCategories.map(
      (entry) =>
        [`tool category "${entry.label}"`, entry.image] as [string, string],
    ),
  ];

  it.each(declared)("%s names a file the site actually serves", (_who, src) => {
    expect(servedFile(src), `${src} is served by no root`).not.toBeNull();
  });

  // Guards the loop above: an empty catalog would make it vacuously green.
  it("covers every entry of both catalogs", () => {
    expect(declared).toHaveLength(
      referenceCatalog.length + toolCategories.length,
    );
    expect(declared.length).toBeGreaterThan(10);
  });

  // The five deleted placeholders, named explicitly: this is the reference a
  // future bloc would otherwise be free to reintroduce from an old example.
  it("declares none of the placeholder icons deleted with Bloc 104", () => {
    const stale = declared.filter(([, src]) =>
      /^\/category-.*\.svg$/.test(src),
    );
    expect(stale).toEqual([]);
  });
});
