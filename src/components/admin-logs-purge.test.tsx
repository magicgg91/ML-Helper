import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLogsPurge } from "./admin-logs-purge";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(cleanup);

const messages = {
  admin: {
    common: { cancel: "Annuler", confirm: "Confirmer" },
    logs: {
      start: "Date de début",
      end: "Date de fin",
      error: "Impossible de purger l’historique",
      "purge-title": "Purge du journal",
      "purge-description": "Supprime définitivement les entrées d’une période.",
      "purge-open": "Purger la période…",
      "purge-confirm-title": "Purger cette période ?",
      "purge-confirm-body":
        "{count, plural, =0 {Aucune entrée n’est concernée par cette période.} =1 {# entrée sera supprimée définitivement.} other {# entrées seront supprimées définitivement.}}",
      "purge-confirm-action": "Purger",
      "purge-invalid-range":
        "La date de fin doit être postérieure à la date de début.",
      "purged-count":
        "{count, plural, =1 {# entrée supprimée.} other {# entrées supprimées.}}",
    },
  },
};

function renderPurge() {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdminLogsPurge />
    </NextIntlClientProvider>,
  );
}

const fillRange = (start = "2026-09-01T00:00", end = "2026-09-30T23:59") => {
  fireEvent.change(screen.getByLabelText("Date de début"), {
    target: { value: start },
  });
  fireEvent.change(screen.getByLabelText("Date de fin"), {
    target: { value: end },
  });
};

beforeEach(() => {
  refresh.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () =>
          String(url).includes("/count") ? { count: 42 } : { deleted: 42 },
      }),
    ),
  );
});

describe("Bloc 119: purging the audit log", () => {
  it("asks the server how many entries the period holds, before deleting any", async () => {
    renderPurge();
    fillRange();
    fireEvent.click(screen.getByRole("button", { name: "Purger la période…" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/logs/count?start=2026-09-01T00%3A00&end=2026-09-30T23%3A59",
      ),
    );
    // Nothing is deleted at this point: the only call is the count.
    expect(fetch).toHaveBeenCalledTimes(1);
    const dialog = await screen.findByRole("dialog", {
      name: "Purger cette période ?",
    });
    expect(
      within(dialog).getByText("42 entrées seront supprimées définitivement."),
    ).toBeInTheDocument();
  });

  it("deletes the period once confirmed, and says how many were removed", async () => {
    renderPurge();
    fillRange();
    fireEvent.click(screen.getByRole("button", { name: "Purger la période…" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Purger" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/logs",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({
            start: "2026-09-01T00:00",
            end: "2026-09-30T23:59",
          }),
        }),
      ),
    );
    expect(
      await screen.findByText("42 entrées supprimées."),
    ).toBeInTheDocument();
    // The list behind the card has to be read again — it just lost rows.
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the log when the dialog is cancelled", async () => {
    renderPurge();
    fillRange();
    fireEvent.click(screen.getByRole("button", { name: "Purger la période…" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses a period that ends before it starts, without asking the server", () => {
    renderPurge();
    fillRange("2026-09-30T00:00", "2026-09-01T00:00");
    fireEvent.click(screen.getByRole("button", { name: "Purger la période…" }));
    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "La date de fin doit être postérieure à la date de début.",
      ),
    ).toBeInTheDocument();
  });

  it("refuses an empty period the same way", () => {
    renderPurge();
    fireEvent.click(screen.getByRole("button", { name: "Purger la période…" }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("says so when the server refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    renderPurge();
    fillRange();
    fireEvent.click(screen.getByRole("button", { name: "Purger la période…" }));
    expect(
      await screen.findByText("Impossible de purger l’historique"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("announces a period that holds nothing rather than a bare zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ count: 0 }),
      }),
    );
    renderPurge();
    fillRange();
    fireEvent.click(screen.getByRole("button", { name: "Purger la période…" }));
    expect(
      await screen.findByText(
        "Aucune entrée n’est concernée par cette période.",
      ),
    ).toBeInTheDocument();
  });
});
