import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";
import { defaultGemParameters } from "../lib/gem-parameters";
import { skillColor } from "../lib/game-images";
import { GemsReferenceTable } from "./gems-reference";

afterEach(cleanup);

const renderReference = (
  locale: "fr" | "en" = "fr",
  bundle: typeof messages | typeof enMessages = messages,
) =>
  render(
    <NextIntlClientProvider locale={locale} messages={bundle}>
      <GemsReferenceTable parameters={defaultGemParameters} />
    </NextIntlClientProvider>,
  );

describe("GemsReferenceTable (Bloc 36/A)", () => {
  // Bloc 65/D: 10 skill tiles + 1 Coût tile replace the 11 x 7 matrix
  // table. Each tile keeps all 6 leagues, so the skill x league comparison
  // this reference exists for stays visible without a league selector.
  it("Bloc65/D: renders 1 tile per skill plus the Coût tile, each holding all 6 leagues", () => {
    const { container } = renderReference();
    const tiles = Array.from(container.querySelectorAll(".gems-tile"));
    expect(tiles).toHaveLength(11);
    for (const tile of tiles) {
      const headerCells = tile.querySelectorAll("th");
      expect(headerCells).toHaveLength(6);
      expect(Array.from(headerCells).map((cell) => cell.textContent)).toEqual([
        "Bronze",
        "Argent",
        "Or",
        "Platine",
        "Diamant",
        "Légende",
      ]);
    }
    // No single-league selector: every league is on screen at once.
    expect(container.querySelector(".family-buttons")).toBeNull();
  });

  // Bloc 65/D: the Coût tile opens the grid, spans it fully, stays neutral
  // grey (it belongs to no skill) and carries 2 rows only — no gem image.
  it("Bloc65/D: puts the full-width grey Coût tile first, with 2 rows and no image", () => {
    const { container } = renderReference();
    const tiles = Array.from(container.querySelectorAll(".gems-tile"));
    const cost = screen.getByTestId("gems-tile-cost");
    expect(tiles[0]).toBe(cost);
    expect(cost).toHaveClass("gems-cost-tile");
    expect(cost.querySelectorAll("tr")).toHaveLength(2);
    expect(cost.querySelector("img")).toBeNull();
    // Grey comes from the class, not an inline per-skill color.
    expect((cost as HTMLElement).style.background).toBe("");
  });

  // Bloc 65/D: a skill tile is titled with the skill name and colored from
  // the palette already associated with that skill (cdc 7.1), the same way
  // the Combat/Expedition tiles take their rarity color.
  it("Bloc65/D: titles each skill tile and colors it from the existing per-skill palette", () => {
    renderReference();
    const striker = screen.getByTestId("gems-tile-striker");
    // Bloc 91/M5: tile titles are <h2> now (were <h3> skipping a level).
    expect(striker.querySelector("h2")).toHaveTextContent("Attaque");
    expect(striker).toHaveStyle({ borderColor: skillColor("striker") });
    expect((striker as HTMLElement).style.background).toContain(
      skillColor("striker"),
    );
  });

  // Bloc 65/D: 3 rows — league names, percentage, gem image — in equal,
  // centered columns (the equal width itself is a CSS concern, asserted in
  // reference-styles.test.ts).
  it("Bloc65/D: gives each skill tile a 3-row mini-table: leagues, %, gem image", () => {
    renderReference();
    const striker = screen.getByTestId("gems-tile-striker");
    const rows = striker.querySelectorAll("tr");
    expect(rows).toHaveLength(3);
    expect(rows[1].querySelectorAll("td")).toHaveLength(6);
    expect(rows[1].querySelectorAll("td")[0]).toHaveTextContent("1%");
    const image = within(striker).getByRole("img", { name: "Attaque Bronze" });
    expect(image).toHaveAttribute("src", "/gems/gem-striker-bronze.webp");
    expect(rows[2].contains(image)).toBe(true);
  });

  it("orders the 10 skills alphabetically by their displayed (French) name, not the technical key", () => {
    const { container } = renderReference();
    const titles = Array.from(container.querySelectorAll(".gems-tile h2"))
      .map((title) => title.textContent)
      .slice(1); // the Coût tile opens the grid
    expect(titles).toEqual([
      "Attaque",
      "Bravoure",
      "Charognard",
      "Défense",
      "Intrépide",
      "Prospérité",
      "Recruteur",
      "Récupération",
      "Recycleur",
      "Vitesse",
    ]);
  });

  it("Bloc38/E: shows the locked sapphire-cost formula's raw values, not compact-formatted, with Bronze marked not purchasable", () => {
    renderReference();
    const cost = screen.getByTestId("gems-tile-cost");
    expect(cost.querySelector("h2")).toHaveTextContent("Coût en saphirs");
    const cells = cost.querySelectorAll("td");
    expect(cells[0]).toHaveTextContent("—"); // Bronze: not purchasable
    // Bloc 93/F4: still the exact price, never "3k" — now carrying the
    // locale's thousands separator like every other exact figure on the site.
    expect(cells[1].textContent).toBe("3\u202f000"); // Argent, not "3k"
    expect(cells[5].textContent).toBe("7\u202f000"); // Légende, not "7k"
    for (const cell of [cells[1], cells[5]])
      expect(cell.textContent).not.toMatch(/[kKmMgG]/);
  });

  it("shows the real per-cell gem image (skill x league) with its confirmed percentage value", () => {
    renderReference();
    const striker = screen.getByTestId("gems-tile-striker");
    const image = within(striker).getByRole("img", { name: "Attaque Bronze" });
    expect(image).toHaveAttribute("src", "/gems/gem-striker-bronze.webp");
    expect(within(striker).getAllByText("1%")[0]).toBeInTheDocument();
  });

  it("Bloc38/F: uses the exact English skill names, not a literal translation", () => {
    const { container } = renderReference("en", enMessages);
    const titles = Array.from(container.querySelectorAll(".gems-tile h2")).map(
      (title) => title.textContent,
    );
    for (const label of [
      "Striker",
      "Guardian",
      "Brave",
      "Prosperous",
      "Rusher",
      "Cautious",
      "Fearless",
      "Recruiter",
      "Scavenger",
      "Salvager",
    ])
      expect(titles).toContain(label);
    // Confirms the fix — these mistranslations must no longer appear.
    expect(screen.queryByText("Attack")).not.toBeInTheDocument();
    expect(screen.queryByText("Bravery")).not.toBeInTheDocument();
    expect(screen.queryByText("Defense")).not.toBeInTheDocument();
    expect(screen.queryByText("Prosperity")).not.toBeInTheDocument();
    expect(screen.queryByText("Recovery")).not.toBeInTheDocument();
    expect(screen.queryByText("Speed")).not.toBeInTheDocument();
  });

  // Bloc 53/F: this link used to point at the generic /tools/competences
  // category (landing on whichever tab happened to be firstAvailable) —
  // now it points at the exact Gems calculator tab.
  it("links back to the precise Gemmes calculator, not the generic Compétences category", () => {
    renderReference();
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(screen.getByRole("link", { name: /Gemmes$/ })).toHaveAttribute(
      "href",
      "/tools/competences?open=gems",
    );
  });
});
