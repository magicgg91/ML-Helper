import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { EventsCatalog } from "../lib/events";
import { leagues } from "../lib/player-settings";
import { EventsReferenceEditor } from "./admin-events-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function emptyCatalog(): EventsCatalog {
  return Object.fromEntries(
    leagues.map((league) => [league, { seasonDurationDays: 14, events: [] }]),
    // Object.fromEntries widens the keys to string; the league list it is
    // built from is the exhaustive one.
  ) as unknown as EventsCatalog;
}

const catalog: EventsCatalog = {
  ...emptyCatalog(),
  bronze: {
    seasonDurationDays: 21,
    events: [
      {
        name: "Architecte",
        description_fr: "Construis des bâtiments.",
        description_en: "Build buildings.",
        duration: 72,
        color: "violet",
        tiers: [
          {
            objective_fr: "10 bâtiments",
            objective_en: "10 buildings",
            reward_fr: "500 or",
            reward_en: "500 gold",
          },
        ],
      },
      {
        name: "Conquérant",
        description_fr: "",
        description_en: "",
        duration: 24,
        color: "emerald",
        tiers: [],
      },
    ],
  },
};

function renderEditor(initial: EventsCatalog = catalog) {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  render(
    <EventsReferenceEditor
      initialCatalog={structuredClone(initial)}
      backHref="/admin/referentiels"
      backLabel="Référentiels"
      title="Événements"
    />,
  );
  return request;
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

describe("Bloc 119: the Événements editor", () => {
  it("puts an event on one line, with its tiers folded away", () => {
    renderEditor();
    expect(screen.getByRole("button", { name: /^Architecte/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("1 palier")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Objectif du palier 1 de Architecte"),
    ).not.toBeVisible();
  });

  it("shows an event's tiers once it is unfolded", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Architecte/ }));
    const objective = screen.getByLabelText(
      "Objectif du palier 1 de Architecte",
    );
    expect(objective).toBeVisible();
    expect(objective).toHaveValue("10 bâtiments");
  });

  it("marks an event whose description is still to write", () => {
    renderEditor();
    const description = screen.getByLabelText("Description de l’événement 2");
    expect(description).toHaveAttribute("placeholder", "Description à rédiger");
    expect(description.className).toContain("border-dashed");
  });

  it("keeps each league's events entirely separate", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByRole("radio", { name: "Argent" }));
    expect(screen.getByText("Aucun objet pour l’instant.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Bronze" }));
    expect(screen.getByRole("button", { name: /^Architecte/ })).toBeVisible();
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.bronze.events).toHaveLength(2);
    expect(body.silver.events).toHaveLength(0);
  });

  it("saves an edited name and duration to the same endpoint", async () => {
    const request = renderEditor();
    fireEvent.change(screen.getByLabelText("Nom de l’événement 1"), {
      target: { value: "Bâtisseur" },
    });
    const durations = screen.getAllByRole("radiogroup", {
      name: "Durée de l’événement 1",
    })[0];
    fireEvent.click(within(durations).getByRole("radio", { name: "48h" }));
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][0]).toBe(
      "/api/admin/guides/references/events",
    );
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.bronze.events[0]).toMatchObject({
      name: "Bâtisseur",
      duration: 48,
    });
  });

  it("edits one language's texts without touching the other", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^EN/ }));
    expect(screen.getByLabelText("Description de l’événement 1")).toHaveValue(
      "Build buildings.",
    );
    fireEvent.change(screen.getByLabelText("Description de l’événement 1"), {
      target: { value: "Raise buildings." },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.bronze.events[0]).toMatchObject({
      description_fr: "Construis des bâtiments.",
      description_en: "Raise buildings.",
    });
  });

  it("picks a colour from the palette the screen already had", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByTestId("event-color-bronze-0"));
    fireEvent.click(screen.getByTestId("event-color-bronze-0-amber"));
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.bronze.events[0].color).toBe("amber");
  });

  it("adds a tier to the event whose button was pressed", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Conquérant/ }));
    fireEvent.click(screen.getByTestId("add-tier-bronze-1"));
    fireEvent.change(
      screen.getByLabelText("Objectif du palier 1 de Conquérant"),
      { target: { value: "5 victoires" } },
    );
    fireEvent.change(
      screen.getByLabelText("Récompense du palier 1 de Conquérant"),
      { target: { value: "200 or" } },
    );
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.bronze.events[1].tiers[0]).toMatchObject({
      objective_fr: "5 victoires",
      reward_fr: "200 or",
    });
  });

  it("refuses to save a season its events overflow", async () => {
    // Bloc 77 review: events chain back-to-back, so 96h of events in a
    // 3-day season would overflow the public timeline.
    const request = renderEditor({
      ...catalog,
      bronze: { ...catalog.bronze, seasonDurationDays: 3 },
    });
    save();
    expect(
      await screen.findByText(/Bronze : la durée cumulée/),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it("refuses to save an event with no name", async () => {
    const request = renderEditor();
    fireEvent.change(screen.getByLabelText("Nom de l’événement 2"), {
      target: { value: "" },
    });
    save();
    expect(
      await screen.findByText("Ce champ est obligatoire."),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
});
