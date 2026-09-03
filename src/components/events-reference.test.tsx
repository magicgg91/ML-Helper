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
  color: "violet" as const,
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
    // Bloc 81/F: the badge is "Jx-Jy (durée)" now, not a bare "24h" — a
    // substring match still confirms the hours are in there.
    expect(eventsTiles().getByText(/24h/)).toBeInTheDocument();
    expect(eventsTiles().getByText(/48h/)).toBeInTheDocument();
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
            color: "violet",
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
      // Bloc 81/F: "Jx-Jy (durée)" — the only event in this league's list,
      // so it starts at J0 and, at 72h, ends at J3.
      expect(durationBadge).toHaveTextContent("J0-J3 (72h)");
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
              color: "violet",
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
      // Bloc 81/F: the only event in the list, so J0-J1 for a 24h event.
      expect(tile.querySelector(".events-tile-badge-duration")).toHaveTextContent(
        "J0-J1 (24h)",
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

    // Bloc 81/A: the duration used to repeat here too (name + "72h" per
    // segment) — now redundant since the tile below already shows it
    // (Bloc 81/F), so the segment's own label is just the name.
    it("Bloc81/A: shows each segment's event name only — no duration, tiers, or rewards", () => {
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
      expect(
        timeline.querySelector(".events-timeline-duration"),
      ).not.toBeInTheDocument();
      expect(within(timeline).queryByText(/72h/)).not.toBeInTheDocument();
      expect(within(timeline).queryByText(/24h/)).not.toBeInTheDocument();
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

    // Bloc 81/E: revises Bloc 79/D's flat every-24h scale — a tick now only
    // marks where an event actually changes (this one's end / the next
    // one's start), so for the cdc's own 6-event Diamant/Légende example
    // (72+72+72+72+24+24 = 336h = 14 days) the expected set is exactly
    // J0, J3, J6, J9, J12, J13 — the 5 boundaries BETWEEN the 6 events,
    // plus J0 for the season's own start. E6's own end (J14, which happens
    // to coincide with the season's total length here) is deliberately
    // NOT a tick: nothing follows E6, so there's no "next event start" to
    // mark there.
    it("Bloc81/E: draws a tick only where an event actually changes, not every 24h", () => {
      const catalog = catalogWith({
        diamond: { seasonDurationDays: 14, events: diamondLegendEvents },
      });
      render(<EventsReferenceTable catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Diamant" }));

      const scale = document.querySelector(".events-timeline-scale")!;
      const ticks = scale.querySelectorAll(".events-timeline-tick-group");
      expect(ticks).toHaveLength(6);

      const expectedDays = [0, 3, 6, 9, 12, 13];
      for (const day of expectedDays) {
        const label = day === 0 ? "J0" : `J+${day}`;
        expect(screen.getByTestId(`events-timeline-tick-${day}`)).toHaveTextContent(
          label,
        );
      }
      // Never a tick at J14 — E6's own end, nothing follows it.
      expect(
        screen.queryByTestId("events-timeline-tick-14"),
      ).not.toBeInTheDocument();

      function tickLeft(day: number) {
        const style = screen
          .getByTestId(`events-timeline-tick-${day}`)
          .getAttribute("style")!;
        const match = style.match(/left: ([\d.]+)%/);
        return match ? Number(match[1]) : NaN;
      }
      expect(tickLeft(0)).toBeCloseTo(0, 5);
      expect(tickLeft(3)).toBeCloseTo((72 / 336) * 100, 5);
      expect(tickLeft(13)).toBeCloseTo((312 / 336) * 100, 5);
    });

    // Bloc 80/F: revises Bloc 79/G's auto-derivation-from-name entirely —
    // the color is now the admin's own manual pick per event, applied to
    // the timeline segment AND (grey tile background unchanged) the
    // matching tile's title text, so 2 occurrences of the same name only
    // share a color when the admin gives them the same one on purpose.
    // Bloc 81/D: also checks the timeline's OWN name label — not just the
    // tile's — is written in that same chosen color, not a fixed one.
    it("Bloc80/F, 81/D: colors each segment (and its own timeline name label) with the event's own chosen color, and colors the matching tile's title the same", () => {
      const catalog = catalogWith({
        diamond: {
          seasonDurationDays: 5,
          events: [
            {
              ...recruiterEvent,
              name: "Architecte",
              duration: 72,
              color: "sapphire",
            },
            {
              ...recruiterEvent,
              name: "Recruteur",
              duration: 24,
              color: "amber-bright",
            },
            // Same color as the 1st "Architecte" — chosen on purpose by
            // the admin, not derived from the (identical) name.
            {
              ...recruiterEvent,
              name: "Architecte",
              duration: 24,
              color: "sapphire",
            },
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
      expect(background(0)).toBe("var(--event-sapphire)");
      expect(background(1)).toBe("var(--event-amber-bright)");
      expect(background(2)).toBe("var(--event-sapphire)");

      // Bloc 81/D: the timeline's OWN name labels (not the tiles) match
      // their segment's color exactly.
      const timelineNames = Array.from(
        document.querySelectorAll(".events-timeline .events-timeline-name"),
      ) as HTMLElement[];
      expect(timelineNames[0]!.style.color).toBe("var(--event-sapphire)");
      expect(timelineNames[1]!.style.color).toBe("var(--event-amber-bright)");
      expect(timelineNames[2]!.style.color).toBe("var(--event-sapphire)");

      const tileNames = Array.from(
        document.querySelectorAll(".events-tile-grid .events-tile-name"),
      ) as HTMLElement[];
      const architecteNames = tileNames.filter(
        (el) => el.textContent === "Architecte",
      );
      expect(architecteNames).toHaveLength(2);
      for (const name of architecteNames)
        expect(name.style.color).toBe("var(--event-sapphire)");
      const recruiterName = tileNames.find(
        (el) => el.textContent === "Recruteur",
      )!;
      expect(recruiterName.style.color).toBe("var(--event-amber-bright)");
      // Bloc 80/F: the tile's own background never changes — only its
      // title text color does. Grey stays grey.
      const architecteTile = architecteNames[0]!.closest(".events-tile")!;
      expect(architecteTile).not.toHaveAttribute("style");
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

    // Bloc 80/G: the label's own box is sized proportionally to its
    // segment's share of the season (a wide 72h event gets more room than
    // a narrow 24h one) instead of Bloc 79/E's flat 9rem cap for every
    // segment regardless of width.
    it("Bloc80/G: gives a 72h event's label more room than a narrow 24h event's", () => {
      const wideCatalog = catalogWith({
        diamond: {
          seasonDurationDays: 14,
          events: [
            { ...recruiterEvent, name: "Enrôleur de troupes", duration: 72 },
          ],
        },
      });
      const { unmount } = render(<EventsReferenceTable catalog={wideCatalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Diamant" }));
      const wideLabel = document.querySelector(
        ".events-timeline-label",
      ) as HTMLElement;
      const wideMaxWidth = parseFloat(wideLabel.style.maxWidth);
      unmount();

      const narrowCatalog = catalogWith({
        bronze: {
          seasonDurationDays: 21,
          events: [
            { ...recruiterEvent, name: "Enrôleur de troupes", duration: 24 },
          ],
        },
      });
      render(<EventsReferenceTable catalog={narrowCatalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
      const narrowLabel = document.querySelector(
        ".events-timeline-label",
      ) as HTMLElement;
      const narrowMaxWidth = parseFloat(narrowLabel.style.maxWidth);

      expect(wideMaxWidth).toBeGreaterThan(narrowMaxWidth);
      // Still a readable floor, never collapsing to near-nothing.
      expect(narrowMaxWidth).toBeGreaterThanOrEqual(4.5);
    });
  });
});
