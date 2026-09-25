import { cache } from "react";
import { prisma } from "./prisma";
import {
  homeHighlightsKey,
  parseHomeHighlights,
  type HomeHighlight,
} from "./home-highlights";

/**
 * Bloc 132 §4 : la sélection « Mis en avant » telle qu'elle est stockée.
 *
 * `undefined` quand aucune sélection n'a jamais été enregistrée — l'accueil
 * prend alors la liste de repli (`fallbackHighlights`). `cache` déduplique
 * la lecture dans une même requête, comme pour les réglages de suivi.
 */
export const getHomeHighlights = cache(
  async (): Promise<HomeHighlight[] | undefined> => {
    const row = await prisma.siteSetting.findUnique({
      where: { key: homeHighlightsKey },
      select: { value: true },
    });
    return parseHomeHighlights(row?.value);
  },
);
