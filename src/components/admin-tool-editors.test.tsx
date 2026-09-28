import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { defaultCityParameters } from "../lib/city-parameters";
import {
  defaultDemoPercentages,
  defaultXpTiers,
} from "../lib/combat-calculators";
import { defaultGemParameters } from "../lib/gem-parameters";
import {
  CityParametersEditor,
  DemoAttackTroopsEditor,
  GemParametersEditor,
  XpGainRateEditor,
} from "./admin-tool-editors";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const screenProps = {
  backHref: "/admin/tools",
  backLabel: "Outils",
  title: "Écran",
};

function mockSave() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
const body = (request: ReturnType<typeof mockSave>) =>
  JSON.parse(String(request.mock.calls[0][1]?.body));

describe("Bloc 119: Paramètres Villes partagés", () => {
  // Les trois outils Villes partagent cet éditeur, donc la même href : c'est
  // exactement le cas que le rendu doit tenir (voir le test de clés
  // ci-dessous).
  const sharedTools = [
    { slug: "city-cost", label: "Coût de Ville", href: "/admin/tools" },
    {
      slug: "city-max-level",
      label: "Niveau Max Atteignable",
      href: "/admin/tools",
    },
    { slug: "city-production", label: "Production", href: "/admin/tools" },
  ];

  it("saves the same payload the screen it replaces sent", async () => {
    const request = mockSave();
    render(
      <CityParametersEditor
        initial={defaultCityParameters}
        sharedTools={sharedTools}
        {...screenProps}
      />,
    );
    expect(screen.getByLabelText("Base VP")).toHaveValue("20");
    expect(screen.getByLabelText("Légende Multiplicateur Or")).toHaveValue(
      "10",
    );
    fireEvent.change(screen.getByLabelText("Base VP"), {
      target: { value: "21" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][0]).toBe("/api/admin/tools/city-parameters");
    expect(body(request).vp.base).toBe(21);
    expect(body(request).multipliers.legend.gold).toBe(10);
  });

  it("names the tools whose Modifier opens this very screen", () => {
    render(
      <CityParametersEditor
        initial={defaultCityParameters}
        sharedTools={sharedTools}
        {...screenProps}
      />,
    );
    expect(screen.getByText("Utilisé par 3 outils")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Production" })).toHaveAttribute(
      "href",
      "/admin/tools",
    );
  });

  // Les pastilles étaient keyées sur la href, que les trois outils Villes
  // partagent : React signalait « Encountered two children with the same
  // key » et s'autorisait à en omettre ou en dupliquer. Le slug est ce qui
  // distingue un outil d'un autre.
  it("rend une pastille par outil, même quand tous pointent vers la même page", () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <CityParametersEditor
        initial={defaultCityParameters}
        sharedTools={sharedTools}
        {...screenProps}
      />,
    );
    for (const { label } of sharedTools)
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    expect(
      warn.mock.calls.filter(([first]) => String(first).includes("same key")),
    ).toHaveLength(0);
  });

  it("says nothing is saved until it is, and takes Annuler back", async () => {
    mockSave();
    render(
      <CityParametersEditor
        initial={defaultCityParameters}
        sharedTools={sharedTools}
        {...screenProps}
      />,
    );
    expect(screen.getByText("✓ Tout est enregistré")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Base VP"), {
      target: { value: "21" },
    });
    expect(
      screen.getByText("Modifications non enregistrées"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByLabelText("Base VP")).toHaveValue("20");
    expect(screen.getByText("✓ Tout est enregistré")).toBeInTheDocument();
  });

  it("stops saying it once the save went through", async () => {
    mockSave();
    render(
      <CityParametersEditor
        initial={defaultCityParameters}
        sharedTools={sharedTools}
        {...screenProps}
      />,
    );
    fireEvent.change(screen.getByLabelText("Base VP"), {
      target: { value: "21" },
    });
    save();
    expect(
      await screen.findByText("✓ Tout est enregistré"),
    ).toBeInTheDocument();
  });

  it("reads a comma, which the screen it replaces turned into zero", async () => {
    // `<input type="number">` handed back "" for "1,25", and Number("") is 0.
    const request = mockSave();
    render(
      <CityParametersEditor
        initial={defaultCityParameters}
        sharedTools={sharedTools}
        {...screenProps}
      />,
    );
    fireEvent.change(screen.getByLabelText("Ratio VP"), {
      target: { value: "1,25" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(body(request).vp.ratio).toBe(1.25);
  });
});

describe("Bloc 119: Taux de gain d'XP", () => {
  it("keeps the 5 tiers contiguous when a shared boundary is edited", async () => {
    const request = mockSave();
    render(<XpGainRateEditor initial={defaultXpTiers} {...screenProps} />);
    expect(screen.getByLabelText("Seuil haut du palier 1")).toHaveValue("40");
    expect(screen.getByText("∞")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Seuil haut du palier 1"), {
      target: { value: "45" },
    });
    fireEvent.change(screen.getByLabelText("Taux XP du palier 2"), {
      target: { value: "60" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const saved = body(request).tiers;
    expect(saved[0]).toMatchObject({ low: 0, high: 45, rate: 0 });
    expect(saved[1]).toMatchObject({ low: 45, high: 50, rate: 60 });
    expect(saved[4]).toMatchObject({ low: 200, high: null, rate: 200 });
  });

  it("shows each tier's lower bound without a second field for it", () => {
    render(<XpGainRateEditor initial={defaultXpTiers} {...screenProps} />);
    // Two fields for one number is how the two sides of a boundary drift.
    expect(screen.queryByLabelText(/À partir de/)).toBeNull();
    const rows = screen.getAllByRole("row");
    expect(rows[2]).toHaveTextContent("40");
  });

  it("warns without blocking when the thresholds stop increasing", () => {
    render(<XpGainRateEditor initial={defaultXpTiers} {...screenProps} />);
    expect(screen.queryByText(/pas strictement croissants/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Seuil haut du palier 2"), {
      target: { value: "10" },
    });
    expect(screen.getByText(/pas strictement croissants/)).toBeInTheDocument();
    // Still saveable — these are game data, and the notice is a notice.
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  });
});

describe("Bloc 119: Troupes en attaque démo", () => {
  it("edits the per-league percentages", async () => {
    const request = mockSave();
    render(
      <DemoAttackTroopsEditor
        initial={defaultDemoPercentages}
        {...screenProps}
      />,
    );
    expect(screen.getByLabelText("Bronze X (% des remparts)")).toHaveValue(
      "100",
    );
    fireEvent.change(screen.getByLabelText("Or X (% des remparts)"), {
      target: { value: "45" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(body(request).percentages).toMatchObject({
      gold: 45,
      bronze: 100,
    });
  });
});

describe("Bloc 119: Gemmes", () => {
  it("edits the per-skill/per-league values and the purchase prices", async () => {
    const request = mockSave();
    render(
      <GemParametersEditor initial={defaultGemParameters} {...screenProps} />,
    );
    expect(screen.getByLabelText("Vitesse · Légende")).toHaveValue("15");
    expect(screen.getByLabelText("Vitesse · Bronze")).toHaveValue("2,5");
    expect(screen.getByLabelText("Prix Légende")).toHaveValue("7000");
    fireEvent.change(screen.getByLabelText("Vitesse · Légende"), {
      target: { value: "20" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const saved = body(request);
    expect(saved.skillLeagueValue.rusher.legend).toBe(20);
    expect(saved.skillLeagueValue.rusher.bronze).toBe(2.5);
    expect(saved.gemPrice.legend).toBe(7000);
  });

  it("lines the prices up under the leagues they belong to", () => {
    // Bloc 125 §4: the prices used to be a second, vertical table listing the
    // six leagues all over again, one per row. Reading "how much is a Gold
    // gem" meant finding Gold in a column above and Gold in a row below. One
    // shared column template answers it by position, so the two grids have
    // to be the same grid.
    const { container } = render(
      <GemParametersEditor initial={defaultGemParameters} {...screenProps} />,
    );
    const grids = [
      ...container.querySelectorAll(
        ".grid-cols-\\[180px_repeat\\(6\\,minmax\\(0\\,1fr\\)\\)\\]",
      ),
    ];
    // The header, the ten skill rows, and the one price row.
    expect(grids).toHaveLength(12);
    // One row for the prices, named by the unit, not six rows of one price.
    expect(screen.getByText("Prix (saphirs)")).toBeInTheDocument();
    expect(screen.queryByText("saphirs", { exact: true })).toBeNull();
  });

  // Bloc 126/B reverses Bloc 125 §4 here: this used to assert that Bronze had
  // no field at all, printing a dash instead. The game still sells no Bronze
  // gems, so the field is still empty — but an empty field is something an
  // admin can fill on the day that changes, and a dash is not.
  it("offers Bronze an empty price field rather than a dash", async () => {
    const request = mockSave();
    render(
      <GemParametersEditor initial={defaultGemParameters} {...screenProps} />,
    );
    const bronze = screen.getByLabelText("Prix Bronze");
    expect(bronze).toHaveValue("");
    expect(
      screen.getByText(
        "Le Bronze n’a pas de prix d’achat dans le jeu : laissez le champ vide tant que c’est le cas.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(bronze, { target: { value: "2000" } });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const saved = body(request);
    expect(saved.gemPrice.bronze).toBe(2000);
    // The five leagues that always had a price are untouched by it.
    expect(saved.gemPrice).toMatchObject({
      silver: 3000,
      gold: 4000,
      platinum: 5000,
      diamond: 6000,
      legend: 7000,
    });
  });

  it("shows the formula this screen's numbers feed", () => {
    render(
      <GemParametersEditor initial={defaultGemParameters} {...screenProps} />,
    );
    expect(screen.getByText("Formule")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Valeur de gemme = valeur de base (par compétence et par ligue)",
      ),
    ).toBeInTheDocument();
  });
});

/** Bloc 131/D : le même contrôle sur un second écran d'édition. */
describe("Bloc 131/D — Taux de gain d'XP sans texte d'introduction", () => {
  it("passe du titre au travail, sans phrase entre les deux", () => {
    render(<XpGainRateEditor initial={defaultXpTiers} {...screenProps} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/Les cinq paliers du taux de gain/)).toBeNull();
  });
});
