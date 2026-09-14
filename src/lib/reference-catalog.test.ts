import { describe, expect, it } from "vitest";
import {
  referenceCatalog,
  referenceHref,
  toolHref,
  toolTab,
  toolTabs,
} from "./reference-catalog";

describe("referenceHref", () => {
  it("builds a reference URL for every catalog entry", () => {
    for (const entry of referenceCatalog)
      expect(referenceHref(entry.slug)).toBe(`/referentiels/${entry.slug}`);
  });
});

// Bloc 93/M4: the `?open=<tab>` contract (Bloc 53/F) used to live only in
// string literals spread across 5 reference components, with nothing tying
// them to the tabs the tool pages accept.
describe("toolHref", () => {
  it("builds the deep link the tool pages parse", () => {
    expect(toolHref("competences", "simulator")).toBe(
      "/tools/competences?open=simulator",
    );
    expect(toolHref("competences", "expedition")).toBe(
      "/tools/competences?open=expedition",
    );
    expect(toolHref("competences", "gems")).toBe(
      "/tools/competences?open=gems",
    );
    expect(toolHref("competences", "templars")).toBe(
      "/tools/competences?open=templars",
    );
    expect(toolHref("combat", "xp")).toBe("/tools/combat?open=xp");
    expect(toolHref("combat", "demo")).toBe("/tools/combat?open=demo");
  });

  it("covers every declared tab, so none is left unreachable", () => {
    for (const [slug, tabs] of Object.entries(toolTabs))
      for (const tab of tabs)
        expect(toolHref(slug as keyof typeof toolTabs, tab as never)).toBe(
          `/tools/${slug}?open=${tab}`,
        );
  });
});

describe("toolTab", () => {
  it("accepts a tab the tool actually has", () => {
    expect(toolTab("combat", "xp")).toBe("xp");
    expect(toolTab("competences", "templars")).toBe("templars");
  });

  it("rejects a tab belonging to another tool", () => {
    // The value is a real tab name — just not one of Combat's. Before the
    // shared table, each page repeated its own list and could drift from it.
    expect(toolTab("combat", "templars")).toBeUndefined();
    expect(toolTab("competences", "xp")).toBeUndefined();
  });

  it("rejects unknown, absent and repeated query values", () => {
    expect(toolTab("combat", "nope")).toBeUndefined();
    expect(toolTab("combat", undefined)).toBeUndefined();
    // Next gives an array when the parameter appears more than once.
    expect(toolTab("combat", ["xp", "demo"])).toBeUndefined();
  });
});
