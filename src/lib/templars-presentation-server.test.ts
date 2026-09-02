import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

import { normalizeStoredTemplarPresentation } from "./templars-presentation-server";
import {
  defaultTemplarPresentationCatalog,
  type TemplarPresentationRow,
} from "./templars-presentation";
import { templarKeys } from "./player-settings";

const validRow: TemplarPresentationRow = {
  image: "/templars/striker.webp",
  name_fr: "Attaque",
  name_en: "Attack",
  description_fr: "Description",
  description_en: "Description EN",
  temple_base: "20",
  bonus: "0.25",
};

describe("normalizeStoredTemplarPresentation (Bloc 66/B)", () => {
  it("falls back to the seeded defaults when nothing is stored", () => {
    expect(normalizeStoredTemplarPresentation(null)).toEqual(
      defaultTemplarPresentationCatalog,
    );
    expect(normalizeStoredTemplarPresentation(undefined)).toEqual(
      defaultTemplarPresentationCatalog,
    );
  });

  it("passes a fully-stored catalog through losslessly", () => {
    const stored = Object.fromEntries(
      templarKeys.map((key) => [key, { ...validRow }]),
    );
    expect(normalizeStoredTemplarPresentation(stored)).toEqual(stored);
  });

  // A stored value missing one of the 5 keys (e.g. saved before this bloc
  // shipped) falls back to that key's own seeded default row rather than
  // dropping the whole catalog or leaving the row undefined.
  it("recovers a missing key's row from its own seeded default", () => {
    const stored = { striker: { ...validRow } };
    const result = normalizeStoredTemplarPresentation(stored);
    expect(result.striker).toEqual(validRow);
    expect(result.guardian).toEqual(defaultTemplarPresentationCatalog.guardian);
  });

  it("always returns exactly the 5 TemplarKey rows, never more or fewer", () => {
    const result = normalizeStoredTemplarPresentation({
      striker: { ...validRow },
      // An unknown extra key (e.g. stray manual DB edit) is ignored.
      unknown: { ...validRow },
    });
    expect(Object.keys(result).sort()).toEqual([...templarKeys].sort());
  });
});
