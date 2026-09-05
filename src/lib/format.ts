// Bloc 93/F4: the site's number formatting used to live in three unrelated
// places — formatGameNumber in lib/city-calculators (a calculator module),
// formatSkillPercentValue in lib/skill-percent, and formatPercent exported
// from the reference-tables *component*, which other components imported
// from. Grouped here so the set is discoverable and the "exact number with
// separators" case finally has a helper instead of a bare Math.round.

// Bloc 87/A: every skill/stat contribution percentage shown on the site is
// displayed rounded to exactly 1 decimal, with standard (half-away-from-
// zero) rounding — 23.75% must read 23.8%, never a truncated 23.7%.
// toLocaleString's default rounding mode ("halfExpand", per ECMA-402) is
// precisely that standard rounding, verified for the 23.75 -> 23.8 case.
//
// This is ONLY for skill percentages (equipment / gem contributions). It
// must never be used for whole game quantities (gold, troops, points),
// which stay integers via formatGameNumber or formatExactNumber.
const skillPercentMaxFractionDigits = 1;

export function formatSkillPercentValue(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    maximumFractionDigits: skillPercentMaxFractionDigits,
  });
}

/** A skill percentage with its sign, or an em dash when there is no value. */
export function formatPercent(value: number | null, locale: string) {
  return value === null ? "—" : `${formatSkillPercentValue(value, locale)}%`;
}

/**
 * Compact game quantity: 1.2M, 3.4k, 900. For large in-game numbers where
 * the magnitude matters more than the exact figure.
 */
export function formatGameNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const absolute = Math.abs(rounded);
  const units = [
    { threshold: 1e15, suffix: "P" },
    { threshold: 1e12, suffix: "T" },
    { threshold: 1e9, suffix: "G" },
    { threshold: 1e6, suffix: "M" },
    { threshold: 1e3, suffix: "k" },
  ];
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (absolute < unit.threshold) continue;
    let compact = absolute / unit.threshold;
    if (compact >= 999.995 && index > 0) {
      const next = units[index - 1];
      compact = absolute / next.threshold;
      return `${rounded < 0 ? "-" : ""}${compact.toFixed(2).replace(/\.?0+$/, "")}${next.suffix}`;
    }
    return `${rounded < 0 ? "-" : ""}${compact.toFixed(2).replace(/\.?0+$/, "")}${unit.suffix}`;
  }
  return Math.round(rounded).toLocaleString("fr-FR");
}

/**
 * Bloc 93/F4: an exact whole number with the locale's thousands separators.
 *
 * The third formatting style the site already used, but only ever as a bare
 * `Math.round(value)` — which printed "12345" where the ranking table, using
 * toLocaleString by hand, printed "12 345" for the same magnitude. Use this
 * wherever the precise figure matters (costs, cumulative totals, prices);
 * use formatGameNumber where only the order of magnitude does.
 */
export function formatExactNumber(value: number, locale: string): string {
  return Math.round(value).toLocaleString(locale);
}
