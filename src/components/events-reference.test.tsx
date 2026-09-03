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
  description_fr: "Enrôle un maximum de troupes",
  description_en: "Enlist as many troops as possible",
  duration: 72 as const,
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

  // Bloc 68/N: the league buttons opt into the shared mobile 3-column
  // grid (.league-buttons-grid) instead of the default wrap.
  it("Bloc68/N: gives the league buttons the mobile 3-column grid class", () => {
    render(<EventsReferenceTable catalog={emptyEventsCatalog} />);
    expect(screen.getByRole("group", { name: "Ligue" })).toHaveClass(
      "league-buttons-grid",
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
  // Bloc 77/D put each event's own name in 2 places now (its collapsible
  // card AND the timeline segment above it) — these pre-existing tests
  // scope their queries to .events-list (the card list) to keep targeting
  // the card, not the timeline label that now also carries the same text.
  function eventsList() {
    return within(document.querySelector(".events-list") as HTMLElement);
  }

  it("Bloc60: shows a fully independent event list per league", () => {
    const catalog = catalogWith({
      legend: { seasonDurationDays: 14, events: [recruiterEvent] },
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    expect(screen.queryByText("Recruteur")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    expect(eventsList().getByText("Recruteur")).toBeInTheDocument();
  });

  it("Bloc77/B: lists events in order, each showing its name and duration in hours", () => {
    const catalog = catalogWith({
      bronze: {
        seasonDurationDays: 21,
        events: [
          { ...recruiterEvent, name: "Premier", duration: 24 },
          { ...recruiterEvent, name: "Second", duration: 48 },
        ],
      },
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    const names = eventsList()
      .getAllByText(/Premier|Second/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Premier", "Second"]);
    expect(eventsList().getByText("24h")).toBeInTheDocument();
    expect(eventsList().getByText("48h")).toBeInTheDocument();
  });

  // Bloc 77/A: the event's own description shows in the collapsible card.
  it("Bloc77/A: shows the event's own description once opened", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    fireEvent.click(eventsList().getByText("Recruteur"));
    expect(
      screen.getByText("Enrôle un maximum de troupes"),
    ).toBeVisible();
  });

  // Bloc60: each event is a collapsible block, closed by default.
  it("Bloc60: renders each event closed by default, opening to reveal its tiers", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));

    const details = document.querySelector("details.events-card")!;
    expect(details).not.toHaveAttribute("open");
    expect(screen.queryByText("1G troupes enrôlées")).not.toBeVisible();

    fireEvent.click(eventsList().getByText("Recruteur"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("1G troupes enrôlées")).toBeVisible();
    expect(screen.getByText("100M or + 250 éclats")).toBeVisible();
  });

  // Bloc 60 review (Codex PR #81): tier text is captured per fr/en field
  // (same pattern as Boutique's name_fr/name_en, Bloc44-review/C) — a
  // non-fr visitor must see the English text, never the raw French string.
  it("Bloc60 review: shows the English tier text to a non-fr visitor, French to a fr visitor", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceTable catalog={catalog} />, "en");
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    fireEvent.click(eventsList().getByText("Recruteur"));
    expect(screen.getByText("1B troops enlisted")).toBeVisible();
    expect(screen.getByText("100M gold + 250 shards")).toBeVisible();
    expect(screen.queryByText("1G troupes enrôlées")).not.toBeInTheDocument();
  });

  it("Bloc60: shows a no-tiers message for an event with an empty tier list", () => {
    const catalog = catalogWith({
      bronze: {
        seasonDurationDays: 21,
        events: [
          {
            name: "Vide",
            description_fr: "",
            description_en: "",
            duration: 24,
            tiers: [],
          },
        ],
      },
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    fireEvent.click(eventsList().getByText("Vide"));
    expect(screen.getByText("Aucun palier pour cet événement.")).toBeVisible();
  });

  // Bloc 77/D: the season timeline — validated against the cdc's own
  // Diamant/Légende example (6 events, 72+72+72+72+24+24 = 336h = 14 days,
  // exactly filling the season with no gap).
  describe("Bloc77/D: season timeline", () => {
    const diamondLegendEvents = [
      { ...recruiterEvent, name: "E1", duration: 72 as const },
      { ...recruiterEvent, name: "E2", duration: 72 as const },
      { ...recruiterEvent, name: "E3", duration: 72 as const },
      { ...recruiterEvent, name: "E4", duration: 72 as const },
      { ...recruiterEvent, name: "E5", duration: 24 as const },
      { ...recruiterEvent, name: "E6", duration: 24 as const },
    ];

    function segmentStyle(index: number) {
      const el = screen.getByTestId(`events-timeline-segment-${index}`);
      return el.getAttribute("style") ?? "";
    }

    function percent(style: string, property: "left" | "width") {
      const match = style.match(new RegExp(`${property}: ([\\d.]+)%`));
      return match ? Number(match[1]) : NaN;
    }

    it("positions each of the 6 events by cumulative duration, proportional to the 336h (14-day) season", () => {
      const catalog = catalogWith({
        diamond: { seasonDurationDays: 14, events: diamondLegendEvents },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Diamant" }));

      const expectedLefts = [0, 72, 144, 216, 288, 312].map(
        (hours) => (hours / 336) * 100,
      );
      const expectedWidths = [72, 72, 72, 72, 24, 24].map(
        (hours) => (hours / 336) * 100,
      );
      for (let i = 0; i < 6; i++) {
        const style = segmentStyle(i);
        expect(percent(style, "left")).toBeCloseTo(expectedLefts[i], 5);
        expect(percent(style, "width")).toBeCloseTo(expectedWidths[i], 5);
      }
      // The 6 segments exactly fill the bar with no gap: last left+width = 100%.
      const lastStyle = segmentStyle(5);
      expect(
        percent(lastStyle, "left") + percent(lastStyle, "width"),
      ).toBeCloseTo(100, 5);
    });

    it("shows each segment's event name and duration, and nothing else — never tiers or rewards", () => {
      const catalog = catalogWith({
        diamond: { seasonDurationDays: 14, events: diamondLegendEvents },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Diamant" }));

      const timeline = document.querySelector(
        ".events-timeline",
      ) as HTMLElement;
      for (const event of diamondLegendEvents) {
        expect(within(timeline).getByText(event.name)).toBeInTheDocument();
      }
      expect(within(timeline).getAllByText("72h")).toHaveLength(4);
      expect(within(timeline).getAllByText("24h")).toHaveLength(2);
      expect(
        within(timeline).queryByText("1G troupes enrôlées"),
      ).not.toBeInTheDocument();
      expect(
        within(timeline).queryByText("100M or + 250 éclats"),
      ).not.toBeInTheDocument();
      expect(within(timeline).queryByText("Objectif")).not.toBeInTheDocument();
      expect(within(timeline).queryByText("Récompense")).not.toBeInTheDocument();
    });

    it("renders no timeline for a league with no events", () => {
      render(<EventsReferenceTable catalog={emptyEventsCatalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
      expect(document.querySelector(".events-timeline")).not.toBeInTheDocument();
    });
  });
});
