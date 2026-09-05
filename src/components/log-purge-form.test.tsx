import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogPurgeForm } from "./log-purge-form";
import { renderWithIntl as render } from "../test/render-with-intl";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LogPurgeForm", () => {
  it("renders the purge action as a destructive shadcn Button", () => {
    render(<LogPurgeForm />);
    const button = screen.getByRole("button", { name: "Purger la plage" });
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("purges the selected range and reports the result", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(<LogPurgeForm />);
    fireEvent.change(screen.getByLabelText("Date de début"), {
      target: { value: "2026-01-01T00:00" },
    });
    fireEvent.change(screen.getByLabelText("Date de fin"), {
      target: { value: "2026-01-02T00:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Purger la plage" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/logs",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(await screen.findByText("Historique purgé")).toBeVisible();
  });

  it("reports a server failure without crashing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 500 }),
    );
    render(<LogPurgeForm />);
    fireEvent.change(screen.getByLabelText("Date de début"), {
      target: { value: "2026-01-01T00:00" },
    });
    fireEvent.change(screen.getByLabelText("Date de fin"), {
      target: { value: "2026-01-02T00:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Purger la plage" }));
    expect(
      await screen.findByText("Impossible de purger l’historique"),
    ).toBeVisible();
  });
});
