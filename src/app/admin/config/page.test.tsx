import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import fr from "../../../../messages/fr.json";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConfigAdminPage from "./page";
import type { LanguageRow } from "@/components/admin-languages-panel";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";
import { getTrackingSettings } from "@/lib/site-settings";
import { getLeagueLadder } from "@/lib/leagues";

vi.mock("@/auth/require-session", () => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    guide: { findMany: vi.fn() },
    localeSetting: { findMany: vi.fn() },
    // Bloc 136 : la taille du journal, résumée dans l'en-tête de la section
    // de purge.
    auditLog: { count: vi.fn() },
  },
}));
vi.mock("@/lib/site-settings", () => ({ getTrackingSettings: vi.fn() }));
// Bloc 135 : l'échelle des ligues et des divisions. Seul son chargement est
// doublé — `activeLadder`, qui compte les échelons publics du résumé, reste
// celui du module.
vi.mock("@/lib/leagues", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/leagues")>()),
  getLeagueLadder: vi.fn(),
}));
vi.mock("next-intl/server", () => ({
  // Bloc 136 : les valeurs interpolées sont rendues à côté de la clé. Le
  // résumé d'une section repliée est fait de ces valeurs — sans elles,
  // « 4 actives sur 5 » se lirait « languages-summary », et un compte faux
  // passerait.
  getTranslations: async () => {
    const translate = (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key;
    // Bloc 135 : les noms de langue passés au panneau des ligues sont lus avec
    // `has` avant `()`, comme sur les écrans Outils et Référentiels — la
    // doublure doit donc porter les deux.
    return Object.assign(translate, { has: () => true });
  },
  getLocale: async () => "fr",
}));
// Bloc 132 §4 : l'écran calcule aussi ce qu'on peut mettre en avant. Ces
// deux-là n'ont rien à voir avec les langues, d'où des doublures fixes.
vi.mock("@/lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({
    "city-cost": true,
    gemmes: true,
  }),
}));
vi.mock("@/lib/home-highlights-server", () => ({
  getHomeHighlights: async () => highlights.value,
}));
const highlights = vi.hoisted(() => ({
  value: undefined as { kind: string; slug: string }[] | undefined,
}));
vi.mock("@/components/admin-highlights-panel", () => ({
  AdminHighlightsPanel: (props: {
    candidates: { kind: string; slug: string; name: string }[];
    initial: { kind: string; slug: string }[];
  }) => <pre data-testid="highlights">{JSON.stringify(props)}</pre>,
}));
vi.mock("@/components/admin-languages-panel", () => ({
  AdminLanguagesPanel: (props: { rows: LanguageRow[] }) => (
    <pre data-testid="languages">{JSON.stringify(props.rows)}</pre>
  ),
}));
vi.mock("@/components/tracking-settings-panel", () => ({
  TrackingSettingsPanel: () => <div data-testid="tracking" />,
}));
// Bloc 131/E : la carte de purge arrive de la page Historique. Doublée comme
// les autres panneaux — ce que cet écran décide, c'est de la montrer ou non.
vi.mock("@/components/admin-logs-purge", () => ({
  AdminLogsPurge: () => <div data-testid="purge" />,
}));
// Bloc 135 : doublé comme les autres panneaux — ce que cet écran décide, c'est
// de le montrer ou non, et avec quelles langues.
vi.mock("@/components/admin-leagues-panel", () => ({
  AdminLeaguesPanel: (props: {
    initialLadder: { id: string }[];
    hiddenLocales?: readonly string[];
    languageNames?: Record<string, string>;
  }) => <pre data-testid="leagues">{JSON.stringify(props)}</pre>,
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedGuideFindMany = vi.mocked(prisma.guide.findMany);
const mockedLocaleFindMany = vi.mocked(prisma.localeSetting.findMany);
const mockedTracking = vi.mocked(getTrackingSettings);
const mockedLogCount = vi.mocked(prisma.auditLog.count);
const mockedLadder = vi.mocked(getLeagueLadder);

/** Deux échelons, dont un préparé mais pas publié — de quoi compter. */
const ladder = [
  {
    id: "bronze",
    league: "bronze" as const,
    division: "",
    name: {},
    position: 0,
    active: true,
    bands: [],
  },
  {
    id: "silver-1",
    league: "silver" as const,
    division: "1",
    name: { fr: "Argent I" },
    position: 1,
    active: false,
    bands: [],
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  highlights.value = undefined;
});

async function renderPage({
  role = "super_admin",
  url = "",
}: { role?: string; url?: string } = {}) {
  mockedRequireCapability.mockResolvedValue({
    user: { id: "admin", role, name: "Admin" },
  } as Awaited<ReturnType<typeof requireCapability>>);
  mockedGuideFindMany.mockResolvedValue([
    {
      content: { fr: "a", en: "a", de: "a" },
      slug: "bien-debuter",
      title: { fr: "Bien débuter" },
      status: "published",
    },
    {
      content: { fr: "b", en: "b" },
      slug: "brouillon",
      title: { fr: "Brouillon" },
      status: "draft",
    },
  ] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>);
  mockedLocaleFindMany.mockResolvedValue([
    { locale: "es", active: false },
  ] as unknown as Awaited<ReturnType<typeof prisma.localeSetting.findMany>>);
  mockedTracking.mockResolvedValue({ url, websiteId: "" });
  mockedLogCount.mockResolvedValue(1234);
  mockedLadder.mockResolvedValue(ladder);
  // Bloc 136 : l'en-tête des sections est un composant client — ses propres
  // libellés (la pastille « Modifié ») passent par le fournisseur, là où le
  // corps de la page lit `getTranslations`, doublé plus haut.
  render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      {await ConfigAdminPage()}
    </NextIntlClientProvider>,
  );
  // La section des langues n'existe pas pour un rôle qui entre ici par
  // `leagues.read` seul (Bloc 135) : ses tests lisent alors autre chose.
  return JSON.parse(
    screen.queryByTestId("languages")?.textContent ?? "[]",
  ) as LanguageRow[];
}

describe("Bloc 119: the Configuration screen", () => {
  it("counts the guides written in each language", async () => {
    const rows = await renderPage();
    const byLocale = Object.fromEntries(rows.map((row) => [row.locale, row]));
    expect(byLocale.fr).toMatchObject({ translated: 2, total: 2 });
    expect(byLocale.de).toMatchObject({ translated: 1, total: 2 });
    expect(byLocale.tr).toMatchObject({ translated: 0, total: 2 });
  });

  it("keeps the two base languages first, and locked", async () => {
    const rows = await renderPage();
    expect(rows.slice(0, 2).map((row) => row.locale)).toEqual(["en", "fr"]);
    expect(rows.slice(0, 2).every((row) => row.locked)).toBe(true);
    expect(rows.slice(2).some((row) => row.locked)).toBe(false);
  });

  it("carries each language's stored visibility", async () => {
    const rows = await renderPage();
    expect(rows.find((row) => row.locale === "es")?.active).toBe(false);
    expect(rows.find((row) => row.locale === "de")?.active).toBe(true);
  });

  it("shows the tracking section to a Super Admin alone", async () => {
    await renderPage();
    expect(screen.getByTestId("tracking")).toBeInTheDocument();
    cleanup();
    // Revue Codex (PR #127): an `admin` keeps the rest of the tab; a field
    // whose save is refused would only be a trap.
    await renderPage({ role: "admin" });
    expect(screen.queryByTestId("tracking")).toBeNull();
  });

  it("says whether a script is loaded at all", async () => {
    await renderPage({ url: "https://example.com/script.js" });
    expect(screen.getByText("tracking.script-active")).toBeInTheDocument();
    cleanup();
    await renderPage({ url: "" });
    expect(screen.getByText("tracking.script-inactive")).toBeInTheDocument();
  });
});

/**
 * Bloc 132 §4 : l'écran Configuration reçoit aussi la sélection « Mis en
 * avant ». Ce qu'il calcule, c'est la liste de ce qu'on peut choisir — et
 * un brouillon n'en fait pas partie : on ne met pas en avant une page que
 * personne ne peut ouvrir.
 */
describe("Bloc 132 §4 : la sélection « Mis en avant »", () => {
  async function renderHighlights(
    selection?: { kind: string; slug: string }[],
  ) {
    highlights.value = selection;
    await renderPage();
    return JSON.parse(screen.getByTestId("highlights").textContent ?? "{}") as {
      candidates: { kind: string; slug: string; name: string }[];
      initial: { kind: string; slug: string }[];
    };
  }

  it("propose les outils, les référentiels et les guides publiés", async () => {
    const { candidates } = await renderHighlights();
    expect(
      candidates.map((candidate) => `${candidate.kind}:${candidate.slug}`),
    ).toEqual(
      expect.arrayContaining([
        "tool:city-cost",
        "reference:gems",
        "guide:bien-debuter",
      ]),
    );
  });

  it("écarte un guide qui n'est pas publié", async () => {
    const { candidates } = await renderHighlights();
    expect(candidates.some((candidate) => candidate.slug === "brouillon")).toBe(
      false,
    );
  });

  // Un outil désactivé en administration n'est pas ouvrable non plus.
  it("écarte un outil désactivé", async () => {
    const { candidates } = await renderHighlights();
    expect(
      candidates.some((candidate) => candidate.slug === "city-production"),
    ).toBe(false);
  });

  /**
   * Retour de revue : la page passait `highlights ?? []`, ce qui écrasait
   * « rien d'enregistré » et « liste vide enregistrée » en un seul état.
   * L'un laisse l'accueil sur sa liste de repli, l'autre masque le panneau
   * exprès : le panneau d'édition doit pouvoir les distinguer.
   */
  it("passe les trois états tels quels au panneau", async () => {
    expect((await renderHighlights()).initial).toBeUndefined();
    cleanup();
    expect((await renderHighlights([])).initial).toEqual([]);
    cleanup();
    expect(
      (await renderHighlights([{ kind: "tool", slug: "city-cost" }])).initial,
    ).toEqual([{ kind: "tool", slug: "city-cost" }]);
  });
});

/**
 * Bloc 131/E : la purge du journal vit maintenant ici.
 *
 * Le rôle qui y a droit n'a pas bougé — `logs.purge`, donc Super Admin — et
 * c'est bien le point : seul l'endroit change. Un `admin` garde l'accès à
 * Configuration et n'y voit pas la carte, exactement comme il gardait
 * l'accès à Historique sans la voir.
 */
describe("Bloc 131/E — la purge du journal, en Configuration", () => {
  it("montre la carte à un Super Admin", async () => {
    await renderPage();
    expect(screen.getByTestId("purge")).toBeInTheDocument();
  });

  it("la cache à un Admin, qui peut lire le journal sans le vider", async () => {
    await renderPage({ role: "admin" });
    expect(screen.queryByTestId("purge")).toBeNull();
  });

  // Une action destructive se met en bout de page, pas au milieu des
  // réglages qu'on vient modifier tous les jours.
  it("la pose en dernier, après les réglages", async () => {
    await renderPage();
    // Bloc 136 : la carte est désormais le contenu d'une section repliable,
    // et c'est cette section qui doit fermer la colonne.
    const section = screen.getByTestId("purge").closest("section");
    expect(section?.parentElement?.lastElementChild).toBe(section);
  });

  /**
   * Bloc 136 : repliée comme les autres, et résumée par ce qu'on veut savoir
   * avant d'en supprimer une tranche — combien le journal contient.
   */
  it("dit la taille du journal sans qu'on ouvre la section", async () => {
    await renderPage();
    const summary = screen.getByText(/^entries-summary/).textContent ?? "";
    expect(JSON.parse(summary.replace("entries-summary ", ""))).toEqual({
      count: 1234,
    });
    expect(screen.getByRole("button", { name: "purge-title" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  // Le compte n'est demandé qu'à qui peut purger : un admin ne déclenche pas
  // une requête dont il ne verra jamais le résultat.
  it("ne compte le journal que pour qui peut le purger", async () => {
    await renderPage({ role: "admin" });
    expect(mockedLogCount).not.toHaveBeenCalled();
  });
});

/**
 * Bloc 136 : l'écran s'ouvre replié.
 *
 * Le Bloc 119 avait déplié ces sections pour de bon ; l'écran a grossi depuis
 * (les mises en avant du Bloc 132 §4, la purge du Bloc 131/E) et la décision
 * s'inverse. Ce que cette page doit garantir en plus du composant lui-même,
 * c'est que chaque section dit juste ce qu'elle contient sans qu'on l'ouvre,
 * et qu'elle porte l'ancre qui permet d'y envoyer quelqu'un.
 */
describe("Bloc 136 — Configuration repliée par défaut", () => {
  it("ouvre les cinq sections repliées", async () => {
    await renderPage();
    // Chacune nommée par son seul titre : c'est l'en-tête d'une section, pas
    // la phrase « titre + description + résumé » mise bout à bout. Les titres
    // sont ici les clés elles-mêmes, la doublure de `getTranslations` les
    // rendant telles quelles — d'où « section », le titre de la section
    // Ligues et divisions dans son propre espace de noms.
    const headers = [
      "highlights.section",
      "section",
      "languages-section",
      "tracking.section",
      "purge-title",
    ].map((title) => screen.getByRole("button", { name: title }));
    expect(
      headers.every(
        (header) => header.getAttribute("aria-expanded") === "false",
      ),
    ).toBe(true);
  });

  it("compte les langues actives sans qu'on ouvre la section", async () => {
    await renderPage();
    // La doublure de `localeSetting` ne désactive que l'espagnol : quatre
    // actives sur les cinq lancées.
    const summary = screen.getByText(/^languages-summary/).textContent ?? "";
    expect(JSON.parse(summary.replace("languages-summary ", ""))).toEqual({
      count: 4,
      total: 5,
    });
  });

  it("porte l'ancre de chaque section", async () => {
    await renderPage();
    expect(
      [
        "mis-en-avant",
        "ligues-divisions",
        "langues",
        "suivi-visites",
        "purge-journal",
      ].map((id) => document.getElementById(id)?.tagName),
    ).toEqual(["SECTION", "SECTION", "SECTION", "SECTION", "SECTION"]);
  });
});

/**
 * Bloc 135 §2 : la section Ligues et divisions, sur l'écran Configuration.
 *
 * Ce que cet écran décide : où la section se place, ce que son en-tête dit
 * sans qu'on l'ouvre, et à qui elle s'affiche. Le CRUD lui-même est doublé —
 * il a ses propres tests.
 */
describe("Bloc 135 §2 — Ligues et divisions dans Configuration", () => {
  const panel = () =>
    JSON.parse(screen.getByTestId("leagues").textContent ?? "{}") as {
      initialLadder: { id: string }[];
      hiddenLocales?: string[];
      languageNames?: Record<string, string>;
    };

  it("compte les échelons et les actifs sans qu'on ouvre la section", async () => {
    await renderPage();
    const summary = screen.getByText(/^summary/).textContent ?? "";
    expect(JSON.parse(summary.replace("summary ", ""))).toEqual({
      count: 2,
      active: 1,
    });
  });

  // Entre la sélection de l'accueil et les langues du site : un référentiel de
  // jeu, du même ordre que les langues, et non un réglage technique.
  it("se place après « Mis en avant » et avant « Langues »", async () => {
    await renderPage();
    const order = [...document.querySelectorAll("section[id]")].map(
      (section) => section.id,
    );
    expect(order).toEqual([
      "mis-en-avant",
      "ligues-divisions",
      "langues",
      "suivi-visites",
      "purge-journal",
    ]);
  });

  it("passe l'échelle, les langues masquées et leurs noms au panneau", async () => {
    await renderPage();
    const props = panel();
    expect(props.initialLadder.map((rung) => rung.id)).toEqual([
      "bronze",
      "silver-1",
    ]);
    // L'espagnol est désactivé par la doublure de `localeSetting` : un nom
    // écrit dedans n'est nulle part sur le site, et l'onglet doit le dire.
    expect(props.hiddenLocales).toEqual(["es"]);
    expect(Object.keys(props.languageNames ?? {})).toEqual([
      "fr",
      "en",
      "de",
      "es",
      "tr",
    ]);
  });

  /**
   * Le point qui justifie une capacité à part. « Gestion Outils » éditait
   * l'échelle quand elle vivait sur /admin/tools/ranking : il entre donc ici,
   * et n'y voit que sa section — pas les langues du site, pas la sélection de
   * l'accueil, pas le suivi, pas la purge.
   */
  it("s'ouvre à « Gestion Outils », et à lui seul cette section", async () => {
    await renderPage({ role: "tools_manager" });
    expect(screen.getByTestId("leagues")).toBeInTheDocument();
    expect(screen.queryByTestId("languages")).toBeNull();
    expect(screen.queryByTestId("highlights")).toBeNull();
    expect(screen.queryByTestId("tracking")).toBeNull();
    expect(screen.queryByTestId("purge")).toBeNull();
  });

  // Et les guides ne sont pas lus pour lui : il n'a pas `guides.read`, et le
  // seul usage de leur contenu est le tableau des langues qu'il ne voit pas.
  it("ne lit pas les guides pour un rôle qui n'a que les ligues", async () => {
    await renderPage({ role: "tools_manager" });
    expect(mockedGuideFindMany).not.toHaveBeenCalled();
  });

  it("n'affiche rien pour un rôle sans droit sur les ligues", async () => {
    await renderPage({ role: "guides_manager" });
    expect(screen.queryByTestId("leagues")).toBeNull();
  });
});
