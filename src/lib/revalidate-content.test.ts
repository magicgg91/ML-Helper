import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const activeLocales = vi.hoisted(() => vi.fn());
vi.mock("./locale-settings", () => ({ getActiveLocales: activeLocales }));

const { contentPathsToRevalidate, revalidateContent } =
  await import("./revalidate-content");

beforeEach(() => {
  revalidatePath.mockClear();
  activeLocales.mockReset();
});

describe("Bloc 125 §9: a save drops every language of what it changed", () => {
  it("covers each active locale, not only the one being edited", async () => {
    activeLocales.mockResolvedValue(["fr", "en", "de"]);
    await revalidateContent("references", "shop");
    expect(revalidatePath.mock.calls.map(([p]) => p).sort()).toEqual(
      [
        "/de/referentiels",
        "/de/referentiels/shop",
        "/en/referentiels",
        "/en/referentiels/shop",
        "/fr/referentiels",
        "/fr/referentiels/shop",
      ].sort(),
    );
  });

  it("leaves a language an admin switched off alone", async () => {
    // Nothing is served at /tr, so there is nothing there to drop.
    activeLocales.mockResolvedValue(["fr", "en"]);
    const paths = await contentPathsToRevalidate("guides", "debuter");
    expect(paths.some((p) => p.startsWith("/tr/"))).toBe(false);
    expect(paths).toContain("/fr/guides/debuter");
    expect(paths).toContain("/en/guides/debuter");
  });

  it("drops the index alongside the item, and only the index without one", async () => {
    activeLocales.mockResolvedValue(["fr"]);
    expect(await contentPathsToRevalidate("guides", "debuter")).toEqual([
      "/fr/guides/debuter",
      "/fr/guides",
    ]);
    expect(await contentPathsToRevalidate("legal")).toEqual(["/fr/legal"]);
  });

  // Bloc 132 §4 : l'accueil n'a pas d'index au-dessus de lui, donc un seul
  // chemin par langue — et surtout pas « /fr/ » avec une barre de trop.
  it("vise la racine de chaque langue pour l'accueil", async () => {
    activeLocales.mockResolvedValue(["fr", "en"]);
    expect(await contentPathsToRevalidate("home")).toEqual(["/fr", "/en"]);
  });

  it("never fails the request it is called from", async () => {
    // The write has already succeeded and been logged by this point: telling
    // the admin their change was lost because a cache hint failed would be a
    // lie. Reported, not raised.
    activeLocales.mockRejectedValue(new Error("database unreachable"));
    const reported = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(revalidateContent("tools")).resolves.toBeUndefined();
    expect(reported).toHaveBeenCalled();
    reported.mockRestore();
  });
});

describe("Bloc 125 §9: every admin save that changes a public page calls it", () => {
  it("leaves none of them out", async () => {
    const root = path.join(process.cwd(), "src/app/api/admin");
    const routes: string[] = [];
    async function walk(directory: string) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.name === "route.ts") routes.push(full);
      }
    }
    await walk(root);

    // What each of these routes writes, and whether the public site renders
    // it. An account's password, a role, the audit log and the one-time setup
    // change nothing a visitor can see; a locale toggle and a tool's active
    // flag are read per request by the layout, never from a cached page.
    const invisibleToThePublic = [
      "config/locales",
      "config/tracking",
      "guides/references/[slug]/active",
      "logs",
      "logs/count",
      "profile/password",
      "profile/totp",
      "profile/totp/setup",
      "setup",
      "tools/[id]",
      "users",
      "users/[id]",
    ];
    const missing: string[] = [];
    for (const route of routes) {
      const name = path
        .relative(root, path.dirname(route))
        .split(path.sep)
        .join("/");
      if (invisibleToThePublic.includes(name)) continue;
      const source = await readFile(route, "utf8");
      if (!source.includes("revalidateContent(")) missing.push(name);
    }
    expect(missing).toEqual([]);
    // …and the exclusion list is not quietly covering a route that no longer
    // exists, which is how a list like this rots into a rubber stamp.
    const names = routes.map((route) =>
      path.relative(root, path.dirname(route)).split(path.sep).join("/"),
    );
    expect(
      invisibleToThePublic.filter((name) => !names.includes(name)),
    ).toEqual([]);
  });
});
