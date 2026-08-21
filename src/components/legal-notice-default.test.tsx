import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";
import { defaultFrenchLegalNotice } from "../lib/legal-notice";

describe("default French legal notice", () => {
  it("renders its Markdown and keeps every explicit placeholder", () => {
    render(<MarkdownRenderer markdown={defaultFrenchLegalNotice} />);

    expect(
      screen.getByRole("heading", { name: "Mentions légales", level: 1 }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Développement et fiabilité des données",
        level: 2,
      }),
    ).toBeVisible();
    expect(
      screen.getAllByText("[NOM DE L'ÉDITEUR — À COMPLÉTER]"),
    ).toHaveLength(2);
    expect(document.body).toHaveTextContent(
      "[ADRESSE EMAIL DE CONTACT — À COMPLÉTER]",
    );
    expect(document.body).toHaveTextContent(
      "[NOM DE L'HÉBERGEUR — À COMPLÉTER]",
    );
    expect(document.body).toHaveTextContent(
      "[ADRESSE DE L'HÉBERGEUR — À COMPLÉTER]",
    );
    expect(document.body).toHaveTextContent(
      "[CONTACT DE L'HÉBERGEUR — À COMPLÉTER]",
    );
    expect(screen.getAllByText("Million Lords")).toHaveLength(2);
    expect(
      screen
        .getAllByText("Million Lords")
        .every((node) => node.tagName === "EM"),
    ).toBe(true);
    expect(
      screen.getByText("vérifiés par observation directe en jeu").tagName,
    ).toBe("STRONG");
  });
});
