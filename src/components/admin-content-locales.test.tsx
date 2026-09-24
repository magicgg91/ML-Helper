import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { ShopReferenceEditor } from "./admin-shop-editor";
import { emptyConsumableRow } from "../lib/consumables";
import { launchLocales } from "../lib/launch-locales.generated";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Bloc 125 §9: an editor offers the languages its rows have columns for, and
 * no others.
 *
 * Reproduced in a browser before this was written: on the Boutique's DE tab,
 * typing a German name saved it into the English column, showed it back on
 * the DE tab — which reads the same column — and destroyed the English text
 * with nothing said anywhere. The tab was the lie; the write was fine.
 */

const catalog = {
  intro: [],
  advisors: [
    {
      ...emptyConsumableRow,
      name_fr: "Commandant",
      name_en: "Commander",
      description_fr: "Un conseiller.",
      description_en: "An advisor.",
    },
  ],
  equipment: [],
  expedition: [],
  inventory: [],
};

describe("Bloc 125 §9: the tabs of fr/en content", () => {
  it("offers French and English, and not the three languages it cannot store", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    render(
      <ShopReferenceEditor
        initialCatalog={structuredClone(catalog)}
        backHref="/admin/referentiels"
        backLabel="Référentiels"
        title="Boutique"
      />,
    );
    expect(
      screen.getByRole("button", { name: /^FR — Français/ }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^EN — English/ })).toBeVisible();
    for (const name of [/^DE/, /^ES/, /^TR/])
      expect(screen.queryByRole("button", { name })).toBeNull();
    // The five launch languages still exist — they are simply not what this
    // particular content is stored in.
    expect(launchLocales).toHaveLength(5);
  });

  it("leaves no editor collapsing a language onto another", async () => {
    // The shape of the bug, as a pattern: mapping any locale that is not
    // French onto the English field. If it comes back anywhere, it comes back
    // with the data loss.
    const components = path.join(process.cwd(), "src/components");
    const offenders: string[] = [];
    for (const entry of await readdir(components)) {
      if (!/^admin-.*\.tsx$/.test(entry) || /\.test\.tsx$/.test(entry))
        continue;
      const source = await readFile(path.join(components, entry), "utf8");
      if (/===\s*"fr"\s*\?\s*"fr"\s*:\s*"en"/.test(source))
        offenders.push(entry);
    }
    expect(offenders).toEqual([]);
  });
});
