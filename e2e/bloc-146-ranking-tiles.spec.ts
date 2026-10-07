import { expect, test } from "@playwright/test";
import {
  desktopWidths,
  expectRankingTilesFit,
  phoneWidths,
  rewardCounts,
} from "./ranking-tile-layout";

/**
 * Bloc 146 — les tuiles d'intervalle du Classement, mesurées sur un téléphone
 * puis sur un bureau.
 *
 * Deux défauts, deux causes, un même symptôme : du texte imprimé sur ce qui
 * se trouve à côté.
 *
 * 1. La colonne des rangs écrasée. La rangée « rangs | récompenses » du
 *    Bloc 112 servait la colonne des récompenses — une piste non flexible, à
 *    son contenu maximal — avant le `1fr` des rangs. Sur téléphone la
 *    première colonne tombait à 0 px dès 320 px ; sur bureau, où la troisième
 *    piste avait en plus un plancher de 260 px, elle tombait à 0 px à 901 px
 *    et la valeur des rangs mordait jusqu'à 185 px sur les mini-tuiles.
 *
 * 2. Le libellé d'une mini-tuile plus large que sa tuile. Les quatre libellés
 *    sont un mot unique dans les cinq langues, et la tuile avait une largeur
 *    fixe : « Beschleunigungen » débordait de 52 px sur téléphone, 33 sur
 *    bureau, et dix des vingt libellés débordaient d'au moins 1 px.
 *
 * Ce fichier parcourt les cinq langues parce que ce sont le nom de ligue et le
 * libellé de récompense qui remplissent ces largeurs, et qu'ils n'ont pas la
 * même longueur partout. Les plus larges mesurés au rendu à 393 px — nom de
 * ligue : « Diamant »/« Légende » 67 px (fr), « Platinum »/« Diamond » 71 px
 * (en), « Legende »/« Diamant » 67 px (de), « Diamante » 76 px (es),
 * « Efsane »/« Gümüş » 54 px (tr) ; libellé : « Speedups » 54 px (fr),
 * « Sapphires » 54 px (en), « Beschleunigungen » 99 px (de),
 * « Aceleraciones » 76 px (es), « Hızlandırma » 65 px (tr). L'échelon Diamant
 * porte les noms les plus longs, l'échelon Argent les trois récompenses —
 * d'où les deux ouverts ici.
 *
 * Il n'écrit rien : l'échelle est celle que `defaultLeagueLadder` donne à une
 * base semée. Le cas à QUATRE mini-tuiles demande un Prestige, donc une
 * écriture, donc phase-one.spec.ts — qui appelle la même mesure.
 */

const locales = ["fr", "en", "de", "es", "tr"] as const;

/**
 * Les échelons par leur rang dans la barre de boutons, pas par leur libellé :
 * il change à chaque langue, l'ordre non. 1 = Argent (trois récompenses par
 * plage), 4 = Diamant (une seule, et les noms de ligue les plus longs).
 */
const rungs = [
  { index: 1, rewards: 3 },
  { index: 4, rewards: 1 },
];

for (const locale of locales) {
  test(`Bloc146: the ${locale.toUpperCase()} range tiles hold at every width`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(`/${locale}/tools/classement`);
    const buttons = page
      .locator(".ranking-calculator")
      .getByRole("group")
      .first()
      .getByRole("button");

    for (const rung of rungs) {
      await buttons.nth(rung.index).click();
      await expect(page.locator(".ranking-range-tile").first()).toBeVisible();
      for (const width of [...phoneWidths, ...desktopWidths]) {
        await page.setViewportSize({ width, height: 1600 });
        const tiles = await expectRankingTilesFit(
          page,
          `${locale} / ${width}px / échelon ${rung.index}`,
        );
        // Le scénario couvre-t-il encore ce qu'il annonce ? Un jeu semé qui
        // changerait de récompenses le ferait passer au vert sans rien mesurer.
        expect(
          rewardCounts(tiles),
          `${locale} / ${width}px : le nombre de mini-tuiles attendu`,
        ).toEqual([rung.rewards]);
      }
      // La largeur de départ pour l'échelon suivant, dont le clic se fait sur
      // la barre de boutons telle qu'elle est à l'ouverture.
      await page.setViewportSize({ width: 1280, height: 1600 });
    }
  });
}
