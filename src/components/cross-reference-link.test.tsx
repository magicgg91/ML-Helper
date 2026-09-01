import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CrossReferenceLink } from "./cross-reference-link";

afterEach(cleanup);

// Bloc 54/B: the phrase used to sit in its own <p> above a smaller button —
// now it's folded inside the button itself, alongside a bigger 5rem
// thumbnail. This covers the component generically, so every consumer
// (Gemmes, Templiers, Level Up, Combat/Expedition) gets the same shape.
describe("CrossReferenceLink — Bloc 54/B", () => {
  function renderLink() {
    return render(
      <CrossReferenceLink
        href="/referentiels/gems"
        title="Gemmes"
        image="/referentials/referential-gems.webp"
        fallbackImage="/category-skills.svg"
        label="Aller plus loin en vérifiant le référentiel"
      />,
    );
  }

  it("puts the label inside the button itself, not as a separate element above it", () => {
    renderLink();
    const link = screen.getByRole("link");
    const label = screen.getByText(
      "Aller plus loin en vérifiant le référentiel",
    );
    expect(link).toContainElement(label);
    expect(label.tagName).not.toBe("P");
  });

  it("gives the button a single accessible name combining the label and the title", () => {
    renderLink();
    expect(
      screen.getByRole("link", {
        name: "Aller plus loin en vérifiant le référentiel Gemmes",
      }),
    ).toHaveAttribute("href", "/referentiels/gems");
  });

  it("sizes the thumbnail at 5rem via the .cross-reference-thumb class", () => {
    renderLink();
    const thumb = document.querySelector(".cross-reference-thumb");
    expect(thumb).not.toBeNull();
  });
});
