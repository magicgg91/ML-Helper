import { leaguesSectionHref } from "./admin-sections";
import { adminToolEditHref, isReferenceCalculatorSlug } from "./admin-tools";
import { calculatorCatalog, type CalculatorSlug } from "./calculator-catalog";

/**
 * Bloc 119: where each tool's numbers come from, and where they are edited.
 *
 * The Outils screen has to answer "Source des paramètres" per row, and the
 * Référentiels screen the mirror question "Utilisé par l'outil". Both were
 * invisible before: a tool with no ⏻ edit button said nothing about *why*,
 * and a reference said nothing about what consumed it.
 *
 * Every fact here was read off the code rather than assumed:
 *
 * - the three Villes tools share one editor — `adminToolEditHref` sends
 *   city-cost, city-max-level and city-production to
 *   /admin/tools/city-parameters, and the list of tools sharing an editor is
 *   computed below from that function rather than written out again;
 * - Équipement de Combat and Équipement d'Expédition have no parameters of
 *   their own: the public page hands SkillsCalculators `combatRows` /
 *   `expeditionRows` straight from the two references
 *   (app/[locale]/(public)/tools/[slug]/page.tsx), which is why their row
 *   points at a reference instead of an editor;
 * - Récompenses de Production genuinely has nothing to edit: its component
 *   (`RewardsCalculator` in components/city-calculators.tsx) takes no
 *   parameters at all — every number comes from the player's own input;
 * - Gemmes and Templiers are the other direction: the *reference* is edited
 *   through the *tool's* editor, which `adminToolEditHref` already encodes by
 *   sending "gemmes"/"templiers" to /admin/tools/gems|templars.
 */

export type ToolParameterSource =
  /** Named parameters of its own, edited on its own screen. */
  | { kind: "own"; href: string }
  /** Parameters shared with other tools — the Villes trio. */
  | { kind: "shared"; href: string; tools: readonly CalculatorSlug[] }
  /** No parameters: its data is a reference's rows. */
  | { kind: "reference"; reference: CalculatorSlug; href: string }
  /**
   * Bloc 135 : ses paramètres sont un réglage du site, pas les siens.
   *
   * Le Classement est le seul dans ce cas : ses seuls paramètres étaient
   * l'échelle des ligues et des divisions, que les Gemmes, la Progression, les
   * Événements et les Villes lisent aussi, et qui se gère donc dans
   * Configuration. La ligne le dit au lieu de laisser un bouton « Modifier »
   * mener à un écran qui n'existe plus.
   */
  | { kind: "configuration"; href: string }
  /** Nothing to edit at all. */
  | { kind: "none" };

/** The tools whose data is a reference's rows, not named parameters. */
const referenceByTool: Partial<Record<CalculatorSlug, CalculatorSlug>> = {
  "stuff-simulator": "combat-equipment",
  "expedition-equipment-simulator": "expedition-equipment",
};

/**
 * The references edited through a tool's editor, because the two share the
 * same formula parameters (Bloc 33/G for Templiers, Bloc 36/A for Gemmes).
 */
const toolByReference: Partial<Record<CalculatorSlug, CalculatorSlug>> = {
  gemmes: "gems",
  templiers: "templars",
};

const toolSlugs = calculatorCatalog
  .map(({ slug }) => slug)
  .filter((slug) => !isReferenceCalculatorSlug(slug));

/**
 * Where a reference is edited: its own screen, or the tool editor it shares
 * its parameters with. The fallback used to be spelled out in the
 * Référentiels page; it belongs next to the mapping it completes.
 */
export function adminReferenceEditHref(slug: string): string {
  return adminToolEditHref(slug) ?? `/admin/referentiels/reference-${slug}`;
}

/**
 * The tools that edit their parameters on the same screen as this one.
 *
 * Exported for the shared editor itself (Bloc 119 §3 bis): the "Utilisé par N
 * outils" chips of Paramètres Villes partagés name the same tools the Outils
 * table counts, from this one mapping.
 */
export function toolsSharingEditor(href: string): CalculatorSlug[] {
  return toolSlugs.filter((slug) => adminToolEditHref(slug) === href);
}

/** Les outils dont les paramètres vivent dans Configuration (Bloc 135). */
const configurationBySlug: Partial<Record<CalculatorSlug, string>> = {
  ranking: leaguesSectionHref,
};

export function toolParameterSource(slug: string): ToolParameterSource {
  const configuration = configurationBySlug[slug as CalculatorSlug];
  if (configuration) return { kind: "configuration", href: configuration };
  const reference = referenceByTool[slug as CalculatorSlug];
  if (reference)
    return {
      kind: "reference",
      reference,
      href: adminReferenceEditHref(reference),
    };
  const href = adminToolEditHref(slug);
  if (!href) return { kind: "none" };
  const shared = toolsSharingEditor(href);
  return shared.length > 1
    ? { kind: "shared", href, tools: shared }
    : { kind: "own", href };
}

/**
 * The tool a reference feeds, for the "Utilisé par l'outil" column — either
 * because the tool reads its rows, or because the two share one editor.
 */
export function toolUsingReference(slug: string): CalculatorSlug | undefined {
  const shared = toolByReference[slug as CalculatorSlug];
  if (shared) return shared;
  return toolSlugs.find(
    (tool) => referenceByTool[tool] === (slug as CalculatorSlug),
  );
}
