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
