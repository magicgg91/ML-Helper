import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync("src/app/globals.css", "utf8");
const admin = readFileSync("src/app/admin/admin.css", "utf8");

/**
 * Bloc 125 §2, and Codex review (PR #149): the form-control font reset gets
 * out of the admin's way without getting in the public site's.
 *
 * Two opposite failures, one line apart. Left as `button, input, select`, the
 * reset is unlayered and so beats every Tailwind utility in the admin
 * whatever its specificity — "Enregistrer" rendered 14px/400 against classes
 * asking 14px/600. Written as a bare `:not(.admin-shell button)` to exclude
 * the admin, it climbs to 0-1-2 and starts beating the *public* component
 * rules, which are 0-1-1 — a league button went 12.48px → 16px and a stepper
 * button 15px monospace → 12.48px sans, measured on /fr/tools.
 *
 * `:where()` is what threads it: it contributes nothing to specificity, so
 * the reset stays exactly where it was and simply stops matching the admin.
 */
describe("Bloc 125: the form-control font reset", () => {
  const reset = globals.match(
    /button:where\(:not\(\.admin-shell button\)\),[\s\S]*?\n}/,
  )?.[0];

  it("excludes the admin through :where(), so its specificity is unchanged", () => {
    expect(
      reset,
      "the reset no longer looks the way this test expects",
    ).toBeDefined();
    expect(reset).toMatch(/font: inherit;/);
    // The three selectors, each wrapping its exclusion.
    for (const element of ["button", "input", "select"])
      expect(reset).toContain(
        `${element}:where(:not(.admin-shell ${element}))`,
      );
    // A bare :not() would raise it to 0-1-2 and outrank the public rules.
    expect(reset).not.toMatch(/(^|\n)(button|input|select):not\(/);
  });

  it("is the public component rules it must not outrank", () => {
    // The ones measured as broken, so this test names real casualties rather
    // than a hypothetical class.
    for (const selector of [
      ".family-buttons button",
      ".num-stepper button",
      ".calculator-tabs button",
    ])
      expect(globals, `${selector} is gone — check what replaced it`).toContain(
        selector,
      );
  });

  it("says the same thing for the admin from inside a cascade layer", () => {
    // Layered, so Tailwind's utilities (@layer utilities) still win over it.
    const layered = admin.match(/@layer base \{[\s\S]*?\n\}/)?.[0];
    expect(layered).toBeDefined();
    expect(layered).toContain(
      ".admin-shell :is(button, input, select, textarea)",
    );
    expect(layered).toContain("font: inherit;");
  });
});

describe("Bloc 125 §3: the layer a drawer's own popover opens on", () => {
  it("sits above the drawer, which sits above an ordinary popover", () => {
    const step = (name: string) =>
      Number(admin.match(new RegExp(`--z-${name}: (\\d+);`))?.[1]);
    // Codex review (PR #149): the account menu is rendered inside the drawer
    // below 1024 px, and portalled out of it. On the plain popover step it
    // opened *under* the drawer — measured: elementFromPoint on its own
    // "Mon compte" entry returned the drawer — which left /admin/account,
    // whose only entrance that menu is, unreachable on a phone.
    expect(step("popover")).toBeLessThan(step("drawer"));
    expect(step("drawer")).toBeLessThan(step("drawer-popover"));
    // …and a dialog still comes out above all of them: a confirmation is a
    // question about what the menu just did.
    expect(step("drawer-popover")).toBeLessThan(step("dialog"));
    expect(step("dialog")).toBeLessThan(step("toast"));
  });
});
