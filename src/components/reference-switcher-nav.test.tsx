import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReferenceSwitcherNav } from "./reference-switcher-nav";

// Bloc 91/E1: ReferenceSwitcherNav now reads usePathname (and renders Link)
// from the locale-aware @/i18n/navigation, so override the global setup stub
// here with one whose pathname is mutable per test.
let pathname = "/referentiels";
vi.mock("@/i18n/navigation", async () => {
  const { createElement } = await import("react");
  return {
    Link: ({
      href,
      children,
      ...props
    }: {
      href: unknown;
      children?: unknown;
      [key: string]: unknown;
    }) =>
      createElement(
        "a",
        { href: typeof href === "string" ? href : "#", ...props },
        children as never,
      ),
    usePathname: () => pathname,
    useRouter: () => ({
      push: () => {},
      replace: () => {},
      prefetch: () => {},
      back: () => {},
      forward: () => {},
      refresh: () => {},
    }),
    redirect: () => {},
    getPathname: () => pathname,
  };
});

const catalog: Record<string, string> = {
  "catalog.combat-equipment": "Équipements de Combat",
  "catalog.expedition-equipment": "Équipements d’Expédition",
  "catalog.level-up": "Progression",
  "catalog.templars": "Templiers",
  "catalog.gems": "Gemmes",
  "catalog.shop": "Boutique",
  "catalog.events": "Événements",
  "tabs-label": "tabs-label",
  comingSoon: "Bientôt disponible",
  unavailable: "Indisponible actuellement",
};
// The translator is read via useTranslations inside the component (not
// passed as a `t` prop) — a next-intl/server translator is a function, and
// Next.js forbids passing functions from a Server Component to a Client
// Component, which crashed this exact page at runtime (RTL doesn't enforce
// that boundary, so this bug only surfaced in a real browser).
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => catalog[key] ?? key,
  useLocale: () => "fr",
}));

const active = {
  "combat-equipment": true,
  "expedition-equipment": true,
  "level-up": true,
  templiers: true,
  gemmes: true,
  consommables: true,
  events: true,
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
      "Progression",
      "Templiers",
      "Gemmes",
      "Boutique",
      "Événements",
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

  // Bloc 62/I: sorted by the displayed label (active locale), not the
  // catalog's own declaration order (combat-equipment, expedition-equipment,
  // level-up, templars, gems, shop, events).
  it("Bloc62/I: lists every reference alphabetically by its displayed label", () => {
    render(<ReferenceSwitcherNav active={active} />);
    const nav = screen.getByRole("navigation", { name: "tabs-label" });
    const labels = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    const expected = [
      "Boutique",
      "Templiers",
      "Équipements de Combat",
      "Équipements d’Expédition",
      "Événements",
      "Gemmes",
      "Progression",
    ];
    expect(labels).toEqual(
      [...expected].sort((a, b) => a.localeCompare(b, "fr")),
    );
  });

  // Bloc 62/I: an inactive reference (e.g. Events before an admin activates
  // it) still gets a slot here — an internal teaser, unlike Bloc 60's
  // search/sitemap discovery hiding — but isn't a real link, and shows the
  // same colored "Bientôt disponible" treatment as disabled tools (Bloc 62/J).
  it("Bloc62/I: shows an inactive reference as a non-clickable teaser, not hidden", () => {
    render(<ReferenceSwitcherNav active={{ ...active, events: false }} />);
    const nav = screen.getByRole("navigation", { name: "tabs-label" });
    expect(within(nav).queryByRole("link", { name: /Événements/ })).toBeNull();
    const teaser = within(nav)
      .getByText("Événements")
      .closest('[aria-disabled="true"]');
    expect(teaser).not.toBeNull();
    expect(within(nav).getByText("Bientôt disponible")).toBeInTheDocument();
  });
});
