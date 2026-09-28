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

/**
 * Bloc 131/C : la deuxième règle d'élément nu que globals.css applique aux
 * champs, et qui n'avait pas reçu l'exclusion du Bloc 125 §2.
 *
 * Même mécanique, autres propriétés : non layée, elle battait toutes les
 * classes utilitaires de l'admin (`@layer utilities`) quelle que soit leur
 * spécificité. Mesuré au navigateur avant le correctif, sur Classement,
 * Utilisateurs et Configuration : chaque `input`/`select` de l'admin sortait
 * en `1px solid #d3d6dd`, rayon 8,8 px, fond blanc, quelles que soient ses
 * classes — donc aussi les trois états du champ numérique, y compris le
 * contour rouge d'un champ refusé. Après : `#dcdfe7`, rayon 8 px, et le
 * rouge quand il y a lieu.
 *
 * C'est pour ça que ce fichier existe : une règle de ce genre se lit juste
 * et ne rend rien, et rien dans jsdom ne s'en aperçoit.
 */
describe("Bloc 131/C: the form-control box reset", () => {
  const reset = globals.match(
    /select:where\(:not\(\.admin-shell select\)\),\ninput:where[\s\S]*?\n}/,
  )?.[0];

  it("excludes the admin through :where(), like the font reset above it", () => {
    expect(
      reset,
      "the box reset no longer looks the way this test expects",
    ).toBeDefined();
    // Les déclarations qui écrasaient les utilitaires de l'admin.
    expect(reset).toMatch(/border: 1px solid var\(--border\);/);
    expect(reset).toMatch(/border-radius: 0\.55rem;/);
    expect(reset).toMatch(/color: var\(--foreground\);/);
    for (const element of ["input", "select"])
      expect(reset).toContain(
        `${element}:where(:not(.admin-shell ${element}))`,
      );
    // Un `:not()` nu la ferait monter à 0-1-2 et passer devant les règles
    // de composant du site public, qui sont à 0-1-1 (Bloc 125 §2).
    expect(reset).not.toMatch(/(^|\n)(input|select):not\(/);
  });

  // Plus aucune règle d'élément nu ne doit viser les champs sans exclure
  // l'admin : c'est la classe entière de bug, pas cette règle-là seulement.
  it("leaves no bare input/select rule without the exclusion", () => {
    for (const [, selector] of globals.matchAll(
      /(?<=\n)((?:(?:input|select|textarea)[^,{\n]*,\n)*(?:input|select|textarea)[^,{\n]*) \{/g,
    ))
      expect(selector, selector).toContain(".admin-shell");
  });
});
