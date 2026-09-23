import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deriveLaunchLocales,
  generate,
  messagesDirectory,
} from "../../scripts/generate-launch-locales";
import { launchLocales } from "@/lib/translations";

/**
 * Bloc 120: adding a language must be adding a file, and nothing else.
 *
 * The chain under test has two links, and each is tested where it lives: the
 * generator really reads the directory (below, against real files in a temp
 * directory), and the app really reads the generator's output (further below,
 * by replacing the generated module and re-importing the routing that
 * consumes it). Testing only the first would prove a script works and nothing
 * about the site; testing only the second would prove wiring over a list
 * nobody derived.
 */

/** A throwaway project root holding a `messages/` directory. */
function fakeProject(locales: readonly string[], extraFiles: string[] = []) {
  const root = mkdtempSync(path.join(tmpdir(), "ml-helper-locales-"));
  mkdirSync(path.join(root, messagesDirectory), { recursive: true });
  for (const name of [...locales.map((l) => `${l}.json`), ...extraFiles])
    writeFileSync(
      path.join(root, messagesDirectory, name),
      JSON.stringify({ common: { language: name } }),
      "utf8",
    );
  return root;
}

describe("Bloc 120: the locale list is read off the translation files", () => {
  const roots: string[] = [];
  const project = (...args: Parameters<typeof fakeProject>) => {
    const root = fakeProject(...args);
    roots.push(root);
    return root;
  };
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true });
  });

  const derive = (root: string) =>
    deriveLaunchLocales(path.join(root, messagesDirectory), {
      first: ["fr", "en"],
    });

  it("picks up a language that exists only as a new messages/*.json file", () => {
    const before = project(["fr", "en", "de", "es", "tr"]);
    expect(derive(before)).toEqual(["fr", "en", "de", "es", "tr"]);

    // The whole point of the bloc: the same directory plus one file.
    const after = project(["fr", "en", "de", "es", "tr", "pl"]);
    expect(derive(after)).toContain("pl");

    // And it reaches the module the app imports, not just the return value.
    const { locales, changed } = generate(after);
    expect(changed).toBe(true);
    expect(locales).toContain("pl");
    expect(
      readFileSync(
        path.join(after, "src/lib/launch-locales.generated.ts"),
        "utf8",
      ),
    ).toContain('"pl"');
  });

  it("drops a language whose file is removed", () => {
    const root = project(["fr", "en", "de", "es", "tr"]);
    rmSync(path.join(root, messagesDirectory, "tr.json"));
    expect(derive(root)).toEqual(["fr", "en", "de", "es"]);
    expect(derive(root)).not.toContain("tr");
  });

  it("keeps the default and fallback languages in front, and sorts the rest", () => {
    // Not cosmetic: this order drives the guide translation columns, the
    // editorial locale pickers and the hreflang list, all of which would have
    // silently reshuffled the day the list became derived.
    const root = project(["tr", "de", "en", "pl", "fr", "es"]);
    expect(derive(root)).toEqual(["fr", "en", "de", "es", "pl", "tr"]);
  });

  it("ignores a JSON file that does not name a locale", () => {
    const root = project(["fr", "en"], ["README.json", "en-US-extra.json"]);
    expect(derive(root)).toEqual(["fr", "en"]);
  });

  it("refuses to emit an empty list rather than silently unlaunching the site", () => {
    const root = project([]);
    expect(() => generate(root)).toThrow(/refusing to generate an empty/);
  });

  it("rewrites nothing when the list has not changed", () => {
    const root = project(["fr", "en"]);
    expect(generate(root).changed).toBe(true);
    expect(generate(root).changed).toBe(false);
  });

  it("matches what the app is currently compiled against", () => {
    // Catches a stale generated module: the file is git-ignored and rewritten
    // before dev, build and test, so it should always equal a fresh scan.
    expect([...launchLocales]).toEqual(derive(process.cwd()));
  });
});

describe("Bloc 120: a derived language reaches the routing with no code change", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.doUnmock("@/lib/launch-locales.generated"));

  /** The app as it would be compiled after `pl.json` was dropped into messages/. */
  async function withPolish() {
    vi.doMock("@/lib/launch-locales.generated", () => ({
      launchLocales: ["fr", "en", "de", "es", "tr", "pl"] as const,
    }));
    return {
      routing: (await import("@/i18n/routing")).routing,
      localeSettings: await import("@/lib/locale-settings"),
      translations: await import("@/lib/translations"),
      proxy: (await import("@/proxy")).proxy,
    };
  }

  it("adds the locale to the routing next-intl and generateStaticParams read", async () => {
    const { routing } = await withPolish();
    expect(routing.locales).toContain("pl");
    // Still statically prerenderable: the list is a plain array available at
    // build time, which is what src/app/[locale]/layout.tsx maps over.
    expect(routing.locales.map((locale) => ({ locale }))).toContainEqual({
      locale: "pl",
    });
    expect(routing.defaultLocale).toBe("fr");
  });

  it("accepts the new locale as a public URL prefix and negotiates it", async () => {
    const { proxy } = await withPolish();
    const response = proxy(
      new NextRequest("https://example.com/pl/tools", {
        headers: new Headers(),
      }),
    );
    // Rendered as Polish, not 308-redirected to /fr/pl/tools the way an
    // unknown first segment would be.
    expect(response.status).toBe(200);
    expect(
      response.headers.get("x-middleware-request-x-next-intl-locale"),
    ).toBe("pl");
  });
});

