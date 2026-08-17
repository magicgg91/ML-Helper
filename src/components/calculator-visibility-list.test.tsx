import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalculatorVisibilityList } from "./calculator-visibility-list";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CalculatorVisibilityList", () => {
  it("disables an active calculator and reflects the saved state", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ id: "calculator-ranking", active: false }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    render(
      <CalculatorVisibilityList
        rows={[
          {
            id: "calculator-ranking",
            slug: "ranking",
            label: "Ranking",
            active: true,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Désactiver" }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/admin/calculators/calculator-ranking",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ active: false }),
        },
      ),
    );
    expect(
      await screen.findByRole("button", { name: "Activer" }),
    ).toBeVisible();
    expect(screen.getByText("Inactif")).toBeVisible();
  });
});
