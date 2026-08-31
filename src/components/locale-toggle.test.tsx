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

afterEach(cleanup);

describe("LocaleToggle (Bloc 47/A: styled select, not one button per locale)", () => {
  beforeEach(() => {
    localStorage.clear();
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders a single select, not a row of buttons", () => {
    renderToggle();
    const select = screen.getByRole("combobox", { name: "Langue" });
    expect(select).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("Bloc 44: still offers all 5 activated locales as select options", () => {
    renderToggle("fr", ["de", "en", "es", "fr", "tr"]);
    const select = screen.getByRole("combobox", { name: "Langue" });
    const optionLabels = Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent,
    );
    expect(optionLabels).toEqual(["DE", "EN", "ES", "FR", "TR"]);
  });

  it("shows the active locale as the select's current value", () => {
    renderToggle("fr");
    expect(screen.getByRole("combobox", { name: "Langue" })).toHaveValue("fr");
  });

  it("persists the selected language, refreshes the route, and mirrors the choice to localStorage", async () => {
    renderToggle("fr");
    fireEvent.change(screen.getByRole("combobox", { name: "Langue" }), {
      target: { value: "en" },
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "en" }),
      });
      expect(refresh).toHaveBeenCalledOnce();
    });
    expect(localStorage.getItem("mlhelper_locale")).toBe("en");
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
});
