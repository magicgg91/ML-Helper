// Additive star-upgrade formula, shared by every equipment system that uses
// it (cdc section 7.1: Combat equipment, Expedition equipment) — a neutral
// helper with no dependency on any specific skill or stat, so neither side
// re-derives or duplicates the same formula (AGENTS.md factoring rule).
const maxEquipmentStar = 8;

export function valueAtStar(
  base: number,
  increment: number,
  star: number,
): number {
  return (
    base + increment * (Math.max(1, Math.min(maxEquipmentStar, star)) - 1)
  );
}

/**
 * Bloc 93/M1: doubling merge cost per star — Coût(rareté, n) = K(rareté) ×
 * 2^(n-1). Combat and Expédition each carried their own byte-identical copy
 * of this, the Combat one commented as "reproduces exactly" the Expédition
 * one: copied instead of shared. Only the K table per rarity differs between
 * the two systems, and that stays with each of them.
 *
 * Returns null for a rarity absent from the given base table.
 */
export function mergeCostAtStar<Rarity extends string>(
  base: Partial<Record<Rarity, number>>,
  rarity: string,
  star: number,
): number | null {
  const rarityBase = base[rarity as Rarity];
  if (rarityBase === undefined) return null;
  return rarityBase * 2 ** (Math.max(1, star) - 1);
}
