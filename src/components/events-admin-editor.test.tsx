import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventsReferenceScreen } from "./events-admin-editor";
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

describe("EventsReferenceScreen", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
  });

  it("starts on the first league, with no events", () => {
    render(<EventsReferenceScreen initialCatalog={emptyEventsCatalog} />);
    const group = screen.getByRole("group", { name: "Ligue" });
    expect(
      within(group).getByRole("button", { name: "Bronze" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Aucun objet pour l’instant.")).toBeInTheDocument();
  });

  it("Bloc60: each league's event list is entirely independent — switching leagues never bleeds data through", () => {
    const catalog = catalogWith({
      legend: { seasonDurationDays: 14, events: [recruiterEvent] },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    expect(screen.queryByDisplayValue("Recruteur")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    expect(screen.getByDisplayValue("Recruteur")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    expect(screen.queryByDisplayValue("Recruteur")).not.toBeInTheDocument();
  });

  it("Bloc60: adds an event to the selected league only", () => {
    render(<EventsReferenceScreen initialCatalog={emptyEventsCatalog} />);
    fireEvent.click(screen.getByTestId("add-event-bronze"));
    expect(screen.getByTestId("event-bronze-0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Or" }));
    expect(screen.queryByTestId("event-gold-0")).not.toBeInTheDocument();
  });

  it("Bloc60: edits an event's name", () => {
    render(<EventsReferenceScreen initialCatalog={emptyEventsCatalog} />);
    fireEvent.click(screen.getByTestId("add-event-bronze"));
    const card = screen.getByTestId("event-bronze-0");
    fireEvent.change(within(card).getByLabelText(/Nom.*événement 1/), {
      target: { value: "Nouvel Event" },
    });
    expect(within(card).getByDisplayValue("Nouvel Event")).toBeInTheDocument();
  });

  // Bloc 77/A: Description is a genuine editable field, persisted through
  // to the saved catalog.
  it("Bloc77/A: makes an event's Description field editable and persists it", async () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    const card = screen.getByTestId("event-bronze-0");
    const descriptionInput = within(card).getByLabelText(
      /Description.*événement 1/,
    ) as HTMLInputElement;
    expect(descriptionInput.value).toBe("Enrôle un maximum de troupes");
    fireEvent.change(descriptionInput, {
      target: { value: "Nouvelle description" },
    });
    expect(
      within(card).getByDisplayValue("Nouvelle description"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer toute la page" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.bronze.events[0].description_fr).toBe("Nouvelle description");
  });

  // Bloc 77/B: startDay/endDay are gone — a single Durée select (24/48/72h)
  // replaces them, with no trace of the 2 old fields anywhere.
  it("Bloc77/B: replaces Jour de début/fin with a single Durée select (24h/48h/72h), no trace of the old fields", async () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    const card = screen.getByTestId("event-bronze-0");
    expect(
      within(card).queryByLabelText(/Jour de début/),
    ).not.toBeInTheDocument();
    expect(within(card).queryByLabelText(/Jour de fin/)).not.toBeInTheDocument();

    const durationSelect = within(card).getByLabelText(
      /Durée.*événement 1/,
    ) as HTMLSelectElement;
    expect(durationSelect.value).toBe("72");
    expect(
      within(durationSelect).getAllByRole("option").map((o) => o.textContent),
    ).toEqual(["24h", "48h", "72h"]);
    fireEvent.change(durationSelect, { target: { value: "24" } });
    expect(durationSelect.value).toBe("24");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer toute la page" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.bronze.events[0].duration).toBe(24);
    expect(body.bronze.events[0]).not.toHaveProperty("startDay");
    expect(body.bronze.events[0]).not.toHaveProperty("endDay");
  });

  // Bloc 77/C: the season duration is editable per league and defaults to
  // a reasonable value (not 0/blank) — it's never hardcoded, since the
  // public timeline visual uses it as its denominator.
  it("Bloc77/C: makes the season duration editable per league, with a reasonable default, and persists it", async () => {
    render(<EventsReferenceScreen initialCatalog={emptyEventsCatalog} />);
    const seasonInput = screen.getByLabelText(
      "Durée de la saison (jours)",
    ) as HTMLInputElement;
    expect(Number(seasonInput.value)).toBeGreaterThan(0);
    expect(seasonInput.value).toBe("21"); // Bronze's own default (cdc).

    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    expect(seasonInput.value).toBe("14"); // Légende's own default.
    fireEvent.change(seasonInput, { target: { value: "16" } });
    expect(seasonInput.value).toBe("16");

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer toute la page" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.legend.seasonDurationDays).toBe(16);
    expect(body.bronze.seasonDurationDays).toBe(21); // untouched league.
  });

  it("Bloc60: reorders events with the move up/down arrows", () => {
    const catalog = catalogWith({
      bronze: {
        seasonDurationDays: 21,
        events: [
          { ...recruiterEvent, name: "Premier" },
          { ...recruiterEvent, name: "Second" },
        ],
      },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    const cards = () => screen.getAllByTestId(/^event-bronze-/);
    expect(cards().map((c) => within(c).getByRole("textbox", { name: /Nom/ })))
      .toEqual(
        [screen.getByDisplayValue("Premier"), screen.getByDisplayValue("Second")],
      );

    fireEvent.click(screen.getByTestId("move-down-event-bronze-0"));
    const reordered = cards();
    expect(
      within(reordered[0]).getByDisplayValue("Second"),
    ).toBeInTheDocument();
    expect(
      within(reordered[1]).getByDisplayValue("Premier"),
    ).toBeInTheDocument();
  });

  it("Bloc60: removes an event after confirmation", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByTestId("remove-event-bronze-0"));
    expect(screen.queryByDisplayValue("Recruteur")).not.toBeInTheDocument();
  });

  it("Bloc60: cancels the removal when the confirmation is declined", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByTestId("remove-event-bronze-0"));
    expect(screen.getByDisplayValue("Recruteur")).toBeInTheDocument();
  });

  it("Bloc60: CRUD on an event's nested tier list reuses EditableDataTable (add/edit/reorder/remove)", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    expect(screen.getByDisplayValue("1G troupes enrôlées")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("add-tier-bronze-0"));
    const objectiveInputs = screen.getAllByLabelText(/Objectif/);
    fireEvent.change(objectiveInputs[objectiveInputs.length - 1], {
      target: { value: "Nouveau palier" },
    });
    expect(screen.getByDisplayValue("Nouveau palier")).toBeInTheDocument();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByTestId("remove-row-0-bronze-0"));
    expect(
      screen.queryByDisplayValue("1G troupes enrôlées"),
    ).not.toBeInTheDocument();
  });

  // Bloc 60 review (Codex PR #81): same editorial-locale toggle as
  // Consommables (Bloc 48/A) — tier text is captured per fr/en field, and
  // the toggle switches which one the table edits.
  it("Bloc60 review: switching the locale selector switches the tier table to the English values", () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    expect(screen.getByDisplayValue("1G troupes enrôlées")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Langue du texte"), {
      target: { value: "en" },
    });
    expect(screen.getByDisplayValue("1B troops enlisted")).toBeInTheDocument();
    expect(screen.getByDisplayValue("100M gold + 250 shards")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("1G troupes enrôlées"),
    ).not.toBeInTheDocument();
  });

  it("Bloc60: blocks save and shows an error when an event has no name or a tier is incomplete", async () => {
    const catalog = catalogWith({
      bronze: {
        seasonDurationDays: 21,
        events: [
          {
            name: "",
            description_fr: "",
            description_en: "",
            duration: 24,
            tiers: [
              { objective_fr: "", objective_en: "", reward_fr: "R", reward_en: "" },
            ],
          },
        ],
      },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer toute la page" }));
    await waitFor(() =>
      expect(
        screen.getAllByText("Ce champ est obligatoire.").length,
      ).toBeGreaterThan(0),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("Bloc60: saves the whole catalog (every league, not just the selected one) in one PUT", async () => {
    const catalog = catalogWith({
      bronze: { seasonDurationDays: 21, events: [recruiterEvent] },
      legend: {
        seasonDurationDays: 14,
        events: [{ ...recruiterEvent, name: "Autre" }],
      },
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer toute la page" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("/api/admin/guides/references/events");
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.bronze.events[0].name).toBe("Recruteur");
    expect(body.legend.events[0].name).toBe("Autre");
    expect(body.gold.events).toEqual([]);
  });
});
