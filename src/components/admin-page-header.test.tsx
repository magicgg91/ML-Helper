import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminButton } from "./admin-button";
import { PageHeader } from "./admin-page-header";

afterEach(cleanup);

describe("Bloc 119: PageHeader", () => {
  it("gives the screen exactly one h1", () => {
    render(<PageHeader eyebrow="Contenu" title="Guides" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Guides" }),
    ).toBeInTheDocument();
  });

  it("reads the eyebrow before the title, as a label of the section", () => {
    render(<PageHeader eyebrow="Contenu" title="Guides" />);
    const eyebrow = screen.getByText("Contenu");
    expect(eyebrow).toHaveClass("admin-eyebrow");
    expect(
      eyebrow.compareDocumentPosition(
        screen.getByRole("heading", { level: 1 }),
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("holds the screen's main action", () => {
    render(
      <PageHeader
        title="Guides"
        actions={<AdminButton variant="primary">Nouveau guide</AdminButton>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Nouveau guide" }),
    ).toBeInTheDocument();
  });

  it("leaves out what it was not given", () => {
    const { container } = render(<PageHeader title="Guides" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});
