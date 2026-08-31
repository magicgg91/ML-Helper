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

afterEach(cleanup);

describe("LocaleToggle", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("exposes every locale as a directly clickable button, no dropdown", () => {
    render(
      <NextIntlClientProvider
        locale="fr"
        messages={{ common: { language: "Langue" } }}
      >
        <LocaleToggle locales={["en", "fr"]} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("button", { name: "EN" })).toBeVisible();
    const frButton = screen.getByRole("button", { name: "FR" });
    expect(frButton).toBeVisible();
    expect(frButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  // Bloc 44: DE/ES/TR — this same component backs both the public layout's
  // and the admin layout's language switcher, both fed directly from
  // getAvailableLocales() (filesystem-driven), so this covers "selectable
  // publicly and in admin" for both at once.
  it("Bloc 44: shows all 5 activated locales once DE/ES/TR are discovered", () => {
    render(
      <NextIntlClientProvider
        locale="fr"
        messages={{ common: { language: "Langue" } }}
      >
        <LocaleToggle locales={["de", "en", "es", "fr", "tr"]} />
      </NextIntlClientProvider>,
    );

    for (const label of ["DE", "EN", "ES", "FR", "TR"])
      expect(screen.getByRole("button", { name: label })).toBeVisible();
  });

  it("persists the selected language and refreshes the route on click", async () => {
    render(
      <NextIntlClientProvider
        locale="fr"
        messages={{ common: { language: "Langue" } }}
      >
        <LocaleToggle locales={["en", "fr"]} />
      </NextIntlClientProvider>,
    );

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
});
