import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

afterEach(cleanup);

const labels = { callout: "À retenir", illustration: "Illustration" };

const renderGuide = (markdown: string) =>
  render(<MarkdownRenderer markdown={markdown} breaks guideBlocks={labels} />);

describe("Bloc 129 §3.5 : les blocs d'un corps de guide", () => {
  // La syntaxe retenue pour l'encadré, documentée dans le PR : le marqueur
  // d'alerte de GitHub, en tête de citation.
  describe("l'encadré « À retenir »", () => {
    it("transforme une citation marquée en encadré", () => {
      const { container } = renderGuide(
        "> [!retenir]\n> L'or se dépense, les troupes se perdent.",
      );
      const callout = container.querySelector(".guide-callout")!;
      expect(callout.tagName).toBe("ASIDE");
      expect(callout).toHaveTextContent("À retenir");
      expect(callout).toHaveTextContent("L'or se dépense");
      // Le marqueur lui-même ne se lit pas dans le texte rendu.
      expect(callout).not.toHaveTextContent("[!retenir]");
      expect(container.querySelector("blockquote")).toBeNull();
    });

    it("laisse une citation ordinaire être une citation", () => {
      const { container } = renderGuide("> Une citation du jeu.");
      expect(container.querySelector("blockquote")).toBeInTheDocument();
      expect(container.querySelector(".guide-callout")).toBeNull();
    });
  });

  describe("les illustrations", () => {
    it("fait une figure légendée d'une ligne ILLUSTRATION", () => {
      const { container } = renderGuide(
        "[ILLUSTRATION — La carte du royaume au niveau 10]",
      );
      const figure = container.querySelector("figure.guide-figure")!;
      expect(figure).toBeInTheDocument();
      expect(figure.querySelector("figcaption")).toHaveTextContent(
        "La carte du royaume au niveau 10",
      );
      // §1.3 : l'emplacement vide tant qu'aucun fichier n'est fourni.
      expect(screen.getByText("Illustration")).toBeInTheDocument();
      expect(figure.querySelector("img")).toBeNull();
    });

    it("fait une figure d'une vraie image, et légende avec son alt", () => {
      const { container } = renderGuide(
        "![Le mur au niveau 20](https://exemple.test/mur.png)",
      );
      const figure = container.querySelector("figure.guide-figure")!;
      expect(figure.querySelector("img")).toHaveAttribute(
        "src",
        "https://exemple.test/mur.png",
      );
      expect(figure.querySelector("figcaption")).toHaveTextContent(
        "Le mur au niveau 20",
      );
    });

    it("laisse une image sans alt sans légende plutôt qu'une légende vide", () => {
      const { container } = renderGuide("![](https://exemple.test/mur.png)");
      expect(container.querySelector("figure")).toBeInTheDocument();
      expect(container.querySelector("figcaption")).toBeNull();
    });

    it("ne touche pas à un paragraphe qui parle d'illustrations", () => {
      const { container } = renderGuide(
        "Les [ILLUSTRATION — …] sont des repères visuels.",
      );
      expect(container.querySelector("figure")).toBeNull();
    });
  });

  describe("les ancres des titres", () => {
    it("pose sur chaque titre l'identifiant que le sommaire vise", () => {
      const { container } = renderGuide("## Premiers pas\n\ntexte");
      expect(container.querySelector("h2")).toHaveAttribute(
        "id",
        "premiers-pas",
      );
    });

    it("départage deux titres identiques comme le sommaire", () => {
      const { container } = renderGuide("## Bilan\n\ntexte\n\n## Bilan");
      expect([...container.querySelectorAll("h2")].map((h) => h.id)).toEqual([
        "bilan",
        "bilan-2",
      ]);
    });
  });
});
