import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// The translator the manifest routes use, backed by the real messages/*.json
// files (through the same English-fallback merge the app uses at runtime), so
// these tests compare the served name against the actual translations rather
// than against a stub — a manifest that stopped following next-intl would show
// up here.
vi.mock("next-intl/server", () => ({
  getTranslations: async ({
    locale,
    namespace,
  }: {
    locale: string;
    namespace: string;
  }) => {
    const { getMessagesForLocale } = await import("@/i18n/config");
    const messages = await getMessagesForLocale(locale);
    return (key: string) =>
      [...namespace.split("."), key].reduce<unknown>(
        (node, part) => (node as Record<string, unknown>)?.[part],
        messages,
      ) as string;
  },
}));

const { default: manifest } = await import("./manifest");
const { GET, generateStaticParams } =
  await import("./[locale]/manifest.webmanifest/route");

const globalsCss = readFileSync(path.join(__dirname, "globals.css"), "utf8");

/** The site name as it is really written in one locale's message file. */
function siteTitle(locale: string): string {
  const messages = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "messages", `${locale}.json`),
      "utf8",
    ),
  );
  return messages.Public.meta.siteTitle;
}

/** Fetches one locale's manifest through its route handler. */
async function localeManifest(locale: string) {
  const response = await GET(
    new Request(`http://x/${locale}/manifest.webmanifest`),
    {
      params: Promise.resolve({ locale }),
    },
  );
  return { response, data: await response.json() };
}

// The dark theme's token block — the default the site renders in, and so the
// palette an installed app's splash screen and browser chrome should match.
const darkBlock = globalsCss.slice(
  globalsCss.indexOf(":root,"),
  globalsCss.indexOf(':root[data-theme="light"]'),
);

/** Resolves a token to a hex, following one level of `var(--other)` aliasing. */
function token(name: string): string {
  const raw = new RegExp(`--${name}:\\s*([^;]+);`).exec(darkBlock);
  if (!raw) throw new Error(`--${name} not found in the dark theme block`);
  const value = raw[1].trim();
  const alias = /^var\(--([\w-]+)\)$/.exec(value);
  return alias ? token(alias[1]) : value;
}

/** Width and height straight from the PNG IHDR chunk (bytes 16-24). */
function pngSize(file: string): { width: number; height: number } {
  const buffer = readFileSync(path.join(__dirname, file));
  expect(buffer.subarray(1, 4).toString("ascii")).toBe("PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

// Bloc 95 (audit SEO Bloc 91/F1): the manifest that makes ML-Helper
// installable on a phone's home screen.
const data = await manifest();

describe("web app manifest", () => {
  it("names the app both in full and in the short form shown under the icon", async () => {
    // Codex review (PR #120): the full name is user-visible text, so it comes
    // from next-intl like everything else — this root document is the one the
    // non-prefixed routes (/admin, /login) get, in the fallback language.
    expect(data.name).toBe(siteTitle("en"));
    expect(data.short_name).toBe("ML-Helper");
    // The short name is what a home screen actually has room for.
    expect(data.short_name!.length).toBeLessThanOrEqual(12);
  });

  it("opens as an app, from the site root", () => {
    expect(data.display).toBe("standalone");
    // "/" and not "/fr": src/proxy.ts redirects the bare root to the visitor's
    // own language, so the installed app is not frozen to one locale.
    expect(data.start_url).toBe("/");
    expect(data.id).toBe("/");
  });

  // Guards the reason these two values exist: they are the site's own tokens.
  // A palette change that left this file behind would show a mismatched splash
  // screen before the first paint, which is exactly what nobody would notice.
  it("takes its colours from the site's dark theme, not from new values", () => {
    expect(data.background_color).toBe(token("bg"));
    expect(data.theme_color).toBe(token("accent"));
  });

  it("lists both icons with the size and MIME type each file really has", () => {
    const icons = data.icons ?? [];
    expect(icons).toHaveLength(2);

    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      // The declared size must match the file on disk: a manifest that lies
      // about its icons gets them rejected or rendered blurry.
      const file = icon.src!.replace(/^\//, "");
      const { width, height } = pngSize(file);
      expect(`${width}x${height}`).toBe(icon.sizes);
      expect(width).toBe(height);
    }

    expect(icons.map((icon) => icon.src)).toEqual([
      "/icon.png",
      "/apple-icon.png",
    ]);
    expect(icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
  });

  it("does not claim maskable, which would clip the shield", () => {
    // The artwork spans ~83% of the square, wider than the 80% safe zone a
    // maskable icon is cropped to. Declaring it would cut the shield's edges.
    for (const icon of data.icons ?? [])
      expect(icon.purpose ?? "any").toBe("any");
  });
});

// Codex review (PR #120): a single manifest can only name the app in one
// language, and the name is what the install prompt shows. Each locale serves
// its own.
describe("per-locale manifest route", () => {
  const locales = ["fr", "en", "de", "es", "tr"];

  it("prerenders one manifest per launched locale", () => {
    expect(generateStaticParams().map((entry) => entry.locale)).toEqual(
      expect.arrayContaining(locales),
    );
  });

  it.each(locales)(
    "names the app in %s, with the manifest media type",
    async (locale) => {
      const { response, data } = await localeManifest(locale);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("manifest+json");
      expect(data.name).toBe(siteTitle(locale));
    },
  );

  it("really does serve five different names", async () => {
    const names = await Promise.all(
      locales.map(async (locale) => (await localeManifest(locale)).data.name),
    );
    // The point of the route: one hardcoded name for all 5 would pass every
    // assertion above that only checks shape.
    expect(new Set(names).size).toBe(locales.length);
  });

  it("changes nothing but the name", async () => {
    const { data: fr } = await localeManifest("fr");
    const root = await manifest();
    expect({ ...fr, name: null }).toEqual({ ...root, name: null });
  });

  it("404s on a locale the site does not have", async () => {
    // notFound() throws Next's NEXT_HTTP_ERROR_FALLBACK;404 signal.
    await expect(localeManifest("it")).rejects.toThrow();
  });
});

describe("installable icon files", () => {
  it("ships the two Next.js file-convention icons at their intended sizes", () => {
    expect(pngSize("icon.png")).toEqual({ width: 192, height: 192 });
    expect(pngSize("apple-icon.png")).toEqual({ width: 512, height: 512 });
  });
});
