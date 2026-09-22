/**
 * Bloc 109: how the Classement league/division picker lays its buttons out.
 *
 * Since Bloc 108 the number of active rungs is whatever an admin has switched
 * on — anywhere from 2 to 10 today, and more later — so the picker can no
 * longer assume the six it shipped with. This returns how many buttons each
 * row holds, and nothing else: the component slices its entries accordingly
 * and the stylesheet draws the rows.
 *
 * It is a formula, deliberately, not a table of the cases the brief listed —
 * adding an eleventh rung must not require another bloc.
 */

/** Above this count the picker stops fitting on the row it has always used. */
const singleRowLimit = 6;
/** The most buttons a narrow screen can carry on one row and stay legible. */
const narrowRowMax = 3;

export function leagueButtonRows(count: number, narrow: boolean): number[] {
  // At or below six, nothing changes: one flat list, laid out by the CSS that
  // has always laid it out — a single desktop row, a 3-column grid on mobile.
  // Returning one row here is what keeps that markup identical.
  if (count <= singleRowLimit) return [count];

  // Desktop: two rows, never more, split as evenly as the count allows. The
  // picker keeps its 50% of the field's width, so a third row would only make
  // the block taller than the two numeric fields beside it.
  if (!narrow) return [Math.ceil(count / 2), Math.floor(count / 2)];

  // Narrow: as many rows as it takes at three per row, then the buttons
  // spread evenly over those rows rather than filling each one in turn. The
  // difference shows at ten, where filling in turn leaves 3+3+3+1 — a last
  // row holding a single button under three full ones — against 3+3+2+2.
  const rows = Math.ceil(count / narrowRowMax);
  const perRow = Math.floor(count / rows);
  // The remainder is spread one per row from the top, so no row is ever more
  // than one button shorter than another. `perRow + 1` cannot exceed three:
  // reaching perRow = 3 would mean count = 3 × rows exactly, which leaves no
  // remainder to add.
  const longer = count % rows;
  return Array.from({ length: rows }, (_, index) =>
    index < longer ? perRow + 1 : perRow,
  );
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
