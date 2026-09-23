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
 * How many of a row's own fields nobody has confirmed yet.
 *
 * An empty string is "not known yet"; "none" is a confirmed absence (Bloc
 * 37/G) and does not count. The set's own three fields are not passed in —
 * they belong to the set header, not to the row.
 */
export function countUnconfirmed(
  row: Record<string, string>,
  fields: readonly string[],
): number {
  return fields.filter((field) => (row[field] ?? "").trim() === "").length;
}
