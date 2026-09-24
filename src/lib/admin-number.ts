/**
 * Bloc 119: reading and writing a number the way the admin's own language
 * writes it — a comma in French, a dot in English — while accepting both when
 * parsing, because a value pasted from a spreadsheet or from another screen
 * carries whichever separator it was written with.
 *
 * Two things this must never do, both from AGENTS.md:
 *  - invent a value for an empty field: an unconfirmed game value stays null
 *    until somebody confirms it in game, so a cleared field parses to null,
 *    never to 0;
 *  - swallow an unreadable entry: "1.2.3" is not 1.2, it is a typo, and the
 *    field has to be able to say so rather than store a number nobody typed.
 */

export type AdminNumberParse =
  /** `value: null` means the field was cleared, not that it holds zero. */
  { ok: true; value: number | null } | { ok: false };

/** The empty string for a null, so an unfilled field shows its placeholder. */
export function formatAdminNumber(
  value: number | null | undefined,
  locale: string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "";
  return new Intl.NumberFormat(locale, {
    // Game parameters go to a few decimals (a troop ratio is 1.2453); 10 is
    // past anything stored and short of the noise of a binary fraction.
    maximumFractionDigits: 10,
    // Grouping would have to be typed back in to round-trip, and a field 72 px
    // wide has no room for it.
    useGrouping: false,
  }).format(value);
}

export function parseAdminNumber(text: string): AdminNumberParse {
  // Every kind of space goes, the narrow no-break one French grouping uses
  // included — a pasted "1 234,5" is a number, not a typo.
  let cleaned = text.replace(/[\s  ]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Both separators: the last one is the decimal point ("1,234.5" in
    // English, "1.234,5" in French) and the other one groups.
    const grouping =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? "." : ",";
    cleaned = cleaned.split(grouping).join("");
  }
  cleaned = cleaned.replace(",", ".");
  if (cleaned === "") return { ok: true, value: null };
  // Number("") is 0, which is why the empty case is settled above; what is
  // left reaching NaN really is unreadable. Number(" ") and Number("1e3") are
  // both handled here too — the first became "" above, the second is 1000.
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return { ok: false };
  return { ok: true, value };
}
