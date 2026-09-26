import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { EventsCatalog } from "../lib/events";
import type { LeagueLadder } from "../lib/leagues";
import { leagues } from "../lib/player-settings";
import { EventsReferenceEditor } from "./admin-events-editor";
import { adminLeagueChipClass } from "./admin-league-chip";
import { AdminRankingEditor } from "./admin-ranking-editor";

// L'écran du Classement lit l'URL pour savoir quel échelon montrer ; ici on ne
// regarde que des classes, donc un routeur inerte suffit.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

/**
 * Bloc 138/C — les boutons de sélection de ligue du Classement et ceux
 * d'Événements rendent la même classe.
 *
 * Le constat du porteur de projet : dans le Classement, le bouton actif sortait
 * en violet plein, discordant du reste de l'admin. La cause n'était pas qu'une
 * nuance de goût — le Bloc 137 avait écrit `text-admin-accent-ink` et
 * `border-admin-accent-ink`, deux noms de jeton qui n'existent pas dans
 * `admin.css`. Les classes n'étaient donc pas engendrées : le texte gardait la
 * couleur héritée sur `bg-admin-accent`, mesuré à 1,94:1 en thème clair, là où
 * le WCAG 1.4.3 demande 4,5:1.
 *
 * Deux écrans qui « se ressemblent » se remettent à diverger au commit suivant.
 * Ce fichier compare donc les classes rendues, caractère par caractère, plutôt
 * que l'allure : si l'un des deux reprend un style à lui, le cas tombe.
 */
const ladder: LeagueLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    name: {},
    position: 0,
    active: true,
    bands: [],
  },
  {
    id: "silver",
    league: "silver",
    division: "",
    name: {},
    position: 1,
    active: true,
    bands: [],
  },
];

function rankingChips() {
  render(
    <AdminRankingEditor
      initialLadder={structuredClone(ladder)}
      backHref="/admin/tools"
      backLabel="Outils"
      title="Classement"
    />,
  );
  const group = screen.getByRole("group", { name: "Ligue ou division" });
  const buttons = within(group).getAllByRole("button");
  return {
    active: buttons.find((button) => button.getAttribute("aria-current")),
    other: buttons.find((button) => !button.getAttribute("aria-current")),
  };
}

function eventsChips() {
  const catalog = Object.fromEntries(
    leagues.map((league) => [league, { seasonDurationDays: 14, events: [] }]),
    // Object.fromEntries élargit les clés à string ; la liste dont elles
    // viennent est la liste exhaustive des ligues.
  ) as unknown as EventsCatalog;
  render(
    <EventsReferenceEditor
      initialCatalog={catalog}
      backHref="/admin/referentiels"
      backLabel="Référentiels"
      title="Événements"
    />,
  );
  const group = screen.getByRole("radiogroup");
  const buttons = within(group).getAllByRole("radio");
  return {
    active: buttons.find(
      (button) => button.getAttribute("aria-checked") === "true",
    ),
    other: buttons.find(
      (button) => button.getAttribute("aria-checked") !== "true",
    ),
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Bloc 138/C: one style for the admin's league buttons", () => {
  it("gives the Classement and Événements chips the very same classes", () => {
    const events = eventsChips();
    cleanup();
    const ranking = rankingChips();
    expect(events.active?.className).toBeTruthy();
    expect(ranking.active?.className).toBe(events.active?.className);
    expect(ranking.other?.className).toBe(events.other?.className);
  });

  it("takes those classes from the shared function", () => {
    // Sans quoi les deux écrans pourraient être d'accord sur une troisième
    // valeur, recopiée de part et d'autre — ce que ce bloc défait.
    const events = eventsChips();
    expect(events.active?.className).toBe(adminLeagueChipClass(true));
    expect(events.other?.className).toBe(adminLeagueChipClass(false));
  });

  it("dresses the selected chip in the soft accent pair, never the solid one", () => {
    // La paire de jetons appariée d'`admin.css` (8,96:1 en clair), celle que
    // portent déjà les onglets de langue et les filtres.
    const selected = adminLeagueChipClass(true);
    expect(selected).toContain("bg-admin-accent-soft");
    expect(selected).toContain("text-admin-accent-soft-ink");
    // Par classe entière, et non par sous-chaîne : `bg-admin-accent` est un
    // préfixe de `bg-admin-accent-soft`, donc une expression régulière dirait
    // le contraire de ce qu'on veut ici.
    const classes = selected.split(" ");
    expect(classes).not.toContain("bg-admin-accent");
    expect(classes).not.toContain("text-admin-accent-ink");
    expect(classes).not.toContain("border-admin-accent-ink");
  });
});
