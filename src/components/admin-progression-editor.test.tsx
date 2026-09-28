import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import {
  defaultLevelUpParameters,
  levelUpTroopsAt,
  type LevelUpParameters,
} from "../lib/level-up";
import { formatGameNumber } from "../lib/format";
import { ProgressionEditor } from "./admin-progression-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderEditor(initial: LevelUpParameters = defaultLevelUpParameters) {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(initial), { status: 200 }));
  render(
    <ProgressionEditor
      initial={structuredClone(initial)}
      backHref="/admin/referentiels"
      backLabel="Référentiels"
      title="Progression"
    />,
  );
  return request;
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

describe("Bloc 119: the Progression reference", () => {
  it("saves the XP curve and the troop formulas to the same endpoint", async () => {
    const request = renderEditor();
    fireEvent.change(screen.getByLabelText("Base XP"), {
      target: { value: "60" },
    });
    fireEvent.change(screen.getByLabelText("Bronze Coefficient"), {
      target: { value: "33" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][0]).toBe(
      "/api/admin/guides/references/level-up",
    );
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.xp.base).toBe(60);
    expect(body.troops.bronze.coefficient).toBe(33);
  });

  it("computes level 60 with the public table's own function", () => {
    renderEditor();
    for (const league of ["bronze", "gold", "platinum"] as const) {
      const expected = levelUpTroopsAt(60, league, defaultLevelUpParameters);
      expect(screen.getByTestId(`level-60-${league}`)).toHaveTextContent(
        formatGameNumber(expected!),
      );
    }
  });

  it("scales the gap chip from unremarkable to alert", () => {
    // Bloc 107/A: Bronze 1.245 and Silver 1.243 agree to 0.3% at level 10 and
    // are 10% apart by level 60 — the mistake this column exists to show.
    renderEditor();
    const goldGap = () =>
      screen.getByTestId("level-60-gold").closest("tr")!.lastElementChild!
        .firstElementChild!;
    // Gold set to Bronze's own formula: no gap, and nothing to look at.
    fireEvent.change(screen.getByLabelText("Or Coefficient"), {
      target: { value: "32,2028" },
    });
    fireEvent.change(screen.getByLabelText("Or Ratio"), {
      target: { value: "1,245" },
    });
    expect(goldGap()).toHaveTextContent("0,0 %");
    expect(goldGap().className).toContain("bg-admin-neutral");
    // A gap worth noticing, but not alarming.
    fireEvent.change(screen.getByLabelText("Or Ratio"), {
      target: { value: "1,2455" },
    });
    expect(goldGap().className).toContain("bg-admin-accent-soft");
    // Silver's own ratio typed into Gold: 9.2% short by level 60 — the very
    // mistake Bloc 107/A describes, and still under the alert band.
    fireEvent.change(screen.getByLabelText("Or Ratio"), {
      target: { value: "1,243" },
    });
    expect(goldGap()).toHaveTextContent("-9,2 %");
    expect(goldGap().className).toContain("bg-admin-accent-soft");
    // Past 10%, it is an alert.
    fireEvent.change(screen.getByLabelText("Or Ratio"), {
      target: { value: "1,24" },
    });
    expect(goldGap()).toHaveTextContent("-21,5 %");
    expect(goldGap().className).toContain("bg-admin-warn");
  });

  it("says nothing about Bronze's gap against itself", () => {
    renderEditor();
    const bronze = screen.getByTestId("level-60-bronze").closest("tr")!;
    expect(bronze.lastElementChild).toHaveTextContent("—");
  });

  it("marks a league whose formula nobody has confirmed", () => {
    // Silver ships as {0, 0} — the value that means "not confirmed yet".
    renderEditor();
    const silver = screen.getByTestId("level-60-silver").closest("tr")!;
    expect(silver).toHaveTextContent("Formule de troupes non confirmée");
    expect(screen.getByTestId("level-60-silver")).toHaveTextContent("—");
    fireEvent.change(screen.getByLabelText("Argent Coefficient"), {
      target: { value: "32" },
    });
    fireEvent.change(screen.getByLabelText("Argent Ratio"), {
      target: { value: "1,24" },
    });
    expect(silver).not.toHaveTextContent("Formule de troupes non confirmée");
  });

  it("shows what the route stored, not what was typed into it", async () => {
    // Bloc 107/A: a save the route normalised used to look exactly like one
    // it accepted, and the public table could disagree with this screen
    // indefinitely.
    const stored = structuredClone(defaultLevelUpParameters);
    stored.xp.base = 50;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(stored), { status: 200 }),
    );
    render(
      <ProgressionEditor
        initial={structuredClone(defaultLevelUpParameters)}
        backHref="/admin/referentiels"
        backLabel="Référentiels"
        title="Progression"
      />,
    );
    fireEvent.change(screen.getByLabelText("Base XP"), {
      target: { value: "999" },
    });
    save();
    await waitFor(() =>
      expect(screen.getByLabelText("Base XP")).toHaveValue("50"),
    );
    expect(screen.getByText("✓ Tout est enregistré")).toBeInTheDocument();
  });
});
