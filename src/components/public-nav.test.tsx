import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublicNav } from "./public-nav";

const links = [
  { href: "/tools", label: "Outils" },
  { href: "/guides", label: "Guides" },
  { href: "/contact", label: "Contact" },
];

afterEach(cleanup);

describe("PublicNav", () => {
  it("exposes the nav links and the menu toggle, no dropdown", () => {
    render(
      <PublicNav
        links={links}
        navLabel="Navigation principale"
        menuLabel="Menu"
      />,
    );
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

  it("toggles the menu open state on click, closed by default", () => {
    render(
      <PublicNav
        links={links}
        navLabel="Navigation principale"
        menuLabel="Menu"
      />,
    );
    const toggle = screen.getByRole("button", { name: "Menu" });
    const nav = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(nav).toHaveAttribute("data-open", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(nav).toHaveAttribute("data-open", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(nav).toHaveAttribute("data-open", "false");
  });

  it("closes the menu after a link is clicked", () => {
    render(
      <PublicNav
        links={links}
        navLabel="Navigation principale"
        menuLabel="Menu"
      />,
    );
    const toggle = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("link", { name: "Outils" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
