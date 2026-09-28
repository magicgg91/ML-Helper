import {
  dropEmptyLocales,
  launchLocales,
  translationRecord,
  type LaunchLocale,
} from "./translations";

/**
 * Bloc 127 : un champ de texte éditorial, dans toutes les langues du site.
 *
 * C'est la forme que le Bloc 135 a donnée au nom libre d'un échelon
 * (`RungName`) et le Bloc 130 à la description d'un outil (`ToolDescription`),
 * écrite une fois ici plutôt que trois : un objet par locale, lu par
 * `localizedText` (langue demandée, repli anglais, repli français, jamais un
 * vide), édité sur `launchLocales` par `LangTabs`.
 *
 * Elle remplace la paire `<champ>_fr`/`<champ>_en` que les quatre écrans de
 * l'audit (`docs/audit-contenu-multilingue-2026-09-26.md`) portaient encore :
 * deux colonnes pour cinq langues, donc un visiteur allemand lisait l'anglais,
 * et un onglet allemand écrivait dans la colonne anglaise (Bloc 125 §9).
 *
 * **Une langue laissée blanche est absente de l'objet, jamais écrite `""`.**
 * Le Bloc 126/D a montré ce que coûte la différence : `localizedText` tient une
 * chaîne vide pour écrite et s'arrête dessus, au lieu de se replier sur une
 * langue qui a quelque chose à dire.
 */
export type LocalizedField = Partial<Record<LaunchLocale, string>>;

/** Une valeur stockée, réduite aux langues du site réellement écrites. */
export function parseLocalizedField(value: unknown): LocalizedField {
  const stored = translationRecord(value);
  return Object.fromEntries(
    launchLocales
      .map((locale) => [locale, (stored[locale] ?? "").trim()] as const)
      .filter(([, text]) => text !== ""),
  ) as LocalizedField;
}

/**
 * La même lecture, avec le repli sur la paire FR/EN d'avant la migration.
 *
 * C'est le filet, pas la migration : la donnée passe à la forme nouvelle une
 * fois, en SQL (voir la migration du bloc). Cette branche ne sert qu'à ce que
 * le SQL ne peut pas atteindre — une sauvegarde restaurée d'avant elle, une
 * installation dont l'image n'a pas encore tourné — et un texte y resterait
 * lisible plutôt que de disparaître de l'écran sans un mot.
 */
export function parseLocalizedFieldPair(
  value: unknown,
  pair: { fr: unknown; en: unknown },
): LocalizedField {
  const parsed = parseLocalizedField(value);
  if (hasLocalizedField(parsed)) return parsed;
  return parseLocalizedField({ fr: pair.fr, en: pair.en });
}

/** Les langues dans lesquelles ce champ est réellement écrit. */
export function localizedFieldLocales(field: LocalizedField): LaunchLocale[] {
  return launchLocales.filter((locale) => (field[locale] ?? "").trim() !== "");
}

/** Si ce champ porte un texte, dans n'importe quelle langue. */
export function hasLocalizedField(field: LocalizedField): boolean {
  return localizedFieldLocales(field).length > 0;
}

/**
 * Le texte de **cette** langue exactement, sans aucun repli.
 *
 * Pour un champ qui *surcharge* un défaut déjà traduit dans les cinq langues :
 * les libellés de métrique des Équipements (Bloc 76/B, revue Codex PR #94). Là,
 * se replier sur une autre langue ferait lire au visiteur un texte saisi pour
 * quelqu'un d'autre, alors que sa propre langue a une traduction prête. Le
 * repli de `localizedText` serait donc une régression, pas un progrès — c'est
 * la seule règle de lecture qui diffère dans tout le contenu éditorial.
 */
export function localizedFieldInLocale(
  field: LocalizedField,
  locale: string,
): string {
  const text = field[locale as LaunchLocale];
  return text !== undefined && text.trim() !== "" ? text : "";
}

/**
 * Si ce champ rend un texte **à tous les visiteurs**, quelle que soit leur
 * langue.
 *
 * `localizedText` essaie la langue demandée, puis l'anglais, puis le français :
 * un champ écrit en allemand seul est donc vide pour tout le monde sauf un
 * visiteur allemand. Un écran d'édition qui accepte cet état publie une page
 * blanche, ce qu'AGENTS.md interdit — « repli sur l'anglais si une traduction
 * manque, jamais un vide ». C'est la règle que les guides appliquent déjà
 * (`guideInputSchema` : français OU anglais), posée ici une fois pour tout le
 * contenu éditorial.
 *
 * Revue Codex (PR #167, P2) : la validation de la Boutique demandait « au moins
 * une langue », ce qui laissait passer une ligne écrite en allemand seul.
 */
export function readableInEveryLocale(field: LocalizedField): boolean {
  const locales = localizedFieldLocales(field);
  return locales.includes("en") || locales.includes("fr");
}

/**
 * Un champ **facultatif** : vide, ou lisible par tous les visiteurs.
 *
 * La règle de `readableInEveryLocale` pour les champs qu'un écran n'oblige pas
 * à remplir — la description d'un templier, par exemple. Ce qui reste interdit
 * est l'entre-deux : un texte écrit dans une seule langue sans repli, blanc
 * pour tous les autres.
 */
export function readableWhenWritten(field: LocalizedField): boolean {
  return !hasLocalizedField(field) || readableInEveryLocale(field);
}

/** Toutes les langues, blanches là où rien n'est écrit — ce qu'un formulaire veut. */
export function localizedFieldForm(
  field: LocalizedField,
): Record<LaunchLocale, string> {
  return Object.fromEntries(
    launchLocales.map((locale) => [locale, field[locale] ?? ""]),
  ) as Record<LaunchLocale, string>;
}

/**
 * Le même champ, cette langue réécrite — blanche, elle en disparaît.
 *
 * Ce que tient l'état d'un éditeur est donc exactement ce qui sera stocké : une
 * langue effacée quitte l'objet au lieu d'y rester `""`, si bien que le repli
 * public reprend aussitôt (Bloc 126/D). Le texte n'est pas rogné ici — sinon on
 * ne pourrait pas taper l'espace d'un mot suivant.
 */
export function withLocalizedFieldLocale(
  field: LocalizedField,
  locale: LaunchLocale,
  text: string,
): LocalizedField {
  const next = { ...field };
  if (text.trim() === "") delete next[locale];
  else next[locale] = text;
  return next;
}

/** Ce qui se stocke, depuis ce qu'un formulaire tient : blanc = absent. */
export function localizedFieldToStore(
  form: Partial<Record<string, string>>,
): LocalizedField {
  return dropEmptyLocales(
    Object.fromEntries(
      launchLocales.map((locale) => [locale, (form[locale] ?? "").trim()]),
    ),
  ) as LocalizedField;
}
