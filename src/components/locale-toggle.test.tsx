import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleToggle } from "./locale-toggle";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

// Doesn't use the app's own renderWithIntl helper — this file needs to
// control the active `locale` prop directly, which that helper doesn't
// expose the same way for a component under test rather than the page.
function renderToggle(locale = "fr", locales = ["en", "fr"]) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ common: { language: "Langue" } }}
    >
      <LocaleToggle locales={locales} />
    </NextIntlClientProvider>,
  );
}

function trigger() {
  return screen.getByRole("button", { name: "Langue" });
}

function listbox() {
  return screen.getByRole("listbox", { name: "Langue" });
}

afterEach(cleanup);

// Bloc 48/C: a native <select>'s open direction is decided by the
// browser/OS (viewport space + which option is selected) — occasionally
// upward, forcing an unwanted page scroll. Replaced by a custom ARIA
// listbox (button trigger + role="listbox" popup) whose popup is always
// `position: absolute`, anchored below the trigger — verified here via its
// structure/classes and interaction behavior, not literal pixel geometry
// (outside what jsdom can render).
describe("LocaleToggle (Bloc 48/C: custom listbox, always opens downward)", () => {
  beforeEach(() => {
    localStorage.clear();
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders a single button trigger, not a native select", () => {
    renderToggle();
    expect(trigger()).toBeVisible();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows the active locale on the trigger, uppercased", () => {
    renderToggle("fr");
    expect(trigger()).toHaveTextContent("FR");
  });

  it("opens a listbox positioned to always anchor below the trigger, regardless of which locale is active", () => {
    for (const locale of ["en", "fr"]) {
      renderToggle(locale);
      fireEvent.click(trigger());
      expect(listbox()).toHaveClass("locale-listbox");
      cleanup();
    }
  });

  it("Bloc 44: still offers all 5 activated locales as listbox options", () => {
    renderToggle("fr", ["de", "en", "es", "fr", "tr"]);
    fireEvent.click(trigger());
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["DE", "EN", "ES", "FR", "TR"]);
  });

  it("marks the active locale as the selected option", () => {
    renderToggle("fr");
    fireEvent.click(trigger());
    expect(screen.getByRole("option", { name: "FR" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "EN" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("selects an option by click, persists the choice, refreshes, and closes the listbox", async () => {
    renderToggle("fr");
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "EN" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "en" }),
      });
      expect(refresh).toHaveBeenCalledOnce();
    });
    expect(localStorage.getItem("mlhelper_locale")).toBe("en");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("navigates and selects with the keyboard (ArrowUp then Enter)", async () => {
    // Opens with the active locale ("fr", index 1) highlighted — ArrowUp
    // moves the highlight to "en" (index 0), Enter selects it.
    renderToggle("fr", ["en", "fr"]);
    fireEvent.click(trigger());
    fireEvent.keyDown(listbox(), { key: "ArrowUp" });
    fireEvent.keyDown(listbox(), { key: "Enter" });

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "en" }),
      }),
    );
  });

  it("closes without selecting on Escape and returns focus to the trigger", () => {
    renderToggle("fr");
    fireEvent.click(trigger());
    fireEvent.keyDown(listbox(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger()).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("closes when clicking outside the component", () => {
    renderToggle("fr");
    fireEvent.click(trigger());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  // Bloc 47/B: a previously-saved choice (e.g. the cookie got cleared
  // separately from localStorage) is re-applied on mount, same pattern as
  // ThemeToggle restoring "mlhelper_theme".
  it("Bloc 47/B: re-applies a saved locale on mount when it differs from the active one", async () => {
    localStorage.setItem("mlhelper_locale", "en");
    renderToggle("fr", ["en", "fr"]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "en" }),
      });
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  // Codex review (PR #70): a non-2xx (or rejected) /api/locale request must
  // never be treated as a success — no stale localStorage write, no
  // refresh, so the sync-on-mount effect keeps retrying instead of getting
  // stuck believing an unsaved locale is already active.
  it("Codex review: does not persist or refresh when the server rejects the change", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    renderToggle("fr");
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "EN" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(refresh).not.toHaveBeenCalled();
    expect(localStorage.getItem("mlhelper_locale")).toBeNull();
  });

  it("Codex review: does not persist or refresh when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderToggle("fr");
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "EN" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(refresh).not.toHaveBeenCalled();
    expect(localStorage.getItem("mlhelper_locale")).toBeNull();
  });
});
