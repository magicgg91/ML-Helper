import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventsReferenceTable } from "./events-reference";
import { renderWithIntl as render } from "../test/render-with-intl";
import { emptyEventsCatalog, type EventsCatalog } from "../lib/events";

function catalogWith(overrides: Partial<EventsCatalog>): EventsCatalog {
  return { ...emptyEventsCatalog, ...overrides };
}

const recruiterEvent = {
  name: "Recruteur",
  startDay: "1",
  endDay: "7",
  tiers: [
    {
      objective_fr: "1G troupes enrôlées",
      objective_en: "1B troops enlisted",
      reward_fr: "100M or + 250 éclats",
      reward_en: "100M gold + 250 shards",
    },
    {
      objective_fr: "3G troupes enrôlées",
      objective_en: "3B troops enlisted",
      reward_fr: "300M or + 5 saphirs",
      reward_en: "300M gold + 5 sapphires",
    },
  ],
};

describe("EventsReferenceTable", () => {
  afterEach(cleanup);

  it("waits for a league instead of showing anything by default", () => {
    render(<EventsReferenceTable catalog={emptyEventsCatalog} />);
    const group = screen.getByRole("group", { name: "Ligue" });
    for (const button of within(group).getAllByRole("button"))
      expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Choisis une ligue pour voir ses événements.",
    );
  });

  it("shows an empty message for a league with no events yet", () => {
    render(<EventsReferenceTable catalog={emptyEventsCatalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Aucun événement pour cette ligue pour le moment.",
    );
  });

  // Bloc60: entirely independent per league — switching leagues swaps the
  // whole event list, never mixing data from another league.
  it("Bloc60: shows a fully independent event list per league", () => {
    const catalog = catalogWith({ legend: [recruiterEvent] });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    expect(screen.queryByText("Recruteur")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    expect(screen.getByText("Recruteur")).toBeInTheDocument();
  });

  it("Bloc60: lists events in order, each showing its name and duration", () => {
    const catalog = catalogWith({
      bronze: [
        { ...recruiterEvent, name: "Premier", startDay: "1", endDay: "3" },
        { ...recruiterEvent, name: "Second", startDay: "4", endDay: "6" },
      ],
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    const names = screen
      .getAllByText(/Premier|Second/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Premier", "Second"]);
    expect(screen.getByText(/1.*–.*3/)).toBeInTheDocument();
    expect(screen.getByText(/4.*–.*6/)).toBeInTheDocument();
  });

  // Bloc60: each event is a collapsible block, closed by default.
  it("Bloc60: renders each event closed by default, opening to reveal its tiers", () => {
    const catalog = catalogWith({ bronze: [recruiterEvent] });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));

    const details = document.querySelector("details.events-card")!;
    expect(details).not.toHaveAttribute("open");
    expect(screen.queryByText("1G troupes enrôlées")).not.toBeVisible();

    fireEvent.click(screen.getByText("Recruteur"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("1G troupes enrôlées")).toBeVisible();
    expect(screen.getByText("100M or + 250 éclats")).toBeVisible();
  });

  // Bloc 60 review (Codex PR #81): tier text is captured per fr/en field
  // (same pattern as Boutique's name_fr/name_en, Bloc44-review/C) — a
  // non-fr visitor must see the English text, never the raw French string.
  it("Bloc60 review: shows the English tier text to a non-fr visitor, French to a fr visitor", () => {
    const catalog = catalogWith({ bronze: [recruiterEvent] });
    render(<EventsReferenceTable catalog={catalog} />, "en");
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    fireEvent.click(screen.getByText("Recruteur"));
    expect(screen.getByText("1B troops enlisted")).toBeVisible();
    expect(screen.getByText("100M gold + 250 shards")).toBeVisible();
    expect(screen.queryByText("1G troupes enrôlées")).not.toBeInTheDocument();
  });

  it("Bloc60: shows a no-tiers message for an event with an empty tier list", () => {
    const catalog = catalogWith({
      bronze: [{ name: "Vide", startDay: "", endDay: "", tiers: [] }],
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    fireEvent.click(screen.getByText("Vide"));
    expect(screen.getByText("Aucun palier pour cet événement.")).toBeVisible();
  });
});
