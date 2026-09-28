import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportErrorLink } from "./report-error-link";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("Bloc 129 §2.4 : « Signaler une erreur »", () => {
  it("ouvre Contact sur l'objet « erreur dans les données »", () => {
    render(<ReportErrorLink label="Signaler une erreur" />);
    expect(
      screen.getByRole("link", { name: "Signaler une erreur" }),
    ).toHaveAttribute("href", "/contact?subject=data-error");
  });

  it("emporte le chemin de la page d'où on est parti", () => {
    render(
      <ReportErrorLink
        label="Signaler une erreur"
        page="Villes › Coût de ville"
      />,
    );
    const href =
      screen
        .getByRole("link", { name: "Signaler une erreur" })
        .getAttribute("href") ?? "";
    expect(new URL(href, "http://localhost").searchParams.get("page")).toBe(
      "Villes › Coût de ville",
    );
  });

  it("ne fait pas lire son icône, qui ne dit rien de plus que le libellé", () => {
    const { container } = render(
      <ReportErrorLink label="Signaler une erreur" />,
    );
    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
