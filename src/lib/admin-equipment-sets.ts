/**
 * Bloc 119 §3 bis: equipment rows, grouped by the set they belong to.
 *
 * Purely a display grouping — the stored model is unchanged, still one flat
 * array whose row identity is its position. A set is therefore not a thing
 * that exists in the data; it is what a run of rows sharing a name amounts
 * to, and this file is where that is worked out.
 *
 * Grouped by name alone, not by name+family+rarity: the brief asks for a
 * warning when "the rows of a set have inconsistent families or rarities",
 * and a group keyed on those two could never be inconsistent. So the name
 * makes the group, the family and rarity are read back off its rows, and a
 * set whose rows disagree says so instead of pretending.
 */

export type EquipmentSetRow = {
  set_name: string;
  family: string;
  rarity: string;
};

export type EquipmentSetGroup = {
  name: string;
  /** Positions in the original array — the rows' identity. */
  indexes: number[];
  /** The distinct values its rows carry, in first-seen order. */
  families: string[];
  rarities: string[];
  /** False when the rows disagree: the set header cannot speak for them. */
  consistent: boolean;
};

export function groupEquipmentSets(
  rows: readonly EquipmentSetRow[],
): EquipmentSetGroup[] {
  const groups = new Map<string, EquipmentSetGroup>();
  rows.forEach((row, index) => {
    const name = row.set_name;
    const group = groups.get(name) ?? {
      name,
      indexes: [],
      families: [],
      rarities: [],
      consistent: true,
    };
    group.indexes.push(index);
    if (!group.families.includes(row.family)) group.families.push(row.family);
    if (!group.rarities.includes(row.rarity)) group.rarities.push(row.rarity);
    group.consistent = group.families.length <= 1 && group.rarities.length <= 1;
    groups.set(name, group);
  });
  return [...groups.values()];
}

/**
 * Which of a row's fields can be "not confirmed yet".
 *
 * Bloc 126/C: some of them only mean anything alongside another. A combat
 * slot's third percentage belongs to its third skill, and 30 of the 180
 * delivered rows have no third skill at all — 117 have no fourth. Counted
 * flat, those absences read as 294 values waiting to be looked up in the
 * game, which is 294 things nobody can ever do: the skill is not missing
 * from the data, it is missing from the piece of equipment.
 *
 * So a pair contributes exactly when its owner names a real skill or stat
 * and the value beside it is blank — the one case where somebody could go
 * into the game, read a number and fill it in.
 */
export type UnconfirmedFields = {
  /** Fields that stand on their own, whatever else the row holds. */
  own: readonly string[];
  /** `[the field it belongs to, the field that depends on it]`. */
  pairs: readonly (readonly [owner: string, dependent: string])[];
};

const blank = (row: Record<string, string>, field: string) =>
  (row[field] ?? "").trim() === "";

/**
 * Whether a value names something rather than standing for its absence.
 *
 * Bloc 37/G: "" is "nobody has said", "none" is "there is none here". The two
 * are written differently and mean different things, but neither of them is a
 * skill, so neither gives the percentage beside it anything to describe.
 */
export const namesSomething = (value: string | undefined) => {
  const trimmed = (value ?? "").trim();
  return trimmed !== "" && trimmed !== "none";
};

/**
 * How many of a row's own fields nobody has confirmed yet.
 *
 * The set's own three fields are not passed in — they belong to the set
 * header, not to the row.
 */
export function countUnconfirmed(
  row: Record<string, string>,
  fields: UnconfirmedFields,
): number {
  return (
    fields.own.filter((field) => blank(row, field)).length +
    fields.pairs.filter(
      ([owner, dependent]) =>
        namesSomething(row[owner]) && blank(row, dependent),
    ).length
  );
}

/**
 * The same row, with every percentage whose skill does not exist emptied.
 *
 * Codex review (PR #150): disabling the field was not enough. Taking a skill
 * off a slot that had one left its percentage sitting in the form, out of
 * sight and out of reach, and the save wrote it back — so a slot could carry
 * `{skill_4: "", value_4_pct: "10"}`. Pick a skill for that slot later and
 * the 10% is live again, feeding the public equipment calculations without
 * anybody having typed it.
 *
 * Applied where the skill changes, so the admin sees the percentage go, and
 * again over every row on the way to the server, so a row that already
 * carries an orphan is cleaned rather than kept forever.
 */
export function clearOrphanValues<T extends Record<string, string>>(
  row: T,
  fields: UnconfirmedFields,
): T {
  const orphans = fields.pairs.filter(
    ([owner, dependent]) =>
      !namesSomething(row[owner]) && !blank(row, dependent),
  );
  if (orphans.length === 0) return row;
  return {
    ...row,
    ...Object.fromEntries(orphans.map(([, dependent]) => [dependent, ""])),
  };
}
