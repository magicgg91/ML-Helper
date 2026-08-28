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
  it("narrows .reference-admin-narrow to a 2-4 character width, tighter than the Bloc 35 pass", () => {
    const rule = css.match(
      /\.reference-admin-narrow input,\s*\n\.reference-admin-narrow select\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 3\.25rem;/);
  });
});

describe("Bloc37/F: the Gems admin value grid is sized independently, ~50% bigger", () => {
  it("gives .gems-admin-narrow its own width, decoupled from .reference-admin-narrow", () => {
    const rule = css.match(
      /\.gems-admin-narrow input,\s*\n\.gems-admin-narrow select\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 6\.75rem;/);
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
