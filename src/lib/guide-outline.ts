/**
 * Bloc 129 §3.5 : le sommaire d'un guide, construit à partir de ses H2.
 *
 * Le sommaire est rendu côté page, le corps côté markdown : les deux doivent
 * tomber sur les mêmes ancres, sinon un lien du sommaire ne mène nulle part.
 * D'où un seul endroit pour deux choses — la façon de fabriquer un
 * identifiant à partir d'un titre, et la façon de renuméroter les niveaux.
 */

/**
 * La renumérotation des niveaux de titre, telle que rehypeShiftHeadings
 * l'applique au rendu : le corps d'un guide commence à H2, sous le H1 de la
 * page, et ne saute jamais de niveau. Partagée pour que le sommaire liste
 * exactement ce que la page affiche en H2.
 */
export function shiftedHeadingLevels(levels: number[]): number[] {
  const stack: { input: number; output: number }[] = [];
  return levels.map((level) => {
    while (stack.length && stack[stack.length - 1]!.input >= level) stack.pop();
    const output = Math.min(
      6,
      stack.length ? stack[stack.length - 1]!.output + 1 : 2,
    );
    stack.push({ input: level, output });
    return output;
  });
}

/**
 * L'identifiant d'ancre d'un titre.
 *
 * Sans accents ni ponctuation, pour que l'URL reste lisible et stable : un
 * titre « Bien débuter : l'or » donne « bien-debuter-l-or ». Deux titres
 * identiques dans un même guide sont départagés par un suffixe, sinon les
 * deux liens du sommaire mèneraient au premier.
 */
export function headingId(
  text: string,
  taken: Set<string> = new Set(),
): string {
  const base =
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  const unique = `${base}-${suffix}`;
  taken.add(unique);
  return unique;
}

export type GuideHeading = { id: string; label: string };

/**
 * Les titres de niveau 2 du guide, dans l'ordre, tels qu'ils seront rendus.
 *
 * Seuls les titres ATX (`## …`) comptent : c'est ce que l'éditeur de guides
 * produit. Les blocs de code sont ignorés — un `#` en début de ligne dans un
 * exemple de code n'est pas un titre.
 */
export function guideOutline(
  markdown: string,
  /**
   * `shift: false` pour un document qui porte son propre H1 et dont les
   * titres ne sont pas renumérotés — les mentions légales (§3.7). Le
   * sommaire liste alors les H2 tels qu'ils sont écrits.
   */
  { shift = true }: { shift?: boolean } = {},
): GuideHeading[] {
  const lines = markdown.split("\n");
  const found: { level: number; label: string }[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) found.push({ level: match[1]!.length, label: match[2]!.trim() });
  }
  const levels = shift
    ? shiftedHeadingLevels(found.map((entry) => entry.level))
    : found.map((entry) => entry.level);
  const taken = new Set<string>();
  return found.flatMap((entry, index) => {
    // Chaque titre consomme un identifiant, y compris ceux qui ne sont pas
    // au sommaire : le rendu les numérote de la même façon, et les deux
    // suites doivent rester alignées.
    const id = headingId(entry.label, taken);
    return levels[index] === 2 ? [{ id, label: entry.label }] : [];
  });
}
