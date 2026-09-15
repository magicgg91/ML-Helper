import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyThemeColor, themeBackground } from "./theme-color";

const globalsCss = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);
// The same two token blocks color-palette.test.ts reads, delimited the same
// way: the default (dark) one, then the [data-theme="light"] override.
const darkBlock = globalsCss.slice(
  globalsCss.indexOf(":root,"),
  globalsCss.indexOf(':root[data-theme="light"]'),
);
const lightBlock = globalsCss.slice(
  globalsCss.indexOf(':root[data-theme="light"]'),
  globalsCss.indexOf(':root[data-theme="light"] body'),
);

function backgroundToken(block: string): string {
  const match = /--bg:\s*(#[0-9a-fA-F]{6});/.exec(block);
  if (!match) throw new Error("--bg not found in the given CSS block");
  return match[1];
}

function themeColorContent(): string | null {
  return document
    .querySelector('meta[name="theme-color"]')
    ?.getAttribute("content") as string | null;
}

describe("theme-color", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  // Bloc 103: the status bar of an installed iOS app is painted from this
  // colour. Naming a colour the page does not actually render is how the
  // strip ends up a different shade from the page under it — and, before a
  // colour was named at all, how iOS 26+ fell back to blurring the page's own
  // top edge instead.
  it("names the page background of each theme, as globals.css defines it", () => {
    expect(themeBackground.dark).toBe(backgroundToken(darkBlock));
    expect(themeBackground.light).toBe(backgroundToken(lightBlock));
    // Guards the slicing above: two identical blocks would pass the pair of
    // assertions while comparing the dark theme against itself.
    expect(themeBackground.dark).not.toBe(themeBackground.light);
  });

  it("creates the tag when the document carries none yet", () => {
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
    applyThemeColor("light");
    expect(themeColorContent()).toBe(themeBackground.light);
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(
      1,
    );
  });

  it("rewrites the tag the server sent, rather than adding a second one", () => {
    const served = document.createElement("meta");
    served.setAttribute("name", "theme-color");
    served.setAttribute("content", themeBackground.dark);
    document.head.appendChild(served);

    applyThemeColor("light");

    // A second tag would leave the browser reading whichever it prefers, so
    // the theme could stay stuck on the served colour.
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(
      1,
    );
    expect(themeColorContent()).toBe(themeBackground.light);
    applyThemeColor("dark");
    expect(themeColorContent()).toBe(themeBackground.dark);
  });
});
