import { expect, type Page } from "@playwright/test";

/**
 * Bloc 146 — la mesure qui dit qu'une tuile d'intervalle du Classement tient
 * dans sa largeur, à poser sur n'importe quel écran.
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

/**
 * Bloc 146 (suite) — le bureau, depuis son premier pixel. 901 est la largeur
 * où la mise en page à trois colonnes commence (le pendant de `max-width:
 * 900px`), et c'est là que la colonne des rangs était le plus écrasée ; 1 280
 * est au-dessus du seuil mesuré à partir duquel le rendu redevient celui
 * d'avant le bloc.
 */
export const desktopWidths = [901, 1024, 1150, 1280] as const;

type RewardFit = {
  /** Le type de récompense, pour nommer la mini-tuile en défaut. */
  type: string | null;
  text: string;
  /** Mots du libellé — une ligne par mot reste une coupure que l'œil suit. */
  words: number;
  lines: number;
  /** De combien le texte du libellé sort de la boîte de contenu de sa tuile. */
  overflow: number;
  top: number;
  height: number;
};

type TileFit = {
  league: string;
  leagueWords: number;
  leagueLines: number;
  /** Le nombre de caractères posés sur la plus courte de ses lignes. */
  leagueThinnestLine: number;
  ranksOverflow: number;
  rewards: number;
  rewardTiles: RewardFit[];
};

async function measureTiles(page: Page): Promise<TileFit[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll(".ranking-range-tile")].map((tile) => {
      const linesOf = (nodes: Node[]) => {
        const range = document.createRange();
        range.setStartBefore(nodes[0]);
        range.setEndAfter(nodes[nodes.length - 1]);
        // Une ligne par bord supérieur distinct : c'est ce que le navigateur a
        // dessiné, pas ce que la feuille de style laissait espérer.
        return {
          lines: new Set(
            [...range.getClientRects()].map((rect) => Math.round(rect.top)),
          ).size,
          right: range.getBoundingClientRect().right,
        };
      };
      /**
       * Combien de caractères le navigateur a posés sur la ligne la plus
       * courte. Une ligne réduite à une seule lettre est le défaut signalé —
       * « le nom de ligue part en colonne d'une lettre par ligne ».
       */
      const thinnestLine = (element: Element) => {
        const text = element.firstChild;
        if (!text || text.nodeType !== Node.TEXT_NODE) return Infinity;
        const perLine = new Map<number, number>();
        for (let index = 0; index < text.textContent!.length; index += 1) {
          const letter = document.createRange();
          letter.setStart(text, index);
          letter.setEnd(text, index + 1);
          const rect = letter.getBoundingClientRect();
          // Une espace en fin de ligne n'a pas de rectangle : elle ne compte
          // pas comme un caractère posé.
          if (!rect.width) continue;
          const line = Math.round(rect.top);
          perLine.set(line, (perLine.get(line) ?? 0) + 1);
        }
        return perLine.size ? Math.min(...perLine.values()) : Infinity;
      };
      const league = tile.querySelector(".ranking-range-league")!;
      const ranks = tile.querySelector(".ranking-range-ranks")!;
      const value = tile.querySelector(".ranking-range-ranks-value")!;
      const name = league.textContent!.trim();
      return {
        league: name,
        leagueWords: name.split(/\s+/).filter(Boolean).length,
        leagueLines: linesOf([league]).lines,
        leagueThinnestLine: thinnestLine(league),
        ranksOverflow: Math.max(
          0,
          Math.round(
            value.getBoundingClientRect().right -
              ranks.getBoundingClientRect().right,
          ),
        ),
        rewards: tile.querySelectorAll(".ranking-reward-tile").length,
        rewardTiles: [...tile.querySelectorAll(".ranking-reward-tile")].map(
          (mini) => {
            const label = mini.querySelector(".ranking-reward-label")!;
            // Le texte seul, sans l'icône : l'icône a son propre rectangle,
            // plus haut que celui du texte, et le compter donnerait deux
            // lignes à une étiquette qui n'en a qu'une.
            const text = [...label.childNodes].filter(
              (node) =>
                node.nodeType === Node.TEXT_NODE ||
                (node as Element).tagName !== "svg",
            );
            const { lines, right } = linesOf(text);
            const box = mini.getBoundingClientRect();
            const padding = Number.parseFloat(
              getComputedStyle(mini).paddingRight,
            );
            const written = label.textContent!.trim();
            return {
              type: mini.getAttribute("data-reward"),
              text: written,
              words: written.split(/\s+/).filter(Boolean).length,
              lines,
              overflow: Math.max(0, Math.round(right - (box.right - padding))),
              top: Math.round(box.top),
              height: Math.round(box.height),
            };
          },
        ),
      };
    }),
  );
}

