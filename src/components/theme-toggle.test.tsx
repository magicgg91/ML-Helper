import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";
import { renderWithIntl as render } from "../test/render-with-intl";

function mockPrefersLight(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query === "(prefers-color-scheme: light)" && matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "dark";
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("defaults to the OS/browser light preference on a first visit with no saved choice (Bloc 33/B)", async () => {
    mockPrefersLight(true);
    render(<ThemeToggle />);
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("light"),
    );
    expect(localStorage.getItem("mlhelper_theme")).toBeNull();
  });

  it("defaults to dark when the OS/browser has no light preference and nothing is saved", async () => {
    mockPrefersLight(false);
    render(<ThemeToggle />);
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );
    expect(localStorage.getItem("mlhelper_theme")).toBeNull();
  });

  it("prefers a previously saved explicit choice over the OS preference", async () => {
    mockPrefersLight(true);
    localStorage.setItem("mlhelper_theme", "dark");
    render(<ThemeToggle />);
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );
  });

  it("restores and persists the selected visual theme", async () => {
    localStorage.setItem("mlhelper_theme", "light");
    render(<ThemeToggle />);

    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("light"),
    );
    const toggle = screen.getByRole("button", {
      name: "Activer le mode sombre",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("☾");
    expect(toggle).not.toHaveTextContent("Sombre");

    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("mlhelper_theme")).toBe("dark");
  });
});
