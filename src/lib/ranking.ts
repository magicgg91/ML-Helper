import {
  seasonMovements,
  type SeasonBand,
  type SeasonMovement,
} from "./leagues";

/**
 * Le calcul et les couleurs de l'outil Classement — et rien d'autre.
 *
 * Bloc 135 : l'échelle elle-même (échelons, divisions, ordre, League Lock,
 * visibilité) a quitté ce fichier pour `lib/leagues.ts`, d'où tout le site la
 * lit désormais. Ce qui reste ici est ce que seul le Classement utilise :
 * transformer un rang et un pourcentage en intervalles de joueurs, et donner
 * à chaque plage la couleur que la barre et les tuiles doivent partager.
 */

export type RankingRange = SeasonBand & {
  rangeStart: number;
  rankStart: number;
  rankEnd: number;
  /**
   * Revue Codex (PR #137) : où la plage de cet intervalle se situe une fois
   * les plages triées par seuil. C'est sa seule prise unique — un seuil n'en
   * est pas une, puisqu'une administration peut enregistrer deux plages sur le
   * même — et c'est ce qui permet à un appelant de réaligner un intervalle sur
   * sa plage après que le filtre ci-dessous en a écarté certaines.
   */
  bandIndex: number;
};

// Palettes par catégorie de mouvement, clair -> foncé au fil des paliers de
// cette catégorie (prototype-ml-helper-unifie.html, RANK_CATEGORY_SHADES).
const rankCategoryShades: Record<SeasonMovement, readonly string[]> = {
  promotion: ["#a8dcb8", "#7ec99a", "#4fae78", "#2f8c5a", "#1c6b41"],
  stay: ["#a8c9e8", "#7eabd9", "#4f8bc4", "#2f6ba6", "#1c4d80"],
  relegation: ["#f0b088", "#e8895c", "#d9633a", "#b8452a", "#8f2f1c"],
};

export function rankCategoryShade(
  category: SeasonMovement,
  index: number,
): string {
  const shades = rankCategoryShades[category];
  return shades[index % shades.length];
}

/**
 * Bloc 110/C : la teinte de chaque plage, dans l'ordre du tri par seuil.
 *
 * La barre visuelle et les tuiles d'intervalle doivent peindre le même
 * intervalle de la même couleur — c'est tout l'intérêt que les tuiles portent
 * une couleur. Une teinte dépend du nombre de plages du même mouvement qui la
 * précèdent, donc elle ne peut pas être recalculée de chaque côté : les tuiles
 * sont construites depuis les intervalles de `calculateRanking`, qui ÉCARTE
 * toute plage ne contenant aucun rang entier, et une plage écartée décalerait
 * toutes les teintes suivantes. Les deux côtés lisent cette liste unique,
 * construite depuis les plages elles-mêmes — la barre par son propre index
 * trié, une tuile par le `bandIndex` de son intervalle.
 *
 * Revue Codex (PR #137) : une liste indexée par position, pas une table
 * indexée par seuil. Deux plages peuvent partager un seuil — l'action Ajouter
 * de l'administration amorce chaque nouvelle ligne à 100 et
 * `isSavableLeagueLadder` ne vérifie que la plage de valeurs — et indexer par
 * lui faisait silencieusement écraser la teinte de la première par la
 * seconde, si bien que l'intervalle réellement dessiné pouvait porter la
 * couleur d'une autre catégorie.
 */
export function rankBandShades(bands: SeasonBand[]): string[] {
  const counters: Record<SeasonMovement, number> = {
    promotion: 0,
    stay: 0,
    relegation: 0,
  };
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  return sorted.map((band) => {
    const category = band.movement ?? "stay";
    const shade = rankCategoryShade(category, counters[category]);
    counters[category] += 1;
    return shade;
  });
}

export function calculateRanking(
  bands: SeasonBand[],
  percentage: number,
  rank: number,
) {
  if (percentage <= 0) return { total: null, ranges: [] as RankingRange[] };
  const total = Math.max(1, rank) / (percentage / 100);
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  // Only rankEnd is derived from this band's own percentage. rankStart
  // chains off the previous range's rankEnd (+1) instead of being
  // recomputed from this band's own starting percentage — otherwise the
  // same floored rank could land at both the end of one range and the
  // start of the next (Bloc 31/J).
  let previousRankEnd = 0;
  return {
    total,
    // A small enough population can leave a band with no integer rank in
    // it at all (its own rankEnd still floors to the previous band's
    // rankEnd or lower) — chaining still advances previousRankEnd for the
    // next band, but a band with rankStart > rankEnd holds zero players
    // and is dropped rather than shown as a nonsensical reversed range.
    ranges: sorted
      .map((band, index) => {
        const rangeStart = index === 0 ? 0 : sorted[index - 1].threshold;
        // Bloc 62/G: every band floors its rank boundary EXCEPT the 100%
        // one — that row represents the deduced total player count itself
        // (rankEnd = total at threshold 100), and flooring it would silently
        // undercount by up to 1 player (e.g. rank 137 at 86.71% -> raw
        // 157.998, floor 157, ceil 158 — the real total is estimated, but
        // ceil is the correct rounding direction for it specifically).
        const rankEnd =
          band.threshold === 100
            ? Math.ceil((total * band.threshold) / 100)
            : Math.floor((total * band.threshold) / 100);
        const rankStart = previousRankEnd + 1;
        previousRankEnd = rankEnd;
        return { ...band, rangeStart, rankStart, rankEnd, bandIndex: index };
      })
      .filter((range) => range.rankStart <= range.rankEnd),
  };
}

// Les libellés de mouvement du sélecteur de l'éditeur lisent cette liste ;
// elle vit dans `lib/leagues.ts` avec le reste du vocabulaire de fin de
// saison, et n'est ré-exportée ici pour personne.
void seasonMovements;
