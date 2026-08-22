import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(path.join(__dirname, "globals.css"), "utf8");
const adminCss = readFileSync(path.join(__dirname, "admin/admin.css"), "utf8");

describe("color palette — violet accent, gold reserved for legendary", () => {
  it("points --accent and --accent-strong at violet, not gold, in both themes", () => {
    const darkBlock = globalsCss.slice(
      globalsCss.indexOf(":root,"),
      globalsCss.indexOf(':root[data-theme="light"]'),
    );
    const lightBlock = globalsCss.slice(
      globalsCss.indexOf(':root[data-theme="light"]'),
      globalsCss.indexOf(':root[data-theme="light"] body'),
    );
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
});
