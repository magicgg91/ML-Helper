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
