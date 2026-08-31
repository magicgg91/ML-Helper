import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

describe("Bloc35 10.1: .primary-button has a real, visible base style", () => {
  it("defines border/background/color, not just browser defaults", () => {
    const rule = css.match(
      /(?<!\.editable-reference > )\.primary-button\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/border: 1px solid/);
    expect(rule).toMatch(/background:/);
    expect(rule).toMatch(/color:/);
  });

  it("matches the Templiers editor's reference style (.editor-action-primary)", () => {
    const primaryButton = css.match(
      /(?<!\.editable-reference > )\.primary-button\s*{([\s\S]*?)\n}/,
    )?.[1];
    const editorActionPrimary = css.match(
      /\.editor-action-primary\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(primaryButton).toBeDefined();
    expect(editorActionPrimary).toBeDefined();
    // Same accent border/background/foreground tokens, so a save button
    // looks identical whether it lives in an EditorActionBar or is a bare
    // .primary-button (EditableReferenceTable, LevelUp, setup form).
    expect(primaryButton).toMatch(/border: 1px solid var\(--accent\)/);
    expect(editorActionPrimary).toMatch(/border-color: var\(--accent\)/);
    expect(primaryButton).toMatch(/color: var\(--accent-strong\)/);
    expect(editorActionPrimary).toMatch(/color: var\(--accent-strong\)/);
  });
});

describe("Bloc37/A: numeric % columns are sized to their content, not the wide default", () => {
  it("narrows .reference-admin-narrow to a fixed compact width", () => {
    const rule = css.match(
      /\.reference-admin-narrow input,\s*\n\.reference-admin-narrow select\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(rule).toBeDefined();
    // Bloc 42/H: one canonical width for every "compact admin numeric
    // field" screen — folded from the Bloc 37/F Gems-specific 6.75rem and
    // the Bloc 40/C 6.5rem back into a single value (the wider, already
    // Gems-proven one) instead of maintaining two near-identical classes.
    expect(rule).toMatch(/width: 6\.75rem;/);
  });
});

describe("Bloc42/H: the compact admin numeric field is one shared class, not a per-screen fork", () => {
  it("retires .gems-admin-narrow — Gems shares .reference-admin-narrow with every other admin table", () => {
    expect(css).not.toMatch(/\.gems-admin-narrow\s*(input|select|{)/);
  });
});

describe("Bloc42/G: a wide table panel never forces a sibling panel (e.g. Consumables' markdown editor) to widen with it", () => {
  it("lets .admin-panel shrink below its content's intrinsic width (min-width: 0)", () => {
    const rule = css.match(/\.admin-panel\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/min-width:\s*0;/);
  });
});

describe("Bloc37/B, D: the admin filter row sizes selects to their content", () => {
  it("does not stretch .reference-admin-filters selects to fill the row (no width: 100%)", () => {
    const rule = css.match(
      /\.reference-admin-filters select\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: auto;/);
    expect(rule).toMatch(/max-width:/);
  });

  it("keeps the public reference-filters row's own layout (family/rarity, Bloc 39) unaffected by the admin filter row", () => {
    const rule = css.match(/^\.reference-filters\s*{([\s\S]*?)\n}/m)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/grid-template-columns: 1fr 1fr;/);
  });
});

describe("Bloc37/C: the increments field grid lays out exactly 2 rows, no overlap", () => {
  it("uses a fixed 5-column grid for the 10 increment fields, not auto-fill", () => {
    const rule = css.match(/\.reference-admin-grid-row\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/repeat\(5,/);
    expect(rule).not.toMatch(/auto-fill/);
  });
});

describe("Bloc35 10.4: admin select/numeric-value fields are horizontally centered", () => {
  it("centers every <select> and numeric <input> under .admin-main", () => {
    const rule = css.match(
      /main\.admin-main select,\s*\nmain\.admin-main input\[type="number"\]\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/text-align: center;/);
  });

  it("does not blanket-center free-text inputs (e.g. set names)", () => {
    // The centering rule is scoped to selects and type="number" inputs
    // specifically — it must not also match a bare `input` selector that
    // would sweep up text fields.
    expect(css).not.toMatch(/main\.admin-main input\s*{\s*text-align: center/);
  });
});
