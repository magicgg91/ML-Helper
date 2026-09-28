import type { useTranslations } from "next-intl";
import { rungFreeName, type LeagueRung } from "../lib/leagues";

type Translator = ReturnType<typeof useTranslations>;

/**
 * Bloc 108/A : le nom d'un échelon dans la langue du lecteur.
 *
 * Un nom libre l'emporte quand une administration en a saisi un — c'est la
 * porte de sortie du renommage — et il est stocké par langue, lu avec le repli
 * du site (la langue demandée, puis l'anglais, puis le français). Sinon le nom
 * est construit depuis la ligue de base, qui EST traduite (`game.leagues.*`),
 * plus le libellé de division : « Or » + « 1 » se lit « Or 1 » en français et
 * « Gold 1 » en anglais, sans rien à traduire à la main.
 *
 * Bloc 135 : sorti de `ranking-calculator.tsx`, où il vivait parce que le
 * Classement était le seul à nommer un échelon. Ils sont trois désormais — le
 * calculateur, les Paramètres joueur et la section Ligues et divisions de
 * l'administration — et faire importer le calculateur public par un écran
 * d'administration pour une fonction de six lignes n'avait plus de sens.
 */
export function leagueRungLabel(
  rung: LeagueRung,
  game: Translator,
  locale: string,
) {
  const free = rungFreeName(rung, locale);
  if (free) return free;
  const base = rung.league ? game(`leagues.${rung.league}`) : "";
  return rung.division ? `${base} ${rung.division}`.trim() : base;
}
