// Bloc 87/A: every skill/stat contribution percentage shown on the site is
// displayed rounded to exactly 1 decimal, with standard (half-away-from-
// zero) rounding — 23.75% must read 23.8%, never a truncated 23.7%.
// toLocaleString's default rounding mode ("halfExpand", per ECMA-402) is
// precisely that standard rounding, verified for the 23.75 -> 23.8 case.
//
// This is ONLY for skill percentages (equipment / gem contributions). It
// must never be used for whole game quantities (gold, troops, points),
// which stay integers via formatGameNumber.
export const skillPercentMaxFractionDigits = 1;

export function formatSkillPercentValue(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    maximumFractionDigits: skillPercentMaxFractionDigits,
  });
}
