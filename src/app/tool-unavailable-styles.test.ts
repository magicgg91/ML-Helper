import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(path.join(__dirname, "globals.css"), "utf8");

function rule(selector: string): string {
  const marker = `${selector} {`;
  const start = globalsCss.indexOf(marker);
  if (start === -1) throw new Error(`rule "${selector}" not found in globals.css`);
  const end = globalsCss.indexOf("}", start);
  return globalsCss.slice(start, end + 1);
}

// Bloc 62/J: the "Bientôt disponible"/"Indisponible actuellement" pattern
// gets a colored asterisk (::before) and colored text (var(--amber-bright))
// instead of plain/muted text — same treatment on both call sites
// (.tool-unavailable: tool-category-grid + reference-switcher-nav;
// .tab-coming-soon: tool-category-nav).
describe("Bloc62/J: colored coming-soon treatment", () => {
  it("colors .tool-unavailable text with the amber-bright token and prefixes a colored asterisk", () => {
    expect(rule(".tool-unavailable")).toContain("var(--amber-bright)");
    expect(rule(".tool-unavailable::before")).toContain('content: "* "');
  });

  it("colors .tab-coming-soon text with the amber-bright token and prefixes a colored asterisk", () => {
    expect(rule(".tab-coming-soon")).toContain("var(--amber-bright)");
    expect(rule(".tab-coming-soon::before")).toContain('content: "* "');
  });
});
