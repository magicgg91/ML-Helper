import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverflowMenu, type OverflowMenuItem } from "./admin-overflow-menu";

afterEach(cleanup);

const publish = vi.fn();
const remove = vi.fn();

const items: OverflowMenuItem[] = [
  { key: "view", label: "Voir sur le site", href: "/guides/ligues" },
  { key: "publish", label: "Publier", onSelect: publish },
  { key: "delete", label: "Supprimer…", onSelect: remove, tone: "danger" },
];

function open(menuItems: OverflowMenuItem[] = items) {
  render(<OverflowMenu label="Autres actions" items={menuItems} />);
  const trigger = screen.getByRole("button", { name: "Autres actions" });
  fireEvent.click(trigger);
  return trigger;
}

const press = (key: string) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key });

describe("Bloc 119: OverflowMenu", () => {
  it("says whether it is open", () => {
    const trigger = open();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.getByRole("menu", { name: "Autres actions" })).toBeVisible();
  });

  it("opens onto its first item", () => {
    open();
    expect(
      screen.getByRole("menuitem", { name: "Voir sur le site" }),
    ).toHaveFocus();
  });

  it("opens onto its last item when reached with ArrowUp", () => {
    render(<OverflowMenu label="Autres actions" items={items} />);
    const trigger = screen.getByRole("button", { name: "Autres actions" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Supprimer…" })).toHaveFocus();
  });

  it("walks the items with the arrows and wraps around", () => {
    open();
    press("ArrowDown");
    expect(screen.getByRole("menuitem", { name: "Publier" })).toHaveFocus();
    press("ArrowDown");
    press("ArrowDown");
    expect(
      screen.getByRole("menuitem", { name: "Voir sur le site" }),
    ).toHaveFocus();
    press("ArrowUp");
    expect(screen.getByRole("menuitem", { name: "Supprimer…" })).toHaveFocus();
  });

  it("jumps to the ends with Home and End", () => {
    open();
    press("End");
    expect(screen.getByRole("menuitem", { name: "Supprimer…" })).toHaveFocus();
    press("Home");
    expect(
      screen.getByRole("menuitem", { name: "Voir sur le site" }),
    ).toHaveFocus();
  });

  it("closes on Escape and gives the focus back to the trigger", () => {
    const trigger = open();
    press("Escape");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes when the focus tabs out", () => {
    open();
    press("Tab");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes when something else on the page is clicked", () => {
    open();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("runs the chosen action and closes", () => {
    open();
    fireEvent.click(screen.getByRole("menuitem", { name: "Publier" }));
    expect(publish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("renders a link entry as a real anchor", () => {
    open();
    expect(
      screen.getByRole("menuitem", { name: "Voir sur le site" }),
    ).toHaveAttribute("href", "/guides/ligues");
  });

  it("skips a disabled entry instead of focusing it", () => {
    // The Users screen disables "Supprimer" on the row of the signed-in
    // account: the entry stays visible so the column keeps its shape, but the
    // keyboard must not land on something that does nothing.
    open([
      { key: "publish", label: "Publier", onSelect: publish },
      { key: "delete", label: "Supprimer…", onSelect: remove, disabled: true },
    ]);
    expect(screen.getByRole("menuitem", { name: "Publier" })).toHaveFocus();
    press("ArrowDown");
    expect(screen.getByRole("menuitem", { name: "Publier" })).toHaveFocus();
    expect(screen.getByRole("menuitem", { name: "Supprimer…" })).toBeDisabled();
  });
});
