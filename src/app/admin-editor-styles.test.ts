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
