import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicNav } from "./public-nav";

const links = [
  { href: "/tools", label: "Outils" },
  { href: "/guides", label: "Guides" },
  { href: "/contact", label: "Contact" },
];

// Bloc 91/E1: PublicNav now reads usePathname (and renders Link) from the
// locale-aware @/i18n/navigation, so override the global setup stub here with
// one whose pathname is mutable per test.
let pathname = "/tools";
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

afterEach(cleanup);

describe("PublicNav", () => {
  beforeEach(() => {
    pathname = "/tools";
  });

  // Bloc 132 §3 : le bouton ☰ et l'ouverture du panneau ont déménagé dans
  // PublicHeader, qui les partage avec la loupe — leurs tests aussi. Ce qui
  // reste ici est ce que cette nav décide encore : quelles entrées, et
  // laquelle est celle de la page.
  it("expose les entrées de navigation, sans liste déroulante", () => {
    render(<PublicNav links={links} navLabel="Navigation principale" />);
    const nav = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    for (const link of links) {
      expect(nav).toContainElement(
        screen.getByRole("link", { name: link.label }),
      );
    }
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("prévient l'appelant quand on part sur une page", () => {
    const onNavigate = vi.fn();
    render(
      <PublicNav
        links={links}
        navLabel="Navigation principale"
        onNavigate={onNavigate}
      />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Outils" }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("marks only the link for the current page as active", () => {
    pathname = "/guides";
    render(<PublicNav links={links} navLabel="Navigation principale" />);
    expect(screen.getByRole("link", { name: "Guides" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Outils" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Contact" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps a section link active on its nested sub-pages", () => {
    pathname = "/tools/villes";
    render(<PublicNav links={links} navLabel="Navigation principale" />);
    expect(screen.getByRole("link", { name: "Outils" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Guides" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks no link active when the current page isn't in the nav", () => {
    pathname = "/legal";
    render(<PublicNav links={links} navLabel="Navigation principale" />);
    for (const link of links) {
      expect(
        screen.getByRole("link", { name: link.label }),
      ).not.toHaveAttribute("aria-current");
    }
  });
});
