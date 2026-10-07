import { expect, test } from "@playwright/test";
import {
  expectRankingTilesFit,
  phoneWidths,
  rewardCounts,
} from "./ranking-tile-layout";

/**
 * Bloc 146 — les tuiles d'intervalle du Classement, mesurées sur un téléphone.
 *
 * Le défaut : à 393 px, « Rangs 11 – 60 » s'imprimait par-dessus les
 * mini-tuiles de récompense et le nom de ligue descendait en colonne, une
 * lettre par ligne. Une seule cause pour les deux — la rangée « rangs |
 * récompenses » du Bloc 112 donnait sa largeur maximale (3 × 84 + 2 × 8 =
 * 268 px) à la colonne des récompenses avant de servir le `1fr` des rangs, et
 * la tuile n'offre que 211 px de contenu à 320 px. La première colonne
 * mesurait 0 px à 320 et 360, 6 px à 393, 43 px à 430.
 *
 * Ce fichier parcourt les cinq langues parce que c'est le nom de ligue qui
 * remplit cette colonne, et qu'il n'a pas la même longueur partout. Les plus
 * larges mesurés au rendu, à 393 px : « Diamant » et « Légende » (67 px) en
 * français, « Platinum » et « Diamond » (71 px) en anglais, « Legende » et
 * « Diamant » (67 px) en allemand, « Diamante » (76 px) en espagnol,
 * « Efsane » et « Gümüş » (54 px) en turc. L'échelon Diamant les porte tous,
 * l'échelon Argent porte « Gümüş » — d'où les deux ouverts ici.
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
  test(`Bloc146: the ${locale.toUpperCase()} range tiles hold at every phone width`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`/${locale}/tools/classement`);
    const buttons = page
      .locator(".ranking-calculator")
      .getByRole("group")
      .first()
      .getByRole("button");

    for (const rung of rungs) {
      await buttons.nth(rung.index).click();
      await expect(page.locator(".ranking-range-tile").first()).toBeVisible();
      for (const width of phoneWidths) {
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
