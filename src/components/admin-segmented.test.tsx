import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminSegmented } from "./admin-segmented";

afterEach(cleanup);

/**
 * Bloc 141 : le mode pleine largeur du contrôle segmenté.
 *
 * Les dimensions réelles se mesurent au navigateur (phase-one, « Bloc 141 ») —
 * jsdom n'a pas de mise en page. Ce qui se tient ici, c'est l'API : le mode
 * est optionnel, et sans lui le groupe garde la forme compacte dont la paire
 * de langues de la barre latérale a besoin.
 */
describe("AdminSegmented", () => {
  const options = [24, 48, 72] as const;

  function renderSegmented(fill: boolean) {
    render(
      <AdminSegmented
        fill={fill}
        label="Durée"
        onChange={() => {}}
        options={options}
        optionLabel={(hours) => `${hours}h`}
        value={48}
      />,
    );
    return screen.getByRole("group", { name: "Durée" });
  }

  it("fills its container and shares it equally between the options", () => {
    const group = renderSegmented(true);
    expect(group.className).toContain("w-full");
    expect(group.className).not.toContain("inline-flex");
    for (const button of within(group).getAllByRole("button")) {
      expect(button.className).toContain("flex-1");
      // Le plancher de largeur reste : `flex-1` le fait grandir, pas rétrécir.
      expect(button.className).toContain("min-w-9");
    }
  });

  it("stays content-sized without the mode, which is what the sidebar needs", () => {
    const group = renderSegmented(false);
    expect(group.className).toContain("inline-flex");
    expect(group.className).not.toContain("w-full");
    for (const button of within(group).getAllByRole("button")) {
      expect(button.className).not.toContain("flex-1");
    }
  });

  it("says which option is on, in either mode", () => {
    const group = renderSegmented(true);
    expect(within(group).getByRole("button", { name: "48h" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(group).getByRole("button", { name: "24h" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
