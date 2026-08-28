import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";

const css = readFileSync("src/app/globals.css", "utf8");

describe("Bloc 38 public reference/homepage styles", () => {
  it("A, D: sizes the Gemmes table's 6 league columns identically and centers them", () => {
    expect(css).toMatch(
      /\.gems-reference-table\s*{\s*table-layout: fixed;/,
    );
    expect(css).toMatch(
      /\.gems-reference-table th,\s*\n\.gems-reference-table td\s*{\s*text-align: center;/,
    );
  });

  it("B, G: Combat/Expedition equipment images and Gemmes' image now share a single 3rem size", () => {
    expect(css).toMatch(/\.reference-equipment-image\s*{\s*display: block;\s*width: 3rem;\s*height: 3rem;/);
  });

  it("C: wraps the Gemmes image and its % value in one inline-flex row", () => {
    expect(css).toMatch(/\.gems-value-row\s*{\s*display: inline-flex;/);
  });

  it("H: the shared category/reference tile image is a strict square", () => {
    expect(css).toMatch(/\.tool-category-image\s*{\s*position: relative;\s*aspect-ratio: 1;/);
  });

  it("I: halves .home-tools' own top margin, leaving .home-guides' untouched", () => {
    expect(css).toMatch(/\.home-tools\s*{\s*margin-top: clamp\(1\.5rem, 4vw, 3\.5rem\);\s*}/);
    expect(css).toMatch(/\.home-guides\s*{\s*margin-top: clamp\(3rem, 8vw, 7rem\);\s*}/);
  });

  it("L: excludes .tools-page-title/.reference-page-title from the generic hero-title rule that was overriding their own font-size clamp", () => {
    const match = css.match(
      /\.hero h1,\s*\n\.public-main > h1([^,{]*),\s*\n\.guide-shell h1\s*{/,
    );
    expect(match).not.toBeNull();
    expect(match![1]).toContain(":not(.tools-page-title)");
    expect(match![1]).toContain(":not(.reference-page-title)");
  });

  it("M: gives Level Up/Templiers/Gemmes' shared table class alternating row colors", () => {
    expect(css).toMatch(
      /\.reference-simple-table tbody tr:nth-child\(even\)\s*{\s*background: var\(--bg-panel-raised\);/,
    );
  });

  it("N: caps the tool-category/reference grid at 4 columns per row instead of a variable auto-fit count", () => {
    expect(css).toMatch(
      /\.tool-category-grid\s*{\s*display: grid;\s*grid-template-columns: repeat\(auto-fit, minmax\(max\(13\.5rem, calc\(\(100% - 3 \* 1rem\) \/ 4\)\), 1fr\)\);/,
    );
  });

  it("P: removes the browser increment/decrement arrows on every admin numeric field", () => {
    expect(css).toMatch(
      /main\.admin-main input\[type="number"\]\s*{\s*appearance: textfield;\s*}/,
    );
    expect(css).toMatch(
      /main\.admin-main input\[type="number"\]::-webkit-inner-spin-button,\s*\nmain\.admin-main input\[type="number"\]::-webkit-outer-spin-button\s*{\s*appearance: none;/,
    );
  });

  it("K: /tools' title and intro sentence are word-for-word the homepage's tools section", () => {
    for (const messages of [frMessages, enMessages]) {
      expect(messages.tools.title).toBe(messages.Home.toolsTitle);
      expect(messages.tools.subtitle).toBe(messages.Home.toolsDescription);
    }
  });

  it("Q: roughly doubles Combat's/Expedition's auxiliary-table numeric fields, scoped to a modifier class", () => {
    expect(css).toMatch(
      /\.reference-admin-wide-inputs \.reference-admin-table input\s*{\s*min-width: 18rem;\s*}/,
    );
    expect(css).toMatch(
      /\.reference-admin-wide-inputs \.reference-admin-grid-field input\s*{\s*width: 100%;\s*min-width: 12rem;/,
    );
  });
});
