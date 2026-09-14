import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminConfigSection } from "./admin-config-section";

afterEach(cleanup);

// Bloc 100/C: the Configuration tab is meant to keep gaining sections, so
// folding is a property of the section wrapper rather than something the tab
// arbitrates between a known pair of panels.
describe("AdminConfigSection", () => {
  function renderTwo() {
    render(
      <>
        <AdminConfigSection title="Langues" description="Visibilité publique.">
          <p>panneau des langues</p>
        </AdminConfigSection>
        <AdminConfigSection title="Suivi des visites">
          <p>panneau de suivi</p>
        </AdminConfigSection>
      </>,
    );
    const section = (title: string) =>
      screen.getByText(title).closest("details")!;
    return {
      languages: section("Langues"),
      tracking: section("Suivi des visites"),
    };
  }

  it("opens each section by default, titled and described", () => {
    const { languages, tracking } = renderTwo();
    expect(languages.open).toBe(true);
    expect(tracking.open).toBe(true);
    // The title is a real heading, so the tab keeps a readable outline.
    expect(screen.getByRole("heading", { name: "Langues" })).toBeVisible();
    expect(screen.getByText("Visibilité publique.")).toBeVisible();
    expect(screen.getByText("panneau de suivi")).toBeVisible();
  });

  it("folds one section without touching the other", () => {
    const { languages, tracking } = renderTwo();

    fireEvent.click(screen.getByText("Langues"));
    expect(languages.open).toBe(false);
    expect(tracking.open).toBe(true);

    // And the other way round, from that state: neither drives the other.
    fireEvent.click(screen.getByText("Suivi des visites"));
    expect(languages.open).toBe(false);
    expect(tracking.open).toBe(false);

    fireEvent.click(screen.getByText("Langues"));
    expect(languages.open).toBe(true);
    expect(tracking.open).toBe(false);
  });

  it("can start folded when a section asks for it", () => {
    render(
      <AdminConfigSection title="Section repliée" defaultOpen={false}>
        <p>contenu</p>
      </AdminConfigSection>,
    );
    expect(screen.getByText("Section repliée").closest("details")!.open).toBe(
      false,
    );
  });
});
