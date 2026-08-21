import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalculatorVisibilityList } from "./calculator-visibility-list";
import { renderWithIntl as render } from "../test/render-with-intl";

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
            editHref: "/admin/tools/ranking",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Désactiver" }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/admin/tools/calculator-ranking",
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

  it("does not expose mutations in read-only mode", () => {
    render(
      <CalculatorVisibilityList
        canToggle={false}
        rows={[
          {
            id: "calculator-ranking",
            slug: "ranking",
            label: "Ranking",
            active: true,
            editHref: "/admin/tools/ranking",
          },
        ]}
      />,
    );
    expect(screen.getByText("Ranking")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
