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

  it("edits the gem skill/league factors and purchase prices", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<GemParametersEditor initial={defaultGemParameters} />);
    expect(
      screen.getByRole("spinbutton", { name: "Facteur Vitesse" }),
    ).toHaveValue(2.5);
    expect(
      screen.getByRole("spinbutton", { name: "Facteur Légende" }),
    ).toHaveValue(6);
    expect(
      screen.getByRole("spinbutton", { name: "Prix Légende" }),
    ).toHaveValue(7000);

    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Facteur Vitesse" }),
      { target: { value: "3" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les paramètres" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    const saved = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(saved.skillFactor.rusher).toBe(3);
    expect(saved.leagueFactor.legend).toBe(6);
    expect(saved.gemPrice.legend).toBe(7000);
  });
});
