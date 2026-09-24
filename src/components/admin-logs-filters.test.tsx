import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLogsFilters } from "./admin-logs-filters";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

afterEach(cleanup);

const messages = {
  admin: {
    logs: {
      start: "Date de début",
      end: "Date de fin",
      "filters-label": "Filtres de l’historique",
      "filter-user": "Utilisateur",
      "filter-user-all": "Tous les utilisateurs",
      "filter-message": "Mot dans le message",
      "filter-message-placeholder": "Un mot du message…",
      "filter-reset": "Réinitialiser",
    },
  },
};

function renderFilters(
  filters: Parameters<typeof AdminLogsFilters>[0]["filters"] = {},
) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdminLogsFilters usernames={["claire", "rootadmin"]} filters={filters} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  replace.mockReset();
  search = "";
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => vi.useRealTimers());

describe("Bloc 119: the audit log's filter bar", () => {
  it("applies a choice immediately, with no Filtrer button to forget", () => {
    renderFilters();
    fireEvent.change(screen.getByLabelText("Utilisateur"), {
      target: { value: "claire" },
    });
    expect(replace).toHaveBeenCalledWith("/admin/logs?user=claire");
  });

  it("waits for a pause in the typing before navigating", () => {
    renderFilters();
    const box = screen.getByRole("searchbox");
    fireEvent.change(box, { target: { value: "gu" } });
    fireEvent.change(box, { target: { value: "gui" } });
    fireEvent.change(box, { target: { value: "guide" } });
    // Three keystrokes, no navigation yet.
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/admin/logs?q=guide");
  });

  it("keeps the other filters when one changes, and starts back at the first page", () => {
    search = "user=claire&page=3";
    renderFilters({ user: "claire" });
    fireEvent.change(screen.getByLabelText("Date de début"), {
      target: { value: "2026-09-01" },
    });
    expect(replace).toHaveBeenCalledWith(
      "/admin/logs?user=claire&from=2026-09-01",
    );
  });

  it("drops a filter that is cleared", () => {
    search = "user=claire";
    renderFilters({ user: "claire" });
    fireEvent.change(screen.getByLabelText("Utilisateur"), {
      target: { value: "" },
    });
    expect(replace).toHaveBeenCalledWith("/admin/logs");
  });

  it("resets everything at once", () => {
    search = "user=claire&q=guide&from=2026-09-01";
    renderFilters({ user: "claire", message: "guide", from: "2026-09-01" });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(replace).toHaveBeenCalledWith("/admin/logs");
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("offers every account as a choice, plus the way back to all of them", () => {
    renderFilters();
    const select = screen.getByLabelText("Utilisateur");
    expect(
      [...select.querySelectorAll("option")].map(
        (option) => option.textContent,
      ),
    ).toEqual(["Tous les utilisateurs", "claire", "rootadmin"]);
  });
});
