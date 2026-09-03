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
  // Bloc 77/D put each event's own name in 2 places now (its tile AND the
  // timeline segment above it) — these tests scope their queries to
  // .events-tile-grid to keep targeting the tile, not the timeline label
  // that also carries the same text.
  function eventsTiles() {
    return within(document.querySelector(".events-tile-grid") as HTMLElement);
  }

  it("Bloc60: shows a fully independent event list per league", () => {
    const catalog = catalogWith({
      legend: { seasonDurationDays: 14, events: [recruiterEvent] },
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    expect(screen.queryByText("Recruteur")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    expect(eventsTiles().getByText("Recruteur")).toBeInTheDocument();
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
    const names = eventsTiles()
      .getAllByText(/Premier|Second/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Premier", "Second"]);
    expect(eventsTiles().getByText("24h")).toBeInTheDocument();
    expect(eventsTiles().getByText("48h")).toBeInTheDocument();
  });

  // Bloc 77/A, 79/F: the event's own description shows next to its name —
  // visible even with the tile closed, not gated behind opening it.
  it("Bloc79/F: shows the event's own description right away, tile still closed", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    const tile = document.querySelector("details.events-tile")!;
    expect(tile).not.toHaveAttribute("open");
    expect(screen.getByText("Enrôle un maximum de troupes")).toBeVisible();
  });

  // Bloc60: each event is a collapsible block, closed by default.
  it("Bloc60: renders each event closed by default, opening to reveal its tiers", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceTable catalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));

    const details = document.querySelector("details.events-tile")!;
    expect(details).not.toHaveAttribute("open");
    // The first tier's own objective/reward only exist inside the table —
    // the always-visible badge only ever carries the LAST tier's objective.
    expect(screen.queryByText("1G troupes enrôlées")).not.toBeVisible();

    fireEvent.click(within(details as HTMLElement).getByText("Recruteur"));
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
    const details = document.querySelector("details.events-tile")!;
    fireEvent.click(within(details as HTMLElement).getByText("Recruteur"));
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
    fireEvent.click(eventsTiles().getByText("Vide"));
    expect(screen.getByText("Aucun palier pour cet événement.")).toBeVisible();
  });

  // Bloc 79/I: the tile itself is the collapsible unit, with a 2-per-row
  // (1 mobile) grey grid replacing Bloc 60's plain block list, and 2
  // badges (final-tier objective, duration) always visible on the tile.
  describe("Bloc79/I: tile grid", () => {
    it("lays out events as a 2-per-row grid, chronological order, no image", () => {
      const catalog = catalogWith({
        bronze: {
          seasonDurationDays: 21,
          events: [
            { ...recruiterEvent, name: "Premier" },
            { ...recruiterEvent, name: "Second" },
          ],
        },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
      const grid = document.querySelector(".events-tile-grid")!;
      const tiles = grid.querySelectorAll(":scope > details.events-tile");
      expect(tiles).toHaveLength(2);
      expect(tiles[0]).toHaveTextContent("Premier");
      expect(tiles[1]).toHaveTextContent("Second");
      expect(grid.querySelector("img")).not.toBeInTheDocument();
      // Bloc 79/H: the admin's position indicator is purely internal —
      // never rendered on the public side.
      expect(
        grid.querySelector(".events-admin-position"),
      ).not.toBeInTheDocument();
    });

    it("shows the final tier's objective and the duration as 2 badges, visible with the tile closed", () => {
      const catalog = catalogWith({
        bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
      const tile = document.querySelector("details.events-tile") as HTMLElement;
      expect(tile).not.toHaveAttribute("open");
      const objectiveBadge = tile.querySelector(
        ".events-tile-badge-objective",
      )!;
      const durationBadge = tile.querySelector(".events-tile-badge-duration")!;
      // The LAST tier ("3G troupes enrôlées"), never the first one.
      expect(objectiveBadge).toHaveTextContent("3G troupes enrôlées");
      expect(objectiveBadge).toBeVisible();
      expect(durationBadge).toHaveTextContent("72h");
      expect(durationBadge).toBeVisible();
    });

    it("shows no objective badge for an event with no tiers, duration badge still shows", () => {
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
      const tile = document.querySelector("details.events-tile") as HTMLElement;
      expect(
        tile.querySelector(".events-tile-badge-objective"),
      ).not.toBeInTheDocument();
      expect(tile.querySelector(".events-tile-badge-duration")).toHaveTextContent(
        "24h",
      );
    });

    it("clicking the tile opens it, revealing every tier (Objectif + Récompense), clicking again closes it", () => {
      const catalog = catalogWith({
        bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
      const tile = document.querySelector("details.events-tile") as HTMLElement;
      const summary = tile.querySelector("summary")!;
      expect(tile).not.toHaveAttribute("open");

      fireEvent.click(summary);
      expect(tile).toHaveAttribute("open");
      const table = tile.querySelector("table")!;
      expect(within(table).getByText("1G troupes enrôlées")).toBeVisible();
      expect(within(table).getByText("100M or + 250 éclats")).toBeVisible();
      // The last tier's objective also duplicates the always-visible badge
      // above — scoped to the table to avoid an ambiguous match.
      expect(within(table).getByText("3G troupes enrôlées")).toBeVisible();
      expect(within(table).getByText("300M or + 5 saphirs")).toBeVisible();

      fireEvent.click(summary);
      expect(tile).not.toHaveAttribute("open");
    });
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

    // Bloc 79/D: a fine 24h-tick day scale, anchored on the season's fixed
    // end — validated against the same 336h (14-day) Diamant/Légende
    // example, whose event boundaries land on exact day numbers.
    it("Bloc79/D: draws a J0..J14 day scale, ticks landing on cumulative event boundaries", () => {
      const catalog = catalogWith({
        diamond: { seasonDurationDays: 14, events: diamondLegendEvents },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Diamant" }));

      const scale = document.querySelector(".events-timeline-scale")!;
      const ticks = scale.querySelectorAll(".events-timeline-tick-group");
      expect(ticks).toHaveLength(15); // J0..J14 inclusive

      expect(screen.getByTestId("events-timeline-tick-0")).toHaveTextContent(
        "J0",
      );
      // Event 2 (E2) starts right where E1 (72h = 3 days) ends.
      expect(screen.getByTestId("events-timeline-tick-3")).toHaveTextContent(
        "J+3",
      );
      expect(screen.getByTestId("events-timeline-tick-14")).toHaveTextContent(
        "J+14",
      );

      function tickLeft(day: number) {
        const style = screen
          .getByTestId(`events-timeline-tick-${day}`)
          .getAttribute("style")!;
        const match = style.match(/left: ([\d.]+)%/);
        return match ? Number(match[1]) : NaN;
      }
      expect(tickLeft(0)).toBeCloseTo(0, 5);
      expect(tickLeft(3)).toBeCloseTo((72 / 336) * 100, 5);
      expect(tickLeft(14)).toBeCloseTo(100, 5);
    });

    // Bloc 79/G: a repeated event name (e.g. "Architecte" as a 72h event
    // early on, then a 24h event later, different tiers each time — 2
    // independent rows, no uniqueness constraint) shares a color across
    // every occurrence, keyed off the name alone.
    it("Bloc79/G: gives 2 occurrences of the same event name the same segment color, distinct from a differently-named neighbor", () => {
      const catalog = catalogWith({
        diamond: {
          seasonDurationDays: 5,
          events: [
            { ...recruiterEvent, name: "Architecte", duration: 72 },
            { ...recruiterEvent, name: "Recruteur", duration: 24 },
            { ...recruiterEvent, name: "Architecte", duration: 24 },
          ],
        },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Diamant" }));

      function background(index: number) {
        const style = segmentStyle(index);
        const match = style.match(/background: ([^;]+);/);
        return match?.[1];
      }
      const architecteColor1 = background(0);
      const recruiterColor = background(1);
      const architecteColor2 = background(2);
      expect(architecteColor1).toBeDefined();
      expect(architecteColor1).toBe(architecteColor2);
      expect(architecteColor1).not.toBe(recruiterColor);
    });

    // Bloc 79/E: a name too long for its own segment (cdc example) must
    // stay fully readable, never cut down to an ellipsis.
    it("Bloc79/E: shows a long event name in full, even on a segment it doesn't fit in", () => {
      const catalog = catalogWith({
        diamond: {
          seasonDurationDays: 14,
          events: [{ ...recruiterEvent, name: "Enrôleur de troupes", duration: 72 }],
        },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Diamant" }));
      const timeline = document.querySelector(
        ".events-timeline",
      ) as HTMLElement;
      expect(
        within(timeline).getByText("Enrôleur de troupes"),
      ).toHaveTextContent("Enrôleur de troupes");
    });
  });
});
