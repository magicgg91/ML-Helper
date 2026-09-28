import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, buttonClassName } from "./button";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

/**
 * Bloc 132 §2 : un bouton, trois variantes, deux balises.
 *
 * Ce qui compte ici n'est pas le style — un test de CSS le tient ailleurs —
 * mais que la balise suive la fonction : ce qui navigue reste un lien, ce
 * qui agit reste un bouton. Un lien déguisé en bouton se perd au clavier et
 * ne s'ouvre pas dans un nouvel onglet.
 */
describe("Button", () => {
  it("rend un lien quand une destination est donnée", () => {
    render(<Button href="/tools">Explorer les outils</Button>);
    const link = screen.getByRole("link", { name: "Explorer les outils" });
    expect(link).toHaveAttribute("href", "/tools");
    expect(link).toHaveClass("button-primary");
  });

  it("rend un bouton sans destination, et n'envoie pas le formulaire par défaut", () => {
    const onClick = vi.fn();
    render(
      <Button variant="toggle" onClick={onClick}>
        Question
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Question" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("button-toggle");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("laisse l'appelant imposer son propre type", () => {
    render(<Button type="submit">Envoyer</Button>);
    expect(screen.getByRole("button", { name: "Envoyer" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("porte l'état d'un choix de groupe", () => {
    render(
      <Button variant="toggle" aria-pressed={true}>
        Autre
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Autre" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("ajoute la classe de l'appelant à celle de la variante", () => {
    expect(buttonClassName("secondary", "report-error-link")).toBe(
      "button-secondary report-error-link",
    );
    expect(buttonClassName("primary")).toBe("button-primary");
  });
});
