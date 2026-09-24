import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { EquipmentStarIncrements } from "../lib/equipment";
import type {
  CombatReferenceRow,
  ExpeditionStarIncrements,
} from "../lib/reference-equipment";
import { EquipmentReferenceEditor } from "./admin-equipment-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const combatRow = (
  overrides: Partial<CombatReferenceRow> = {},
): CombatReferenceRow => ({
  rarity: "Légendaire",
  set_name: "Spirit Fulgur",
  family: "Or",
  skydust: "160",
  gem_slots: "3",
  slot_type: "Arme",
  slot_name: "Marteau",
  skill_1: "Recycleur",
  value_1_pct: "5",
  skill_2: "none",
  value_2_pct: "",
  skill_3: "",
  value_3_pct: "",
  skill_4: "",
  value_4_pct: "",
  ...overrides,
});

const secondaryInitial = {
  rows: [
    {
      key: "mergeCost",
      base: { Commun: 1, Rare: 2, Épique: 3, Mythique: 4, Légendaire: 5 },
    },
    {
      key: "gemSlots",
      base: { Commun: 0, Rare: 1, Épique: 1, Mythique: 2, Légendaire: 3 },
    },
    {
      key: "skydust",
      base: { Commun: 10, Rare: 20, Épique: 30, Mythique: 40, Légendaire: 50 },
    },
  ],
  labels: { mergeCost: { fr: "Fusion", en: "Merge" } },
};

const incrementsInitial = Object.fromEntries(
  [
    "Attaque",
    "Bravoure",
    "Charognard",
    "Défense",
    "Intrépide",
    "Prospérité",
    "Recruteur",
    "Récupération",
    "Recycleur",
    "Vitesse",
  ].map((key) => [key, 1]),
) as unknown as EquipmentStarIncrements;

