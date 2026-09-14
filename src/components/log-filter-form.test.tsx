import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LogFilterForm } from "./log-filter-form";

const t = (key: string) =>
  ({
    "filter-user": "Utilisateur",
    "filter-message": "Mot dans le message",
    start: "Date de début",
    end: "Date de fin",
    "filter-apply": "Filtrer",
    "filter-reset": "Réinitialiser",
  })[key] ?? key;

afterEach(cleanup);

describe("LogFilterForm", () => {
  it("submits as a plain GET form to the same page, no client JS required", () => {
    const { container } = render(<LogFilterForm filters={{}} t={t} />);
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "get");
  });

  it("pre-fills every field from the current filters", () => {
    render(
      <LogFilterForm
        filters={{
          user: "alice",
          message: "supprimé",
          from: "2026-01-01",
          to: "2026-01-31",
        }}
        t={t}
      />,
    );
    expect(screen.getByLabelText("Utilisateur")).toHaveValue("alice");
    expect(screen.getByLabelText("Mot dans le message")).toHaveValue(
      "supprimé",
    );
    expect(screen.getByLabelText("Date de début")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("Date de fin")).toHaveValue("2026-01-31");
  });

  it("exposes a reset link that clears every filter", () => {
    render(<LogFilterForm filters={{ user: "alice" }} t={t} />);
    expect(screen.getByRole("link", { name: "Réinitialiser" })).toHaveAttribute(
      "href",
      "/admin/logs",
    );
  });
});
