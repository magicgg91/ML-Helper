import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import { GuidesHub, type PublicGuideCard } from "./guides-hub";

const guide = (
  overrides: Partial<PublicGuideCard> & Pick<PublicGuideCard, "id" | "slug">,
): PublicGuideCard => ({
  categories: ["combat"],
  title: `Guide ${overrides.id}`,
  excerpt: "Résumé",
  coverImage: null,
  ...overrides,
});

function renderHub(guides: PublicGuideCard[], featuredId?: string) {
  render(
    <NextIntlClientProvider locale="fr" messages={frMessages}>
      <GuidesHub
        guides={guides}
        featuredId={featuredId}
        placeholderLabel="Illustration"
      />
    </NextIntlClientProvider>,
  );
}

const filters = () =>
  screen.queryByRole("navigation", {
    name: "Filtrer les guides par catégorie",
  });

describe("GuidesHub", () => {
  afterEach(cleanup);

  it("filters guides by category, with no search box", () => {
    renderHub([
      guide({
        id: "one",
        slug: "combat-guide",
        categories: ["combat", "clan"],
        title: "Guide combat",
        coverImage: "https://example.com/combat.jpg",
      }),
      guide({
        id: "two",
        slug: "clan-guide",
        categories: ["clan"],
        title: "Guide clan",
      }),
    ]);
    expect(screen.queryByRole("searchbox")).toBeNull();
    fireEvent.click(
      within(filters()!).getByRole("button", { name: "Combat & conquête" }),
    );
    expect(screen.getByText("Guide combat")).toBeVisible();
    expect(screen.queryByText("Guide clan")).toBeNull();
    expect(document.querySelector(".guide-card-media img")).toHaveAttribute(
      "src",
      "https://example.com/combat.jpg",
    );
  });

  it("renders the guide category filter as directly clickable chips, no dropdown", () => {
    renderHub([
      guide({ id: "one", slug: "combat-guide", categories: ["combat"] }),
      guide({ id: "two", slug: "clan-guide", categories: ["clan"] }),
    ]);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
    const allChip = within(filters()!).getByRole("button", { name: "Tout" });
    expect(allChip).toHaveClass("guide-filter-chip");
    expect(allChip).toHaveAttribute("aria-pressed", "true");
    const combatChip = within(filters()!).getByRole("button", {
      name: "Combat & conquête",
    });
    expect(combatChip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(combatChip);
    expect(combatChip).toHaveAttribute("aria-pressed", "true");
    expect(allChip).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a multi-category guide through every assigned category filter", () => {
    renderHub([
      guide({
        id: "multi",
        slug: "multi",
        categories: ["combat", "clan", "defense"],
        title: "Guide transversal",
      }),
    ]);
    for (const category of [
      "Combat & conquête",
      "Clan & stratégie collective",
      "Défense & territoire",
    ]) {
      fireEvent.click(
        within(filters()!).getByRole("button", { name: category }),
      );
      expect(screen.getByText("Guide transversal")).toBeVisible();
    }
  });

  // Bloc 129 §3.4 : « Filtres par catégorie et badge de catégorie masqués
  // tant qu'il n'y a qu'une seule catégorie. Ils réapparaissent
  // automatiquement à partir de deux catégories. »
  describe("avec une seule catégorie", () => {
    it("ne montre ni filtres ni badge", () => {
      renderHub([
        guide({ id: "one", slug: "a", categories: ["debuter"] }),
        guide({ id: "two", slug: "b", categories: ["debuter"] }),
      ]);
      expect(filters()).toBeNull();
      expect(screen.queryByText("Débuter & progresser")).toBeNull();
    });

    it("les fait revenir dès qu'un guide d'une autre catégorie paraît", () => {
      renderHub([
        guide({ id: "one", slug: "a", categories: ["debuter"] }),
        guide({ id: "two", slug: "b", categories: ["clan"] }),
      ]);
      expect(filters()).not.toBeNull();
      // Le libellé apparaît deux fois — comme filtre et comme badge de la
      // carte : c'est bien le badge qu'on cherche ici.
      const card = document.querySelector<HTMLElement>(".guide-card")!;
      expect(
        within(card).getByText("Débuter & progresser"),
      ).toBeVisible();
    });
  });

  // §3.4 : la carte mise en avant, pleine largeur, désignée par la
  // configuration — pas par le composant.
  it("met en avant le guide que la page lui désigne, une seule fois", () => {
    renderHub(
      [
        guide({ id: "start", slug: "bien-debuter", title: "Bien débuter" }),
        guide({ id: "other", slug: "autre", title: "Un autre guide" }),
      ],
      "start",
    );
    const card = document.querySelector<HTMLElement>(".guide-featured")!;
    expect(within(card).getByText("Commence ici")).toBeVisible();
    expect(
      within(card).getByRole("link", { name: "Bien débuter" }),
    ).toHaveAttribute("href", "/guides/bien-debuter");
    // Et il ne se répète pas dans la grille des autres guides.
    const grid = document.querySelector<HTMLElement>(".guide-grid")!;
    expect(within(grid).queryByText("Bien débuter")).toBeNull();
    expect(within(grid).getByText("Un autre guide")).toBeVisible();
  });

  it("n'invente pas de carte mise en avant quand rien n'est désigné", () => {
    renderHub([guide({ id: "one", slug: "a", title: "Un guide" })]);
    expect(document.querySelector(".guide-featured")).toBeNull();
    expect(screen.getByText("Un guide")).toBeVisible();
  });

  // §3.4 : « si un outil est associé au guide, un lien "Outil : [nom]" en
  // pastille ». Sans association, pas de pastille.
  it("porte la pastille de l'outil associé, et rien sans association", () => {
    renderHub([
      guide({
        id: "one",
        slug: "production",
        title: "Comprendre la production",
        tool: { href: "/tools/villes?open=production", label: "Production" },
      }),
      guide({ id: "two", slug: "clan", title: "Rejoindre un clan" }),
    ]);
    expect(
      screen.getByRole("link", { name: "Outil : Production" }),
    ).toHaveAttribute("href", "/tools/villes?open=production");
    const withoutTool = screen
      .getByText("Rejoindre un clan")
      .closest<HTMLElement>(".guide-card")!;
    expect(withoutTool.querySelector(".guide-card-tool")).toBeNull();
  });

  // §1.3 : l'emplacement vide, plutôt qu'un trou, quand il n'y a pas
  // d'illustration.
  it("pose l'emplacement d'illustration quand le guide n'en a pas", () => {
    renderHub([
      guide({ id: "one", slug: "a", title: "Sans image" }),
      guide({
        id: "two",
        slug: "b",
        title: "Avec image",
        coverImage: "https://example.com/b.jpg",
      }),
    ]);
    const without = screen
      .getByText("Sans image")
      .closest<HTMLElement>(".guide-card")!;
    expect(within(without).getByText("Illustration")).toBeVisible();
    expect(without.querySelector("img")).toBeNull();
    const withImage = screen
      .getByText("Avec image")
      .closest<HTMLElement>(".guide-card")!;
    expect(withImage.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/b.jpg",
    );
  });

  it("shows the guide's primary category as a badge, when categories are shown", () => {
    renderHub([
      guide({
        id: "one",
        slug: "combat-guide",
        categories: ["combat", "clan"],
        title: "Guide combat",
      }),
      guide({
        id: "two",
        slug: "clan-guide",
        categories: ["clan"],
        title: "Guide clan",
      }),
    ]);
    const combatCard = screen
      .getByText("Guide combat")
      .closest<HTMLElement>(".guide-card")!;
    expect(within(combatCard).getByText("Combat & conquête +1")).toBeVisible();
    const clanCard = screen
      .getByText("Guide clan")
      .closest<HTMLElement>(".guide-card")!;
    expect(
      within(clanCard).getByText("Clan & stratégie collective"),
    ).toBeVisible();
  });
});
