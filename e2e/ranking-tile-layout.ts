import { expect, type Page } from "@playwright/test";

/**
 * Bloc 146 — la mesure qui dit qu'une tuile d'intervalle du Classement tient
 * dans sa largeur, à poser sur n'importe quel écran de téléphone.
 *
 * Elle vit à part parce que deux fichiers en ont besoin : celui-ci est lu par
 * la suite publique, qui dispose des échelons semés (une et trois
 * mini-tuiles), et par phase-one.spec.ts, le seul à pouvoir écrire en base et
 * donc le seul à pouvoir montrer les quatre mini-tuiles du Bloc 145.
 *
 * Elle ne compare rien à un littéral : ce sont des positions relevées dans le
 * navigateur, confrontées les unes aux autres. Un nombre écrit ici serait un
 * nombre de plus à tenir à jour, et ne dirait pas pourquoi il déborde.
 */

/**
 * Les largeurs d'écran du bloc : les deux plus répandues aujourd'hui (393 et
 * 430), celle des téléphones compacts encore en service (360) et la plus
 * étroite que le site vise (320).
 */
export const phoneWidths = [320, 360, 393, 430] as const;

type TileFit = {
  /** Le nom de ligue affiché, pour que l'échec dise de quelle tuile il parle. */
  league: string;
  /** Combien de mots porte ce nom — une ligne par mot est une coupure légitime. */
  leagueWords: number;
  /** Combien de lignes le navigateur a réellement dessinées. */
  leagueLines: number;
  /** De combien la valeur des rangs sort de sa rangée, en pixels. */
  ranksOverflow: number;
  /** Combien de mini-tuiles de récompense porte la tuile. */
  rewards: number;
};

async function measureTiles(page: Page): Promise<TileFit[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll(".ranking-range-tile")].map((tile) => {
      const lines = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        // Une ligne par bord supérieur distinct : c'est ce que le navigateur a
        // dessiné, pas ce que la feuille de style laissait espérer.
        return new Set(
          [...range.getClientRects()].map((rect) => Math.round(rect.top)),
        ).size;
      };
      const league = tile.querySelector(".ranking-range-league")!;
      const ranks = tile.querySelector(".ranking-range-ranks")!;
      const value = tile.querySelector(".ranking-range-ranks-value")!;
      const name = league.textContent!.trim();
      return {
        league: name,
        leagueWords: name.split(/\s+/).filter(Boolean).length,
        leagueLines: lines(league),
        ranksOverflow: Math.max(
          0,
          Math.round(
            value.getBoundingClientRect().right -
              ranks.getBoundingClientRect().right,
          ),
        ),
        rewards: tile.querySelectorAll(".ranking-reward-tile").length,
      };
    }),
  );
}

/**
 * Chaque tuile visible tient dans sa largeur, sur les deux points que le
 * Bloc 146 corrige.
 *
 * `where` nomme la combinaison essayée (langue, largeur, échelon) : sans lui,
 * un échec dans une boucle de vingt passages ne dit pas lequel a cédé.
 */
export async function expectRankingTilesFit(page: Page, where: string) {
  // Le navigateur a pu changer de largeur à l'instant : on laisse passer une
  // image avant de lire des positions.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
  const tiles = await measureTiles(page);
  expect(tiles.length, `${where} : des tuiles à mesurer`).toBeGreaterThan(0);
  for (const tile of tiles) {
    // Le défaut tel qu'il se voyait : « Rangs 11 – 60 » imprimé par-dessus les
    // mini-tuiles de récompense, parce que sa rangée ne faisait plus 6 px.
    expect(
      tile.ranksOverflow,
      `${where} — « ${tile.league} » : la valeur des rangs sort de sa rangée`,
    ).toBe(0);
    // Et l'autre moitié du même défaut : un nom d'une seule ligue coupé lettre
    // par ligne. Un nom libre de plusieurs mots a le droit de se replier — une
    // ligne par mot reste une coupure que le lecteur suit.
    expect(
      tile.leagueLines,
      `${where} — « ${tile.league} » : le nom de ligue part en colonne`,
    ).toBeLessThanOrEqual(tile.leagueWords);
  }
  return tiles;
}

/** Les nombres de mini-tuiles réellement rencontrés, pour que le scénario
 *  puisse vérifier qu'il couvre encore le cas qu'il croit couvrir. */
export function rewardCounts(tiles: TileFit[]) {
  return [...new Set(tiles.map((tile) => tile.rewards))].sort((a, b) => a - b);
}
