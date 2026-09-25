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

  // Bloc 129 §2.1 : l'icône annonce ce vers quoi on va — soleil quand on est
  // en sombre, lune quand on est en clair — et l'aria-label dit la même
  // chose. Les deux ne doivent pas pouvoir se contredire.
  it("montre le soleil en thème sombre, la lune en thème clair", async () => {
    mockPrefersLight(false);
    const { container } = render(<ThemeToggle />);
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Passer en thème clair",
      ),
    );
    expect(container.querySelector("svg")).toHaveClass("lucide-sun");

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Passer en thème sombre",
    );
    expect(container.querySelector("svg")).toHaveClass("lucide-moon");
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
      name: "Passer en thème sombre",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    // Bloc 129 §2.1 : le glyphe ☾ a laissé la place à une icône. Ce que ce
    // test vérifiait — le bouton porte un pictogramme et aucun mot — tient
    // toujours, sur l'icône plutôt que sur le caractère.
    expect(toggle.querySelector("svg")).toHaveClass("lucide-moon");
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
      screen.getByRole("button", { name: "Passer en thème sombre" }),
    );

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(themeColor()).toBe(themeBackground.dark);
  });
});

describe("Bloc 125 §2: the admin's own skin and wording", () => {
  it("takes a class and a pair of labels, and leaves the public defaults alone", () => {
    render(
      <ThemeToggle
        className="admin-theme-button"
        labels={{
          toDark: "Vers le sombre (admin)",
          toLight: "Vers le clair (admin)",
        }}
      />,
    );
    // Starts dark (the pre-paint default), so the button offers the light one.
    const button = screen.getByRole("button", {
      name: "Vers le clair (admin)",
    });
    expect(button).toHaveClass("admin-theme-button");
    expect(button).not.toHaveClass("theme-toggle");
    // Bloc 129 §2.1 : le libellé public par défaut est devenu « Passer en
    // thème clair » — précisément celui que l'admin se donnait depuis le
    // Bloc 125. Ce test comparait donc deux phrases désormais identiques et
    // ne prouvait plus rien. Avec des libellés distincts, il dit à nouveau
    // ce qu'il voulait dire : ce sont bien ceux du caller qui sont rendus,
    // pas les valeurs par défaut.
    expect(
      screen.queryByRole("button", { name: "Passer en thème clair" }),
    ).toBeNull();
  });
});
