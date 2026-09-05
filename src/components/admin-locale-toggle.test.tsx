import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLocaleToggle } from "./admin-locale-toggle";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function renderToggle(locale = "fr") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ common: { language: "Langue" } }}
    >
      <AdminLocaleToggle />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

// Bloc 47/C: the admin chrome's own display language reverts to EN/FR
// only — unlike the public LocaleToggle (Bloc 47/A), which still exposes
// all 5. Editorial content locale pickers (guides, legal notice,
// Consommables intro) are a separate concern and keep all 5 unchanged.
describe("AdminLocaleToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("offers only EN and FR as directly clickable buttons", () => {
    renderToggle();
    expect(screen.getByRole("button", { name: "EN" })).toBeVisible();
    const frButton = screen.getByRole("button", { name: "FR" });
    expect(frButton).toBeVisible();
    expect(frButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button", { name: /^(DE|ES|TR)$/ })).toBeNull();
  });

  it("persists the selected language and refreshes the route on click", async () => {
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "en" }),
      });
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  // A DE/ES/TR choice made publicly must never leak into the admin
  // chrome — the shared sync-on-mount effect only acts on a locale this
  // toggle actually offers (en/fr), so it's simply ignored here.
  it("ignores a non-EN/FR locale saved in localStorage from public browsing", async () => {
    localStorage.setItem("mlhelper_locale", "es");
    renderToggle("fr");

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
