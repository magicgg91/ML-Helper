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
});
