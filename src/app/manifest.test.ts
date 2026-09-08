import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const globalsCss = readFileSync(path.join(__dirname, "globals.css"), "utf8");

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
describe("web app manifest", () => {
  const data = manifest();

  it("names the app both in full and in the short form shown under the icon", () => {
    expect(data.name).toBe("ML-Helper — Outils Million Lords");
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

describe("installable icon files", () => {
  it("ships the two Next.js file-convention icons at their intended sizes", () => {
    expect(pngSize("icon.png")).toEqual({ width: 192, height: 192 });
    expect(pngSize("apple-icon.png")).toEqual({ width: 512, height: 512 });
  });
});