function renderCombat(rows: CombatReferenceRow[]) {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  render(
    <EquipmentReferenceEditor
      variant="combat"
      initialRows={rows}
      secondaryInitial={secondaryInitial}
      incrementsInitial={incrementsInitial}
      backHref="/admin/referentiels"
      backLabel="Référentiels"
      title="Équipements de Combat"
      usedByTool={{ label: "Équipement de Combat", href: "/admin/tools" }}
    />,
  );
  return request;
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

describe("Bloc 119: the equipment reference editor", () => {
  const rows = [
    combatRow({ slot_type: "Arme", slot_name: "Marteau" }),
    combatRow({ slot_type: "Casque", slot_name: "" }),
    combatRow({ set_name: "Autre Set", family: "Attaque", rarity: "Rare" }),
  ];

  it("groups the rows into the sets they belong to", () => {
    renderCombat(rows);
    expect(screen.getByText("2 sets")).toBeInTheDocument();
    const header = screen.getByRole("button", { name: /^Spirit Fulgur/ });
    expect(header).toHaveTextContent("2 emplacements");
    expect(header).toHaveTextContent("Or");
    expect(header).toHaveTextContent("Légendaire");
  });

  it("counts the values nobody has confirmed, per set", () => {
    renderCombat(rows);
    // Row 1: skill_3, value_3, skill_4, value_4, value_2 empty = 5.
    // Row 2: those 5 plus slot_name = 6. "none" is a decision, not a gap.
    expect(
      screen.getByRole("button", { name: /^Spirit Fulgur/ }),
    ).toHaveTextContent("11 valeurs à confirmer");
  });

  it("names the tool this reference feeds", () => {
    renderCombat(rows);
    expect(
      screen.getByRole("link", {
        name: "Utilisé par l’outil Équipement de Combat",
      }),
    ).toHaveAttribute("href", "/admin/tools");
  });

  it("edits the set's name, family and rarity for every one of its rows", async () => {
    const request = renderCombat(rows);
    fireEvent.click(screen.getByRole("button", { name: /^Spirit Fulgur/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Modifier le set Spirit Fulgur" }),
    );
    fireEvent.change(screen.getByLabelText("Nom du set"), {
      target: { value: "Esprit Fulgur" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const main = request.mock.calls.find(([url]) =>
      String(url).endsWith("/combat-equipment"),
    )!;
    const body = JSON.parse(String(main[1]?.body));
    expect(body[0].set_name).toBe("Esprit Fulgur");
    expect(body[1].set_name).toBe("Esprit Fulgur");
    // The other set is untouched.
    expect(body[2].set_name).toBe("Autre Set");
  });

  it("keeps all four skill columns, because the data fills them", () => {
    // 150 of the 180 shipped rows carry a third skill and 63 a fourth —
    // dropping the columns would make stored game data uneditable.
    renderCombat(rows);
    fireEvent.click(screen.getByRole("button", { name: /^Spirit Fulgur/ }));
    for (const n of [1, 2, 3, 4])
      expect(
        screen.getByLabelText(`Ligne 1 Compétence ${n}`),
      ).toBeInTheDocument();
  });

  it("falls back to row-by-row editing when a set's rows disagree", () => {
    renderCombat([
      combatRow({ set_name: "Mixte", family: "Or" }),
      combatRow({ set_name: "Mixte", family: "Attaque" }),
    ]);
    const header = screen.getByRole("button", { name: /^Mixte/ });
    expect(header).toHaveTextContent("Set incohérent");
    expect(
      screen.queryByRole("button", { name: "Modifier le set Mixte" }),
    ).toBeNull();
    fireEvent.click(header);
    expect(
      screen.getByText(/n’ont pas la même famille ou la même rareté/),
    ).toBeInTheDocument();
    // Family and rarity become per-row fields for this set only.
    expect(screen.getAllByLabelText(/^Ligne \d+ Famille$/)).toHaveLength(2);
  });

  it("filters the sets by what is typed", () => {
    renderCombat(rows);
    fireEvent.change(screen.getByLabelText("Rechercher un set"), {
      target: { value: "autre" },
    });
    expect(screen.getByText("1 set")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Spirit Fulgur/ })).toBeNull();
  });

  it("opens what a filter matched, instead of leaving it folded", () => {
    renderCombat(rows);
    expect(
      screen.getByRole("button", { name: /^Spirit Fulgur/ }),
    ).toHaveAttribute("aria-expanded", "false");
    fireEvent.change(screen.getByLabelText("Rechercher un set"), {
      target: { value: "spirit" },
    });
    expect(
      screen.getByRole("button", { name: /^Spirit Fulgur/ }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps only the sets that still have something to confirm", () => {
    renderCombat([
      combatRow({
        set_name: "Complet",
        slot_name: "Marteau",
        skill_1: "Attaque",
        value_1_pct: "5",
        skill_2: "none",
        value_2_pct: "none",
        skill_3: "none",
        value_3_pct: "none",
        skill_4: "none",
        value_4_pct: "none",
      }),
      combatRow({ set_name: "Incomplet" }),
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "Valeurs à confirmer" }),
    );
    expect(screen.getByText("1 set")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Incomplet/ })).toBeVisible();
  });

  it("saves the bases before the rows, because the rows are stamped from them", async () => {
    const request = renderCombat(rows);
    save();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    const urls = request.mock.calls.map(([url]) => String(url));
    expect(urls[2]).toContain("/combat-equipment");
    expect(urls.slice(0, 2).sort()).toEqual([
      "/api/admin/guides/references/combat-equipment-increments",
      "/api/admin/guides/references/combat-equipment-secondary",
    ]);
  });

  it("edits the indicator label in one language without losing the other", async () => {
    const request = renderCombat(rows);
    expect(screen.getByLabelText("Libellé de l’indicateur 1")).toHaveValue(
      "Fusion",
    );
    fireEvent.click(screen.getByRole("button", { name: /^EN/ }));
    expect(screen.getByLabelText("Libellé de l’indicateur 1")).toHaveValue(
      "Merge",
    );
    fireEvent.change(screen.getByLabelText("Libellé de l’indicateur 1"), {
      target: { value: "Merging" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const secondary = request.mock.calls.find(([url]) =>
      String(url).endsWith("-secondary"),
    )!;
    const body = JSON.parse(String(secondary[1]?.body));
    expect(body[0]).toMatchObject({
      metric_label_fr: "Fusion",
      metric_label_en: "Merging",
    });
  });

  it("names an indicator row nobody has renamed", () => {
    // Three empty label boxes would leave the admin editing anonymous rows;
    // the placeholder is the same name the public page falls back to.
    renderCombat(rows);
    expect(screen.getByLabelText("Libellé de l’indicateur 2")).toHaveAttribute(
      "placeholder",
      "Gemmes",
    );
    // And the numbers of that row are named by it, not by its position.
    expect(screen.getByLabelText("Gemmes Commun")).toHaveValue("0");
    // A row the admin did rename keeps their word.
    expect(screen.getByLabelText("Fusion Commun")).toHaveValue("1");
  });

  it("says it saved in the admin's one save vocabulary", async () => {
    // Not "Référentiel enregistré." — every edit screen says the same thing.
    renderCombat(rows);
    save();
    expect(
      await screen.findByText("Modifications enregistrées."),
    ).toBeInTheDocument();
  });

  it("keeps the sentence about unconfirmed values", () => {
    renderCombat(rows);
    expect(
      screen.getByText(
        "Ne renseigne une valeur inconnue qu’après confirmation en jeu.",
      ),
    ).toBeInTheDocument();
  });
});

describe("Bloc 119: the Expédition variant", () => {
  it("shows its own four columns", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    render(
      <EquipmentReferenceEditor
        variant="expedition"
        initialRows={[
          {
            rarity: "Rare",
            set_name: "Explorateur",
            family: "Or",
            slot: "Cape",
            type_stat_pct: "12",
            secondary_stat_name: "",
            secondary_stat_pct: "",
          },
        ]}
        secondaryInitial={{
          rows: [
            {
              key: "mergeCost",
              base: {
                Commun: 1,
                Rare: 2,
                Épique: 3,
                Mythique: 4,
                Légendaire: 5,
              },
            },
            {
              key: "dismantle",
              base: {
                Commun: 1,
                Rare: 2,
                Épique: 3,
                Mythique: 4,
                Légendaire: 5,
              },
            },
          ],
          labels: {},
        }}
        incrementsInitial={
          {
            Or: 1,
            Troupes: 1,
            Équipement: 1,
            Consommables: 1,
            Vitalité: 1,
            Perception: 1,
            Récupération: 1,
            Vitesse: 1,
            Esquive: 1,
            Chance: 1,
          } as ExpeditionStarIncrements
        }
        backHref="/admin/referentiels"
        backLabel="Référentiels"
        title="Équipements d’Expédition"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Explorateur/ }));
    const table = screen.getByRole("table", { name: "Explorateur" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual([
      "Emplacement",
      "Valeur type (%)",
      "Stat secondaire",
      "Valeur secondaire (%)",
    ]);
  });
});
