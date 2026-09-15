import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";
import { themeBackground } from "../lib/theme-color";
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
    document.head.innerHTML = "";
    vi.restoreAllMocks();
  });

  const themeColor = () =>
    document
      .querySelector('meta[name="theme-color"]')
      ?.getAttribute("content") ?? null;

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

  // Bloc 103: the theme is not only what the page paints — it is also what the
  // browser paints AROUND the page, and on iOS that is the status-bar strip an
  // installed app sits under. Leaving theme-color behind is how the strip
  // keeps the previous theme's colour after a toggle.
  it("Bloc103: moves the status-bar colour with the theme, on load and on toggle", async () => {
    localStorage.setItem("mlhelper_theme", "light");
    render(<ThemeToggle />);

    await waitFor(() => expect(themeColor()).toBe(themeBackground.light));

    fireEvent.click(
      screen.getByRole("button", { name: "Activer le mode sombre" }),
    );

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(themeColor()).toBe(themeBackground.dark);
  });
});
