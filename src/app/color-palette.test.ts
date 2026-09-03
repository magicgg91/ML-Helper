import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(path.join(__dirname, "globals.css"), "utf8");
const adminCss = readFileSync(path.join(__dirname, "admin/admin.css"), "utf8");

const darkBlock = globalsCss.slice(
  globalsCss.indexOf(":root,"),
  globalsCss.indexOf(':root[data-theme="light"]'),
);
const lightBlock = globalsCss.slice(
  globalsCss.indexOf(':root[data-theme="light"]'),
  globalsCss.indexOf(':root[data-theme="light"] body'),
);

function extractHex(block: string, name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`).exec(block);
  if (!match) throw new Error(`--${name} not found in the given CSS block`);
  return match[1];
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return {
    h: Math.round(h * 60),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Blue-slate/anthracite range: wide enough to allow the existing palette's
// hue (~214-220°) while still excluding brown (~20-40°) and the violet
// accent's own hue (~260-280°) from ever being used for a background.
const blueSlateHueRange = { min: 190, max: 250 };

describe("color palette — violet accent, gold reserved for legendary", () => {
  it("points --accent and --accent-strong at violet, not gold, in both themes", () => {
    for (const block of [darkBlock, lightBlock]) {
      expect(block).toMatch(/--accent:\s*var\(--violet\);/);
      expect(block).toMatch(/--accent-strong:\s*var\(--violet-bright\);/);
    }
  });

  it("shares the same accent tokens between the admin shell and the public site", () => {
    expect(adminCss).toMatch(/--color-primary:\s*var\(--accent-strong\);/);
    expect(adminCss).toMatch(/--color-ring:\s*var\(--accent\);/);
  });

  it("never uses --gold or --gold-bright as a generic interface color", () => {
    // The site's own rarity system (.rarity-legendaire) uses its own
    // dedicated --rarity-legendaire token and hardcoded badge colors, not
    // --gold — so no selector should reference var(--gold) or
    // var(--gold-bright) at all. Catches gold creeping back in as a hover/
    // active/link accent instead of staying reserved for legendary data.
    expect(globalsCss).not.toMatch(/var\(--gold(-bright)?\)/);
    expect(adminCss).not.toMatch(/var\(--gold(-bright)?\)/);
  });

  it("still defines --gold and --gold-bright, reserved for legendary data", () => {
    expect(globalsCss).toMatch(/--gold:\s*#[0-9a-fA-F]{6};/);
    expect(globalsCss).toMatch(/--gold-bright:\s*#[0-9a-fA-F]{6};/);
  });

  it("keeps the dark theme a blue-slate anthracite, never pure black or brown", () => {
    for (const name of ["bg", "bg-panel", "bg-panel-raised", "surface-muted"]) {
      const { h, l } = hexToHsl(extractHex(darkBlock, name));
      expect(l).toBeGreaterThan(0);
      expect(h).toBeGreaterThanOrEqual(blueSlateHueRange.min);
      expect(h).toBeLessThanOrEqual(blueSlateHueRange.max);
    }
  });

  it("drops the gold-tinted ambient page gradient in favor of violet", () => {
    // rgb(201 160 74 / ...) was --gold (dark); the ambient wash behind the
    // whole page must not carry a warm/golden tint any more.
    expect(globalsCss).not.toMatch(/rgb\(201 160 74/);
  });

  it("keeps the light theme tinted (never pure white), same blue family as dark", () => {
    for (const name of ["bg", "bg-panel", "bg-panel-raised", "surface-muted"]) {
      const hex = extractHex(lightBlock, name);
      expect(hex.toLowerCase()).not.toBe("#ffffff");
      const { h, s } = hexToHsl(hex);
      expect(s).toBeGreaterThan(0);
      expect(h).toBeGreaterThanOrEqual(blueSlateHueRange.min);
      expect(h).toBeLessThanOrEqual(blueSlateHueRange.max);
    }
  });

  it("Bloc 34/F: lightens the dark theme's background family by one notch, same hue", () => {
    // A 2nd tester pass asked for the dark navy/anthracite background to be
    // a little brighter — not a retint, not a jump to a light background.
    // Locks in the exact tokens agreed on, and checks each new hue matches
    // its pre-Bloc-34 value exactly, so a future change can't silently
    // drift the hue while "just" nudging lightness.
    const before: Record<string, string> = {
      bg: "#12151b",
      "bg-panel": "#191d25",
      "bg-panel-raised": "#20252f",
      border: "#2b313d",
      "surface-muted": "#252a34",
    };
    const after: Record<string, string> = {
      bg: "#1b2029",
      "bg-panel": "#222833",
      "bg-panel-raised": "#29303d",
      border: "#343c4a",
      "surface-muted": "#2f3541",
    };
    for (const name of Object.keys(after)) {
      expect(extractHex(darkBlock, name).toLowerCase()).toBe(after[name]);
      const beforeHsl = hexToHsl(before[name]!);
      const afterHsl = hexToHsl(after[name]!);
      // 8-bit hex quantization can shift the rounded hue by a degree even
      // when the underlying color math kept it fixed — same navy family,
      // not a retint, is what actually matters here.
      expect(Math.abs(afterHsl.h - beforeHsl.h)).toBeLessThanOrEqual(2);
      expect(afterHsl.l).toBeGreaterThan(beforeHsl.l);
    }
  });

  // Bloc 81/B: the event picker's 10 swatches (Bloc 80/F) read as "too dark"
  // in practice because they reused the shared --violet/--emerald/etc.
  // tokens, tuned for their own jobs elsewhere (accent, success, badges) —
  // not for standing alone as vivid, distinct color-tag options. A
  // dedicated --event-* namespace (theme-invariant, defined once) replaces
  // them; this locks in genuine vividness (high saturation, mid-to-high
  // lightness — never the murky/desaturated end of the scale) for all 10.
  it("Bloc 81/B: the --event-* palette (event-color picker) is genuinely vivid — high saturation, never dark or muted", () => {
    const names = [
      "violet",
      "emerald",
      "amber",
      "ember",
      "sapphire",
    ].flatMap((base) => [`event-${base}`, `event-${base}-bright`]);
    expect(names).toHaveLength(10);
    for (const name of names) {
      // Emerald's own hue reads darker/less saturated than the other 4 at
      // equal HSL numbers (a property of green, not a palette flaw) — the
      // bounds are set loose enough to hold for all 10 while still ruling
      // out anything genuinely dark (l < 30) or washed-out (s < 55).
      const { s, l } = hexToHsl(extractHex(darkBlock, name));
      expect(s, name).toBeGreaterThanOrEqual(55);
      expect(l, name).toBeGreaterThanOrEqual(30);
      expect(l, name).toBeLessThanOrEqual(80);
    }
  });

  // The tokens are defined once (theme-invariant, no light-theme override)
  // — this is what actually fixes the tester's complaint, since the old
  // shared tokens' light-theme "-bright" variants are deliberately DARKER
  // (for text contrast), the opposite of vivid for a standalone swatch.
  it("Bloc 81/B: the --event-* tokens are theme-invariant — no light-theme override to go dark", () => {
    expect(lightBlock).not.toMatch(/--event-/);
  });

  it("Bloc 34/F: keeps WCAG AA text contrast after the dark-theme brightness bump", () => {
    const luminance = (hex: string) => {
      const value = Number.parseInt(hex.slice(1), 16);
      const channels = [
        (value >> 16) & 255,
        (value >> 8) & 255,
        value & 255,
      ].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    };
    const contrast = (foreground: string, background: string) => {
      const [lighter, darker] = [
        luminance(foreground),
        luminance(background),
      ].sort((a, b) => b - a);
      return (lighter! + 0.05) / (darker! + 0.05);
    };
    const text = extractHex(darkBlock, "text");
    for (const background of ["bg", "bg-panel", "bg-panel-raised"]) {
      expect(
        contrast(text, extractHex(darkBlock, background)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
