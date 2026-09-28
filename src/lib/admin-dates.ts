/**
 * Bloc 119: every date and time the admin prints, in one place.
 *
 * Two problems this replaces. The admin used to show raw ISO strings
 * (`2026-09-22T18:04:11.314Z` in the audit log) next to locale-formatted ones
 * (the dashboard's `toLocaleString(locale)`), so the same instant read
 * differently on two screens. And both were formatted without a time zone:
 * a Date rendered on the server carries the *container's* zone (UTC in the
 * Docker image), so a moderation action taken at 20:04 in Paris was logged as
 * 18:04 for the person who had just done it.
 *
 * The site's audience is a French player base, so the admin reads times in
 * Europe/Paris whatever the server, the browser or the interface language —
 * the zone is the site's, the wording follows the locale.
 */

export const adminTimeZone = "Europe/Paris";

export type AdminDateInput = Date | string | number;

/**
 * A `Date` from whatever the caller has: the object Prisma returns, or the
 * ISO string it becomes when a server component passes it to a client one.
 *
 * An unparsable value throws rather than rendering "Invalid Date" in the
 * interface: it can only come from a broken payload, and a silent bad date in
 * an audit trail is worse than a visible failure.
 */
function toDate(value: AdminDateInput): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Date invalide pour l'administration : ${String(value)}`);
  return date;
}

function format(
  value: AdminDateInput,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return toDate(value).toLocaleString(locale, {
    timeZone: adminTimeZone,
    ...options,
  });
}

/** `22/09/2026` — the full date, for a "created on" line. */
export function formatAdminDate(value: AdminDateInput, locale: string): string {
  return format(value, locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** `1 sept.` — the short form the list columns use for a last-modified date. */
export function formatAdminShortDate(
  value: AdminDateInput,
  locale: string,
): string {
  return format(value, locale, { day: "numeric", month: "short" });
}

/** `18:04` — the audit log's own column, the only place mono type is used. */
export function formatAdminTime(value: AdminDateInput, locale: string): string {
  return format(value, locale, {
    hour: "2-digit",
    minute: "2-digit",
    // Bloc 119: the admin is EN/FR, and an English reader of a French site's
    // log still compares rows against a 24-hour game clock — `hour12: false`
    // keeps the column a single width and the order obvious.
    hour12: false,
  });
}

/** `22/09/2026 18:04` — date and time together, for a single-row summary. */
export function formatAdminDateTime(
  value: AdminDateInput,
  locale: string,
): string {
  return `${formatAdminDate(value, locale)} ${formatAdminTime(value, locale)}`;
}

/**
 * `Mardi 22 septembre 2026` — the audit log's day sub-heading.
 *
 * French writes weekdays and months in lower case; the heading starts a line,
 * so its first letter is raised — with the locale's own casing rules
 * (`toLocaleUpperCase`), not ASCII's.
 */
export function formatAdminDayHeading(
  value: AdminDateInput,
  locale: string,
): string {
  const heading = format(value, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return heading.charAt(0).toLocaleUpperCase(locale) + heading.slice(1);
}

/**
 * `2026-09-22`, the Paris day an instant belongs to — the key the audit log
 * groups its rows by.
 *
 * Grouping on the raw UTC date would split a Paris evening in two: 00:30 on
 * the 23rd in Paris is still the 22nd in UTC, and the two rows of one working
 * session would land under different headings. `en-CA` is the locale whose
 * numeric date is already `YYYY-MM-DD`, so the parts sort as strings.
 */
export function adminDayKey(value: AdminDateInput): string {
  return format(value, "en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
