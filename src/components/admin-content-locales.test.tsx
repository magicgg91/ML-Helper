import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cleanup, fireEvent, screen } from "@testing-library/react";
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
 * Bloc 125 §9, repris au Bloc 127 : un éditeur offre les langues que ses lignes
 * savent stocker, et aucune autre.
 *
 * Reproduit au navigateur avant d'être corrigé : sur l'onglet DE de la
 * Boutique, taper un nom allemand l'écrivait dans la colonne **anglaise**, le
 * montrait en retour sur l'onglet DE — qui lit la même colonne — et détruisait
 * l'anglais sans un mot. L'onglet était le mensonge ; l'écriture allait bien.
 *
 * Le Bloc 125 avait retiré les trois onglets que le modèle ne pouvait pas
 * tenir. Le Bloc 127 fait l'inverse, dans le bon ordre : le modèle tient
 * maintenant les cinq langues, donc les cinq onglets reviennent — et ce qui est
 * tapé sur chacun s'y range. Les trois écrans encore en paire (Templiers,
 * Équipements, Événements) gardent leurs deux onglets jusqu'aux PR 2 et 3 ;
 * `lib/content-round-trip.test.ts` tient la correspondance écran par écran.
 */

const catalog = {
  intro: [],
  advisors: [
    {
      ...emptyConsumableRow,
      name: { fr: "Commandant", en: "Commander" },
      description: { fr: "Un conseiller.", en: "An advisor." },
    },
  ],
  equipment: [],
  expedition: [],
  inventory: [],
};

const renderEditor = (hiddenLocales?: readonly string[]) => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("{}", { status: 200 }),
  );
  render(
    <ShopReferenceEditor
      initialCatalog={structuredClone(catalog)}
      backHref="/admin/referentiels"
      backLabel="Référentiels"
      title="Boutique"
      hiddenLocales={hiddenLocales}
    />,
  );
};

describe("Bloc 127 : les onglets du contenu de la Boutique", () => {
  it("offre les cinq langues du site, celles que le modèle stocke désormais", () => {
    renderEditor();
    for (const code of launchLocales)
      expect(
        screen.getByRole("button", {
          name: new RegExp(`^${code.toUpperCase()} — `),
        }),
        code,
      ).toBeVisible();
    expect(launchLocales).toHaveLength(5);
  });

  it("montre en pointillés les langues encore à écrire", () => {
    renderEditor();
    const tab = (code: string) =>
      screen.getByRole("button", { name: new RegExp(`^${code} — `) });
    // Écrites : FR et EN. À écrire : DE, ES, TR — et c'est le libellé qui le
    // dit, pas seulement la bordure.
    expect(tab("FR").className).not.toContain("border-dashed");
    expect(tab("DE").className).toContain("border-dashed");
    expect(tab("DE").getAttribute("aria-label")).toMatch(/à créer|to write/i);
  });

  it("garde ce qui est tapé dans une langue quand on change d'onglet", () => {
    renderEditor();
    const name = () => screen.getByLabelText("Nom");
    fireEvent.click(screen.getByRole("button", { name: /^DE — / }));
    fireEvent.change(name(), { target: { value: "Kommandant" } });
    fireEvent.click(screen.getByRole("button", { name: /^EN — / }));
    expect(name()).toHaveValue("Commander");
    fireEvent.click(screen.getByRole("button", { name: /^DE — / }));
    expect(name()).toHaveValue("Kommandant");
  });

  it("dit d'une langue éteinte dans Configuration qu'elle est masquée", () => {
    renderEditor(["tr"]);
    expect(
      screen.getByRole("button", { name: /^TR — .*masquée sur le site/ }),
    ).toBeVisible();
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
