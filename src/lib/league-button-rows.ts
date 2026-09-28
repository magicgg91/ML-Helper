/**
 * Bloc 109: how the Classement league/division picker lays its buttons out.
 *
 * Since Bloc 108 the number of active rungs is whatever an admin has switched
 * on — anywhere from 2 to 10 today, and more later — so the picker can no
 * longer assume the six it shipped with. This returns how many buttons each
 * row holds, and nothing else: the component slices its entries accordingly
 * and the stylesheet draws the rows.
 *
 * It is a formula, deliberately, not a table of the cases a brief listed —
 * adding an eleventh rung must not require another bloc.
 *
 * Scope: the Classement picker only. The league buttons of every other tool
 * (Événements, Progression, Villes, Paramètres joueur) come from
 * LeagueButtons, which never calls this and keeps its own flat layout.
 */

/** Above this count the picker stops fitting on the row it has always used. */
const singleRowLimit = 6;
/**
 * Bloc 110/1: the columns a narrow screen gets, fixed — see below.
 */
const narrowColumns = 2;

export function leagueButtonRows(count: number, narrow: boolean): number[] {
  // Bloc 110/1, replacing the narrow rule of Bloc 109 (as many rows as three
  // per row takes, spread evenly). Three buttons to a row broke the page
  // width in real conditions: a button keeps min-width: max-content so its
  // label is never truncated, and three real division names — "Diamant 2",
  // "Platine 1" — do not fit across a phone. Two fixed columns do, whatever
  // the names, so the narrow layout no longer depends on the count at all:
  // ceil(N/2) rows of 2, the last holding 1 when N is odd.
  if (narrow) {
    const rows = Math.ceil(count / narrowColumns);
    return Array.from({ length: rows }, (_, index) =>
      // The last row is short exactly when N is odd; every other row is full.
      Math.min(narrowColumns, count - index * narrowColumns),
    );
  }

  // Desktop, unchanged since Bloc 109. At or below six, nothing changes: one
  // flat list, laid out by the CSS that has always laid it out. Returning one
  // row here is what keeps that markup identical.
  if (count <= singleRowLimit) return [count];

  // Above six: two rows, never more, split as evenly as the count allows. The
  // picker keeps its 50% of the field's width, so a third row would only make
  // the block taller than the two numeric fields beside it.
  return [Math.ceil(count / 2), Math.floor(count / 2)];
}

/** Slices `items` into the rows leagueButtonRows describes. */
export function sliceIntoRows<T>(items: T[], rows: number[]): T[][] {
  let start = 0;
  return rows.map((size) => {
    const row = items.slice(start, start + size);
    start += size;
    return row;
  });
}
