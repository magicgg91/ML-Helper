import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("static translation database cleanup", () => {
  it("keeps tool, formula and reference labels exclusively in next-intl", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const calculator = schema.match(/model Calculator \{([\s\S]*?)\n\}/)?.[1];
    const formula = schema.match(/model Formula \{([\s\S]*?)\n\}/)?.[1];
    const reference = schema.match(
      /model ReferenceTable \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(calculator).not.toMatch(/^\s+name\s/m);
    expect(formula).not.toMatch(/^\s+label\s/m);
    expect(reference).not.toMatch(/^\s+label\s/m);
  });
});
