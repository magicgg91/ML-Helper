import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabList, TabPanel, tabId, tabPanelId } from "./tabs";

afterEach(cleanup);

type Key = "alpha" | "beta";

const tabs = [
  { key: "alpha" as const, label: "Alpha" },
  { key: "beta" as const, label: "Beta" },
];

function renderTabs(active: Key | undefined, onSelect = vi.fn()) {
  const view = render(
    <>
      <TabList
        idPrefix="demo"
        label="Démonstration"
        tabs={tabs}
        active={active}
        onSelect={onSelect}
      />
      {active && (
        <TabPanel idPrefix="demo" tabKey={active}>
          Contenu {active}
        </TabPanel>
      )}
    </>,
  );
  return { ...view, onSelect };
}

// Bloc 93/M1: the ARIA relationship these two components own was previously
// written out by hand at 6 sites. These tests pin it once.
describe("TabList", () => {
  it("names the tablist and marks only the active tab selected", () => {
    renderTabs("alpha");
    const list = screen.getByRole("tablist", { name: "Démonstration" });
    expect(list).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("points each tab at its panel, and the panel back at its tab", () => {
    renderTabs("alpha");
    const tab = screen.getByRole("tab", { name: "Alpha" });
    const panel = screen.getByRole("tabpanel");
    expect(tab.id).toBe(tabId("demo", "alpha"));
    expect(tab).toHaveAttribute("aria-controls", tabPanelId("demo", "alpha"));
    expect(panel.id).toBe(tabPanelId("demo", "alpha"));
    expect(panel).toHaveAttribute("aria-labelledby", tabId("demo", "alpha"));
    // The references resolve to real elements in both directions.
    expect(document.getElementById(tab.getAttribute("aria-controls")!)).toBe(
      panel,
    );
    expect(
      document.getElementById(panel.getAttribute("aria-labelledby")!),
    ).toBe(tab);
  });

  it("keeps a single tab stop, on the active tab", () => {
    renderTabs("beta");
    expect(screen.getByRole("tab", { name: "Alpha" }).tabIndex).toBe(-1);
    expect(screen.getByRole("tab", { name: "Beta" }).tabIndex).toBe(0);
  });

  it("reports the selected key on click", () => {
    const { onSelect } = renderTabs("alpha");
    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));
    expect(onSelect).toHaveBeenCalledWith("beta");
  });

  it("moves focus with the arrow keys, wrapping around", () => {
    renderTabs("alpha");
    const list = screen.getByRole("tablist");
    const [alpha, beta] = screen.getAllByRole("tab");
    alpha.focus();
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(document.activeElement).toBe(beta);
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(document.activeElement).toBe(alpha);
    fireEvent.keyDown(list, { key: "End" });
    expect(document.activeElement).toBe(beta);
    fireEvent.keyDown(list, { key: "Home" });
    expect(document.activeElement).toBe(alpha);
  });

  it("disables and badges an unavailable tab", () => {
    render(
      <TabList
        idPrefix="demo"
        label="Démonstration"
        active="alpha"
        onSelect={vi.fn()}
        tabs={[
          { key: "alpha" as const, label: "Alpha" },
          {
            key: "beta" as const,
            label: "Beta",
            available: false,
            unavailableLabel: "Bientôt",
          },
        ]}
      />,
    );
    const beta = screen.getByRole("tab", { name: /Beta/ });
    expect(beta).toBeDisabled();
    expect(beta).toHaveAttribute("title", "Bientôt");
    expect(beta).toHaveTextContent("Bientôt");
  });

  it("gives a panelless placeholder no dangling aria-controls", () => {
    const onSelect = vi.fn();
    render(
      <TabList<"alpha">
        idPrefix="demo"
        label="Démonstration"
        active="alpha"
        onSelect={onSelect}
        tabs={[
          {
            key: "soon",
            label: "Bientôt disponible",
            available: false,
            unavailableLabel: "Bientôt",
            hasPanel: false,
          },
          { key: "alpha" as const, label: "Alpha" },
        ]}
      />,
    );
    const placeholder = screen.getByRole("tab", { name: /Bientôt disponible/ });
    // No panel exists for it, so it must not claim to control one.
    expect(placeholder).not.toHaveAttribute("aria-controls");
    expect(placeholder).not.toHaveAttribute("id");
    expect(placeholder).toHaveAttribute("aria-selected", "false");
    expect(placeholder).toBeDisabled();
  });

  it("renders as a nav by default and as a div when asked", () => {
    const { container, rerender } = render(
      <TabList
        idPrefix="demo"
        label="Démonstration"
        tabs={tabs}
        active="alpha"
        onSelect={vi.fn()}
      />,
    );
    expect(container.querySelector("nav")).not.toBeNull();
    rerender(
      <TabList
        as="div"
        className="mode-switch"
        idPrefix="demo"
        label="Démonstration"
        tabs={tabs}
        active="alpha"
        onSelect={vi.fn()}
      />,
    );
    expect(container.querySelector("nav")).toBeNull();
    expect(container.querySelector("div.mode-switch")).not.toBeNull();
  });
});

describe("TabPanel", () => {
  it("is focusable so Tab reaches its content from the selected tab", () => {
    renderTabs("alpha");
    expect(screen.getByRole("tabpanel").tabIndex).toBe(0);
  });

  it("forwards a className and extra attributes", () => {
    render(
      <TabPanel
        idPrefix="demo"
        tabKey="alpha"
        className="calculator-stack"
        aria-live="polite"
      >
        Contenu
      </TabPanel>,
    );
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveClass("calculator-stack");
    expect(panel).toHaveAttribute("aria-live", "polite");
  });
});
