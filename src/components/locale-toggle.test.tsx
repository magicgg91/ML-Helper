import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleToggle } from "./locale-toggle";

// Bloc 91/E1: the toggle now switches language by navigating to the same page
// under the target locale's URL (next-intl router.replace), not by writing the
// NEXT_LOCALE cookie. Override the global navigation stub with spies so those
// navigation calls can be asserted.
const replace = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/tools",
  useRouter: () => ({ replace }),
}));

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

describe("LocaleToggle (Bloc 48/C listbox, Bloc 91/E1 URL navigation)", () => {
  beforeEach(() => {
    replace.mockReset();
    // Reset the URL so window.location.search is clean for each test (the
    // toggle re-attaches the live query string when switching locale).
    window.history.replaceState({}, "", "/");
  });

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

  it("opens a listbox anchored below the trigger, regardless of the active locale", () => {
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

  it("Bloc 91/E1: selecting an option navigates to the same page in the new locale, and closes the listbox", () => {
    renderToggle("fr");
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "EN" }));
    expect(replace).toHaveBeenCalledWith("/tools", { locale: "en" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("Codex P2: keeps the current query string when switching locale", () => {
    // usePathname() is mocked to "/tools"; the toggle re-attaches the live
    // ?open=gems so switching language doesn't reset the open calculator tab.
    window.history.replaceState({}, "", "/fr/tools?open=gems");
    renderToggle("fr");
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "EN" }));
    expect(replace).toHaveBeenCalledWith("/tools?open=gems", { locale: "en" });
  });

  it("Bloc 91/E1: keyboard ArrowUp then Enter navigates to the highlighted locale", () => {
    // Opens with the active locale ("fr", index 1) highlighted — ArrowUp
    // moves to "en" (index 0), Enter selects it.
    renderToggle("fr", ["en", "fr"]);
    fireEvent.click(trigger());
    fireEvent.keyDown(listbox(), { key: "ArrowUp" });
    fireEvent.keyDown(listbox(), { key: "Enter" });
    expect(replace).toHaveBeenCalledWith("/tools", { locale: "en" });
  });

  it("does not navigate when the active locale is re-selected", () => {
    renderToggle("fr");
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "FR" }));
    expect(replace).not.toHaveBeenCalled();
  });

  it("closes without navigating on Escape and returns focus to the trigger", () => {
    renderToggle("fr");
    fireEvent.click(trigger());
    fireEvent.keyDown(listbox(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger()).toHaveFocus();
    expect(replace).not.toHaveBeenCalled();
  });

  it("closes when clicking outside the component", () => {
    renderToggle("fr");
    fireEvent.click(trigger());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
