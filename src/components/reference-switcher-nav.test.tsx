import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReferenceSwitcherNav } from "./reference-switcher-nav";

let pathname = "/referentiels";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

const catalog: Record<string, string> = {
  "catalog.combat-equipment": "Équipements de Combat",
  "catalog.expedition-equipment": "Équipements d’Expédition",
  "catalog.level-up": "Level Up",
  "catalog.templars": "Coût des Templiers",
  "catalog.gems": "Gemmes",
  "catalog.shop": "Boutique",
  "tabs-label": "tabs-label",
};
// The translator is read via useTranslations inside the component (not
// passed as a `t` prop) — a next-intl/server translator is a function, and
// Next.js forbids passing functions from a Server Component to a Client
// Component, which crashed this exact page at runtime (RTL doesn't enforce
// that boundary, so this bug only surfaced in a real browser).
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => catalog[key] ?? key,
}));

const active = {
  "combat-equipment": true,
  "expedition-equipment": true,
  "level-up": true,
  templiers: true,
  gemmes: true,
  consommables: true,
};

describe("ReferenceSwitcherNav", () => {
  afterEach(cleanup);
  beforeEach(() => {
    pathname = "/referentiels";
  });

  // Bloc 50/E: same requirement as the old inline cross-nav (Bloc 35/1.2),
  // now rendered by src/app/(public)/referentiels/layout.tsx instead of the
  // [slug] detail page itself.
  it("Bloc35 1.2: offers a cross-nav to switch directly to another reference", () => {
    pathname = "/referentiels/combat-equipment";
    render(<ReferenceSwitcherNav active={active} />);
    const nav = screen.getByRole("navigation", { name: "tabs-label" });
    for (const label of [
      "Équipements de Combat",
      "Équipements d’Expédition",
      "Level Up",
      "Coût des Templiers",
      "Gemmes",
      "Boutique",
    ]) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    const currentLink = within(nav).getByText("Équipements de Combat");
    expect(currentLink).toHaveAttribute("aria-current", "page");
    const otherLink = within(nav).getByText("Équipements d’Expédition");
    expect(otherLink).toHaveAttribute(
      "href",
      "/referentiels/expedition-equipment",
    );
    // Bloc 40/A: reuses the /tools category banner's own container/button
    // classes (full width, grows to fill the row) instead of the
    // family-buttons pill row (content width).
    expect(nav).toHaveClass("category-nav");
    expect(nav).not.toHaveClass("family-buttons");
    expect(currentLink).toHaveClass("category-btn");
    expect(otherLink).not.toHaveAttribute("aria-current");
    // Bloc 41/C: keeps its own "reference-switcher" class alongside
    // "category-nav" — the spacing-below fix is scoped to it specifically,
    // so it doesn't add space under the /tools banner too.
    expect(nav).toHaveClass("reference-switcher");
  });

  it("sets no aria-current on the /referentiels index, where no single reference is current", () => {
    pathname = "/referentiels";
    render(<ReferenceSwitcherNav active={active} />);
    const nav = screen.getByRole("navigation", { name: "tabs-label" });
    for (const link of within(nav).getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });
});