describe("Bloc 120: the two rules this must not disturb", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.doUnmock("@/lib/launch-locales.generated"));

  async function withPolish() {
    vi.doMock("@/lib/launch-locales.generated", () => ({
      launchLocales: ["fr", "en", "de", "es", "tr", "pl"] as const,
    }));
    return {
      translations: await import("@/lib/translations"),
      localeSettings: await import("@/lib/locale-settings"),
      proxy: (await import("@/proxy")).proxy,
    };
  }

  // Blocs 116/C and 118: the admin is EN/FR whatever the public site ships.
  it("leaves the admin clamp untouched when a language is added", async () => {
    const { translations, proxy } = await withPolish();
    expect([...translations.adminLocales]).toEqual(["en", "fr"]);
    expect([...translations.adminNamespaces]).toEqual([
      "admin",
      "login",
      "roles",
    ]);
    const response = proxy(
      new NextRequest("https://example.com/admin", {
        headers: new Headers({ cookie: "NEXT_LOCALE=pl" }),
      }),
    );
    expect(
      response.headers.get("x-middleware-request-x-next-intl-locale"),
      "a public language leaked into the admin chrome",
    ).toBe("en");
  });

  // Bloc 90: having a translation file and being visible to the public are
  // two different things, and only the first is what this bloc derives.
  it("adds the language as deactivatable rather than as permanently on", async () => {
    const { localeSettings } = await withPolish();
    expect([...localeSettings.deactivatableLocales]).toEqual([
      "de",
      "es",
      "tr",
      "pl",
    ]);
    expect(localeSettings.isDeactivatableLocale("pl")).toBe(true);
    // EN/FR stay locked: a file for them is not what makes them always-on.
    expect(localeSettings.isAlwaysActiveLocale("fr")).toBe(true);
    expect(localeSettings.isDeactivatableLocale("en")).toBe(false);
  });

  it("renders a disabled language's URL in English instead of hiding the whole locale", async () => {
    const { localeSettings } = await withPolish();
    // resolveRenderLocale is the Bloc 90/E rule; a derived locale that an
    // admin has switched off must still be handled by it.
    expect(
      localeSettings.resolveRenderLocale("pl", ["fr", "en", "de", "es", "tr"]),
    ).toBe("en");
    expect(localeSettings.resolveRenderLocale("pl", ["fr", "en", "pl"])).toBe(
      "pl",
    );
  });
});

describe("Bloc 120: no second copy of the list survives", () => {
  /**
   * The bug this catches is the one this bloc found in `/admin/config`: a
   * hand-written `["en", "fr", "de", "es", "tr"]` that *filtered* against
   * launchLocales, so a language added as a file was present on the public
   * site and missing from the table that switches it off. Deriving the list in
   * one place is only worth something if nowhere else re-enumerates it.
   *
   * Three in a row is the threshold on purpose: an `"fr" | "en"` pair is the
   * repo's documented shape for admin-entered content (pickFrEn), not a copy
   * of the launch list.
   *
   * Two shapes count as a copy, because both were found hiding in this
   * codebase. A list of quoted codes is the obvious one. A record *keyed* by
   * locale is the one that did real damage: two Zod schemas
   * (`services/guides.ts`, the legal-notice route) declared one field per
   * locale, so a language added as a file reached the editor and was then
   * silently stripped on save — the schema simply did not know the key.
   */
  const localeRun =
    /(["'`])(?:fr|en|de|es|tr)\1\s*[,|]\s*(["'`])(?:fr|en|de|es|tr)\2\s*[,|]\s*(["'`])(?:fr|en|de|es|tr)\3|\((?:fr|en|de|es|tr)\|(?:fr|en|de|es|tr)\|/;
  const localeKey = /(?:^|[{,;\s(])(fr|en|de|es|tr)\s*:/gm;

  const keyedByLocale = (source: string) =>
    new Set([...source.matchAll(localeKey)].map((match) => match[1])).size >= 3;

  it("enumerates the launched locales nowhere but the generated module", async () => {
    const { readdir } = await import("node:fs/promises");
    const files: string[] = ["next.config.ts"];
    async function walk(directory: string) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (
          /\.tsx?$/.test(entry.name) &&
          !/\.test\.tsx?$/.test(entry.name) &&
          entry.name !== "launch-locales.generated.ts"
        )
          files.push(full);
      }
    }
    await walk("src");

    // Test files are deliberately out of scope: some exist precisely to
    // assert one language's text (newly-activated-locales), and `tsc` is
    // already the guard for a fixture that stops compiling when the list
    // grows — which is how the three that did were found.
    const offenders = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return localeRun.test(source) || keyedByLocale(source);
    });
    expect(offenders).toEqual([]);
  });
});
