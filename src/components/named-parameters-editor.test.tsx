import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { defaultCityParameters } from "../lib/city-parameters";
import {
  defaultDemoPercentages,
  defaultXpTiers,
} from "../lib/combat-calculators";
import { defaultGemParameters } from "../lib/gem-parameters";
import { defaultLevelUpParameters } from "../lib/level-up";
import {
  CityParametersEditor,
  DemoAttackTroopsEditor,
  GemParametersEditor,
  LevelUpParametersEditor,
  TemplarParametersEditor,
  XpGainRateEditor,
} from "./named-parameters-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("named formula parameter editors", () => {
  it("edits all shared City progression and league multiplier values", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<CityParametersEditor initial={defaultCityParameters} />);
    expect(screen.getByRole("spinbutton", { name: "Base VP" })).toHaveValue(20);
    expect(
      screen.getByRole("spinbutton", { name: "Légende Multiplicateur Or" }),
    ).toHaveValue(10);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Base VP" }), {
      target: { value: "21" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les paramètres" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).vp.base).toBe(21);
  });
  it("exposes only the named Templar base and ratio", () => {
    render(<TemplarParametersEditor initial={{ base: 150, ratio: 1.3 }} />);
    expect(screen.getByRole("spinbutton", { name: "Base" })).toHaveValue(150);
    expect(screen.getByRole("spinbutton", { name: "Ratio" })).toHaveValue(1.3);
    expect(screen.queryByText(/JSON/i)).toBeNull();
    expect(screen.getByRole("link", { name: "← Retour" })).toHaveAttribute(
      "href",
      "/admin/tools",
    );
  });
  it("sends a guides_manager reaching this editor from Guides back to Guides, not the Outils table they can't view", () => {
    render(
      <TemplarParametersEditor
        initial={{ base: 150, ratio: 1.3 }}
        backHref="/admin/guides"
      />,
    );
    expect(screen.getByRole("link", { name: "← Retour" })).toHaveAttribute(
      "href",
      "/admin/guides",
    );
  });

  it("keeps the 5 XP tiers contiguous when a shared boundary is edited", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<XpGainRateEditor initial={defaultXpTiers} />);
    expect(
      screen.getByRole("spinbutton", { name: "Seuil haut du palier 1" }),
    ).toHaveValue(40);
    expect(screen.getByText("∞")).toBeInTheDocument();

    // Editing tier 1's upper bound must also move tier 2's (shared) lower
    // bound, so the 5 tiers never end up with a gap or an overlap.
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Seuil haut du palier 1" }),
      { target: { value: "45" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Taux XP du palier 2" }),
      { target: { value: "60" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les paramètres" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    const saved = JSON.parse(String(request.mock.calls[0][1]?.body)).tiers;
    expect(saved[0]).toMatchObject({ low: 0, high: 45, rate: 0 });
    expect(saved[1]).toMatchObject({ low: 45, high: 50, rate: 60 });
    expect(saved[4]).toMatchObject({ low: 200, high: null, rate: 200 });
  });

  it("edits the per-league demo-attack percentages", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<DemoAttackTroopsEditor initial={defaultDemoPercentages} />);
    expect(
      screen.getByRole("spinbutton", { name: "Bronze X (% des remparts)" }),
    ).toHaveValue(100);
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Or X (% des remparts)" }),
      { target: { value: "45" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les paramètres" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    const saved = JSON.parse(
      String(request.mock.calls[0][1]?.body),
    ).percentages;
    expect(saved.gold).toBe(45);
    expect(saved.bronze).toBe(100);
  });

  it("edits the per-skill/per-league gem values and purchase prices", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<GemParametersEditor initial={defaultGemParameters} />);
    expect(
      screen.getByRole("spinbutton", { name: "Vitesse · Légende" }),
    ).toHaveValue(15);
    expect(
      screen.getByRole("spinbutton", { name: "Vitesse · Bronze" }),
    ).toHaveValue(2.5);
    expect(
      screen.getByRole("spinbutton", { name: "Prix Légende" }),
    ).toHaveValue(7000);

    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Vitesse · Légende" }),
      { target: { value: "20" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les paramètres" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    const saved = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(saved.skillLeagueValue.rusher.legend).toBe(20);
    expect(saved.skillLeagueValue.rusher.bronze).toBe(2.5);
    expect(saved.gemPrice.legend).toBe(7000);
  });

  it("Bloc36/A: defaults the Gems editor's back link to Tools", () => {
    render(<GemParametersEditor initial={defaultGemParameters} />);
    expect(screen.getByRole("link", { name: "← Retour" })).toHaveAttribute(
      "href",
      "/admin/tools",
    );
  });
  it("Bloc36/A: sends a guides_manager reaching the Gems editor from Guides back to Guides, not the Outils table they can't view", () => {
    render(
      <GemParametersEditor
        initial={defaultGemParameters}
        backHref="/admin/guides"
      />,
    );
    expect(screen.getByRole("link", { name: "← Retour" })).toHaveAttribute(
      "href",
      "/admin/guides",
    );
  });

  it("Bloc35 10.2/10.3: LevelUpParametersEditor uses the same EditorActionBar save banner as the other editors", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<LevelUpParametersEditor initial={defaultLevelUpParameters} />);
    expect(screen.getByRole("link", { name: /Retour/ })).toHaveClass(
      "editor-back-action",
    );
    const saveButton = screen.getByRole("button", {
      name: "Enregistrer les paramètres",
    });
    expect(saveButton).toHaveClass("editor-action-primary");
    fireEvent.click(saveButton);
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request).toHaveBeenCalledWith(
      "/api/admin/guides/references/level-up",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(await screen.findByText("Paramètres enregistrés.")).toBeVisible();
  });

  it("Bloc35 8.1: narrows the per-skill/per-league value columns (never exceed 100%)", () => {
    render(<GemParametersEditor initial={defaultGemParameters} />);
    const valueCell = screen
      .getByRole("spinbutton", { name: "Vitesse · Légende" })
      .closest("td");
    // Bloc 37/F: decoupled from .reference-admin-narrow so its own cells
    // could grow ~50% without narrowing every other admin table with them.
    expect(valueCell).toHaveClass("gems-admin-narrow");
    const priceCell = screen
      .getByRole("spinbutton", { name: "Prix Légende" })
      .closest("td");
    expect(priceCell).not.toHaveClass("gems-admin-narrow");
  });

  it("Bloc35 8.2/8.3: shows the purchase-price fields as a real table with plain league-name headers", () => {
    render(<GemParametersEditor initial={defaultGemParameters} />);
    const priceInput = screen.getByRole("spinbutton", {
      name: "Prix Légende",
    });
    const priceTable = priceInput.closest("table")!;
    expect(priceTable).not.toBeNull();
    const headers = Array.from(priceTable.querySelectorAll("th")).map(
      (th) => th.textContent,
    );
    expect(headers).toEqual(["Argent", "Or", "Platine", "Diamant", "Légende"]);
  });

  it("Bloc35 8.4: renames the purchase-price table's title", () => {
    render(<GemParametersEditor initial={defaultGemParameters} />);
    expect(
      screen.getByText("Prix d’achat des gemmes par ligue (en saphirs)"),
    ).toBeVisible();
  });
});
