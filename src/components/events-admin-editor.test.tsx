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
  startDay: "1",
  endDay: "7",
  tiers: [
    { objective: "1G troupes enrôlées", reward: "100M or + 250 éclats" },
    { objective: "3G troupes enrôlées", reward: "300M or + 5 saphirs" },
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
    const catalog = catalogWith({ legend: [recruiterEvent] });
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

  it("Bloc60: edits an event's name/startDay/endDay fields", () => {
    render(<EventsReferenceScreen initialCatalog={emptyEventsCatalog} />);
    fireEvent.click(screen.getByTestId("add-event-bronze"));
    const card = screen.getByTestId("event-bronze-0");
    fireEvent.change(within(card).getByLabelText(/Nom.*événement 1/), {
      target: { value: "Nouvel Event" },
    });
    fireEvent.change(within(card).getByLabelText(/Jour de début.*événement 1/), {
      target: { value: "1" },
    });
    fireEvent.change(within(card).getByLabelText(/Jour de fin.*événement 1/), {
      target: { value: "5" },
    });
    expect(within(card).getByDisplayValue("Nouvel Event")).toBeInTheDocument();
    expect(within(card).getByDisplayValue("1")).toBeInTheDocument();
    expect(within(card).getByDisplayValue("5")).toBeInTheDocument();
  });

  it("Bloc60: reorders events with the move up/down arrows", () => {
    const catalog = catalogWith({
      bronze: [
        { ...recruiterEvent, name: "Premier" },
        { ...recruiterEvent, name: "Second" },
      ],
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
    const catalog = catalogWith({ bronze: [recruiterEvent] });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByTestId("remove-event-bronze-0"));
    expect(screen.queryByDisplayValue("Recruteur")).not.toBeInTheDocument();
  });

  it("Bloc60: cancels the removal when the confirmation is declined", () => {
    const catalog = catalogWith({ bronze: [recruiterEvent] });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByTestId("remove-event-bronze-0"));
    expect(screen.getByDisplayValue("Recruteur")).toBeInTheDocument();
  });

  it("Bloc60: CRUD on an event's nested tier list reuses EditableDataTable (add/edit/reorder/remove)", () => {
    const catalog = catalogWith({ bronze: [recruiterEvent] });
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

  it("Bloc60: blocks save and shows an error when an event has no name or a tier is incomplete", async () => {
    const catalog = catalogWith({
      bronze: [{ name: "", startDay: "", endDay: "", tiers: [{ objective: "", reward: "R" }] }],
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
      bronze: [recruiterEvent],
      legend: [{ ...recruiterEvent, name: "Autre" }],
    });
    render(<EventsReferenceScreen initialCatalog={catalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer toute la page" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("/api/admin/guides/references/events");
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.bronze[0].name).toBe("Recruteur");
    expect(body.legend[0].name).toBe("Autre");
    expect(body.gold).toEqual([]);
  });
});
