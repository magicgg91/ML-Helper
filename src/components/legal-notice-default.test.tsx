import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";
import {
  defaultEnglishLegalNotice,
  defaultFrenchLegalNotice,
} from "../lib/legal-notice";

afterEach(cleanup);
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
    expect(document.body).toHaveTextContent(
      "Le formulaire de contact collecte votre adresse email, l'objet sélectionné et le message que vous rédigez.",
    );
    expect(document.body).toHaveTextContent(
      "envoyées par email à l'équipe éditoriale et ne sont jamais conservées en base de données sur ce site.",
    );
    expect(
      screen.queryByText(/SI FORMULAIRE DE CONTACT/),
    ).not.toBeInTheDocument();
  });
});

// Bloc 56: the legal notice is edited through the same
// @uiw/react-md-editor + MarkdownRenderer pipeline as the Boutique intro
// and guides — proving the raw-HTML fix here too, not just for Boutique.
describe("legal notice — Bloc 56: raw HTML support", () => {
  it("renders a raw <img width> tag at its set size, not escaped as text", () => {
    render(
      <MarkdownRenderer markdown='<img src="https://example.com/host-logo.png" alt="Logo hébergeur" width="48" height="48" />' />,
    );
    const image = screen.getByRole("img", { name: "Logo hébergeur" });
    expect(image).toHaveAttribute(
      "src",
      "https://example.com/host-logo.png",
    );
    expect(image).toHaveAttribute("width", "48");
    expect(image).toHaveAttribute("height", "48");
  });
});

describe("default English legal notice", () => {
  it("renders its Markdown and keeps every explicit placeholder", () => {
    render(<MarkdownRenderer markdown={defaultEnglishLegalNotice} />);

    expect(
      screen.getByRole("heading", { name: "Legal Notice", level: 1 }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Development and reliability of the data",
        level: 2,
      }),
    ).toBeVisible();
    expect(
      screen.getAllByText("[PUBLISHER NAME — TO BE COMPLETED]"),
    ).toHaveLength(2);
    expect(document.body).toHaveTextContent(
      "[CONTACT EMAIL ADDRESS — TO BE COMPLETED]",
    );
    expect(document.body).toHaveTextContent("[HOST NAME — TO BE COMPLETED]");
    expect(document.body).toHaveTextContent(
      "[HOST ADDRESS — TO BE COMPLETED]",
    );
    expect(document.body).toHaveTextContent(
      "[HOST CONTACT — TO BE COMPLETED]",
    );
    expect(screen.getAllByText("Million Lords")).toHaveLength(2);
    expect(
      screen
        .getAllByText("Million Lords")
        .every((node) => node.tagName === "EM"),
    ).toBe(true);
    expect(
      screen.getByText("verified by direct in-game observation").tagName,
    ).toBe("STRONG");
    expect(document.body).toHaveTextContent(
      "The contact form collects your email address, the subject you select, and the message you write.",
    );
    expect(document.body).toHaveTextContent(
      "sent by email to the editorial team and is never kept in this site's database.",
    );
  });
});
