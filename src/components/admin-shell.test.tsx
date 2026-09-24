import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "./admin-shell";

let pathname = "/admin";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
// The column itself has its own test file; here it only needs to be findable.
vi.mock("./admin-sidebar", () => ({
  AdminSidebar: () => (
    <nav aria-label="Navigation administration">
      <a href="#guides">Guides</a>
    </nav>
  ),
}));

afterEach(cleanup);

const messages = {
  admin: {
    "navigation-label": "Navigation administration",
    "open-menu": "Ouvrir le menu",
    common: { close: "Fermer" },
  },
};

// A fresh element each time: React bails out of re-rendering a subtree when
// it is handed the very same element object, and this file re-renders to
// simulate a navigation.
const shell = () => (
  <NextIntlClientProvider locale="fr" messages={messages}>
    <AdminShell
      role="super_admin"
      username="rootadmin"
      totpEnabled={false}
      counts={{}}
    >
      <p>contenu de la page</p>
    </AdminShell>
  </NextIntlClientProvider>
);

function renderShell() {
  pathname = "/admin";
  return render(shell());
}

describe("Bloc 119: AdminShell", () => {
  it("renders the page inside a main region", () => {
    renderShell();
    expect(
      within(screen.getByRole("main")).getByText("contenu de la page"),
    ).toBeInTheDocument();
  });

  it("scopes the admin palette to itself", () => {
    // Every --admin-* token is declared under .admin-shell: without this
    // class the whole refonte would fall back to the public site's colours,
    // and with it anywhere else the public site would inherit them.
    const { container } = renderShell();
    expect(container.querySelector(".admin-shell")).toBeInTheDocument();
  });

  it("keeps the column out of the flow on a narrow screen, and the button out of it on a wide one", () => {
    // Which of the two is shown is a CSS decision (lg = 1024 px), so that a
    // server render — which has no viewport — is never wrong for a frame.
    const { container } = renderShell();
    expect(
      container.querySelector("aside.hidden.lg\\:block"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: "Ouvrir le menu" })
        .closest(".lg\\:hidden"),
    ).toBeInTheDocument();
  });

  it("gives the column a viewport of its own that the page scrolls past", () => {
    // Bloc 125 §1: the bottom of the menu walked off the screen on a long
    // page because the column was a flex sibling of the content and took its
    // height. Two grid tracks, and an `aside` that is 100dvh and sticky, is
    // what keeps it still.
    const { container } = renderShell();
    const shell = container.querySelector(".admin-shell");
    expect(shell?.className).toContain("grid");
    expect(shell?.className).toContain("lg:grid-cols-[248px_minmax(0,1fr)]");
    expect(shell?.className).toContain("min-h-[100dvh]");
    const column = container.querySelector("aside");
    expect(column?.className).toContain("sticky");
    expect(column?.className).toContain("top-0");
    expect(column?.className).toContain("h-[100dvh]");
    // …and nothing between the two clips the page: an `overflow` anywhere up
    // the tree would silently kill `position: sticky`.
    expect(shell?.className).not.toContain("overflow");
  });

  it("opens the navigation in a drawer, and closes it on Escape", () => {
    renderShell();
    const trigger = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).toBeNull();

    trigger.focus();
    fireEvent.click(trigger);
    const drawer = screen.getByRole("dialog", {
      name: "Navigation administration",
    });
    expect(
      within(drawer).getByRole("link", { name: "Guides" }),
    ).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    // The keyboard comes back where it was, not at the top of the page.
    expect(trigger).toHaveFocus();
  });

  it("closes itself when one of its links loads another page", () => {
    // The drawer is bound to the route it was opened on: following a link
    // navigates behind it, and it must be gone when the new page paints —
    // otherwise it covers exactly what was asked for.
    const { rerender } = renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    pathname = "/admin/guides";
    rerender(shell());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the drawer on a click outside it", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const drawer = screen.getByRole("dialog");
    fireEvent.mouseDown(drawer.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
