import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "dark";
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