/**
 * Chaque tuile visible tient dans sa largeur, sur les trois points que le
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
  // Rien de tout cela ne doit se régler en poussant la page vers la droite :
  // ce qui ne tient pas se replie, il ne déborde pas.
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    `${where} : la page défile horizontalement`,
  ).toBeLessThanOrEqual(0);
  for (const tile of tiles) {
    // Le défaut tel qu'il se voyait : « Rangs 11 – 60 » imprimé par-dessus les
    // mini-tuiles de récompense, parce que sa colonne ne faisait plus 6 px.
    expect(
      tile.ranksOverflow,
      `${where} — « ${tile.league} » : la valeur des rangs sort de sa rangée`,
    ).toBe(0);
    // Et l'autre moitié du même défaut : le nom de ligue descendu en colonne,
    // une lettre par ligne, faute de largeur.
    //
    // Deux façons d'être correct, parce que la colonne est partagée : soit le
    // nom ne se replie pas au-delà d'une ligne par mot — une coupure que l'œil
    // suit — soit il se replie davantage mais aucune de ses lignes n'est
    // réduite à une lettre. La seconde porte le cas du repli « À définir dans
    // l'administration », une phrase et non un nom, qui a le droit de tenir
    // sur plus de lignes qu'elle n'a de mots.
    expect(
      tile.leagueLines <= tile.leagueWords || tile.leagueThinnestLine >= 2,
      `${where} — « ${tile.league} » : le nom de ligue part en colonne (${tile.leagueLines} lignes pour ${tile.leagueWords} mot(s), la plus courte en porte ${tile.leagueThinnestLine})`,
    ).toBe(true);
    for (const reward of tile.rewardTiles) {
      // Le second défaut : « Beschleunigungen » débordait de 52 px hors de sa
      // mini-tuile, par-dessus la suivante.
      expect(
        reward.overflow,
        `${where} — « ${tile.league} » / « ${reward.text} » : le libellé sort de sa mini-tuile`,
      ).toBe(0);
      // Et il n'est pas non plus coupé au milieu pour y tenir.
      expect(
        reward.lines,
        `${where} — « ${tile.league} » / « ${reward.text} » : le libellé est coupé`,
      ).toBeLessThanOrEqual(reward.words);
    }
    // Les mini-tuiles d'une même rangée restent alignées : même bord haut,
    // même hauteur. C'est ce qui tient quand l'une d'elles s'élargit.
    const rows = new Map<number, RewardFit[]>();
    for (const reward of tile.rewardTiles) {
      rows.set(reward.top, [...(rows.get(reward.top) ?? []), reward]);
    }
    for (const [top, row] of rows) {
      expect(
        [...new Set(row.map((reward) => reward.height))],
        `${where} — « ${tile.league} » : la rangée de mini-tuiles à y=${top} n'a pas une hauteur unique`,
      ).toHaveLength(1);
    }
  }
  return tiles;
}

/** Les nombres de mini-tuiles réellement rencontrés, pour que le scénario
 *  puisse vérifier qu'il couvre encore le cas qu'il croit couvrir. */
export function rewardCounts(tiles: TileFit[]) {
  return [...new Set(tiles.map((tile) => tile.rewards))].sort((a, b) => a - b);
}
